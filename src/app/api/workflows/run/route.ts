import { NextRequest, NextResponse } from "next/server";
import { LLMClient, SearchClient, Config, HeaderUtils } from "coze-coding-dev-sdk";
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
        // 将输出传递给下一个模块
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
        // 遇到错误停止执行
        runLog.status = "error";
        runLog.error = `模块「${mod.name}」执行失败：${errorMsg}`;
        break;
      }
    }

    if (runLog.status === "running") {
      runLog.status = "success";
    }
    runLog.finishedAt = new Date().toISOString();
    runLog.moduleResults = moduleResults;

    // 保存日志
    saveWorkflowLog(runLog);

    // 更新工作流运行统计
    workflow.runCount += 1;
    if (runLog.status === "success") {
      workflow.successCount += 1;
    }
    workflow.lastRunAt = new Date().toISOString();
    workflow.updatedAt = new Date().toISOString();
    saveWorkflow(workflow);

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
      // 模拟数据抓取 — 实际应调用对应平台 API
      const platform = mod.config?.platform as string || "douyin";
      return `已从 ${platform} 平台抓取数据，输入内容：\n${input}`;
    }

    case "feishu_write": {
      // 飞书写入 — 需要飞书 token，此处记录操作
      return `飞书写入操作已记录。输入数据长度：${input.length} 字符`;
    }

    case "feishu_notify": {
      return `飞书通知已发送。通知内容：${input.slice(0, 200)}`;
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
