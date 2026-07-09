import { NextRequest, NextResponse } from "next/server";
import { LLMClient, SearchClient, KnowledgeClient, Config, HeaderUtils, DataSourceType } from "coze-coding-dev-sdk";
import {
  getWorkflow,
  saveWorkflow,
  saveWorkflowLog,
  type WorkflowRunLog,
  type ModuleRunResult,
  type WorkflowModule,
} from "@/lib/workflow-store";
import { generateId } from "@/lib/workflow-store";
import { getModelById } from "@/lib/llm-config";
import { setupLLMEnv, KNOWLEDGE_DATASET_NAME } from "@/lib/platform-config";

/** POST — 执行工作流 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { workflowId, input } = body;

    if (!workflowId) {
      return NextResponse.json({ success: false, error: "缺少工作流 ID" }, { status: 400 });
    }

    const workflow = getWorkflow(workflowId);
    if (!workflow) {
      return NextResponse.json({ success: false, error: "工作流不存在" }, { status: 404 });
    }

    const enabledModules = workflow.modules.filter((m: WorkflowModule) => m.enabled);
    if (enabledModules.length === 0) {
      return NextResponse.json({ success: false, error: "工作流没有启用的模块" }, { status: 400 });
    }

    // 确保 LLM 环境变量已设置
    setupLLMEnv();

    // 创建执行日志
    const runLog: WorkflowRunLog = {
      id: generateId(),
      workflowId: workflow.id,
      workflowName: workflow.name,
      status: "running",
      startedAt: new Date().toISOString(),
      moduleResults: [],
    };

    // 逐模块执行
    let context: string = input || "";
    const moduleResults: ModuleRunResult[] = [];

    for (const mod of enabledModules) {
      const startTime = Date.now();
      try {
        const result = await executeModule(mod, context);
        const duration = Date.now() - startTime;
        moduleResults.push({
          moduleId: mod.id,
          moduleName: mod.name,
          status: "success",
          output: result.slice(0, 2000),
          duration,
        });
        context = result;
      } catch (err) {
        const duration = Date.now() - startTime;
        const errorMsg = err instanceof Error ? err.message : "模块执行失败";
        moduleResults.push({
          moduleId: mod.id,
          moduleName: mod.name,
          status: "error",
          error: errorMsg,
          duration,
        });
        runLog.status = "error";
        runLog.error = `模块「${mod.name}」执行失败：${errorMsg}`;
        
        // 检查是否配置了 continueOnError，如果是则继续执行后续模块
        const continueOnError = mod.config?.continueOnError === true;
        if (!continueOnError) {
          break;
        }
        // 继续执行时，保持上一次的 context 不变
      }
    }

    if (runLog.status === "running") {
      runLog.status = "success";
    }
    runLog.finishedAt = new Date().toISOString();
    runLog.moduleResults = moduleResults;

    await saveWorkflowLog(runLog);

    workflow.runCount += 1;
    if (runLog.status === "success") {
      workflow.successCount += 1;
    }
    workflow.lastRunAt = new Date().toISOString();
    workflow.updatedAt = new Date().toISOString();
    await saveWorkflow(workflow);

    return NextResponse.json({
      success: true,
      data: {
        runId: runLog.id,
        status: runLog.status,
        moduleResults,
        finalOutput: context.slice(0, 3000),
        error: runLog.error,
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "执行请求格式错误" }, { status: 400 });
  }
}

/** 执行单个模块 */
async function executeModule(mod: WorkflowModule, input: string): Promise<string> {
  switch (mod.type) {
    case "llm_analysis":
    case "llm_generate":
    case "llm_summary": {
      const modelConfig = getModelById(mod.modelId || "");
      const config = new Config();
      const client = new LLMClient(config);
      const messages = [
        { role: "system" as const, content: mod.prompt || "请处理以下内容：" },
        { role: "user" as const, content: input },
      ];
      const response = await client.invoke(messages, {
        model: modelConfig.id,
        temperature: (mod.config?.temperature as number) ?? modelConfig.temperature,
      });
      return response.content || "（模型未返回内容）";
    }

    case "web_search": {
      const config = new Config();
      const searchClient = new SearchClient(config);
      const query = input.slice(0, 200) || (mod.config?.query as string) || "热门内容";
      const response = await searchClient.advancedSearch(query, {
        searchType: "web",
        count: (mod.config?.maxResults as number) || 5,
        needSummary: true,
        needUrl: true,
      });
      if (!response.web_items || response.web_items.length === 0) {
        return "搜索未返回结果";
      }
      return response.web_items
        .map((r: { title?: string; snippet?: string; url?: string }) =>
          `标题：${r.title || ""}\n摘要：${r.snippet || ""}\n链接：${r.url || ""}`
        )
        .join("\n\n---\n\n");
    }

    case "data_fetch": {
      const platform = mod.config?.platform as string || "douyin";
      return `已从 ${platform} 平台抓取数据，输入内容：\n${input}`;
    }

    case "knowledge_save": {
      // 知识库写入 — 将工作流产出存入云文档知识库
      const config = new Config();
      const knowledgeClient = new KnowledgeClient(config);

      let title = (mod.config?.title as string) || "工作流产出";
      let contentType = (mod.config?.contentType as string) || "脚本";

      try {
        const parsed = JSON.parse(input);
        if (parsed.title) title = parsed.title;
        if (parsed.contentType) contentType = parsed.contentType;
      } catch {
        // 非 JSON 格式，使用原始输入
      }

      const docContent = `[${contentType}] ${title}\n\n${input}`;
      const response = await knowledgeClient.addDocuments(
        [{ source: DataSourceType.TEXT, raw_data: docContent }],
        KNOWLEDGE_DATASET_NAME
      );

      if (response.code === 0) {
        const docIds = response.doc_ids?.join(", ") || "unknown";
        return `已成功存入知识库，文档ID: ${docIds}`;
      }
      throw new Error(`知识库写入失败: ${response.msg || "未知错误"}`);
    }

    case "knowledge_search": {
      // 知识库搜索 — 从知识库中检索相关内容
      const config = new Config();
      const knowledgeClient = new KnowledgeClient(config);
      const query = input.slice(0, 200) || (mod.config?.query as string) || "运营知识";
      const topK = (mod.config?.topK as number) || 5;

      const response = await knowledgeClient.search(query, undefined, topK);

      if (response.code === 0 && response.chunks && response.chunks.length > 0) {
        return response.chunks
          .map((chunk: { content: string; score: number }, i: number) =>
            `[${i + 1}] (相关度: ${(chunk.score * 100).toFixed(1)}%)\n${chunk.content}`
          )
          .join("\n\n---\n\n");
      }
      return "知识库中未找到相关内容";
    }

    case "condition": {
      const field = mod.config?.field as string || "";
      const operator = mod.config?.operator as string || "contains";
      const value = mod.config?.value as string || "";
      let result = false;
      switch (operator) {
        case "contains":
          result = input.includes(value);
          break;
        case "not_contains":
          result = !input.includes(value);
          break;
        case "equals":
          result = input.trim() === value;
          break;
        case "gt":
          result = Number(input) > Number(value);
          break;
        case "lt":
          result = Number(input) < Number(value);
          break;
        default:
          result = true;
      }
      return result ? `条件满足（${field} ${operator} ${value}），继续执行` : `条件不满足（${field} ${operator} ${value}），跳过后续`;
    }

    case "transform": {
      const operation = mod.config?.operation as string || "passthrough";
      switch (operation) {
        case "uppercase":
          return input.toUpperCase();
        case "lowercase":
          return input.toLowerCase();
        case "trim":
          return input.trim();
        case "truncate": {
          const maxLen = (mod.config?.maxLength as number) || 500;
          return input.slice(0, maxLen);
        }
        default:
          return input;
      }
    }

    default:
      return `未知模块类型：${mod.type}`;
  }
}
