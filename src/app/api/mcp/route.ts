import { NextRequest, NextResponse } from 'next/server';
import { MCPExecutor, getAllTools, getToolsByCategory, getToolByName } from '@/lib/mcp-server';

/**
 * MCP (Model Context Protocol) API
 * 
 * 暴露 ECCP 的后台能力为 MCP 工具，让 AI 助手可以直接调用。
 * 
 * 支持的端点：
 * - GET  /api/mcp?action=list_tools          列出所有可用工具
 * - GET  /api/mcp?action=tool_info&name=xxx  获取工具详情
 * - POST /api/mcp                            执行工具
 */

const executor = new MCPExecutor();

/**
 * GET /api/mcp
 * 列出工具或获取工具详情
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'list_tools';
    const name = searchParams.get('name');
    const category = searchParams.get('category') as 'perception' | 'analysis' | 'execution' | 'memory' | null;

    // 获取单个工具详情
    if (action === 'tool_info' && name) {
      const tool = getToolByName(name);
      if (!tool) {
        return NextResponse.json(
          { success: false, error: `Tool not found: ${name}` },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, data: tool });
    }

    // 列出工具
    let tools = category ? getToolsByCategory(category) : getAllTools();

    // 按分类分组
    const grouped = {
      perception: tools.filter(t => t.category === 'perception'),
      analysis: tools.filter(t => t.category === 'analysis'),
      execution: tools.filter(t => t.category === 'execution'),
      memory: tools.filter(t => t.category === 'memory'),
    };

    return NextResponse.json({
      success: true,
      data: {
        total: tools.length,
        categories: {
          perception: { count: grouped.perception.length, label: '感知层（眼睛）', description: '数据采集：热搜、视频文案、评论' },
          analysis: { count: grouped.analysis.length, label: '分析层（大脑）', description: '智能分析：选题评估、情感分析' },
          execution: { count: grouped.execution.length, label: '执行层（手）', description: '内容生成：脚本、文章' },
          memory: { count: grouped.memory.length, label: '记忆层（记忆）', description: '知识管理：存储、搜索' },
        },
        tools: tools.map(t => ({
          name: t.name,
          description: t.description,
          category: t.category,
          required: t.inputSchema.required || [],
        })),
      },
    });
  } catch (error) {
    console.error('[MCP] List tools failed:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to list tools' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/mcp
 * 执行 MCP 工具
 * Body: { tool: string, params: Record<string, string> }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tool, params } = body as { tool: string; params: Record<string, string> };

    if (!tool) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: tool' },
        { status: 400 }
      );
    }

    // 验证工具是否存在
    const toolDef = getToolByName(tool);
    if (!toolDef) {
      return NextResponse.json(
        { success: false, error: `Unknown tool: ${tool}. Use GET /api/mcp?action=list_tools to see available tools.` },
        { status: 404 }
      );
    }

    // 验证必填参数
    const required = toolDef.inputSchema.required || [];
    const missingParams = required.filter(r => !params?.[r]);
    if (missingParams.length > 0) {
      return NextResponse.json(
        { success: false, error: `Missing required params: ${missingParams.join(', ')}` },
        { status: 400 }
      );
    }

    // 执行工具
    const result = await executor.execute(tool, params || {});

    return NextResponse.json({
      success: result.success,
      data: result.data,
      error: result.error,
      meta: {
        tool,
        category: toolDef.category,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[MCP] Execute failed:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to execute tool' },
      { status: 500 }
    );
  }
}
