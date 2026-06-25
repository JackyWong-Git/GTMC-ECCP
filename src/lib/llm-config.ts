/**
 * LLM 多模型配置 — 按工作流节点分层使用
 *
 * | 工作流节点         | 模型                          | 理由                          |
 * |-------------------|-------------------------------|-------------------------------|
 * | 热点内容分析       | doubao-seed-2-0-lite          | 高频调用，多模态，成本敏感      |
 * | 脚本大纲生成       | qwen-3-5-plus                 | 核心创作，高质量中文长文本      |
 * | 竞品内容分析       | qwen-3-5-plus                 | 多模态理解视频/图片内容         |
 * | 数据摘要/通知      | doubao-seed-2-0-mini          | 轻量文本汇总，低成本快速响应    |
 */

export const MODEL_CONFIG = {
  /** 热点内容分析 — 高频、多模态、成本敏感 */
  HOT_TOPIC_ANALYSIS: {
    model: 'doubao-seed-2-0-lite-260215',
    temperature: 0.3,
    label: 'Doubao Seed 2.0 Lite',
  },
  /** 脚本大纲生成 — 核心创作环节 */
  SCRIPT_GENERATION: {
    model: 'qwen-3-5-plus-260215',
    temperature: 0.9,
    label: 'Qwen 3.5 Plus',
  },
  /** 竞品内容分析 — 多模态理解 */
  COMPETITOR_ANALYSIS: {
    model: 'qwen-3-5-plus-260215',
    temperature: 0.5,
    label: 'Qwen 3.5 Plus',
  },
  /** 数据摘要/通知 — 轻量快速 */
  DATA_SUMMARY: {
    model: 'doubao-seed-2-0-mini-260215',
    temperature: 0.2,
    label: 'Doubao Seed 2.0 Mini',
  },
} as const;

/**
 * 用户可选模型列表 — 用于工作流编辑器中让用户选择模型
 */
export const AVAILABLE_MODELS = [
  {
    id: 'doubao-seed-2-0-lite-260215',
    label: 'Doubao Seed 2.0 Lite',
    provider: '字节跳动',
    description: '高频调用，多模态支持，成本敏感场景首选',
    category: '轻量分析',
    temperature: 0.3,
  },
  {
    id: 'doubao-seed-2-0-mini-260215',
    label: 'Doubao Seed 2.0 Mini',
    provider: '字节跳动',
    description: '轻量文本汇总，低成本快速响应',
    category: '快速摘要',
    temperature: 0.2,
  },
  {
    id: 'qwen-3-5-plus-260215',
    label: 'Qwen 3.5 Plus',
    provider: '阿里云',
    description: '高质量中文长文本，核心创作和多模态理解',
    category: '深度创作',
    temperature: 0.7,
  },
  {
    id: 'deepseek-v3-250324',
    label: 'DeepSeek V3',
    provider: 'DeepSeek',
    description: '强推理能力，适合复杂分析和逻辑推理',
    category: '逻辑推理',
    temperature: 0.6,
  },
  {
    id: 'kimi-latest',
    label: 'Kimi Latest',
    provider: '月之暗面',
    description: '超长上下文支持，适合长文档分析和总结',
    category: '长文本处理',
    temperature: 0.5,
  },
] as const;

/** 根据模型 ID 获取模型配置 */
export function getModelById(modelId: string) {
  return AVAILABLE_MODELS.find((m) => m.id === modelId) || AVAILABLE_MODELS[0];
}

/** System Prompts */
export const SYSTEM_PROMPTS = {
  HOT_TOPIC_ANALYSIS: `你是一个专业的短视频内容分析师。你的任务是分析热门视频内容，提取关键信息并评估其作为选题的价值。

请按以下格式输出分析结果：
1. **内容摘要**：一句话概括视频核心内容
2. **热度因素**：分析该视频走热的 2-3 个关键原因
3. **受众画像**：目标受众特征（年龄、兴趣）
4. **选题建议**：基于此热点，推荐 2-3 个可操作的选题方向
5. **风险提示**：可能存在的版权、舆论等风险

输出要求：简洁专业，每个要点不超过 2 行，使用中文。`,

  SCRIPT_GENERATION: `你是一个资深的短视频脚本策划师，擅长为抖音和视频号创作吸引人的内容脚本。

请根据用户提供的选题，生成一份完整的视频脚本大纲，包含：

1. **开场钩子**（前3秒）：用一个问题、冲突或悬念抓住观众注意力
2. **内容主体**（3-5个段落）：
   - 每个段落包含：核心观点 + 具体案例/数据 + 过渡语
   - 标注每段的预计时长
3. **高潮点**：全片最有传播力的一个片段设计
4. **结尾引导**：互动引导（评论/关注/转发）
5. **拍摄建议**：场景、道具、字幕风格建议

风格要求：口语化、节奏快、信息密度高、适合竖屏短视频。
字数要求：1500-2500字。`,

  DATA_SUMMARY: `你是一个数据分析助手，负责为运营团队生成简洁的数据摘要报告。

请按以下格式输出：
1. **核心指标**：总播放、总点赞、总评论、平均互动率
2. **趋势分析**：与上一周期对比的变化趋势
3. **TOP内容**：表现最好的 3 个内容及原因分析
4. **优化建议**：基于数据的 2-3 条可执行建议

输出要求：数据准确、结论清晰、建议可操作，使用中文。`,
} as const;
