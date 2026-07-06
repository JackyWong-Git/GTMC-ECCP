import { NextRequest, NextResponse } from "next/server";
import { LLMClient, Config, HeaderUtils } from "coze-coding-dev-sdk";
import { MODEL_CONFIG } from "@/lib/llm-config";

interface AnalysisRequest {
  title: string;
  content?: string;
  category?: string;
  targetAudience?: string;
}

interface AnalysisResult {
  summary: string;
  heatScore: number;
  audienceMatch: string;
  contentAngle: string;
  riskAssessment: string;
  recommendedPlatforms: string[];
  keyPoints: string[];
  competitorAnalysis: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as AnalysisRequest;
    const { title, content, category, targetAudience } = body;

    if (!title) {
      return NextResponse.json(
        { error: "缺少选题标题" },
        { status: 400 }
      );
    }

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const llmClient = new LLMClient(config, customHeaders);

    const audienceContext = targetAudience
      ? `目标受众：${targetAudience}`
      : "目标受众：通用（请分析最适合的受众）";

    const categoryContext = category
      ? `内容分类：${category}`
      : "内容分类：待分析";

    const llmResponse = await llmClient.invoke([
      {
        role: "system",
        content: `你是一个专业的内容选题分析师，擅长汽车行业内容策划。请对给定的选题进行深度分析。

分析维度：
1. **内容摘要**：50字以内概括选题核心
2. **热度评分**：1-100分，基于话题热度、时效性、讨论度
3. **受众匹配**：分析该选题最适合的目标受众群体
4. **内容切入角度**：推荐3个差异化的内容切入角度
5. **风险评估**：是否存在敏感内容、版权风险、舆论风险
6. **推荐平台**：最适合发布的平台（抖音/视频号/微博/B站/小红书）
7. **关键要点**：内容必须覆盖的3-5个关键信息点
8. **竞品分析**：同类内容的表现情况和差异化建议

请严格按照以下 JSON 格式输出：
{
  "summary": "内容摘要",
  "heatScore": 热度评分(1-100),
  "audienceMatch": "受众匹配分析",
  "contentAngle": "推荐切入角度",
  "riskAssessment": "风险评估",
  "recommendedPlatforms": ["平台1", "平台2"],
  "keyPoints": ["要点1", "要点2", "要点3"],
  "competitorAnalysis": "竞品分析"
}`,
      },
      {
        role: "user",
        content: `请分析以下选题：

选题标题：${title}
${content ? `相关内容：${content}` : ""}
${categoryContext}
${audienceContext}`,
      },
    ], {
      model: MODEL_CONFIG.HOT_TOPIC_ANALYSIS.model,
      temperature: MODEL_CONFIG.HOT_TOPIC_ANALYSIS.temperature,
    });

    let result: AnalysisResult;
    try {
      const responseText = llmResponse.content || "";
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]) as AnalysisResult;
      } else {
        throw new Error("无法解析 LLM 响应");
      }
    } catch {
      result = {
        summary: llmResponse.content?.substring(0, 100) || "分析完成",
        heatScore: 70,
        audienceMatch: "通用受众",
        contentAngle: "建议从行业趋势角度切入",
        riskAssessment: "低风险",
        recommendedPlatforms: ["抖音", "视频号"],
        keyPoints: ["行业背景", "核心观点", "数据支撑"],
        competitorAnalysis: "建议差异化呈现",
      };
    }

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        model: MODEL_CONFIG.HOT_TOPIC_ANALYSIS.model,
        analyzedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("选题分析失败:", error);
    return NextResponse.json(
      { error: "选题分析失败，请稍后重试" },
      { status: 500 }
    );
  }
}
