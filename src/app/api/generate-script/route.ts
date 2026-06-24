import { NextRequest } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { MODEL_CONFIG, SYSTEM_PROMPTS } from '@/lib/llm-config';

/**
 * POST /api/generate-script
 * 脚本大纲生成 — 使用 qwen-3-5-plus（核心创作，流式输出）
 *
 * 请求体: { topicTitle: string, platform: string, style?: string, duration?: string }
 * 返回: SSE 流式响应
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topicTitle, platform, style, duration } = body as {
      topicTitle: string;
      platform: string;
      style?: string;
      duration?: string;
    };

    if (!topicTitle || !platform) {
      return new Response(
        JSON.stringify({ error: '缺少必要参数：topicTitle 和 platform' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    const userContent = `请为以下选题生成视频脚本大纲：

选题名称：${topicTitle}
目标平台：${platform}
${style ? `风格要求：${style}` : '风格要求：轻松口语化，节奏快'}
${duration ? `视频时长：${duration}` : '视频时长：3-5分钟'}

请生成一份完整的、可直接用于拍摄的视频脚本大纲。`;

    const messages = [
      { role: 'system' as const, content: SYSTEM_PROMPTS.SCRIPT_GENERATION },
      { role: 'user' as const, content: userContent },
    ];

    const stream = client.stream(messages, {
      model: MODEL_CONFIG.SCRIPT_GENERATION.model,
      temperature: MODEL_CONFIG.SCRIPT_GENERATION.temperature,
    });

    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (chunk.content) {
              const text = chunk.content.toString();
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ content: text })}\n\n`)
              );
            }
          }
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                done: true,
                model: MODEL_CONFIG.SCRIPT_GENERATION.label,
                modelId: MODEL_CONFIG.SCRIPT_GENERATION.model,
              })}\n\n`
            )
          );
          controller.close();
        } catch (streamError) {
          console.error('[generate-script] 流式输出错误:', streamError);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                error: '生成过程中发生错误',
                detail:
                  streamError instanceof Error
                    ? streamError.message
                    : '未知错误',
              })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error) {
    console.error('[generate-script] 脚本生成失败:', error);
    return new Response(
      JSON.stringify({
        error: '脚本生成失败',
        detail: error instanceof Error ? error.message : '未知错误',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
