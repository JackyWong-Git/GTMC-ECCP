import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { MODEL_CONFIG, SYSTEM_PROMPTS } from '@/lib/llm-config';

/**
 * POST /api/analyze-topic
 * 热点内容分析 — 使用 doubao-seed-2-0-lite（高频、多模态、成本敏感）
 *
 * 请求体: { topicTitle: string, platform: string, heatData?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topicTitle, platform, heatData } = body as {
      topicTitle: string;
      platform: string;
      heatData?: string;
    };

    if (!topicTitle || !platform) {
      return NextResponse.json(
        { error: '缺少必要参数：topicTitle 和 platform' },
        { status: 400 }
      );
    }

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    const userContent = `请分析以下热门内容：

选题名称：${topicTitle}
来源平台：${platform}
${heatData ? `热度数据：${heatData}` : ''}

请从内容分析师的角度，给出专业的选题价值评估和建议。`;

    const messages = [
      { role: 'system' as const, content: SYSTEM_PROMPTS.HOT_TOPIC_ANALYSIS },
      { role: 'user' as const, content: userContent },
    ];

    const response = await client.invoke(messages, {
      model: MODEL_CONFIG.HOT_TOPIC_ANALYSIS.model,
      temperature: MODEL_CONFIG.HOT_TOPIC_ANALYSIS.temperature,
    });

    return NextResponse.json({
      success: true,
      data: {
        analysis: response.content,
        model: MODEL_CONFIG.HOT_TOPIC_ANALYSIS.label,
        modelId: MODEL_CONFIG.HOT_TOPIC_ANALYSIS.model,
      },
    });
  } catch (error) {
    console.error('[analyze-topic] 分析失败:', error);
    return NextResponse.json(
      {
        error: '热点分析失败',
        detail: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    );
  }
}
