/**
 * MCP (Model Context Protocol) Server
 * 
 * 将 ECCP 的后台能力暴露为 MCP 工具，让 AI 助手可以直接调用：
 * - 数据采集（眼睛）：抖音热搜、微博热搜、视频文案、评论采集
 * - 分析决策（大脑）：选题评估、深度研究、情感分析
 * - 执行输出（手）：知识库写入、脚本生成、内容发布
 * - 记忆存储（记忆）：知识库搜索、归档、分类
 */

import { KnowledgeClient, Config, LLMClient, DataSourceType } from 'coze-coding-dev-sdk';
import { setupLLMEnv, DEFAULT_KNOWLEDGE_DATASET } from '@/lib/platform-config';

// Message type for LLM calls
interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// ==================== MCP Tool 定义 ====================

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
}

export interface MCPToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

// ==================== 工具注册表 ====================

export const MCP_TOOLS: MCPTool[] = [
  // === 感知层（眼睛）===
  {
    name: 'search_douyin_trending',
    description: '获取抖音热搜榜数据，包括热搜词、热度值、视频数量。用于发现当前热点话题。',
    category: 'perception',
    inputSchema: {
      type: 'object',
      properties: {
        keyword: { type: 'string', description: '可选的搜索关键词，用于过滤相关话题' },
        limit: { type: 'string', description: '返回条数，默认 20' },
      },
    },
  },
  {
    name: 'search_weibo_trending',
    description: '获取微博热搜榜数据，包括话题排名、热度值、分类标签。用于追踪社交媒体热点。',
    category: 'perception',
    inputSchema: {
      type: 'object',
      properties: {
        category: { type: 'string', description: '分类过滤', enum: ['all', 'entertainment', 'tech', 'sports', 'finance'] },
      },
    },
  },
  {
    name: 'extract_video_transcript',
    description: '从视频 URL 提取口播文案。支持抖音、B站等平台。将视频转为可编辑的文字内容。',
    category: 'perception',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: '视频链接（支持抖音分享链接、B站链接等）' },
      },
      required: ['url'],
    },
  },
  {
    name: 'collect_douyin_comments',
    description: '采集抖音视频评论区数据，包括评论内容、点赞数、情感倾向分析。用于了解用户真实反馈。',
    category: 'perception',
    inputSchema: {
      type: 'object',
      properties: {
        video_url: { type: 'string', description: '抖音视频链接或分享链接' },
        limit: { type: 'string', description: '采集条数，默认 50' },
        sentiment: { type: 'string', description: '是否开启情感分析', enum: ['true', 'false'] },
      },
      required: ['video_url'],
    },
  },
  {
    name: 'crawl_platform_data',
    description: '从 20+ 平台采集数据（抖音/微博/B站/小红书/知乎等）。支持热搜、用户信息、内容详情。',
    category: 'perception',
    inputSchema: {
      type: 'object',
      properties: {
        platform: { type: 'string', description: '目标平台', enum: ['douyin', 'weibo', 'bilibili', 'xiaohongshu', 'zhihu', 'kuaishou'] },
        action: { type: 'string', description: '采集动作', enum: ['trending', 'user_info', 'video_detail', 'search'] },
        query: { type: 'string', description: '搜索关键词或目标 ID' },
      },
      required: ['platform', 'action'],
    },
  },

  // === 分析层（大脑）===
  {
    name: 'analyze_topic',
    description: '对选题进行多维度热度评估，返回评分、趋势分析和竞品对比。帮助判断选题价值。',
    category: 'analysis',
    inputSchema: {
      type: 'object',
      properties: {
        topic: { type: 'string', description: '要分析的选题关键词或话题' },
        depth: { type: 'string', description: '分析深度', enum: ['quick', 'standard', 'deep'] },
      },
      required: ['topic'],
    },
  },
  {
    name: 'sentiment_analysis',
    description: '对文本内容进行情感分析，识别正面/负面/中性情绪及关键情感触发点。',
    category: 'analysis',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: '要分析的文本内容' },
        context: { type: 'string', description: '分析上下文（如"评论区"、"文章"）' },
      },
      required: ['text'],
    },
  },

  // === 执行层（手）===
  {
    name: 'generate_script',
    description: '根据选题生成完整的视频脚本，包括口播文案、分镜建议、标题备选。支持多种风格。',
    category: 'execution',
    inputSchema: {
      type: 'object',
      properties: {
        topic: { type: 'string', description: '选题或话题' },
        style: { type: 'string', description: '脚本风格', enum: ['informative', 'storytelling', 'humorous', 'professional'] },
        platform: { type: 'string', description: '目标平台', enum: ['douyin', 'bilibili', 'weixin', 'general'] },
        duration: { type: 'string', description: '目标时长（秒）' },
      },
      required: ['topic'],
    },
  },
  {
    name: 'generate_article',
    description: '根据选题生成长文内容（公众号文章、知乎回答等），支持多种文体和篇幅。',
    category: 'execution',
    inputSchema: {
      type: 'object',
      properties: {
        topic: { type: 'string', description: '选题或话题' },
        style: { type: 'string', description: '文章风格', enum: ['professional', 'casual', 'academic', 'storytelling'] },
        length: { type: 'string', description: '目标字数' },
      },
      required: ['topic'],
    },
  },

  // === 记忆层（记忆）===
  {
    name: 'save_to_knowledge',
    description: '将内容保存到知识库，支持文本、URL、结构化数据。自动分类和标签。',
    category: 'memory',
    inputSchema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: '要保存的内容' },
        title: { type: 'string', description: '文档标题' },
        category: { type: 'string', description: '分类', enum: ['topic', 'script', 'article', 'data', 'reference', 'note'] },
        source_url: { type: 'string', description: '来源 URL（可选）' },
      },
      required: ['content'],
    },
  },
  {
    name: 'search_knowledge',
    description: '在知识库中语义搜索，找到相关文档和历史内容。用于避免重复创作和查找参考资料。',
    category: 'memory',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '搜索关键词' },
        top_k: { type: 'string', description: '返回条数，默认 5' },
      },
      required: ['query'],
    },
  },
];

