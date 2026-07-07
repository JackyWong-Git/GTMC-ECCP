import { NextRequest, NextResponse } from "next/server";
import { SearchClient, Config, HeaderUtils, LLMClient } from "coze-coding-dev-sdk";
import { MODEL_CONFIG } from "@/lib/llm-config";
import { saveTopicCache } from "@/lib/topic-cache";
import { setupLLMEnv } from "@/lib/platform-config";

interface TrendingTopic {
  rank: number;
  title: string;
  heatScore: number;
  category: string;
  source: string;
  url?: string;
  snippet?: string;
  publishTime?: string;
}

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

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("query") || "抖音热榜 今日热门话题 热门视频";
    const source = searchParams.get("source") || "douyin";
    const count = parseInt(searchParams.get("count") || "20", 10);

    // 设置 LLM 环境变量
    setupLLMEnv();

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const searchClient = new SearchClient(config, customHeaders);

    const response = await searchClient.advancedSearch(query, {
      searchType: "web",
      count,
      timeRange: "1w",
      needSummary: true,
      needContent: false,
      needUrl: true,
    });

    if (!response.web_items || response.web_items.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          topics: [],
          summary: "暂无热榜数据",
          fetchedAt: new Date().toISOString(),
          query,
          source,
        },
      });
    }

    const llmHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const llmConfig = new Config();
    const llmClient = new LLMClient(llmConfig, llmHeaders);

    const searchResultsText = response.web_items
      .map((item, i) => `${i + 1}. ${item.title}\n   来源: ${item.site_name || "未知"}\n   摘要: ${item.snippet}\n   URL: ${item.url || "无"}`)
      .join("\n\n");

    const categoryHint = source === "automotive" ? "汽车/新能源/智能驾驶/车企/销量" :
      source === "weibo" ? "微博热搜/汽车话题/新车/车展" :
      source === "crisis" ? "危机/裁员/召回/供应链/补贴" :
      "社会/娱乐/科技/生活/教育/健康/财经/体育/汽车";

    const llmResponse = await llmClient.invoke([
      {
        role: "system",
        content: `你是一个热点内容分析师。根据搜索结果，提取并整理热门话题。
重点关注以下分类：${categoryHint}
请严格按照以下 JSON 格式输出，不要输出其他内容：
{
  "topics": [
    {
      "rank": 序号(数字),
      "title": "话题标题",
      "heatScore": 热度分数(1000-10000之间的整数),
      "category": "分类(汽车/新能源/智能驾驶/车企/销量/危机/综合)",
      "source": "来源平台(抖音/微博/视频号/快手/综合)",
      "url": "相关链接(如有)",
      "snippet": "简短描述(50字以内)"
    }
  ]
}
最多提取15个热点话题，按热度从高到低排序。`,
      },
      {
        role: "user",
        content: `以下是搜索到的热点内容，请分析并结构化输出：\n\n${searchResultsText}\n\nAI摘要：${response.summary || "无"}`,
      },
    ], {
      model: MODEL_CONFIG.HOT_TOPIC_ANALYSIS.model,
      temperature: MODEL_CONFIG.HOT_TOPIC_ANALYSIS.temperature,
    });

    let topics: TrendingTopic[] = [];
    try {
      const content = llmResponse.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as { topics: TrendingTopic[] };
        topics = parsed.topics || [];
      }
    } catch {
      topics = response.web_items.slice(0, 15).map((item, i) => ({
        rank: i + 1,
        title: item.title,
        heatScore: Math.floor(9000 - i * 400 + Math.random() * 200),
        category: "综合",
        source: source === "weibo" ? "微博" : source === "automotive" ? "汽车行业" : "综合",
        url: item.url || undefined,
        snippet: item.snippet?.substring(0, 50) || "",
        publishTime: item.publish_time || undefined,
      }));
    }

    // 保存到缓存
    const cachedTopics = topics.map((t, i) => ({
      id: Date.now() + i,
      title: t.title,
      platform: t.source || "综合",
      heat: t.heatScore,
      likes: 0,
      comments: 0,
      status: "选题评估",
      assignee: "待分配",
      publishDate: new Date().toISOString().split("T")[0],
      sourceUrl: t.url || "",
      tags: [t.category || "热点"],
      snippet: t.snippet,
      category: t.category,
    }));

    saveTopicCache({
      topics: cachedTopics,
      fetchedAt: new Date().toISOString(),
      query,
      source,
    });

    console.log(`[douyin-trending] Returning ${cachedTopics.length} topics for query: ${query}`);

    return NextResponse.json({
      success: true,
      data: {
        topics,
        summary: response.summary || "",
        totalResults: response.web_items.length,
        fetchedAt: new Date().toISOString(),
        query,
        source,
      },
    });
  } catch (error) {
    console.error("热榜抓取失败:", error);
    return NextResponse.json(
      { error: "热榜抓取失败，请稍后重试" },
      { status: 500 }
    );
  }
}

// POST 方法支持自定义搜索
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      query?: string;
      source?: string;
      keywords?: string[];
    };

    const { query, source, keywords } = body;

    // 构建搜索查询
    let searchQuery = query || "";
    if (keywords && keywords.length > 0) {
      searchQuery = keywords.join(" ");
    } else if (!searchQuery) {
      searchQuery = "抖音热榜 今日热门话题";
    }

    // 重定向到 GET 处理
    const url = new URL(request.url);
    url.searchParams.set("query", searchQuery);
    url.searchParams.set("source", source || "custom");

    return GET(new NextRequest(url.toString(), { headers: request.headers }));
  } catch (error) {
    console.error("自定义搜索失败:", error);
    return NextResponse.json(
      { error: "搜索失败，请稍后重试" },
      { status: 500 }
    );
  }
}

// 导出预设关键词供前端使用
export async function GET_KEYWORDS() {
  return NextResponse.json({
    success: true,
    data: {
      automotive: AUTOMOTIVE_KEYWORDS,
      weibo: WEIBO_AUTOMOTIVE_KEYWORDS,
      crisis: CRISIS_KEYWORDS,
    },
  });
}
