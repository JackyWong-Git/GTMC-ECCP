import { NextResponse } from "next/server";
import {
  getDouyinStatus,
  getDouyinVideoList,
  getDouyinVideoData,
  getDouyinUserData,
} from "@/lib/douyin-client";

/**
 * GET /api/douyin/sync
 * 同步抖音视频数据
 */
export async function GET() {
  const status = getDouyinStatus();

  if (!status.connected) {
    return NextResponse.json(
      { error: "未登录抖音，请先在「系统设置」页面连接抖音账号" },
      { status: 401 }
    );
  }

  try {
    // 获取账号汇总数据
    const accountData = await getDouyinUserData();

    // 获取视频列表
    const videoList = await getDouyinVideoList(0, 20);

    // 获取视频详细数据
    const itemIds = videoList.list.map((v) => v.item_id);
    let videoDetails: Array<{
      item_id: string;
      title: string;
      create_time: number;
      statistics: {
        play_count: number;
        digg_count: number;
        comment_count: number;
        share_count: number;
        forward_count: number;
      };
    }> = [];

    if (itemIds.length > 0) {
      try {
        videoDetails = await getDouyinVideoData(itemIds);
      } catch {
        // 视频数据获取失败不影响整体同步
      }
    }

    // 合并数据
    const videos = videoList.list.map((video) => {
      const detail = videoDetails.find((d) => d.item_id === video.item_id);
      return {
        id: video.item_id,
        title: detail?.title || video.title || "无标题",
        platform: "抖音",
        publishDate: new Date(
          (detail?.create_time || video.create_time) * 1000
        )
          .toISOString()
          .split("T")[0],
        views: detail?.statistics?.play_count || 0,
        likes: detail?.statistics?.digg_count || 0,
        comments: detail?.statistics?.comment_count || 0,
        shares: detail?.statistics?.share_count || 0,
        cover: video.cover || "",
      };
    });

    // 计算汇总数据
    const totalViews = videos.reduce((sum, v) => sum + v.views, 0);
    const totalLikes = videos.reduce((sum, v) => sum + v.likes, 0);
    const totalComments = videos.reduce((sum, v) => sum + v.comments, 0);
    const totalShares = videos.reduce((sum, v) => sum + v.shares, 0);

    return NextResponse.json({
      success: true,
      data: {
        platform: "抖音",
        user: status.user,
        summary: {
          totalViews: accountData.total_play || totalViews,
          totalLikes: accountData.total_like || totalLikes,
          totalComments: accountData.total_comment || totalComments,
          totalShares: accountData.total_share || totalShares,
          avgPlayDuration: accountData.avg_play_duration,
          videoCount: videos.length,
        },
        videos,
        syncedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "同步失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
