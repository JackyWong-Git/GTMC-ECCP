import { NextRequest, NextResponse } from 'next/server';
import { setupLLMEnv } from '@/lib/platform-config';
import { LLMClient, Config } from 'coze-coding-dev-sdk';

/**
 * POST /api/douyin-comments
 * 采集抖音视频评论区数据 + 情感分析
 * 
 * 参考：douyin-api-1 的评论接口 + douyin-mcp-server 的数据采集模式
 * 
 * Body: { videoUrl: string, limit?: number, sentiment?: boolean }
 */

interface Comment {
  id: string;
  content: string;
  author: string;
  likes: number;
  time: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  sentimentScore?: number;
}

interface CommentAnalysis {
  total: number;
  positive: number;
  negative: number;
  neutral: number;
  topKeywords: string[];
  summary: string;
}

/**
 * 从分享链接中提取视频 ID
 */
function extractVideoId(url: string): string {
  // 抖音分享链接格式：https://v.douyin.com/xxxxx/
  // 完整链接格式：https://www.douyin.com/video/7xxxxxxxxxxxx
  const match = url.match(/video\/(\d+)/);
  if (match) return match[1];
  
  // 短链接需要先解析
  const shortMatch = url.match(/douyin\.com\/([a-zA-Z0-9]+)/);
  return shortMatch?.[1] || '';
}

/**
 * 通过 crawl-data-api 采集评论
 */
async function fetchCommentsFromAPI(videoId: string, limit: number): Promise<Comment[]> {
  try {
    const fs = await import('fs');
    const path = await import('path');
    const configPath = path.join(process.cwd(), '.platform-config.json');
    
    let apiKey = '';
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf-8');
      const config = JSON.parse(content);
      apiKey = config.crawlData?.apiKey || '';
    }

    if (!apiKey) return [];

    const response = await fetch(
      `https://api.justoneapi.com/v1/douyin-comments?video_id=${videoId}&count=${limit}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      return (data.comments || []).map((c: {
        cid?: string;
        text?: string;
        user?: { nickname?: string };
        digg_count?: number;
        create_time?: number;
      }, idx: number) => ({
        id: c.cid || String(idx),
        content: c.text || '',
        author: c.user?.nickname || '匿名用户',
        likes: c.digg_count || 0,
        time: c.create_time ? new Date(c.create_time * 1000).toISOString() : new Date().toISOString(),
      }));
    }
  } catch (error) {
    console.error('[douyin-comments] API fetch failed:', error);
  }
  return [];
}

/**
 * 使用 LLM 进行情感分析
 */
async function analyzeSentiment(comments: Comment[]): Promise<{
  comments: Comment[];
  analysis: CommentAnalysis;
}> {
  setupLLMEnv();
  
  const client = new LLMClient(new Config());
  
  const commentTexts = comments.map(c => c.content).join('\n');
  
  const result = await client.invoke(
    [{ role: 'user' as const, content: `请对以下抖音评论进行情感分析：

评论内容：
${commentTexts}

请输出 JSON 格式：
{
  "sentiments": [
    { "index": 0, "sentiment": "positive/negative/neutral", "score": 0.8 }
  ],
  "topKeywords": ["关键词1", "关键词2", "关键词3", "关键词4", "关键词5"],
  "summary": "整体评论氛围总结（50字内）"
}` }],
    { model: 'doubao-seed-2-0-lite-260215', temperature: 0.2 }
  );

  const content = result.content || '{}';
  
  try {
    // 尝试解析 JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    
    // 将情感标签合并回评论
    const sentiments = parsed.sentiments || [];
    const enrichedComments = comments.map((c, idx) => {
      const s = sentiments.find((si: { index: number }) => si.index === idx);
      return {
        ...c,
        sentiment: s?.sentiment || 'neutral',
        sentimentScore: s?.score || 0.5,
      } as Comment;
    });

    const positive = enrichedComments.filter(c => c.sentiment === 'positive').length;
    const negative = enrichedComments.filter(c => c.sentiment === 'negative').length;
    const neutral = enrichedComments.filter(c => c.sentiment === 'neutral').length;

    return {
      comments: enrichedComments,
      analysis: {
        total: enrichedComments.length,
        positive,
        negative,
        neutral,
        topKeywords: parsed.topKeywords || [],
        summary: parsed.summary || '评论分析完成',
      },
    };
  } catch {
    // JSON 解析失败，返回原始数据
    return {
      comments,
      analysis: {
        total: comments.length,
        positive: 0,
        negative: 0,
        neutral: comments.length,
        topKeywords: [],
        summary: '情感分析解析失败，仅返回原始评论',
      },
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { videoUrl, limit = 50, sentiment = true } = body as {
      videoUrl: string;
      limit?: number;
      sentiment?: boolean;
    };

    if (!videoUrl) {
      return NextResponse.json(
        { success: false, error: '缺少视频链接参数' },
        { status: 400 }
      );
    }

    const videoId = extractVideoId(videoUrl);
    
    // 采集评论
    let comments = await fetchCommentsFromAPI(videoId, limit);
    
    // 如果 API 采集失败，返回提示
    if (comments.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          videoUrl,
          videoId,
          comments: [],
          analysis: {
            total: 0,
            positive: 0,
            negative: 0,
            neutral: 0,
            topKeywords: [],
            summary: '未采集到评论数据。请确认：1) 视频链接正确 2) crawl-data-api 已配置 3) 视频有公开评论',
          },
          message: '评论采集需要配置 crawl-data-api Key，请在系统设置中配置。',
        },
      });
    }

    // 情感分析
    let analysis: CommentAnalysis;
    if (sentiment && comments.length > 0) {
      const result = await analyzeSentiment(comments);
      comments = result.comments;
      analysis = result.analysis;
    } else {
      analysis = {
        total: comments.length,
        positive: 0,
        negative: 0,
        neutral: comments.length,
        topKeywords: [],
        summary: '未开启情感分析',
      };
    }

    return NextResponse.json({
      success: true,
      data: {
        videoUrl,
        videoId,
        comments,
        analysis,
      },
    });
  } catch (error) {
    console.error('[douyin-comments] 采集失败:', error);
    return NextResponse.json(
      { success: false, error: '评论采集失败' },
      { status: 500 }
    );
  }
}
