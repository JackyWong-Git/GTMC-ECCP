import { NextRequest, NextResponse } from "next/server";
import { LLMClient, Config, HeaderUtils } from "coze-coding-dev-sdk";
import { MODEL_CONFIG } from "@/lib/llm-config";

/**
 * 评论情感分析 API
 * 
 * 分析视频评论的情感倾向，返回：
 * - 整体情感分布（正面/中性/负面）
 * - 每条评论的情感标签
 * - 高频关键词提取
 * - 情感趋势分析
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { comments, videoTitle } = body;

    if (!comments || !Array.isArray(comments) || comments.length === 0) {
      return NextResponse.json(
        { error: "请提供评论列表" },
        { status: 400 }
      );
    }

    // 限制评论数量，避免 token 超限
    const limitedComments = comments.slice(0, 50);
    const commentsText = limitedComments
      .map((c: { content: string; likes?: number }, i: number) => `${i + 1}. ${c.content}${c.likes ? ` (${c.likes}赞)` : ""}`)
      .join("\n");

    const systemPrompt = `你是一个专业的社交媒体评论情感分析师。请分析以下视频评论的情感倾向。

分析维度：
1. **情感分类**：将每条评论分为"正面"、"中性"或"负面"
2. **情感强度**：1-5分（1=很弱，5=很强）
3. **情感类型**：具体情感（如：喜爱、惊讶、愤怒、失望、期待、搞笑等）
4. **关键词提取**：提取评论中的高频关键词和话题

输出格式（严格 JSON）：
{
  "summary": {
    "total": 评论总数,
    "positive": 正面评论数,
    "neutral": 中性评论数,
    "negative": 负面评论数,
    "positiveRate": 正面率百分比,
    "averageSentiment": 平均情感分数(1-5)
  },
  "keywords": [
    {"word": "关键词", "count": 出现次数, "sentiment": "正面/中性/负面"}
  ],
  "emotions": [
    {"type": "情感类型", "count": 出现次数}
  ],
  "highlights": {
    "mostLiked": "获赞最多的评论内容",
    "mostControversial": "最具争议的评论",
    "mostPositive": "最正面的评论",
    "mostNegative": "最负面的评论"
  },
  "insights": [
    "洞察1：...",
    "洞察2：...",
    "洞察3：..."
  ]
}

注意：
- keywords 最多返回 10 个
- emotions 最多返回 8 种
- insights 返回 3-5 条有价值的洞察
- 所有文本使用中文`;

    const userPrompt = `视频标题：${videoTitle || "未知"}

评论列表：
${commentsText}

请分析这些评论的情感倾向。`;

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    const response = await client.invoke(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      {
        model: MODEL_CONFIG.HOT_TOPIC_ANALYSIS.model,
        temperature: MODEL_CONFIG.HOT_TOPIC_ANALYSIS.temperature,
      }
    );

    const content = response.content || "";

    // 提取 JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "AI 返回格式错误" },
        { status: 500 }
      );
    }

    const result = JSON.parse(jsonMatch[0]);

    return NextResponse.json({
      success: true,
      data: result,
      analyzedCount: limitedComments.length,
    });
  } catch (error) {
    console.error("Sentiment analysis error:", error);
    return NextResponse.json(
      { error: "情感分析失败，请稍后重试" },
      { status: 500 }
    );
  }
}
