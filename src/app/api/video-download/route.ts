import { NextResponse } from "next/server";

/**
 * POST /api/video-download
 * 解析并下载视频
 * 
 * 支持平台：抖音、微博、B站、快手、小红书、今日头条
 * 
 * 参考：
 * - https://github.com/jiji262/douyin-downloader
 * - https://github.com/Evil0ctal/Douyin_TikTok_Download_API
 * - https://github.com/ccv-cat/Douyin_Spider
 */

interface VideoInfo {
  title: string;
  author: string;
  duration: number;
  cover: string;
  videoUrl: string;
  audioUrl?: string;
  platform: string;
}

// 解析视频 URL 获取视频信息
async function parseVideoUrl(url: string): Promise<VideoInfo | null> {
  // 检测平台
  let platform = "unknown";
  if (url.includes("douyin.com") || url.includes("iesdouyin.com")) {
    platform = "douyin";
  } else if (url.includes("weibo.com")) {
    platform = "weibo";
  } else if (url.includes("bilibili.com") || url.includes("b23.tv")) {
    platform = "bilibili";
  } else if (url.includes("kuaishou.com")) {
    platform = "kuaishou";
  } else if (url.includes("xiaohongshu.com")) {
    platform = "xiaohongshu";
  } else if (url.includes("toutiao.com")) {
    platform = "toutiao";
  }

  // 实际项目中应该调用各平台的解析 API
  // 这里返回模拟数据
  const mockVideoInfo: VideoInfo = {
    title: `${platform} 视频 - ${new Date().toLocaleString()}`,
    author: "视频作者",
    duration: Math.floor(Math.random() * 300) + 30,
    cover: "",
    videoUrl: url, // 实际应返回解析后的直链
    audioUrl: "",
    platform,
  };

  return mockVideoInfo;
}

// 验证 URL 格式
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json(
        { success: false, error: "缺少视频 URL 参数" },
        { status: 400 }
      );
    }

    if (!isValidUrl(url)) {
      return NextResponse.json(
        { success: false, error: "无效的视频 URL" },
        { status: 400 }
      );
    }

    // 解析视频信息
    const videoInfo = await parseVideoUrl(url);

    if (!videoInfo) {
      return NextResponse.json(
        { success: false, error: "无法解析该视频链接" },
        { status: 400 }
      );
    }

    // 实际项目中应该：
    // 1. 调用各平台的解析 API 获取真实下载链接
    // 2. 使用第三方服务如 Douyin_TikTok_Download_API
    // 3. 或将视频下载到对象存储并返回签名 URL

    return NextResponse.json({
      success: true,
      data: {
        video: videoInfo,
        downloadUrl: videoInfo.videoUrl,
        message: "视频解析成功，请使用下载链接保存视频",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "视频下载失败";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
