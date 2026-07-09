import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config, HeaderUtils, KnowledgeClient, DataSourceType } from 'coze-coding-dev-sdk';
import { MODEL_CONFIG, SYSTEM_PROMPTS } from '@/lib/llm-config';
import { DEFAULT_KNOWLEDGE_DATASET } from '@/lib/platform-config';

/**
 * 异步保存内容到知识库（不阻塞主流程）
 */
async function saveToKnowledge(
  content: string,
  metadata: { type: string; title: string; platform?: string; period?: string }
): Promise<void> {
  try {
    const config = new Config();
    const knowledgeClient = new KnowledgeClient(config);
    
    // 构建带标签的内容
    const taggedContent = [
      `[${metadata.type}] ${metadata.title}`,
      metadata.platform ? `平台: ${metadata.platform}` : '',
      metadata.period ? `周期: ${metadata.period}` : '',
      `时间: ${new Date().toISOString().split('T')[0]}`,
      '---',
      content,
    ].filter(Boolean).join('\n');

    await knowledgeClient.addDocuments(
      [{ source: DataSourceType.TEXT, raw_data: taggedContent }],
      DEFAULT_KNOWLEDGE_DATASET
    );
    console.log(`[knowledge] ${metadata.type}已保存: ${metadata.title}`);
  } catch (error) {
    // 静默失败，不影响主流程
    console.error(`[knowledge] ${metadata.type}保存失败:`, error);
  }
}

/**
 * POST /api/data-summary
 * 数据摘要生成 — 使用 doubao-seed-2-0-mini（轻量快速）
 *
 * 请求体: { platform: string, period: string, metrics: object }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { platform, period, metrics } = body as {
      platform: string;
      period: string;
      metrics: {
        totalViews: number;
        totalLikes: number;
        totalComments: number;
        totalShares: number;
        videoCount: number;
        topVideos?: Array<{
          title: string;
          views: number;
          likes: number;
        }>;
      };
    };

    if (!platform || !period || !metrics) {
      return NextResponse.json(
        { error: '缺少必要参数：platform、period 和 metrics' },
        { status: 400 }
      );
    }

    // 字段级校验，防止 toLocaleString 空指针
    const safeMetrics = {
      totalViews: Number(metrics.totalViews) || 0,
      totalLikes: Number(metrics.totalLikes) || 0,
      totalComments: Number(metrics.totalComments) || 0,
      totalShares: Number(metrics.totalShares) || 0,
      videoCount: Number(metrics.videoCount) || 0,
      topVideos: Array.isArray(metrics.topVideos) ? metrics.topVideos : [],
    };

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    const topVideosText = safeMetrics.topVideos.length > 0
      ? safeMetrics.topVideos
          .map(
            (v: { title: string; views: number; likes: number }, i: number) =>
              `  ${i + 1}. 「${v.title || '未命名'}」— 播放 ${Number(v.views) || 0}，点赞 ${Number(v.likes) || 0}`
          )
          .join('\n')
      : '暂无数据';

    const interactionRate = safeMetrics.totalViews > 0
      ? ((safeMetrics.totalLikes + safeMetrics.totalComments) / safeMetrics.totalViews * 100).toFixed(1)
      : '0.0';

    const userContent = `请为以下运营数据生成摘要报告：

平台：${platform}
统计周期：${period}

核心数据：
- 视频数量：${safeMetrics.videoCount} 个
- 总播放量：${safeMetrics.totalViews.toLocaleString()}
- 总点赞数：${safeMetrics.totalLikes.toLocaleString()}
- 总评论数：${safeMetrics.totalComments.toLocaleString()}
- 总分享数：${safeMetrics.totalShares.toLocaleString()}
- 平均互动率：${interactionRate}%

TOP 视频表现：
${topVideosText}

请生成一份简洁专业的数据摘要报告，包含趋势分析和优化建议。`;

    const messages = [
      { role: 'system' as const, content: SYSTEM_PROMPTS.DATA_SUMMARY },
      { role: 'user' as const, content: userContent },
    ];

    const response = await client.invoke(messages, {
      model: MODEL_CONFIG.DATA_SUMMARY.model,
      temperature: MODEL_CONFIG.DATA_SUMMARY.temperature,
    });

    // 异步保存到知识库（不阻塞响应）
    if (response.content) {
      saveToKnowledge(response.content, {
        type: '数据报告',
        title: `${platform} ${period} 数据摘要`,
        platform,
        period,
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      data: {
        summary: response.content,
        model: MODEL_CONFIG.DATA_SUMMARY.label,
        modelId: MODEL_CONFIG.DATA_SUMMARY.model,
      },
    });
  } catch (error) {
    console.error('[data-summary] 摘要生成失败:', error);
    return NextResponse.json(
      {
        error: '数据摘要生成失败',
        detail: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    );
  }
}
