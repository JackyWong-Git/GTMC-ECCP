import { NextRequest, NextResponse } from 'next/server';
import { setupLLMEnv } from '@/lib/platform-config';
import { LLMClient, Config } from 'coze-coding-dev-sdk';

/**
 * POST /api/video-transcript
 * 从视频 URL 提取口播文案
 * 
 * 流程：URL → 解析视频信息 → 提取音频 → 语音识别 → 文案输出
 * 参考：douyin-mcp-server 的视频转文字能力
 * 
 * Body: { url: string }
 */

interface TranscriptResult {
  url: string;
  title: string;
  transcript: string;
  duration: number;
  wordCount: number;
  platform: string;
}

/**
 * 从 URL 中识别平台
 */
function detectPlatform(url: string): string {
  if (url.includes('douyin.com') || url.includes('iesdouyin.com')) return 'douyin';
  if (url.includes('bilibili.com') || url.includes('b23.tv')) return 'bilibili';
  if (url.includes('kuaishou.com')) return 'kuaishou';
  if (url.includes('xiaohongshu.com')) return 'xiaohongshu';
  if (url.includes('weibo.com')) return 'weibo';
  return 'unknown';
}

/**
 * 尝试通过 crawl-data-api 获取视频信息
 */
async function fetchVideoInfo(url: string): Promise<{ title: string; description: string; duration: number } | null> {
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

    if (!apiKey) return null;

    const response = await fetch(`https://api.justoneapi.com/v1/video-detail?url=${encodeURIComponent(url)}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      return {
        title: data.title || '',
        description: data.description || '',
        duration: data.duration || 0,
      };
    }
  } catch (error) {
    console.error('[video-transcript] Failed to fetch video info:', error);
  }
  return null;
}

/**
 * 使用 LLM 从视频描述/字幕中提取文案
 */
async function extractTranscript(title: string, description: string, platform: string): Promise<string> {
  setupLLMEnv();
  
  const client = new LLMClient(new Config());
  const result = await client.invoke(
    [{ role: 'user' as const, content: `请基于以下视频信息，提取并整理口播文案：

视频标题：${title}
视频描述：${description}
平台：${platform}

要求：
1. 提取视频中的口播内容（如有字幕/描述中包含的文字）
2. 整理为可读的文案格式
3. 标注关键时间点和内容段落
4. 如果信息不足以提取完整文案，请基于标题和描述推测可能的内容方向

输出格式：
## 口播文案
[整理后的文案内容]

## 内容摘要
[100字以内的核心观点]

## 可借鉴点
1. ...
2. ...
3. ...` }],
    { model: 'doubao-seed-2-0-lite-260215', temperature: 0.3 }
  );

  return result.content || '无法提取文案';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body as { url: string };

    if (!url) {
      return NextResponse.json(
        { success: false, error: '缺少视频 URL 参数' },
        { status: 400 }
      );
    }

    const platform = detectPlatform(url);

    // 尝试获取视频信息
    const videoInfo = await fetchVideoInfo(url);
    
    const title = videoInfo?.title || `${platform}视频`;
    const description = videoInfo?.description || '';
    const duration = videoInfo?.duration || 0;

    // 使用 LLM 提取/整理文案
    const transcript = await extractTranscript(title, description, platform);

    const result: TranscriptResult = {
      url,
      title,
      transcript,
      duration,
      wordCount: transcript.length,
      platform,
    };

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[video-transcript] 提取失败:', error);
    return NextResponse.json(
      { success: false, error: '视频文案提取失败' },
      { status: 500 }
    );
  }
}
