import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config } from 'coze-coding-dev-sdk';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ModelInfo {
  id: string;
  label: string;
  category: string;
}

const SYSTEM_PROMPT = `你是一个运营工作流设计专家，帮助用户创建自动化工作流。

你需要理解用户的运营需求，然后生成合适的工作流配置。

## 可用的模块类型
- llm_analysis: AI 内容分析（适合分析文本、图片、视频内容）
- llm_generate: AI 内容生成（适合生成脚本、文案、标题等）
- llm_summary: AI 摘要总结（适合对数据进行汇总和摘要）
- web_search: 网络搜索（适合搜索互联网获取实时信息和热点数据）
- data_fetch: 数据抓取（适合从指定 URL 抓取数据）
- knowledge_save: 知识库写入（适合将数据存入云文档知识库）
- knowledge_search: 知识库搜索（适合从知识库检索参考素材）
- condition: 条件判断（适合根据条件分支执行不同逻辑）
- transform: 数据转换（适合对数据进行格式转换、过滤等处理）

## 可用的模型
用户会提供可用模型列表，你需要根据任务特点选择合适的模型。

## 回复格式
你的回复需要包含两部分：
1. 对用户需求的理解和建议（自然语言）
2. 工作流配置（JSON 格式，用 \`\`\`json 代码块包裹）

工作流配置 JSON 格式：
\`\`\`json
{
  "name": "工作流名称",
  "description": "工作流描述",
  "trigger": "manual|schedule|event",
  "modules": [
    {
      "type": "模块类型",
      "name": "模块名称",
      "description": "模块描述",
      "modelId": "模型ID（仅 LLM 模块需要）",
      "prompt": "系统提示词（仅 LLM 模块需要）",
      "config": {},
      "enabled": true
    }
  ]
}
\`\`\`

## 注意事项
- 根据用户需求合理组合模块
- 为每个 LLM 模块选择合适的模型和提示词
- 模块顺序很重要，按照执行顺序排列
- 如果用户需求不明确，先给出建议方案，询问用户是否满意
- 回复使用中文`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, history = [], availableModels = [], availableModules = [] } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: '请输入消息' }, { status: 400 });
    }

    // Build context
    const modelList = (availableModels as ModelInfo[])
      .map((m) => `- ${m.label} (${m.id}) [${m.category}]`)
      .join('\n');

    const moduleList = (availableModules as string[]).join(', ');

    const systemMessage = {
      role: 'system' as const,
      content: `${SYSTEM_PROMPT}\n\n## 当前可用模型\n${modelList}\n\n## 当前可用模块类型\n${moduleList}`,
    };

    // Build conversation history
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemMessage.content },
    ];

    for (const msg of history as ChatMessage[]) {
      messages.push({ role: msg.role, content: msg.content });
    }
    messages.push({ role: 'user', content: message });

    // Call LLM
    const llmClient = new LLMClient(new Config());
    const response = await llmClient.invoke(messages, {
      model: 'doubao-seed-2-0-lite-260215',
      temperature: 0.7,
    });

    const reply = response.content || '';

    // Try to extract workflow JSON from the response
    let workflow = null;
    const jsonMatch = reply.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        workflow = JSON.parse(jsonMatch[1]);
      } catch {
        // JSON parse failed, ignore
      }
    }

    // Clean up the reply text (remove JSON block for display)
    const displayReply = reply.replace(/```json\s*[\s\S]*?\s*```/g, '').trim() ||
      '已为你生成工作流配置，请查看右侧画布。';

    return NextResponse.json({
      success: true,
      data: {
        reply: displayReply,
        workflow,
      },
    });
  } catch (error) {
    console.error('AI assist error:', error);
    return NextResponse.json({ error: 'AI 助手请求失败' }, { status: 500 });
  }
}
