import fs from "fs";
import path from "path";

/** 工作流模块类型 */
export type ModuleType =
  | "llm_analysis"
  | "llm_generate"
  | "llm_summary"
  | "web_search"
  | "data_fetch"
  | "feishu_write"
  | "feishu_notify"
  | "condition"
  | "transform";

/** 工作流模块定义 */
export interface WorkflowModule {
  id: string;
  type: ModuleType;
  name: string;
  description: string;
  config: Record<string, unknown>;
  modelId?: string;
  prompt?: string;
  enabled: boolean;
}

/** 工作流定义 */
export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  status: "active" | "paused" | "draft";
  trigger: "manual" | "schedule" | "event";
  schedule?: string;
  modules: WorkflowModule[];
  createdAt: string;
  updatedAt: string;
  lastRunAt?: string;
  runCount: number;
  successCount: number;
}

/** 工作流执行日志 */
export interface WorkflowRunLog {
  id: string;
  workflowId: string;
  workflowName: string;
  status: "running" | "success" | "error";
  startedAt: string;
  finishedAt?: string;
  moduleResults: ModuleRunResult[];
  error?: string;
}

export interface ModuleRunResult {
  moduleId: string;
  moduleName: string;
  status: "success" | "error" | "skipped";
  output?: string;
  error?: string;
  duration: number;
}

const STORE_PATH = path.join(process.cwd(), ".workflows.json");

function readStore(): { workflows: WorkflowDefinition[]; logs: WorkflowRunLog[] } {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, "utf-8");
      return JSON.parse(raw);
    }
  } catch {
    // ignore
  }
  return { workflows: [], logs: [] };
}

function writeStore(data: { workflows: WorkflowDefinition[]; logs: WorkflowRunLog[] }): void {
  fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), "utf-8");
}

export function getWorkflows(): WorkflowDefinition[] {
  return readStore().workflows;
}

export function getWorkflow(id: string): WorkflowDefinition | undefined {
  return readStore().workflows.find((w) => w.id === id);
}

export function saveWorkflow(workflow: WorkflowDefinition): void {
  const store = readStore();
  const idx = store.workflows.findIndex((w) => w.id === workflow.id);
  if (idx >= 0) {
    store.workflows[idx] = workflow;
  } else {
    store.workflows.push(workflow);
  }
  writeStore(store);
}

export function deleteWorkflow(id: string): void {
  const store = readStore();
  store.workflows = store.workflows.filter((w) => w.id !== id);
  writeStore(store);
}

export function getWorkflowLogs(workflowId?: string): WorkflowRunLog[] {
  const store = readStore();
  if (workflowId) {
    return store.logs.filter((l) => l.workflowId === workflowId);
  }
  return store.logs;
}

export function saveWorkflowLog(log: WorkflowRunLog): void {
  const store = readStore();
  store.logs.unshift(log);
  // 只保留最近 100 条日志
  if (store.logs.length > 100) {
    store.logs = store.logs.slice(0, 100);
  }
  writeStore(store);
}

/** 生成唯一 ID */
export function generateId(): string {
  return `wf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** 生成模块 ID */
export function generateModuleId(): string {
  return `mod_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

/** 预置模块模板 */
export const MODULE_TEMPLATES: Record<ModuleType, Omit<WorkflowModule, "id">> = {
  llm_analysis: {
    type: "llm_analysis",
    name: "AI 内容分析",
    description: "使用大模型分析文本/图片/视频内容",
    config: {},
    modelId: "doubao-seed-2-0-lite-260215",
    prompt: "请分析以下内容并给出关键信息：",
    enabled: true,
  },
  llm_generate: {
    type: "llm_generate",
    name: "AI 内容生成",
    description: "使用大模型生成脚本/文案/标题等内容",
    config: {},
    modelId: "qwen-3-5-plus-260215",
    prompt: "请根据以下主题生成内容：",
    enabled: true,
  },
  llm_summary: {
    type: "llm_summary",
    name: "AI 摘要总结",
    description: "使用大模型对数据进行汇总和摘要",
    config: {},
    modelId: "doubao-seed-2-0-mini-260215",
    prompt: "请对以下数据进行摘要总结：",
    enabled: true,
  },
  web_search: {
    type: "web_search",
    name: "网络搜索",
    description: "搜索互联网获取实时信息和热点数据",
    config: { maxResults: 10 },
    enabled: true,
  },
  data_fetch: {
    type: "data_fetch",
    name: "数据抓取",
    description: "从指定平台抓取数据（抖音/视频号等）",
    config: { platform: "douyin", dataType: "trending" },
    enabled: true,
  },
  feishu_write: {
    type: "feishu_write",
    name: "飞书写入",
    description: "将数据写入飞书多维表或文档",
    config: { target: "bitable" },
    enabled: true,
  },
  feishu_notify: {
    type: "feishu_notify",
    name: "飞书通知",
    description: "向飞书群发送通知消息",
    config: { messageType: "text" },
    enabled: true,
  },
  condition: {
    type: "condition",
    name: "条件判断",
    description: "根据条件决定执行路径",
    config: { field: "", operator: "contains", value: "" },
    enabled: true,
  },
  transform: {
    type: "transform",
    name: "数据转换",
    description: "对数据进行格式化、过滤、映射等转换操作",
    config: { operation: "filter" },
    enabled: true,
  },
};
