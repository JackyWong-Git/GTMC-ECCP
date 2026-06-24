import { NextRequest, NextResponse } from "next/server";
import { SearchClient, Config, HeaderUtils, LLMClient } from "coze-coding-dev-sdk";
import { MODEL_CONFIG } from "@/lib/llm-config";

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

export async function GET(request: NextRequest) {
  try {
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const searchClient = new SearchClient(config, customHeaders);

    // 搜索抖音热榜/热点内容
    const response = await searchClient.advancedSearch("抖音热榜 今日热门话题 热门视频", {
      searchType: "web",
      count: 20,
      timeRange: "1d",
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
        },
      });
    }

    // 使用 LLM 对搜索结果进行结构化解析
    const llmHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const llmConfig = new Config();
    const llmClient = new LLMClient(llmConfig, llmHeaders);

    const searchResultsText = response.web_items
      .map((item, i) => `${i + 1}. ${item.title}\n   来源: ${item.site_name || "未知"}\n   摘要: ${item.snippet}\n   URL: ${item.url || "无"}`)
      .join("\n\n");

    const llmResponse = await llmClient.invoke([
      {
        role: "system",
        content: `你是一个热点内容分析师。根据搜索结果，提取并整理抖音/短视频平台的热门话题。
请严格按照以下 JSON 格式输出，不要输出其他内容：
{
  "topics": [
    {
      "rank": 序号(数字),
      "title": "话题标题",
      "heatScore": 热度分数(1000-10000之间的整数，根据话题热度和讨论度估算),
      "category": "分类(社会/娱乐/科技/生活/教育/健康/财经/体育/其他)",
      "source": "来源平台(抖音/视频号/快手/微博/综合)",
      "url": "相关链接(如有)",
      "snippet": "简短描述(50字以内)"
    }
  ]
}
最多提取15个热点话题，按热度从高到低排序。`,
      },
      {
        role: "user",
        content: `以下是今日搜索到的热点内容，请分析并结构化输出：\n\n${searchResultsText}\n\nAI摘要：${response.summary || "无"}`,
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
      // LLM 解析失败时，直接从搜索结果构建基础数据
      topics = response.web_items.slice(0, 15).map((item, i) => ({
        rank: i + 1,
        title: item.title,
        heatScore: Math.floor(9000 - i * 400 + Math.random() * 200),
        category: "综合",
        source: "综合",
        url: item.url || undefined,
        snippet: item.snippet?.substring(0, 50) || "",
        publishTime: item.publish_time || undefined,
      }));
    }

    return NextResponse.json({
      success: true,
      data: {
        topics,
        summary: response.summary || "",
        totalResults: response.web_items.length,
        fetchedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("抖音热榜抓取失败:", error);
    return NextResponse.json(
      { error: "热榜抓取失败，请稍后重试" },
      { status: 500 }
    );
  }
}