// ==================== 工具执行器 ====================

export class MCPExecutor {
  /**
   * 执行 MCP 工具
   */
  async execute(toolName: string, params: Record<string, string>): Promise<MCPToolResult> {
    const tool = MCP_TOOLS.find(t => t.name === toolName);
    if (!tool) {
      return { success: false, error: `Unknown tool: ${toolName}` };
    }

    try {
      switch (toolName) {
        case 'search_douyin_trending':
          return await this.executeDouyinTrending(params);
        case 'search_weibo_trending':
          return await this.executeWeiboTrending(params);
        case 'extract_video_transcript':
          return await this.executeVideoTranscript(params);
        case 'collect_douyin_comments':
          return await this.executeDouyinComments(params);
        case 'crawl_platform_data':
          return await this.executeCrawlData(params);
        case 'analyze_topic':
          return await this.executeAnalyzeTopic(params);
        case 'sentiment_analysis':
          return await this.executeSentimentAnalysis(params);
        case 'generate_script':
          return await this.executeGenerateScript(params);
        case 'generate_article':
          return await this.executeGenerateArticle(params);
        case 'save_to_knowledge':
          return await this.executeSaveToKnowledge(params);
        case 'search_knowledge':
          return await this.executeSearchKnowledge(params);
        default:
          return { success: false, error: `Tool not implemented: ${toolName}` };
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error(`[MCP] Tool ${toolName} failed:`, errMsg);
      return { success: false, error: errMsg };
    }
  }

  // === 感知层实现 ===

  private async executeDouyinTrending(params: Record<string, string>): Promise<MCPToolResult> {
    const baseUrl = process.env.COZE_PROJECT_DOMAIN_DEFAULT
      ? `https://${process.env.COZE_PROJECT_DOMAIN_DEFAULT}`
      : 'http://localhost:5000';
    
    const url = new URL(`${baseUrl}/api/douyin-trending`);
    if (params.keyword) url.searchParams.set('keyword', params.keyword);
    if (params.limit) url.searchParams.set('limit', params.limit);

    const response = await fetch(url.toString());
    const data = await response.json();
    return { success: true, data };
  }

  private async executeWeiboTrending(params: Record<string, string>): Promise<MCPToolResult> {
    const baseUrl = process.env.COZE_PROJECT_DOMAIN_DEFAULT
      ? `https://${process.env.COZE_PROJECT_DOMAIN_DEFAULT}`
      : 'http://localhost:5000';
    
    const url = new URL(`${baseUrl}/api/weibo-trending`);
    if (params.category && params.category !== 'all') {
      url.searchParams.set('category', params.category);
    }

    const response = await fetch(url.toString());
    const data = await response.json();
    return { success: true, data };
  }

  private async executeVideoTranscript(params: Record<string, string>): Promise<MCPToolResult> {
    const baseUrl = process.env.COZE_PROJECT_DOMAIN_DEFAULT
      ? `https://${process.env.COZE_PROJECT_DOMAIN_DEFAULT}`
      : 'http://localhost:5000';

    const response = await fetch(`${baseUrl}/api/video-transcript`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: params.url }),
    });
    const data = await response.json();
    return { success: response.ok, data, error: data.error };
  }

  private async executeDouyinComments(params: Record<string, string>): Promise<MCPToolResult> {
    const baseUrl = process.env.COZE_PROJECT_DOMAIN_DEFAULT
      ? `https://${process.env.COZE_PROJECT_DOMAIN_DEFAULT}`
      : 'http://localhost:5000';

    const response = await fetch(`${baseUrl}/api/douyin-comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        videoUrl: params.video_url,
        limit: parseInt(params.limit || '50', 10),
        sentiment: params.sentiment !== 'false',
      }),
    });
    const data = await response.json();
    return { success: response.ok, data, error: data.error };
  }

  private async executeCrawlData(params: Record<string, string>): Promise<MCPToolResult> {
    const baseUrl = process.env.COZE_PROJECT_DOMAIN_DEFAULT
      ? `https://${process.env.COZE_PROJECT_DOMAIN_DEFAULT}`
      : 'http://localhost:5000';

    const response = await fetch(`${baseUrl}/api/crawl-data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platform: params.platform,
        action: params.action,
        query: params.query,
      }),
    });
    const data = await response.json();
    return { success: response.ok, data, error: data.error };
  }

  // === 分析层实现 ===

  private async executeAnalyzeTopic(params: Record<string, string>): Promise<MCPToolResult> {
    setupLLMEnv();
    
    const client = new LLMClient(new Config());
    const depth = params.depth || 'standard';
    
    const prompt = depth === 'deep'
      ? `请对选题"${params.topic}"进行深度分析：
1. 热度趋势（近7天变化）
2. 受众画像（年龄/兴趣/痛点）
3. 竞品内容分析（至少5个）
4. 差异化切入角度（至少3个）
5. 内容价值评分（1-10分及理由）
6. 风险提示`
      : `请对选题"${params.topic}"进行快速评估：
1. 当前热度（1-10分）
2. 目标受众
3. 内容建议（1-2句话）`;

    const result = await client.invoke(
      [{ role: 'user' as const, content: prompt }],
      { model: 'doubao-seed-2-0-lite-260215', temperature: 0.3 }
    );

    return {
      success: true,
      data: {
        topic: params.topic,
        depth,
        analysis: result.content || '分析完成',
      },
    };
  }

  private async executeSentimentAnalysis(params: Record<string, string>): Promise<MCPToolResult> {
    setupLLMEnv();
    
    const client = new LLMClient(new Config());
    const result = await client.invoke(
      [{ role: 'user' as const, content: `请对以下${params.context || '文本'}进行情感分析：

${params.text}

输出格式：
1. 整体情感倾向：正面/负面/中性
2. 情感强度：1-10
3. 关键情感词：列出 3-5 个
4. 情感触发点：什么内容引发了这种情感` }],
      { model: 'doubao-seed-2-0-lite-260215', temperature: 0.2 }
    );

    return {
      success: true,
      data: {
        analysis: result.content || '分析完成',
      },
    };
  }

  // === 执行层实现 ===

  private async executeGenerateScript(params: Record<string, string>): Promise<MCPToolResult> {
    setupLLMEnv();
    
    const client = new LLMClient(new Config());
    const style = params.style || 'informative';
    const platform = params.platform || 'douyin';
    const duration = params.duration || '60';

    const styleMap: Record<string, string> = {
      informative: '知识科普风格，信息密度高，用数据说话',
      storytelling: '故事叙事风格，有情节起伏，引人入胜',
      humorous: '轻松幽默风格，段子穿插，娱乐性强',
      professional: '专业权威风格，行业术语，深度分析',
    };

    const platformMap: Record<string, string> = {
      douyin: '抖音短视频，开头3秒强钩子，节奏快',
      bilibili: 'B站中长视频，可以深入展开，互动感强',
      weixin: '微信视频号，偏正式，适合知识分享',
      general: '通用脚本，不限平台',
    };

    const result = await client.invoke(
      [{ role: 'user' as const, content: `请为选题"${params.topic}"生成一段${duration}秒的视频脚本。

风格要求：${styleMap[style] || styleMap.informative}
平台特点：${platformMap[platform] || platformMap.general}

输出格式：
## 标题备选（3个）
1. ...
2. ...
3. ...

## 口播脚本
[开头钩子 - 3秒]
...

[正文 - 主体内容]
...

[结尾 - CTA]
...

## 分镜建议
| 时间 | 画面 | 备注 |
|------|------|------|` }],
      { model: 'qwen-3-5-plus-260215', temperature: 0.9 }
    );

    return {
      success: true,
      data: {
        topic: params.topic,
        style,
        platform,
        script: result.content || '脚本生成完成',
      },
    };
  }

  private async executeGenerateArticle(params: Record<string, string>): Promise<MCPToolResult> {
    setupLLMEnv();
    
    const client = new LLMClient(new Config());
    const style = params.style || 'professional';
    const length = params.length || '1500';

    const result = await client.invoke(
      [{ role: 'user' as const, content: `请为选题"${params.topic}"生成一篇${length}字的文章。

风格：${style === 'professional' ? '专业严谨' : style === 'casual' ? '轻松随意' : style === 'academic' ? '学术深度' : '故事叙事'}

输出格式：
# 标题

## 导语
（100字内，抓住核心）

## 正文
（分 3-5 个小节，每节有论点+论据+案例）

## 结语
（总结+行动号召）` }],
      { model: 'qwen-3-5-plus-260215', temperature: 0.8 }
    );

    return {
      success: true,
      data: {
        topic: params.topic,
        style,
        article: result.content || '文章生成完成',
      },
    };
  }

  // === 记忆层实现 ===

  private async executeSaveToKnowledge(params: Record<string, string>): Promise<MCPToolResult> {
    setupLLMEnv();
    
    const config = new Config();
    const client = new KnowledgeClient(config);

    const title = params.title || `MCP-${Date.now()}`;
    const category = params.category || 'note';

    const contentWithMeta = `[分类: ${category}]\n[来源: ${params.source_url || 'MCP工具'}]\n[时间: ${new Date().toISOString()}]\n\n${params.content}`;

    const documents = [{ source: DataSourceType.TEXT, raw_data: contentWithMeta }];
    const response = await client.addDocuments(documents, DEFAULT_KNOWLEDGE_DATASET, {
      separator: '\n\n',
      max_tokens: 2000,
      remove_extra_spaces: true,
      remove_urls_emails: false,
    });

    return {
      success: response.code === 0,
      data: {
        docIds: response.doc_ids || [],
        title,
        category,
      },
      error: response.code !== 0 ? response.msg : undefined,
    };
  }

  private async executeSearchKnowledge(params: Record<string, string>): Promise<MCPToolResult> {
    setupLLMEnv();
    
    const config = new Config();
    const client = new KnowledgeClient(config);
    const topK = parseInt(params.top_k || '5', 10);

    const response = await client.search(params.query, undefined, topK, 0.0);

    return {
      success: response.code === 0,
      data: {
        results: (response.chunks || []).map((chunk: { content: string; score: number; doc_id?: string }) => ({
          content: chunk.content,
          score: chunk.score,
          docId: chunk.doc_id || '',
        })),
        total: response.chunks?.length || 0,
      },
      error: response.code !== 0 ? response.msg : undefined,
    };
  }
}

// ==================== 工具分类查询 ====================

export function getToolsByCategory(category: MCPTool['category']): MCPTool[] {
  return MCP_TOOLS.filter(t => t.category === category);
}

export function getAllTools(): MCPTool[] {
  return MCP_TOOLS;
}

export function getToolByName(name: string): MCPTool | undefined {
  return MCP_TOOLS.find(t => t.name === name);
}
