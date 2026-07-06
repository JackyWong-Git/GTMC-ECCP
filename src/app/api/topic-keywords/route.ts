import { NextResponse } from "next/server";

// 预设汽车行业关键词
const AUTOMOTIVE_KEYWORDS = [
  { label: "新能源汽车", query: "新能源汽车 销量 趋势" },
  { label: "智能驾驶", query: "智能驾驶 自动驾驶 技术" },
  { label: "汽车降价", query: "汽车降价 价格战 优惠" },
  { label: "车企财报", query: "车企财报 业绩 营收" },
  { label: "汽车出口", query: "汽车出口 海外市场" },
  { label: "充电桩", query: "充电桩 基础设施 建设" },
  { label: "汽车安全", query: "汽车安全 碰撞测试 NCAP" },
  { label: "二手车", query: "二手车 市场 保值率" },
];

// 微博汽车热榜关键词
const WEIBO_KEYWORDS = [
  { label: "微博汽车热搜", query: "微博汽车热搜 热门话题" },
  { label: "新车上市", query: "新车上市 发布会 微博" },
  { label: "车展热点", query: "车展 热门 新车" },
  { label: "汽车KOL", query: "汽车博主 KOL 评测" },
];

// 行业危机关键词
const CRISIS_KEYWORDS = [
  { label: "车企裁员", query: "车企 裁员 优化" },
  { label: "汽车召回", query: "汽车 召回 质量问题" },
  { label: "供应链危机", query: "汽车 供应链 芯片短缺" },
  { label: "补贴退坡", query: "新能源 补贴退坡 政策" },
  { label: "行业洗牌", query: "汽车行业 洗牌 倒闭" },
];

// 行业报告关键词
const REPORT_KEYWORDS = [
  { label: "行业白皮书", query: "汽车行业 白皮书 报告" },
  { label: "市场研究", query: "汽车市场 研究报告 分析" },
  { label: "消费者洞察", query: "汽车消费者 洞察 调研" },
  { label: "技术趋势", query: "汽车技术 趋势 前瞻" },
];

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      categories: [
        {
          id: "automotive",
          name: "汽车行业",
          icon: "car",
          keywords: AUTOMOTIVE_KEYWORDS,
        },
        {
          id: "weibo",
          name: "微博汽车热榜",
          icon: "trending",
          keywords: WEIBO_KEYWORDS,
        },
        {
          id: "crisis",
          name: "行业危机",
          icon: "alert",
          keywords: CRISIS_KEYWORDS,
        },
        {
          id: "report",
          name: "行业报告",
          icon: "file",
          keywords: REPORT_KEYWORDS,
        },
      ],
    },
  });
}
