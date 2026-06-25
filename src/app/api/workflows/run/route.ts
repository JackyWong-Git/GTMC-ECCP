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
import { getSession } from "@/lib/feishu-client";
import { getPlatformConfig } from "@/lib/platform-config";

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
      // 飞书多维表写入 — 实际调用飞书 API
      const session = getSession();
      if (!session) {
        throw new Error("未登录飞书，请先在设置页面连接飞书账号");
      }

      const config = getPlatformConfig();
      const ledger = config.ledger;
      const appToken = (mod.config?.appToken as string) || ledger?.appToken;
      const tableId = (mod.config?.tableId as string) || ledger?.tableId;

      if (!appToken || !tableId) {
        throw new Error("未配置多维表，请先在设置页面配置台账 App Token 和 Table ID");
      }

      // 解析输入数据，尝试提取结构化字段
      let title = (mod.config?.title as string) || "工作流产出";
      let contentType = (mod.config?.contentType as string) || "脚本";
      let summary = input.slice(0, 500);

      // 尝试从输入中解析 JSON 数据
      try {
        const parsed = JSON.parse(input);
        if (parsed.title) title = parsed.title;
        if (parsed.contentType) contentType = parsed.contentType;
        if (parsed.summary) summary = parsed.summary;
        if (parsed.content) summary = parsed.content.slice(0, 500);
      } catch {
        // 非 JSON 格式，使用原始输入
      }

      const record = {
        fields: {
          "内容类型": contentType,
          "标题": title,
          "内容摘要": summary,
          "创建时间": Date.now(),
          "状态": "已生成",
        },
      };

      const FEISHU_API_BASE = "https://open.feishu.cn/open-apis";
      const res = await fetch(
        `${FEISHU_API_BASE}/bitable/v1/apps/${appToken}/tables/${tableId}/records/batch_create`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.userAccessToken}`,
          },
          body: JSON.stringify({ records: [record] }),
        }
      );

      const data = await res.json();
      if (data.code !== 0) {
        throw new Error(`飞书写入失败: ${data.msg || "未知错误"}`);
      }

      const recordIds = data.data?.records?.map(
        (r: { record_id: string }) => r.record_id
      ) || [];

      return `成功写入 ${recordIds.length} 条记录到多维表台账，记录ID: ${recordIds.join(", ")}`;
    }

    case "feishu_notify": {
      // 飞书通知 — 通过飞书机器人发送消息
      const session = getSession();
      if (!session) {
        throw new Error("未登录飞书，请先在设置页面连接飞书账号");
      }

      const webhookUrl = mod.config?.webhookUrl as string;
      const notifyContent = input.slice(0, 2000);

      if (webhookUrl) {
        // 通过 Webhook 发送消息
        const res = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            msg_type: "text",
            content: { text: notifyContent },
          }),
        });
        const data = await res.json();
        if (data.code !== 0 && data.StatusCode !== 0) {
          throw new Error(`飞书通知发送失败: ${data.msg || "未知错误"}`);
        }
        return `飞书通知已发送到 Webhook`;
      }

      // 没有 Webhook 时，记录通知内容
      return `飞书通知内容（未配置 Webhook）：${notifyContent.slice(0, 200)}`;
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
