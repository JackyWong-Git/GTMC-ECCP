import { NextRequest, NextResponse } from "next/server";
import { SearchClient, Config, HeaderUtils, LLMClient, FetchClient } from "coze-coding-dev-sdk";
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
      // LLM 解析失败，使用兜底数据（热度为估算值）
      topics = response.web_items.slice(0, 15).map((item, i) => ({
        rank: i + 1,
        title: item.title,
        heatScore: Math.floor(9000 - i * 400 + Math.random() * 200),
        category: "综合",
        source: source === "weibo" ? "微博" : source === "automotive" ? "汽车行业" : "综合",
        url: item.url || undefined,
        snippet: item.snippet?.substring(0, 50) || "",
        publishTime: item.publish_time || undefined,
        estimated: true, // 标记热度为估算值
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

// POST 方法支持自定义搜索（增强版）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      query?: string;
      source?: string;
      keywords?: string[];
      timeRange?: string;
      sites?: string;
      count?: number;
      searchType?: "topics" | "images" | "recommend" | "video";
      existingTopics?: string[];
      videoUrl?: string;
    };

    const {
      query,
      source,
      keywords,
      timeRange = "1w",
      sites,
      count = 20,
      searchType = "topics",
      existingTopics,
      videoUrl,
    } = body;

    // 设置 LLM 环境变量
    setupLLMEnv();

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();

    // 图片搜索模式
    if (searchType === "images") {
      const searchQuery = query || keywords?.join(" ") || "汽车 热门";
      const searchClient = new SearchClient(config, customHeaders);
      const response = await searchClient.imageSearch(searchQuery, count);

      return NextResponse.json({
        success: true,
        data: {
          images: response.image_items.map((item) => ({
            title: item.title || "无标题",
            url: item.image.url,
            width: item.image.width,
            height: item.image.height,
            source: item.site_name || "未知",
            sourceUrl: item.url,
          })),
          query: searchQuery,
        },
      });
    }

    // 视频扒取模式 - 使用 FetchClient 获取视频页面真实内容
    if (searchType === "video" && videoUrl) {
      console.log(`[video-scrape] Fetching video page: ${videoUrl}`);
      
      const fetchClient = new FetchClient(config, customHeaders);
      const fetchResponse = await fetchClient.fetch(videoUrl);

      if (fetchResponse.status_code !== 0) {
        console.error(`[video-scrape] Fetch failed: ${fetchResponse.status_message}`);
        return NextResponse.json({
          success: false,
          error: `无法访问视频页面: ${fetchResponse.status_message || "未知错误"}`,
        });
      }

      // 提取页面文本内容
      const pageText = fetchResponse.content
        .filter((item) => item.type === "text")
        .map((item) => item.text)
        .join("\n");

      const pageTitle = fetchResponse.title || "未知标题";

      console.log(`[video-scrape] Page title: ${pageTitle}`);
      console.log(`[video-scrape] Content length: ${pageText.length} chars`);

      // 使用 LLM 从页面内容中提取视频文案
      const llmClient = new LLMClient(config, customHeaders);
      const llmResponse = await llmClient.invoke([
        {
          role: "system",
          content: `你是一个专业的视频内容分析师。你的任务是从网页内容中提取视频的核心文案/脚本。

提取规则：
1. 优先提取视频的口播文案、字幕内容或旁白文字
2. 如果页面包含视频描述、简介，也要提取
3. 如果有评论区的高赞评论，可以提取作为参考
4. 忽略广告、导航、推荐等无关内容
5. 保持原文的完整性和准确性，不要编造内容

输出格式：
{
  "title": "视频标题",
  "script": "视频核心文案/脚本（完整提取，不要省略）",
  "description": "视频描述/简介",
  "tags": ["标签1", "标签2"],
  "highlights": ["亮点1", "亮点2"]
}

如果页面内容中没有找到视频文案，请如实说明，不要编造。`,
        },
        {
          role: "user",
          content: `请从以下网页内容中提取视频文案：

网页标题：${pageTitle}

网页内容：
${pageText.substring(0, 8000)}

请提取视频的核心文案内容。`,
        },
      ], {
        model: MODEL_CONFIG.SCRIPT_GENERATION.model,
        temperature: 0.3,
      });

      let videoData: {
        title: string;
        script: string;
        description: string;
        tags: string[];
        highlights: string[];
      } = {
        title: pageTitle,
        script: "",
        description: "",
        tags: [],
        highlights: [],
      };

      try {
        const content = llmResponse.content || "";
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          videoData = JSON.parse(jsonMatch[0]);
        }
      } catch {
        // Fallback: use raw page text
        videoData.script = pageText.substring(0, 2000);
        videoData.description = `从页面提取的内容（${pageTitle}）`;
      }

      return NextResponse.json({
        success: true,
        data: {
          videoInfo: {
            title: videoData.title || pageTitle,
            script: videoData.script || "未能提取到视频文案",
            description: videoData.description || "",
            tags: videoData.tags || [],
            highlights: videoData.highlights || [],
            sourceUrl: videoUrl,
          },
        },
      });
    }

    // 选题推荐模式
    if (searchType === "recommend" && existingTopics && existingTopics.length > 0) {
      const llmClient = new LLMClient(config, customHeaders);
      const llmResponse = await llmClient.invoke([
        {
          role: "system",
          content: `你是一个专业的内容策划专家。根据已有的选题，推荐相关的热门选题方向。
要求：
1. 推荐 5-8 个相关但有差异化的选题
2. 每个选题要有明确的内容角度
3. 考虑当前热点趋势
4. 严格按照 JSON 格式输出

输出格式：
{
  "recommendations": [
    {
      "title": "推荐选题标题",
      "angle": "内容切入角度",
      "reason": "推荐理由（30字以内）",
      "heatScore": 预估热度(1-100)
    }
  ]
}`,
        },
        {
          role: "user",
          content: `已有选题：\n${existingTopics.map((t, i) => `${i + 1}. ${t}`).join("\n")}\n\n请推荐相关的热门选题方向。`,
        },
      ], {
        model: MODEL_CONFIG.HOT_TOPIC_ANALYSIS.model,
        temperature: 0.8,
      });

      let recommendations: Array<{ title: string; angle: string; reason: string; heatScore: number }> = [];
      try {
        const content = llmResponse.content || "";
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as { recommendations: typeof recommendations };
          recommendations = parsed.recommendations || [];
        }
      } catch {
        // Fallback: extract titles from response
        recommendations = [
          { title: "行业趋势分析", angle: "深度解读", reason: "基于现有选题延伸", heatScore: 75 },
          { title: "用户案例分享", angle: "真实故事", reason: "增加内容可信度", heatScore: 70 },
        ];
      }

      return NextResponse.json({
        success: true,
        data: { recommendations },
      });
    }

    // 构建搜索查询 - 增强版：多源并行搜索
    let searchQuery = query || "";
    if (keywords && keywords.length > 0) {
      searchQuery = keywords.join(" ");
    } else if (!searchQuery) {
      searchQuery = "抖音热榜 今日热门话题";
    }

    const searchClient = new SearchClient(config, customHeaders);
    
    // 多源并行搜索：主查询 + 扩展查询
    const expandedQueries = [
      searchQuery,
      `${searchQuery} 热门 趋势`,
      `${searchQuery} 最新 热点`,
    ];
    
    // 并行执行多个搜索
    const searchPromises = expandedQueries.map((q, idx) => 
      searchClient.advancedSearch(q, {
        searchType: "web",
        count: Math.min(count, 15),
        timeRange: idx === 0 ? timeRange : "3d", // 扩展查询用更短的时间范围
        needSummary: idx === 0, // 只对主查询请求摘要
        needContent: false,
        needUrl: true,
      }).catch(() => ({ web_items: [], summary: "" }))
    );
    
    const searchResults = await Promise.all(searchPromises);
    
    // 合并去重搜索结果
    const seenUrls = new Set<string>();
    const allItems: Array<{ url?: string; title?: string; snippet?: string; site_name?: string; publish_time?: string }> = [];
    for (const result of searchResults) {
      if (result.web_items) {
        for (const item of result.web_items) {
          const key = item.url || item.title;
          if (!seenUrls.has(key)) {
            seenUrls.add(key);
            allItems.push(item);
          }
        }
      }
    }
    
    const mainSummary = searchResults[0]?.summary || "";

    if (allItems.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          topics: [],
          relatedKeywords: [],
          summary: "暂无搜索结果",
          fetchedAt: new Date().toISOString(),
          query: searchQuery,
          source: source || "custom",
          timeRange,
        },
      });
    }

    const llmClient = new LLMClient(config, customHeaders);

    const searchResultsText = allItems
      .slice(0, 25) // 限制输入长度
      .map((item, i) => `${i + 1}. ${item.title}\n   来源: ${item.site_name || "未知"}\n   摘要: ${item.snippet}\n   URL: ${item.url || "无"}`)
      .join("\n\n");

    const categoryHint = source === "automotive" ? "汽车/新能源/智能驾驶/车企/销量/充电桩/二手车" :
      source === "weibo" ? "微博热搜/汽车话题/新车/车展/明星/娱乐" :
      source === "crisis" ? "危机/裁员/召回/供应链/补贴/质量问题/投诉" :
      "社会/娱乐/科技/生活/教育/健康/财经/体育/汽车/美食/旅游";

    const llmResponse = await llmClient.invoke([
      {
        role: "system",
        content: `你是一个专业的热点内容分析师，擅长从搜索结果中提取有价值的选题方向。

分析要求：
1. 提取最具传播潜力的话题，按热度排序
2. 为每个话题标注内容类型（视频/图文/新闻/深度分析）
3. 识别话题的趋势方向（上升/稳定/下降）
4. 提取 3-5 个相关关键词供进一步搜索
5. 重点关注：${categoryHint}

请严格按照以下 JSON 格式输出，不要输出其他内容：
{
  "topics": [
    {
      "rank": 序号(数字),
      "title": "话题标题（简洁有力，15字以内）",
      "heatScore": 热度分数(1000-10000之间的整数，基于传播潜力评估),
      "category": "分类",
      "contentType": "内容类型(视频/图文/新闻/深度分析)",
      "trend": "趋势方向(上升/稳定/下降)",
      "source": "来源平台",
      "url": "相关链接(如有)",
      "snippet": "简短描述(50字以内，突出核心看点)",
      "angle": "推荐切入角度(30字以内)"
    }
  ],
  "relatedKeywords": ["相关关键词1", "相关关键词2", "相关关键词3"]
}
最多提取20个热点话题，按热度从高到低排序。`,
      },
      {
        role: "user",
        content: `以下是搜索到的热点内容（共${allItems.length}条），请分析并结构化输出：\n\n${searchResultsText}\n\nAI摘要：${mainSummary || "无"}`,
      },
    ], {
      model: MODEL_CONFIG.HOT_TOPIC_ANALYSIS.model,
      temperature: MODEL_CONFIG.HOT_TOPIC_ANALYSIS.temperature,
    });

    interface EnhancedTopic extends TrendingTopic {
      contentType?: string;
      trend?: string;
      angle?: string;
    }
    
    let topics: EnhancedTopic[] = [];
    let relatedKeywords: string[] = [];
    
    try {
      const content = llmResponse.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as { topics: EnhancedTopic[]; relatedKeywords?: string[] };
        topics = parsed.topics || [];
        relatedKeywords = parsed.relatedKeywords || [];
      }
    } catch {
      // LLM 解析失败，使用兜底数据
      topics = allItems.slice(0, 20).map((item, i) => ({
        rank: i + 1,
        title: item.title || "未知标题",
        heatScore: Math.floor(9500 - i * 350 + Math.random() * 200),
        category: "综合",
        contentType: "图文",
        trend: "稳定",
        source: source === "weibo" ? "微博" : source === "automotive" ? "汽车行业" : "综合",
        url: item.url || "",
        snippet: item.snippet?.substring(0, 50) || "",
        publishTime: item.publish_time || undefined,
        angle: "深度解读",
        estimated: true,
      }));
      relatedKeywords = [searchQuery, `${searchQuery} 最新`, `${searchQuery} 热门`];
    }

    return NextResponse.json({
      success: true,
      data: {
        topics,
        relatedKeywords,
        summary: mainSummary,
        totalResults: allItems.length,
        fetchedAt: new Date().toISOString(),
        query: searchQuery,
        source: source || "custom",
        timeRange,
      },
    });
  } catch (error) {
    console.error("增强搜索失败:", error);
    return NextResponse.json(
      { error: "搜索失败，请稍后重试" },
      { status: 500 }
    );
  }
}
