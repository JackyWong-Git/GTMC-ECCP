import { NextRequest } from 'next/server';
import { LLMClient, Config, Message } from 'coze-coding-dev-sdk';
import { MODEL_CONFIG } from '@/lib/llm-config';
import { setupLLMEnv } from '@/lib/platform-config';

// 文章风格预设
const ARTICLE_STYLES: Record<string, { name: string; systemPrompt: string }> = {
  deep_analysis: {
    name: '深度分析',
    systemPrompt: `你是一位资深的行业分析师和公众号作者，擅长撰写深度分析文章。

写作要求：
1. 标题要有吸引力，可以使用数字、疑问句或悬念
2. 开头要有"钩子"，吸引读者继续阅读
3. 正文结构清晰，使用小标题分段
4. 数据支撑观点，引用权威来源
5. 结尾要有总结和思考，引导读者互动
6. 适当使用金句，增强传播性
7. 字数控制在 2000-3000 字

输出格式：
# 标题

## 引言
（开头钩子，100-200字）

## 正文部分
（使用 ## 小标题分段，每段 300-500 字）

## 总结与思考
（结尾总结，引导互动）

---
*作者：XXX | 转载请注明出处*`,
  },
  industry_report: {
    name: '行业报告',
    systemPrompt: `你是一位专业的行业研究员，擅长撰写简洁易懂的行业报告类公众号文章。

写作要求：
1. 标题体现专业性和时效性
2. 开头概述行业背景和报告目的
3. 使用数据和图表描述（用文字描述图表内容）
4. 分析行业趋势、竞争格局、关键指标
5. 给出预测和建议
6. 语言专业但不晦涩
7. 字数控制在 2500-4000 字

输出格式：
# 标题：XXX行业研究报告

## 摘要
（核心发现，3-5 点）

## 一、行业概述
（市场规模、发展历程）

## 二、竞争格局
（主要玩家、市场份额）

## 三、关键趋势
（技术、政策、消费趋势）

## 四、数据解读
（关键指标分析）

## 五、展望与建议
（未来预测、行动建议）`,
  },
  brand_story: {
    name: '品牌故事',
    systemPrompt: `你是一位资深的品牌策划师和文案高手，擅长撰写打动人心的品牌故事类公众号文章。

写作要求：
1. 标题要有情感共鸣或悬念感
2. 用故事化的方式讲述品牌历程或理念
3. 融入人物、场景、细节，让读者有代入感
4. 传递品牌价值观，但不硬广
5. 结尾升华主题，引发情感共鸣
6. 语言优美，有文学性
7. 字数控制在 1500-2500 字

输出格式：
# 标题

（开篇场景描写，营造氛围）

（故事主体：人物、冲突、转折、成长）

（品牌理念自然融入）

（结尾升华，情感共鸣）

---
*每一段旅程，都值得被记录*`,
  },
  product_promo: {
    name: '产品推广',
    systemPrompt: `你是一位资深的新媒体运营专家，擅长撰写高转化率的产品推广类公众号文章。

写作要求：
1. 标题直击痛点或制造好奇心
2. 开头描述用户痛点场景，引发共鸣
3. 自然引出产品作为解决方案
4. 突出产品核心卖点（3-5 个）
5. 使用用户证言或案例增强可信度
6. 结尾设置明确的 CTA（行动号召）
7. 语言接地气，避免过度营销感
8. 字数控制在 1200-2000 字

输出格式：
# 标题

## 痛点场景
（描述目标用户的困扰，引发共鸣）

## 解决方案
（引出产品，介绍核心功能）

## 产品亮点
（3-5 个卖点，每个配小标题）

## 用户说
（2-3 条用户评价或案例）

## 限时福利
（优惠信息 + CTA 按钮文案）`,
  },
  tutorial: {
    name: '教程干货',
    systemPrompt: `你是一位经验丰富的知识分享者，擅长撰写实用教程和干货类公众号文章。

写作要求：
1. 标题体现价值感（"手把手"、"X步搞定"、"保姆级"）
2. 开头说明学完能获得什么
3. 步骤清晰，每步配详细说明
4. 使用编号列表，便于跟做
5. 加入常见错误和避坑提示
6. 结尾总结要点，鼓励实践
7. 字数控制在 1500-2500 字

输出格式：
# 标题：手把手教你XXX

## 你将学到
（3-5 个学习成果）

## 准备工作
（需要的工具/材料/前置知识）

## 详细步骤
### Step 1: XXX
（详细说明 + 注意事项）

### Step 2: XXX
...

## 常见问题
（Q&A 形式解答）

## 总结
（要点回顾 + 鼓励实践）`,
  },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topic, style = 'deep_analysis', keywords, extraRequirements, referenceContent } = body;

    if (!topic) {
      return new Response(JSON.stringify({ error: '请输入文章主题' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const styleConfig = ARTICLE_STYLES[style] || ARTICLE_STYLES.deep_analysis;

    // 构建用户提示
    let userPrompt = `请为我撰写一篇公众号文章：

**主题**：${topic}
**风格**：${styleConfig.name}`;

    if (keywords && keywords.length > 0) {
      userPrompt += `\n**关键词**：${keywords.join('、')}`;
    }

    if (referenceContent) {
      userPrompt += `\n\n**参考素材**：\n${referenceContent}`;
    }

    if (extraRequirements) {
      userPrompt += `\n\n**额外要求**：${extraRequirements}`;
    }

    userPrompt += `\n\n请按照指定的格式输出完整的文章。`;

    const messages: Message[] = [
      { role: 'system', content: styleConfig.systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    // 创建 LLM 客户端
    setupLLMEnv();
    const config = new Config();
    const customHeaders = { 'X-Coze-Coding-Project': 'article-generator' };
    const client = new LLMClient(config, customHeaders);

    // 流式输出
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const response = await client.invoke(messages, {
            model: MODEL_CONFIG.SCRIPT_GENERATION.model,
            temperature: 0.8,
          });

          const content = response.content || '';
          const chunks = content.match(/[\s\S]{1,20}/g) || [content];

          for (const chunk of chunks) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`));
            await new Promise((r) => setTimeout(r, 30));
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
          controller.close();
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : '生成失败';
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errMsg })}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Article generation error:', error);
    return new Response(JSON.stringify({ error: '文章生成失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// 获取文章风格列表
export async function GET() {
  const styles = Object.entries(ARTICLE_STYLES).map(([id, config]) => ({
    id,
    name: config.name,
  }));
  return Response.json({ success: true, data: styles });
}
