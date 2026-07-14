/**
 * MCP Tools Registry
 * 
 * 将 ECCP 的核心能力暴露为 MCP 工具，供 AI 助手直接调用。
 * 
 * 架构：
 *   AI 助手 → MCP 协议 → /api/mcp/tools (列出工具)
 *                       → /api/mcp/execute (执行工具)
 *                       → 内部 API (knowledge, topics, scripts, analytics...)
 * 
 * 工具分类：
 *   - 眼睛（感知）：search_topics, get_trending, get_video_transcript
 *   - 脑子（分析）：analyze_topic, generate_script, generate_article
 *   - 手（执行）：save_to_knowledge, publish_content
 *   - 记忆（存储）：search_knowledge, list_knowledge
 */

import { NextResponse } from 'next/server';

export interface MCPTool {
  name: string;
  description: string;
  category: 'perception' | 'analysis' | 'execution' | 'memory';
  inputSchema: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
    }>;
    required?: string[];
  };
  endpoint: string;
  method: 'GET' | 'POST';
}

const MCP_TOOLS: MCPTool[] = [
  // ==================== 眼睛（感知）====================
  {
    name: 'search_topics',
    description: '搜索热点选题。支持从抖音热榜、微博热搜、行业报告等多渠道获取热门话题，返回结构化的选题列表。',
    category: 'perception',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '搜索关键词，如"新能源汽车"' },
        source: { type: 'string', description: '数据源', enum: ['douyin', 'weibo', 'all'] },
        limit: { type: 'number', description: '返回数量，默认10' },
      },
      required: ['query'],
    },
    endpoint: '/api/douyin-trending',
    method: 'GET',
  },
  {
    name: 'get_trending',
    description: '获取当前热榜数据。支持抖音热榜和微博热搜，返回实时热门话题列表。',
    category: 'perception',
    inputSchema: {
      type: 'object',
      properties: {
        platform: { type: 'string', description: '平台', enum: ['douyin', 'weibo'] },
        category: { type: 'string', description: '分类（抖音支持：汽车/科技/生活等）' },
      },
    },
    endpoint: '/api/douyin-trending',
    method: 'GET',
  },
  {
    name: 'get_video_transcript',
    description: '获取视频的文字内容。输入视频链接（支持抖音分享链接），自动下载、提取音频并转为文字。用于学习竞品内容。',
    category: 'perception',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: '视频链接（支持抖音分享链接、直链）' },
      },
      required: ['url'],
    },
    endpoint: '/api/video-transcript',
    method: 'POST',
  },
  {
    name: 'get_douyin_comments',
    description: '获取抖音视频的评论数据。支持情感分析，用于了解用户对某个话题的真实反馈。',
    category: 'perception',
    inputSchema: {
      type: 'object',
      properties: {
        video_id: { type: 'string', description: '抖音视频ID或分享链接' },
        limit: { type: 'number', description: '评论数量，默认50' },
        analyze_sentiment: { type: 'boolean', description: '是否进行情感分析' },
      },
      required: ['video_id'],
    },
    endpoint: '/api/douyin-comments',
    method: 'POST',
  },
  {
    name: 'crawl_web_data',
    description: '从多个平台采集公开数据。支持抖音、微博、B站、小红书、知乎等20+平台。',
    category: 'perception',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: '目标页面URL' },
        platform: { type: 'string', description: '平台名称' },
        data_type: { type: 'string', description: '数据类型', enum: ['video', 'article', 'comments', 'profile'] },
      },
      required: ['url'],
    },
    endpoint: '/api/crawl-data',
    method: 'POST',
  },

  // ==================== 脑子（分析）====================
  {
    name: 'analyze_topic',
    description: '深度分析选题的热度、受众画像和内容价值。返回多维度评分和优化建议。',
    category: 'analysis',
    inputSchema: {
      type: 'object',
      properties: {
        topic: { type: 'string', description: '选题内容' },
        platform: { type: 'string', description: '目标平台', enum: ['douyin', 'weibo', 'bilibili', 'wechat'] },
      },
      required: ['topic'],
    },
    endpoint: '/api/topic-analysis',
    method: 'POST',
  },
  {
    name: 'generate_script',
    description: '根据选题生成视频脚本。支持口播脚本、分镜脚本、多平台适配脚本。流式输出。',
    category: 'analysis',
    inputSchema: {
      type: 'object',
      properties: {
        topic: { type: 'string', description: '选题或主题' },
        style: { type: 'string', description: '脚本风格', enum: ['口播', '分镜', '故事', '教程'] },
        duration: { type: 'string', description: '目标时长', enum: ['30s', '60s', '90s', '3min'] },
        platform: { type: 'string', description: '目标平台', enum: ['douyin', 'wechat', 'bilibili'] },
      },
      required: ['topic'],
    },
    endpoint: '/api/generate-script',
    method: 'POST',
  },
  {
    name: 'generate_article',
    description: '根据选题生成长文/公众号文章。支持多种写作风格和结构。流式输出。',
    category: 'analysis',
    inputSchema: {
      type: 'object',
      properties: {
        topic: { type: 'string', description: '文章主题' },
        style: { type: 'string', description: '写作风格', enum: ['专业', '轻松', '故事', '观点'] },
        length: { type: 'string', description: '文章长度', enum: ['short', 'medium', 'long'] },
      },
      required: ['topic'],
    },
    endpoint: '/api/generate-article',
    method: 'POST',
  },
  {
    name: 'analyze_sentiment',
    description: '对文本内容进行情感分析。支持正面/负面/中性分类，可用于评论分析、舆情监控。',
    category: 'analysis',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: '待分析的文本内容' },
        batch: { type: 'boolean', description: '是否批量分析（text为JSON数组）' },
      },
      required: ['text'],
    },
    endpoint: '/api/sentiment-analysis',
    method: 'POST',
  },

  // ==================== 手（执行）====================
  {
    name: 'save_to_knowledge',
    description: '将内容保存到知识库。支持文本、URL、脚本等多种内容类型。自动进行向量化索引。',
    category: 'execution',
    inputSchema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: '要保存的内容' },
        title: { type: 'string', description: '文档标题' },
        category: { type: 'string', description: '分类', enum: ['选题', '脚本', '文章', '数据', '素材', '通知', '其他'] },
        url: { type: 'string', description: '如果是URL类型，提供链接' },
      },
      required: ['content'],
    },
    endpoint: '/api/knowledge',
    method: 'POST',
  },
  {
    name: 'run_workflow',
    description: '执行预设的工作流。支持视频脚本生成、选题评估、数据周报等多种模板。',
    category: 'execution',
    inputSchema: {
      type: 'object',
      properties: {
        workflow_id: { type: 'string', description: '工作流ID' },
        input: { type: 'string', description: '输入内容' },
      },
      required: ['workflow_id', 'input'],
    },
    endpoint: '/api/workflows/run',
    method: 'POST',
  },

  // ==================== 记忆（存储）====================
  {
    name: 'search_knowledge',
    description: '语义搜索知识库。基于向量相似度检索，返回最相关的文档片段。',
    category: 'memory',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '搜索关键词' },
        top_k: { type: 'number', description: '返回结果数量，默认10' },
      },
      required: ['query'],
    },
    endpoint: '/api/knowledge',
    method: 'GET',
  },
  {
    name: 'get_analytics_summary',
    description: '获取运营数据的AI摘要。自动分析播放量、点赞、评论等指标，生成周报。',
    category: 'memory',
    inputSchema: {
      type: 'object',
      properties: {
        period: { type: 'string', description: '时间范围', enum: ['week', 'month', 'quarter'] },
        metrics: { type: 'string', description: '关注的指标（逗号分隔）' },
      },
    },
    endpoint: '/api/data-summary',
    method: 'POST',
  },
];

/**
 * GET /api/mcp/tools
 * 列出所有可用的 MCP 工具
 */
export async function GET() {
  // 按分类组织工具
  const toolsByCategory = {
    perception: MCP_TOOLS.filter(t => t.category === 'perception'),
    analysis: MCP_TOOLS.filter(t => t.category === 'analysis'),
    execution: MCP_TOOLS.filter(t => t.category === 'execution'),
    memory: MCP_TOOLS.filter(t => t.category === 'memory'),
  };

  return NextResponse.json({
    success: true,
    data: {
      tools: MCP_TOOLS.map(t => ({
        name: t.name,
        description: t.description,
        category: t.category,
        inputSchema: t.inputSchema,
      })),
      toolsByCategory,
      total: MCP_TOOLS.length,
      version: '1.0.0',
      protocol: 'mcp',
    },
  });
}
