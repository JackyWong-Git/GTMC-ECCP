import { NextRequest, NextResponse } from "next/server";
import { LLMClient, Config, HeaderUtils } from "coze-coding-dev-sdk";
import { MODEL_CONFIG } from "@/lib/llm-config";

/**
 * 爆款拆解分析 API
 * 基于六维分析框架：选题角度/钩子/结构/爆点·数据证据/CTA/可抄点
 */

const VIRAL_ANALYSIS_PROMPT = `你是对标拆解分析师，专注于分析短视频爆款内容。
下面是一条短视频的转录文案 + 数据。按六维拆解，只输出一个 JSON 对象（键必须是这六个中文键），每个值简洁、有信息量、说人话：

- 选题角度：切的什么角度/痛点/人群
- 钩子：前3秒或标题怎么勾人（引原句+点手法：反转/暴论/成果诱惑/痛点）
- 结构：口播骨架（分几段、怎么递进）
- 爆点·数据证据：结合 赞{like}/评{comment} 判断驱动类型（收藏干货型=高赞评比 / 争议型 / 共鸣型 / 励志型）+ 为什么爆
- CTA：结尾引导（关注/评论/领资料/私信/无）
- 可抄点：其他创作者能怎么借鉴这一条（给一条可落地的建议）

标题：{title}
点赞 {like}，评论 {comment}
转录文案：
{transcript}

只输出 JSON，不要任何解释、不要 markdown 代码块。`;

const SEVEN_DIMENSION_PROMPT = `你是短视频运营分析师。分析以下视频内容，从7个维度给出评估，只输出 JSON 对象：

- 脚本类型：聊观点 / 晒过程 / 讲故事 / 教知识（选一个）
- 爆款元素：成本 / 人群 / 奇葩 / 头牌 / 最差 / 反差 / 怀旧 / 荷尔蒙（选1-3个最相关的）
- 情绪波动点：描述文案中情绪变化的关键节点
- 画面感：1-10 分 + 一句话原因
- 力量感：1-10 分 + 一句话原因
- 人设类型：崇拜者 / 教导者 / 分享者 / 陪伴者 / 衬托者 / 搞笑者（选一个）
- 运营建议：一句话改进建议

标题：{title}
点赞 {like}，评论 {comment}
转录文案：
{transcript}

只输出 JSON，不要任何解释、不要 markdown 代码块。`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, transcript, like, comment, mode = "six" } = body;

    if (!title || !transcript) {
      return NextResponse.json(
        { error: "标题和转录文案是必填项" },
        { status: 400 }
      );
    }

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    const promptTemplate = mode === "seven" ? SEVEN_DIMENSION_PROMPT : VIRAL_ANALYSIS_PROMPT;
    const prompt = promptTemplate
      .replace("{title}", title)
      .replace("{like}", String(like || 0))
      .replace("{comment}", String(comment || 0))
      .replace("{transcript}", transcript.slice(0, 4000));

    const messages = [
      { role: "user" as const, content: prompt },
    ];

    const response = await client.invoke(messages, {
      model: MODEL_CONFIG.HOT_TOPIC_ANALYSIS.model,
      temperature: MODEL_CONFIG.HOT_TOPIC_ANALYSIS.temperature,
    });

    const content = response.content || "";

    // Parse JSON from response
    let result: Record<string, string | number> = {};
    try {
      const cleaned = content
        .replace(/^```(?:json)?/gm, "")
        .replace(/```$/gm, "")
        .trim();
      result = JSON.parse(cleaned);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        result = JSON.parse(match[0]);
      } else {
        return NextResponse.json(
          { error: "AI 返回格式异常，请重试" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Viral analysis error:", error);
    return NextResponse.json(
      { error: "分析失败，请稍后重试" },
      { status: 500 }
    );
  }
}
