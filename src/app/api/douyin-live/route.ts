import { NextResponse } from "next/server";

/**
 * GET /api/douyin-live
 * 获取抖音直播间数据和弹幕
 * 
 * 参考：
 * - https://github.com/saermart/DouyinLiveWebFetcher
 * - https://github.com/ape-byte/DouyinBarrageGrab
 */

interface LiveInfo {
  roomId: string;
  title: string;
  viewerCount: number;
  likeCount: number;
  startTime: string;
  status: "live" | "ended" | "scheduled";
  anchor: {
    nickname: string;
    avatar: string;
    followerCount: number;
  };
}

interface Barrage {
  id: string;
  content: string;
  timestamp: number;
  userId: string;
  userName: string;
  type: "normal" | "gift" | "enter";
  giftInfo?: {
    name: string;
    count: number;
  };
}

// 模拟直播数据（实际应通过 WebSocket 或 API 获取）
function generateMockLiveData(roomId: string): { live: LiveInfo; barrages: Barrage[] } {
  const isLive = Math.random() > 0.3;
  
  const live: LiveInfo = {
    roomId,
    title: `直播间 ${roomId} - 精彩内容进行中`,
    viewerCount: isLive ? Math.floor(Math.random() * 50000) + 1000 : 0,
    likeCount: isLive ? Math.floor(Math.random() * 100000) + 5000 : 0,
    startTime: new Date(Date.now() - Math.random() * 3600000).toISOString(),
    status: isLive ? "live" : "ended",
    anchor: {
      nickname: "主播小助手",
      avatar: "",
      followerCount: Math.floor(Math.random() * 1000000) + 100000,
    },
  };

  const mockUserNames = [
    "快乐小鱼", "阳光少年", "追风少年", "小确幸", "大白鲨",
    "星空漫步", "海边吹风", "山顶看日出", "夜空中最亮的星", "小太阳",
    "爱笑的眼睛", "快乐星球", "梦想家", "小可爱", "大魔王"
  ];

  const mockContents = [
    "主播好！", "666", "太厉害了", "加油！", "支持主播",
    "这个真不错", "学到了", "哈哈哈", "求链接", "已关注",
    "第一次来", "老粉报到", "主播辛苦了", "爱了爱了", "太强了",
    "什么时候开播的", "今天播多久", "下次什么时候播", "求回放", "点赞"
  ];

  const mockGifts = ["小心心", "棒棒糖", "鲜花", "火箭", "嘉年华", "飞机"];

  const barrages: Barrage[] = Array.from({ length: 30 }, (_, i) => {
    const type: "normal" | "gift" | "enter" = Math.random() > 0.8 ? "gift" : Math.random() > 0.9 ? "enter" : "normal";
    const userName = mockUserNames[Math.floor(Math.random() * mockUserNames.length)];
    
    return {
      id: `barrage_${Date.now()}_${i}`,
      content: type === "gift" 
        ? `送出了 ${mockGifts[Math.floor(Math.random() * mockGifts.length)]}`
        : type === "enter"
        ? "进入了直播间"
        : mockContents[Math.floor(Math.random() * mockContents.length)],
      timestamp: Date.now() - Math.floor(Math.random() * 60000),
      userId: `user_${Math.floor(Math.random() * 100000)}`,
      userName,
      type,
      giftInfo: type === "gift" ? {
        name: mockGifts[Math.floor(Math.random() * mockGifts.length)],
        count: Math.floor(Math.random() * 10) + 1,
      } : undefined,
    };
  }).sort((a, b) => b.timestamp - a.timestamp);

  return { live, barrages };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const roomId = searchParams.get("roomId");

  if (!roomId) {
    return NextResponse.json(
      { error: "缺少直播间 ID 参数" },
      { status: 400 }
    );
  }

  try {
    // 实际项目中应该：
    // 1. 通过 WebSocket 连接抖音直播间获取实时数据
    // 2. 使用抖音开放平台 API（如果有权限）
    // 3. 或使用第三方服务如 DouyinLiveWebFetcher
    
    const data = generateMockLiveData(roomId);

    return NextResponse.json({
      success: true,
      data: {
        live: data.live,
        barrages: data.barrages,
        fetchedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "获取直播数据失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
