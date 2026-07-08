import { NextResponse } from "next/server";

// 预设汽车行业关键词
const AUTOMOTIVE_KEYWORDS = [
  "汽车行业 新能源",
  "汽车销量 排行榜",
  "智能驾驶 自动驾驶",
  "汽车降价 价格战",
  "车企财报 业绩",
  "汽车出口 海外",
  "充电桩 基础设施",
  "汽车安全 碰撞测试",
  "二手车 市场",
  "汽车金融 贷款",
];

// 微博汽车热榜关键词
const WEIBO_AUTOMOTIVE_KEYWORDS = [
  "微博汽车热搜",
  "汽车话题榜",
  "新车上市 微博",
  "车展 热门",
];

// 行业危机关键词
const CRISIS_KEYWORDS = [
  "汽车行业 危机",
  "车企 裁员",
  "汽车 召回",
  "新能源 补贴退坡",
  "汽车 供应链",
];

/** GET — 获取预设关键词列表 */
export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      automotive: AUTOMOTIVE_KEYWORDS,
      weibo: WEIBO_AUTOMOTIVE_KEYWORDS,
      crisis: CRISIS_KEYWORDS,
    },
  });
}
