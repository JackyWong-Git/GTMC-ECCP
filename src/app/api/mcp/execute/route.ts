/**
 * MCP Tool Execution Endpoint
 * 
 * 接收 MCP 工具调用请求，路由到对应的内部 API 执行。
 * 
 * 请求格式：
 * {
 *   tool: "search_topics",
 *   params: { query: "新能源汽车", source: "douyin" }
 * }
 * 
 * 响应格式：
 * {
 *   success: true,
 *   tool: "search_topics",
 *   data: { ... },
 *   execution_time: 1234
 * }
 */

import { NextRequest, NextResponse } from 'next/server';

interface MCPExecuteRequest {
  tool: string;
  params: Record<string, unknown>;
}

// 工具路由映射表
const TOOL_ROUTES: Record<string, {
  endpoint: string;
  method: 'GET' | 'POST';
  paramMapping?: Record<string, string>;
  transformResponse?: (data: unknown) => unknown;
}> = {
  // 感知类工具
  search_topics: {
    endpoint: '/api/douyin-trending',
    method: 'GET',
    paramMapping: { query: 'keyword', source: 'source' },
  },
  get_trending: {
    endpoint: '/api/douyin-trending',
    method: 'GET',
    paramMapping: { platform: 'source', category: 'category' },
  },
  get_video_transcript: {
    endpoint: '/api/video-transcript',
    method: 'POST',
  },
  get_douyin_comments: {
    endpoint: '/api/douyin-comments',
    method: 'POST',
    paramMapping: { video_id: 'videoId', analyze_sentiment: 'analyzeSentiment' },
  },
  crawl_web_data: {
    endpoint: '/api/crawl-data',
    method: 'POST',
    paramMapping: { data_type: 'dataType' },
  },

  // 分析类工具
  analyze_topic: {
    endpoint: '/api/topic-analysis',
    method: 'POST',
  },
  generate_script: {
    endpoint: '/api/generate-script',
    method: 'POST',
  },
  generate_article: {
    endpoint: '/api/generate-article',
    method: 'POST',
  },
  analyze_sentiment: {
    endpoint: '/api/sentiment-analysis',
    method: 'POST',
  },

  // 执行类工具
  save_to_knowledge: {
    endpoint: '/api/knowledge',
    method: 'POST',
    paramMapping: { category: 'category' },
  },
  run_workflow: {
    endpoint: '/api/workflows/run',
    method: 'POST',
    paramMapping: { workflow_id: 'workflowId' },
  },

  // 记忆类工具
  search_knowledge: {
    endpoint: '/api/knowledge',
    method: 'GET',
    paramMapping: { query: 'q', top_k: 'topK' },
  },
  get_analytics_summary: {
    endpoint: '/api/data-summary',
    method: 'POST',
  },
};

/**
 * 构建内部 API 请求 URL
 */
function buildInternalUrl(endpoint: string, params: Record<string, unknown>, paramMapping?: Record<string, string>): string {
  const baseUrl = process.env.COZE_PROJECT_DOMAIN_DEFAULT 
    ? `http://localhost:${process.env.DEPLOY_RUN_PORT || '5000'}`
    : 'http://localhost:5000';
  
  const url = new URL(endpoint, baseUrl);
  
  if (paramMapping) {
    for (const [mcpParam, apiParam] of Object.entries(paramMapping)) {
      if (params[mcpParam] !== undefined) {
        url.searchParams.set(apiParam, String(params[mcpParam]));
      }
    }
  }
  
  return url.toString();
}

/**
 * POST /api/mcp/execute
 * 执行 MCP 工具调用
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body: MCPExecuteRequest = await request.json();
    const { tool, params } = body;

    // 验证工具名称
    if (!tool) {
      return NextResponse.json({
        success: false,
        error: '缺少工具名称参数 tool',
        availableTools: Object.keys(TOOL_ROUTES),
      }, { status: 400 });
    }

    // 查找工具路由
    const route = TOOL_ROUTES[tool];
    if (!route) {
      return NextResponse.json({
        success: false,
        error: `未知工具: ${tool}`,
        availableTools: Object.keys(TOOL_ROUTES),
      }, { status: 404 });
    }

    // 构建请求
    const internalUrl = buildInternalUrl(route.endpoint, params || {}, route.paramMapping);
    
    const fetchOptions: RequestInit = {
      method: route.method,
      headers: {
        'Content-Type': 'application/json',
        'X-MCP-Caller': 'true',
      },
    };

    // POST 请求需要 body
    if (route.method === 'POST') {
      fetchOptions.body = JSON.stringify(params || {});
    }

    // 执行内部 API 调用
    const response = await fetch(internalUrl, fetchOptions);
    const data = await response.json();

    const executionTime = Date.now() - startTime;

    // 检查是否是流式响应（SSE）
    if (response.headers.get('content-type')?.includes('text/event-stream')) {
      return NextResponse.json({
        success: true,
        tool,
        data: { type: 'stream', message: '此工具返回流式响应，请使用 SSE 客户端接收' },
        execution_time: executionTime,
      });
    }

    return NextResponse.json({
      success: response.ok,
      tool,
      data: route.transformResponse ? route.transformResponse(data) : data,
      execution_time: executionTime,
    });

  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error('[MCP Execute] 工具执行失败:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '工具执行失败',
      execution_time: executionTime,
    }, { status: 500 });
  }
}

/**
 * GET /api/mcp/execute
 * 支持 GET 方式的工具调用（用于 search_knowledge 等）
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const { searchParams } = new URL(request.url);
  
  const tool = searchParams.get('tool');
  const paramsStr = searchParams.get('params');
  
  if (!tool) {
    return NextResponse.json({
      success: false,
      error: '缺少工具名称参数 tool',
      availableTools: Object.keys(TOOL_ROUTES).filter(t => TOOL_ROUTES[t].method === 'GET'),
    }, { status: 400 });
  }

  const route = TOOL_ROUTES[tool];
  if (!route || route.method !== 'GET') {
    return NextResponse.json({
      success: false,
      error: `工具 ${tool} 不存在或不支持 GET 方式`,
    }, { status: 404 });
  }

  try {
    const params = paramsStr ? JSON.parse(paramsStr) : {};
    const internalUrl = buildInternalUrl(route.endpoint, params, route.paramMapping);
    
    const response = await fetch(internalUrl, {
      headers: { 'X-MCP-Caller': 'true' },
    });
    const data = await response.json();

    return NextResponse.json({
      success: response.ok,
      tool,
      data: route.transformResponse ? route.transformResponse(data) : data,
      execution_time: Date.now() - startTime,
    });

  } catch (error) {
    console.error('[MCP Execute GET] 工具执行失败:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '工具执行失败',
      execution_time: Date.now() - startTime,
    }, { status: 500 });
  }
}
