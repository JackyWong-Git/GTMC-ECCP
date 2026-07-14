import { NextRequest, NextResponse } from 'next/server';
import { setupLLMEnv } from '@/lib/platform-config';
import { LLMClient, Config } from 'coze-coding-dev-sdk';
import { MCPExecutor, MCP_TOOLS } from '@/lib/mcp-server';

/**
 * POST /api/mcp/orchestrate
 * AI Orchestrator - 自然语言驱动的 MCP 工具编排
 * 
 * 用户输入自然语言指令，AI 自动拆解为多个 MCP 工具调用并串行执行。
 * 
 * 示例：
 * - "帮我搜一下新能源汽车最新热点，生成三条脚本"
 * - "分析这个视频的评论区：https://v.douyin.com/xxx"
 * - "深度研究一下'AI 教育'这个选题"
 * 
 * Body: { command: string, context?: Record<string, string> }
 */

interface OrchestratorStep {
  tool: string;
  params: Record<string, string>;
  description: string;
}

interface OrchestratorPlan {
  goal: string;
  steps: OrchestratorStep[];
  reasoning: string;
}

/**
 * 使用 LLM 将自然语言指令拆解为 MCP 工具调用计划
 */
async function planExecution(command: string, context?: Record<string, string>): Promise<OrchestratorPlan> {
  setupLLMEnv();
  
  const client = new LLMClient(new Config());
  
  const toolList = MCP_TOOLS.map(t => 
    `- ${t.name} (${t.category}): ${t.description}\n  必填参数: ${(t.inputSchema.required || []).join(', ') || '无'}`
  ).join('\n');

  const result = await client.invoke(
    [{ role: 'user' as const, content: `你是一个 AI 工具编排器。请根据用户的指令，将其拆解为一系列 MCP 工具调用。

可用工具列表：
${toolList}

用户指令：${command}
${context ? `上下文信息：${JSON.stringify(context)}` : ''}

请输出 JSON 格式的执行计划：
{
  "goal": "用户想要达成的目标（一句话）",
  "reasoning": "为什么选择这些工具，执行顺序的逻辑",
  "steps": [
    {
      "tool": "工具名称",
      "params": { "参数名": "参数值" },
      "description": "这一步做什么"
    }
  ]
}

注意：
1. 步骤之间可以有数据依赖（后一步可以用前一步的结果）
2. 如果用户提供了 URL，优先使用相关的数据采集工具
3. 如果涉及内容生成，先搜索/分析再生成
4. 最后一步通常是保存到知识库
5. 参数值要具体，不要用占位符` }],
    { model: 'doubao-seed-2-0-lite-260215', temperature: 0.3 }
  );

  const content = result.content || '{}';
  
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : { goal: command, steps: [], reasoning: '无法解析执行计划' };
  } catch {
    return { goal: command, steps: [], reasoning: 'JSON 解析失败' };
  }
}

/**
 * 按计划逐步执行 MCP 工具
 */
async function executePlan(plan: OrchestratorPlan): Promise<{
  plan: OrchestratorPlan;
  results: Array<{
    step: number;
    tool: string;
    description: string;
    success: boolean;
    data?: unknown;
    error?: string;
  }>;
  summary: string;
}> {
  const executor = new MCPExecutor();
  const results: Array<{
    step: number;
    tool: string;
    description: string;
    success: boolean;
    data?: unknown;
    error?: string;
  }> = [];

  // 收集所有步骤的结果，供后续步骤引用
  const resultContext: Record<string, unknown> = {};

  for (let i = 0; i < plan.steps.length; i++) {
    const step = plan.steps[i];
    
    // 替换参数中的引用（如 {step_0_data}）
    const resolvedParams: Record<string, string> = {};
    for (const [key, value] of Object.entries(step.params)) {
      if (typeof value === 'string' && value.includes('{step_')) {
        // 尝试解析引用
        const refMatch = value.match(/\{step_(\d+)_(\w+)\}/);
        if (refMatch) {
          const refStep = parseInt(refMatch[1], 10);
          const refField = refMatch[2];
          const refResult = resultContext[`step_${refStep}`];
          if (refResult && typeof refResult === 'object') {
            resolvedParams[key] = String((refResult as Record<string, unknown>)[refField] || value);
          } else {
            resolvedParams[key] = value;
          }
        } else {
          resolvedParams[key] = value;
        }
      } else {
        resolvedParams[key] = String(value);
      }
    }

    const result = await executor.execute(step.tool, resolvedParams);
    
    results.push({
      step: i,
      tool: step.tool,
      description: step.description,
      success: result.success,
      data: result.data,
      error: result.error,
    });

    // 保存结果供后续引用
    resultContext[`step_${i}`] = result.data;
  }

  // 生成执行总结
  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;
  
  let summary = `执行完成：${successCount}/${plan.steps.length} 步成功`;
  if (failCount > 0) {
    summary += `，${failCount} 步失败`;
  }

  return { plan, results, summary };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { command, context } = body as { command: string; context?: Record<string, string> };

    if (!command) {
      return NextResponse.json(
        { success: false, error: '缺少 command 参数' },
        { status: 400 }
      );
    }

    // Step 1: 规划执行
    const plan = await planExecution(command, context);

    if (plan.steps.length === 0) {
      return NextResponse.json({
        success: false,
        error: '无法生成执行计划',
        data: { plan },
      });
    }

    // Step 2: 执行计划
    const executionResult = await executePlan(plan);

    return NextResponse.json({
      success: true,
      data: executionResult,
    });
  } catch (error) {
    console.error('[orchestrator] 执行失败:', error);
    return NextResponse.json(
      { success: false, error: '编排执行失败' },
      { status: 500 }
    );
  }
}
