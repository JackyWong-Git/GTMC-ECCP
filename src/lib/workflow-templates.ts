/**
 * 工作流模板库
 * 预设完整的工作流配置，用户可一键克隆使用
 */

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: 'content' | 'data' | 'topic' | 'story' | 'custom';
  icon: string;
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: string;
  modules: TemplateModule[];
}

interface TemplateModule {
  type: string;
  name: string;
  description: string;
  config: Record<string, unknown>;
  modelId?: string;
  prompt?: string;
  enabled: boolean;
}

// ==================== 模板定义 ====================

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  // 模板 1：视频脚本全流程生成器
  {
    id: 'tpl_video_script',
    name: '视频脚本全流程生成器',
    description: '从热点抓取到分镜脚本，一站式生成完整视频内容。自动分析热点话题，生成口播脚本、分镜表和补拍清单，最终存入知识库。',
    category: 'content',
    icon: 'Video',
    tags: ['视频', '脚本', '热点', '分镜'],
    difficulty: 'intermediate',
    estimatedTime: '3-5 分钟',
    modules: [
      {
        type: 'web_search',
        name: '热点素材搜索',
        description: '搜索目标话题的最新热点素材和竞品内容',
        config: { maxResults: 10 },
        prompt: '搜索"{input}"相关的最新热点内容、爆款视频和竞品分析',
        enabled: true,
      },
      {
        type: 'llm_analysis',
        name: '素材分析提炼',
        description: '分析搜索结果，提炼核心卖点和内容方向',
        config: {},
        modelId: 'doubao-seed-2-0-lite-260215',
        prompt: `请分析以下搜索结果，提炼出：
1. 3个核心内容方向
2. 每个方向的差异化切入点
3. 目标受众画像
4. 建议的视频时长和节奏

搜索内容：
{input}`,
        enabled: true,
      },
      {
        type: 'llm_generate',
        name: '口播脚本生成',
        description: '生成自然流畅的口播脚本',
        config: {},
        modelId: 'qwen-3-5-plus-260215',
        prompt: `基于以下分析结果，生成一段 60-90 秒的口播脚本：

分析结果：{input}

要求：
1. 开头 3 秒必须有强钩子（提问/冲突/悬念）
2. 语言口语化，像朋友聊天
3. 每 15 秒一个信息转折点
4. 结尾有明确的行动号召（CTA）
5. 标注【停顿】【强调】【手势】等表演提示`,
        enabled: true,
      },
      {
        type: 'llm_generate',
        name: '分镜脚本生成',
        description: '生成详细的分镜表和拍摄指导',
        config: {},
        modelId: 'qwen-3-5-plus-260215',
        prompt: `基于以下口播脚本，生成分镜脚本：

口播脚本：{input}

请按以下格式输出：

## 分镜表
| 镜号 | 时间 | 画面描述 | 口播内容 | 拍摄角度 | 备注 |
|------|------|----------|----------|----------|------|

## 补拍清单
- 需要额外拍摄的 B-roll 素材
- 产品特写镜头
- 场景转换镜头

## 后期建议
- 字幕样式
- BGM 风格
- 转场效果`,
        enabled: true,
      },
      {
        type: 'transform',
        name: '提取台账数据',
        description: '将脚本内容格式化为台账记录',
        config: {
          operation: 'extract',
          fields: ['title', 'content', 'contentType'],
        },
        enabled: true,
      },
      {
        type: 'knowledge_save',
        name: '存入知识库',
        description: '将生成的脚本存入云文档知识库',
        config: {
          contentType: '脚本',
          status: '待审核',
        },
        enabled: true,
      },
    ],
  },

  // 模板 2：数据周报自动化
  {
    id: 'tpl_weekly_report',
    name: '数据周报自动化',
    description: '自动汇总一周运营数据，生成可视化分析报告并通知团队。支持多平台数据整合、趋势分析和异常预警。',
    category: 'data',
    icon: 'BarChart3',
    tags: ['数据', '周报', '自动化', '通知'],
    difficulty: 'beginner',
    estimatedTime: '1-2 分钟',
    modules: [
      {
        type: 'llm_analysis',
        name: '数据趋势分析',
        description: '分析运营数据，识别趋势和异常',
        config: {},
        modelId: 'doubao-seed-2-0-lite-260215',
        prompt: `请分析以下运营数据，生成周报摘要：

{input}

分析维度：
1. 本周核心指标（播放量、点赞、评论、分享）
2. 环比变化趋势（vs 上周）
3. 异常数据标注（涨幅>50%或跌幅>30%）
4. 表现最好的 3 条内容
5. 改进建议

输出格式：Markdown 表格 + 要点总结`,
        enabled: true,
      },
      {
        type: 'llm_generate',
        name: '周报内容生成',
        description: '生成结构化的周报内容',
        config: {},
        modelId: 'doubao-seed-2-0-mini-260215',
        prompt: `基于以下数据分析结果，生成一份运营周报：

分析结果：{input}

周报结构：
# 运营周报（本周）

## 核心数据
| 指标 | 本周 | 上周 | 变化 |
|------|------|------|------|

## 亮点内容
（列出表现最好的 3 条内容及原因）

## 问题与改进
（识别的问题 + 具体改进建议）

## 下周计划
（基于数据趋势的 3 条行动建议）`,
        enabled: true,
      },
      {
        type: 'knowledge_save',
        name: '存入知识库',
        description: '将周报存入云文档知识库',
        config: {
          contentType: '报告',
          status: '已完成',
        },
        enabled: true,
      },
      {
        type: 'knowledge_save',
        name: '通知团队',
        description: '将周报存入知识库供团队查阅',
        config: {
          contentType: '通知',
          messageTemplate: '运营周报已生成！\n\n核心数据：\n{summary}\n\n查看详情请前往知识库。',
        },
        enabled: true,
      },
    ],
  },

  // 模板 3：选题热度评估
  {
    id: 'tpl_topic_evaluator',
    name: '选题热度评估器',
    description: '自动评估选题的爆款潜力，从多个维度打分并给出优化建议。帮助运营团队快速筛选高价值选题。',
    category: 'topic',
    icon: 'Target',
    tags: ['选题', '评估', '热度', 'AI分析'],
    difficulty: 'beginner',
    estimatedTime: '30秒-1分钟',
    modules: [
      {
        type: 'web_search',
        name: '竞品内容搜索',
        description: '搜索同类选题的竞品内容表现',
        config: { maxResults: 8 },
        prompt: '搜索"{input}"相关的爆款内容，包括高播放量的视频和文章',
        enabled: true,
      },
      {
        type: 'llm_analysis',
        name: '热度评估分析',
        description: '多维度评估选题的爆款潜力',
        config: {},
        modelId: 'doubao-seed-2-0-lite-260215',
        prompt: `请对以下选题进行热度评估：

选题：{input}

竞品数据：
{search_results}

评估维度（每项 1-10 分）：
1. **时效性**：是否是当前热点？
2. **受众广度**：目标受众规模如何？
3. **差异化空间**：能否做出差异化内容？
4. **制作难度**：内容制作复杂度
5. **变现潜力**：商业价值评估

输出格式：
## 选题评分卡
| 维度 | 评分 | 说明 |
|------|------|------|

## 综合评分：X/50

## 优化建议
（3条具体的优化方向）

## 竞品参考
（列出 3 个可参考的爆款内容及可借鉴点）`,
        enabled: true,
      },
      {
        type: 'llm_generate',
        name: '内容方向建议',
        description: '基于评估结果生成内容方向建议',
        config: {},
        modelId: 'doubao-seed-2-0-mini-260215',
        prompt: `基于以下选题评估结果，生成 3 个具体的内容方向：

评估结果：{input}

每个方向包含：
1. 内容角度
2. 标题建议（3个备选）
3. 开头钩子设计
4. 差异化切入点`,
        enabled: true,
      },
      {
        type: 'knowledge_save',
        name: '存入选题库',
        description: '将评估结果存入知识库选题池',
        config: {
          contentType: '选题',
          status: '待决策',
        },
        enabled: true,
      },
    ],
  },

  // 模板 4：员工故事采集器
  {
    id: 'tpl_employee_story',
    name: '员工故事双阶段采集器',
    description: '通过对话式引导采集员工真实故事，生成"差距线"叙事结构的双版本内容（完整版+精华版）。',
    category: 'story',
    icon: 'BookOpen',
    tags: ['故事', '采访', '企业文化', '叙事'],
    difficulty: 'advanced',
    estimatedTime: '5-10 分钟',
    modules: [
      {
        type: 'llm_generate',
        name: '采访引导提问',
        description: '扮演采访者角色，生成引导性问题',
        config: {},
        modelId: 'qwen-3-5-plus-260215',
        prompt: `你是一位专业的企业文化采访者。请基于以下员工信息，生成 5 个引导性采访问题：

员工信息：{input}

采访目标：挖掘"从困难到成长"的真实故事

问题设计原则：
1. 从具体场景切入（不要问"你有什么感受"）
2. 追问细节（时间、地点、人物、对话）
3. 寻找"转折点"（什么时候开始改变？）
4. 挖掘"差距线"（之前的认知 vs 之后的认知）

输出格式：
## 采访问题清单
1. [场景还原] ...
2. [细节追问] ...
3. [转折挖掘] ...
4. [认知对比] ...
5. [成长总结] ...`,
        enabled: true,
      },
      {
        type: 'llm_analysis',
        name: '故事素材提炼',
        description: '从采访回答中提炼故事核心要素',
        config: {},
        modelId: 'doubao-seed-2-0-lite-260215',
        prompt: `请从以下采访记录中提炼故事核心要素：

采访记录：{input}

提炼维度：
1. **差距线**：之前的认知 → 触发事件 → 之后的认知
2. **关键场景**：最有画面感的 3 个场景
3. **情感弧线**：情绪变化轨迹
4. **金句提取**：可直接引用的原话

输出格式：
## 差距线
- 之前：...
- 转折：...
- 之后：...

## 关键场景
1. ...
2. ...
3. ...

## 情感弧线
... → ... → ...

## 可用金句
- "..."
- "..."`,
        enabled: true,
      },
      {
        type: 'llm_generate',
        name: '双版本故事生成',
        description: '生成完整版和精华版两个版本',
        config: {},
        modelId: 'qwen-3-5-plus-260215',
        prompt: `基于以下故事素材，生成两个版本的故事：

故事素材：{input}

## 版本 A：完整版（800-1200 字）
- 完整的叙事弧线
- 丰富的场景描写
- 适合内刊/公众号

## 版本 B：精华版（200-300 字）
- 聚焦"差距线"核心
- 适合海报/短视频文案
- 结尾有金句收束

写作风格：
- 真实、克制、不煽情
- 用细节说话，不用形容词堆砌
- 保留员工原话的温度`,
        enabled: true,
      },
      {
        type: 'knowledge_save',
        name: '存入故事库',
        description: '将故事存入云文档知识库',
        config: {
          contentType: '故事',
          status: '待审核',
        },
        enabled: true,
      },
    ],
  },

  // 模板 5：多平台内容拆解器
  {
    id: 'tpl_content_adapter',
    name: '多平台内容拆解器',
    description: '将一份原始内容自动拆解为适配抖音、视频号、K站等多平台的差异化内容。',
    category: 'content',
    icon: 'Layers',
    tags: ['多平台', '内容拆解', '适配', '分发'],
    difficulty: 'intermediate',
    estimatedTime: '2-3 分钟',
    modules: [
      {
        type: 'llm_analysis',
        name: '原始内容理解',
        description: '分析原始内容的核心信息和卖点',
        config: {},
        modelId: 'doubao-seed-2-0-lite-260215',
        prompt: `请分析以下内容，提取核心信息：

{input}

提取维度：
1. 核心主题（一句话概括）
2. 3个核心卖点
3. 目标受众画像
4. 可调用的素材（数据/案例/金句）`,
        enabled: true,
      },
      {
        type: 'llm_generate',
        name: '抖音口播版',
        description: '生成适配抖音的短视频脚本',
        config: {},
        modelId: 'qwen-3-5-plus-260215',
        prompt: `基于以下核心信息，生成抖音口播脚本（30-60秒）：

核心信息：{input}

抖音平台特点：
- 开头 3 秒强钩子
- 口语化、节奏快
- 信息密度高、不废话
- 结尾引导互动

输出：
## 抖音脚本
[口播内容]

## 标题建议（3个）
1. ...
2. ...
3. ...

## 话题标签
#... #... #...`,
        enabled: true,
      },
      {
        type: 'llm_generate',
        name: '视频号深度版',
        description: '生成适配视频号的深度内容',
        config: {},
        modelId: 'qwen-3-5-plus-260215',
        prompt: `基于以下核心信息，生成视频号内容（2-3分钟）：

核心信息：{input}

视频号平台特点：
- 受众偏成熟（30-50岁）
- 偏好深度、有观点的内容
- 适合知识分享、行业洞察
- 可引导关注公众号

输出：
## 视频号脚本
[开场引入] → [核心观点] → [案例支撑] → [总结升华]

## 标题建议
（偏专业、有观点）

## 公众号推文大纲
（可同步发布的图文版本）`,
        enabled: true,
      },
      {
        type: 'llm_generate',
        name: 'K站图文版',
        description: '生成适配KILAKILA的图文内容',
        config: {},
        modelId: 'doubao-seed-2-0-mini-260215',
        prompt: `基于以下核心信息，生成K站图文内容：

核心信息：{input}

K站特点：
- 小程序生态，碎片化阅读
- 偏好实用、可收藏的内容
- 图文结合，重点突出

输出：
## K站图文
### 标题
### 导语（50字内）
### 正文（分 3-5 个要点，每点配图建议）
### 收藏引导语`,
        enabled: true,
      },
      {
        type: 'knowledge_save',
        name: '批量存入知识库',
        description: '将各平台内容分别存入知识库',
        config: {
          contentType: '多平台内容',
          status: '待发布',
        },
        enabled: true,
      },
    ],
  },

  // 模板 6：深度研究选题评估器
  {
    id: 'tpl_deep_research',
    name: '深度研究选题评估器',
    description: '多轮搜索 → 信息提取 → 发现知识缺口 → 补充搜索 → 综合研究报告。像资深编辑一样把一个选题研究透彻，输出可直接用于决策的深度分析报告。',
    category: 'topic',
    icon: 'Search',
    tags: ['深度研究', '多轮搜索', '知识缺口', '综合报告'],
    difficulty: 'advanced',
    estimatedTime: '5-8 分钟',
    modules: [
      {
        type: 'web_search',
        name: '第一轮广度搜索',
        description: '围绕选题进行广度搜索，收集多方观点和数据',
        config: { maxResults: 12 },
        prompt: '搜索"{input}"的最新资讯、行业报告、专家观点和数据统计',
        enabled: true,
      },
      {
        type: 'llm_analysis',
        name: '信息提取与缺口发现',
        description: '分析搜索结果，提取已知信息并识别知识缺口',
        config: {},
        modelId: 'doubao-seed-2-0-lite-260215',
        prompt: `请分析以下搜索结果，完成两项任务：

搜索结果：{search_results}

## 任务 1：信息提取
列出已获取的关键事实、数据、观点（至少 5 条）

## 任务 2：知识缺口识别
指出以下方面的信息缺失：
1. 数据支撑（缺哪些具体数字？）
2. 反面观点（有没有对立的声音？）
3. 用户视角（真实用户怎么说？）
4. 时间维度（历史趋势和未来预测？）
5. 竞品对比（同类产品/内容怎么做的？）

## 任务 3：补充搜索建议
生成 3 条精准的补充搜索关键词，用于填补上述缺口`,
        enabled: true,
      },
      {
        type: 'web_search',
        name: '第二轮精准搜索',
        description: '基于知识缺口进行精准补充搜索',
        config: { maxResults: 8 },
        prompt: '搜索"{input}"的用户真实评价、反面观点、失败案例和对比分析',
        enabled: true,
      },
      {
        type: 'llm_analysis',
        name: '竞品内容拆解',
        description: '拆解同类爆款内容的成功要素',
        config: {},
        modelId: 'doubao-seed-2-0-lite-260215',
        prompt: `请基于以下两轮搜索结果，拆解竞品内容的成功要素：

第一轮搜索：{search_results}
第二轮补充：{input}

拆解维度：
1. **内容结构**：爆款内容的叙事框架是什么？
2. **钩子设计**：前 3 秒/前 3 行怎么抓人？
3. **数据运用**：如何用数据增强说服力？
4. **情感触发**：触发了什么情绪？（好奇/焦虑/共鸣/愤怒）
5. **差异化空间**：哪些角度还没被覆盖？我们可以怎么做？`,
        enabled: true,
      },
      {
        type: 'llm_generate',
        name: '综合研究报告',
        description: '整合所有信息，生成可决策的深度研究报告',
        config: {},
        modelId: 'qwen-3-5-plus-260215',
        prompt: `基于以下深度研究素材，生成一份完整的选题研究报告：

研究素材：{input}

# 深度研究报告

## 一、选题概述
（一句话定义这个选题的核心价值）

## 二、市场现状
| 维度 | 现状 | 数据来源 |
|------|------|----------|
（至少 5 个维度的数据支撑）

## 三、受众洞察
- **核心受众**：谁最关心这个话题？
- **痛点**：他们最想解决什么问题？
- **信息缺口**：现有内容没满足他们什么需求？

## 四、竞品分析
| 竞品内容 | 亮点 | 不足 | 可借鉴 |
|----------|------|------|--------|
（至少 3 个竞品）

## 五、内容策略建议
### 推荐角度 1：[角度名]
- 切入点：...
- 标题备选：...
- 预估热度：⭐⭐⭐⭐⭐

### 推荐角度 2：[角度名]
- 切入点：...
- 标题备选：...
- 预估热度：⭐⭐⭐⭐

### 推荐角度 3：[角度名]
- 切入点：...
- 标题备选：...
- 预估热度：⭐⭐⭐

## 六、风险提示
（可能踩的坑、敏感点、版权风险）

## 七、行动清单
- [ ] 第一步：...
- [ ] 第二步：...
- [ ] 第三步：...`,
        enabled: true,
      },
      {
        type: 'knowledge_save',
        name: '存入选题库',
        description: '将深度研究报告存入知识库选题池',
        config: {
          contentType: '深度研究',
          status: '待决策',
        },
        enabled: true,
      },
    ],
  },
];

// ==================== 工具函数 ====================

/**
 * 获取所有模板
 */
export function getAllTemplates(): WorkflowTemplate[] {
  return WORKFLOW_TEMPLATES;
}

/**
 * 根据 ID 获取模板
 */
export function getTemplateById(id: string): WorkflowTemplate | undefined {
  return WORKFLOW_TEMPLATES.find(t => t.id === id);
}

/**
 * 根据分类获取模板
 */
export function getTemplatesByCategory(category: string): WorkflowTemplate[] {
  return WORKFLOW_TEMPLATES.filter(t => t.category === category);
}

/**
 * 搜索模板
 */
export function searchTemplates(query: string): WorkflowTemplate[] {
  const lowerQuery = query.toLowerCase();
  return WORKFLOW_TEMPLATES.filter(t =>
    t.name.toLowerCase().includes(lowerQuery) ||
    t.description.toLowerCase().includes(lowerQuery) ||
    t.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
}
