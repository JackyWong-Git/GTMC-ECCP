import { NextRequest, NextResponse } from 'next/server';

// crawl-data-api 配置
const CRAWL_DATA_API_BASE = 'https://api.justoneapi.com/v1';

interface CrawlDataConfig {
  apiKey: string;
}

// 从配置文件读取 API Key
async function getConfig(): Promise<CrawlDataConfig | null> {
  try {
    const fs = await import('fs');
    const path = await import('path');
    const configPath = path.join(process.cwd(), '.platform-config.json');
    
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf-8');
      const config = JSON.parse(content);
      return {
        apiKey: config.crawlData?.apiKey || '',
      };
    }
  } catch (error) {
    console.error('Failed to read config:', error);
  }
  return null;
}

// 通用请求函数
async function fetchFromAPI(endpoint: string, params: Record<string, string>, apiKey: string) {
  const url = new URL(`${CRAWL_DATA_API_BASE}${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// GET: 获取各平台数据
export async function GET(request: NextRequest) {
  try {
    const config = await getConfig();
    if (!config?.apiKey) {
      return NextResponse.json(
        { error: 'crawl-data-api 未配置，请先在系统设置中配置 API Key' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform') || 'douyin';
    const action = searchParams.get('action') || 'search';
    const keyword = searchParams.get('keyword') || '';
    const userId = searchParams.get('userId') || '';
    const videoId = searchParams.get('videoId') || '';

    let result;

    switch (platform) {
      case 'douyin':
        if (action === 'search' && keyword) {
          result = await fetchFromAPI('/douyin/video-search-v4', { keyword }, config.apiKey);
        } else if (action === 'user' && userId) {
          result = await fetchFromAPI('/douyin/user-profile-v3', { user_id: userId }, config.apiKey);
        } else if (action === 'video' && videoId) {
          result = await fetchFromAPI('/douyin/video-details-v2', { video_id: videoId }, config.apiKey);
        } else if (action === 'comments' && videoId) {
          result = await fetchFromAPI('/douyin/video-comments-v1', { video_id: videoId }, config.apiKey);
        }
        break;

      case 'xiaohongshu':
        if (action === 'search' && keyword) {
          result = await fetchFromAPI('/xiaohongshu/note-search-v4', { keyword }, config.apiKey);
        } else if (action === 'hot') {
          result = await fetchFromAPI('/xiaohongshu/hot-search-v1', {}, config.apiKey);
        } else if (action === 'user' && userId) {
          result = await fetchFromAPI('/xiaohongshu/user-profile-v4', { user_id: userId }, config.apiKey);
        } else if (action === 'note' && videoId) {
          result = await fetchFromAPI('/xiaohongshu/note-details-v5', { note_id: videoId }, config.apiKey);
        }
        break;

      case 'weibo':
        if (action === 'search' && keyword) {
          result = await fetchFromAPI('/weibo/keyword-search-v2', { keyword }, config.apiKey);
        } else if (action === 'hot') {
          result = await fetchFromAPI('/weibo/hot-search-v1', {}, config.apiKey);
        } else if (action === 'user' && userId) {
          result = await fetchFromAPI('/weibo/user-profile-v3', { user_id: userId }, config.apiKey);
        }
        break;

      case 'bilibili':
        if (action === 'search' && keyword) {
          result = await fetchFromAPI('/bilibili/video-search-v2', { keyword }, config.apiKey);
        } else if (action === 'video' && videoId) {
          result = await fetchFromAPI('/bilibili/video-details-v2', { video_id: videoId }, config.apiKey);
        } else if (action === 'user' && userId) {
          result = await fetchFromAPI('/bilibili/user-profile-v2', { user_id: userId }, config.apiKey);
        }
        break;

      case 'tiktok':
        if (action === 'search' && keyword) {
          result = await fetchFromAPI('/tiktok/post-search-v1', { keyword }, config.apiKey);
        } else if (action === 'user' && userId) {
          result = await fetchFromAPI('/tiktok/user-profile-v1', { user_id: userId }, config.apiKey);
        }
        break;

      case 'youtube':
        if (action === 'search' && keyword) {
          result = await fetchFromAPI('/youtube/general-search-v1', { keyword }, config.apiKey);
        } else if (action === 'video' && videoId) {
          result = await fetchFromAPI('/youtube/video-details-v1', { video_id: videoId }, config.apiKey);
        }
        break;

      case 'instagram':
        if (action === 'user' && userId) {
          result = await fetchFromAPI('/instagram/user-profile-v1', { user_id: userId }, config.apiKey);
        } else if (action === 'post' && videoId) {
          result = await fetchFromAPI('/instagram/post-details-v1', { post_id: videoId }, config.apiKey);
        }
        break;

      default:
        return NextResponse.json(
          { error: `不支持的平台: ${platform}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: result,
      platform,
      action,
    });
  } catch (error) {
    console.error('Crawl data API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '数据获取失败' },
      { status: 500 }
    );
  }
}

// POST: 批量获取数据
export async function POST(request: NextRequest) {
  try {
    const config = await getConfig();
    if (!config?.apiKey) {
      return NextResponse.json(
        { error: 'crawl-data-api 未配置，请先在系统设置中配置 API Key' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { queries } = body;

    if (!Array.isArray(queries) || queries.length === 0) {
      return NextResponse.json(
        { error: '请提供查询列表' },
        { status: 400 }
      );
    }

    const results = await Promise.allSettled(
      queries.map(async (query: { platform: string; action: string; params: Record<string, string> }) => {
        const { platform, action, params } = query;
        let endpoint = '';
        
        switch (platform) {
          case 'douyin':
            endpoint = action === 'search' ? '/douyin/video-search-v4' : '/douyin/video-details-v2';
            break;
          case 'xiaohongshu':
            endpoint = action === 'search' ? '/xiaohongshu/note-search-v4' : '/xiaohongshu/note-details-v5';
            break;
          case 'weibo':
            endpoint = action === 'search' ? '/weibo/keyword-search-v2' : '/weibo/post-details-v1';
            break;
          case 'bilibili':
            endpoint = action === 'search' ? '/bilibili/video-search-v2' : '/bilibili/video-details-v2';
            break;
          default:
            throw new Error(`不支持的平台: ${platform}`);
        }

        const result = await fetchFromAPI(endpoint, params, config.apiKey);
        return { platform, action, result };
      })
    );

    const successful = results
      .filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof results[0] extends PromiseFulfilledResult<infer T> ? T : never>>> => r.status === 'fulfilled')
      .map(r => r.value);

    const failed = results
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .map(r => (r as PromiseRejectedResult).reason?.message || 'Unknown error');

    return NextResponse.json({
      success: true,
      data: {
        successful,
        failed,
        total: queries.length,
        successCount: successful.length,
        failCount: failed.length,
      },
    });
  } catch (error) {
    console.error('Crawl data API batch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '批量数据获取失败' },
      { status: 500 }
    );
  }
}
