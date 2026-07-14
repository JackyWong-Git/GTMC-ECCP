import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

/**
 * POST /api/dify-workflow
 * 执行 Dify 工作流
 * 
 * 参考：
 * - https://github.com/langgenius/dify
 * - https://github.com/BannyLon/DifyAIA
 * - https://github.com/svcvit/Awesome-Dify-Workflow
 */

interface DifyConfig {
  apiKey: string;
  baseUrl: string;
}

interface WorkflowInput {
  workflowId: string;
  inputs: Record<string, unknown>;
  responseMode?: "blocking" | "streaming";
}

interface WorkflowResult {
  task_id: string;
  workflow_run_id: string;
  data: {
    id: string;
    workflow_id: string;
    status: string;
    outputs: Record<string, unknown>;
    created_at: number;
    finished_at: number;
  };
}

// 读取配置
function getConfig(): DifyConfig | null {
  const configPath = join(process.cwd(), ".platform-config.json");
  
  if (!existsSync(configPath)) {
    return null;
  }

  try {
    const config = JSON.parse(readFileSync(configPath, "utf-8"));
    if (config.dify?.apiKey && config.dify?.baseUrl) {
      return {
        apiKey: config.dify.apiKey,
        baseUrl: config.dify.baseUrl,
      };
    }
  } catch {
    return null;
  }

  return null;
}

// 调用 Dify API 执行工作流
async function executeDifyWorkflow(
  config: DifyConfig,
  input: WorkflowInput
): Promise<WorkflowResult> {
  const response = await fetch(`${config.baseUrl}/v1/workflows/run`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: input.inputs,
      response_mode: input.responseMode || "blocking",
      user: "system",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Dify API error: ${error}`);
  }

  return response.json();
}

// 获取工作流列表
async function getDifyWorkflows(config: DifyConfig): Promise<unknown[]> {
  const response = await fetch(`${config.baseUrl}/v1/workflows`, {
    headers: {
      "Authorization": `Bearer ${config.apiKey}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch workflows");
  }

  const data = await response.json();
  return data.data || [];
}

export async function GET() {
  const config = getConfig();

  if (!config) {
    return NextResponse.json(
      { error: "Dify 未配置，请先在系统设置中配置 Dify API" },
      { status: 400 }
    );
  }

  try {
    const workflows = await getDifyWorkflows(config);
    return NextResponse.json({
      success: true,
      data: { workflows },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "获取工作流列表失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const config = getConfig();

  if (!config) {
    return NextResponse.json(
      { error: "Dify 未配置，请先在系统设置中配置 Dify API" },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const { workflowId, inputs, responseMode } = body;

    if (!workflowId) {
      return NextResponse.json(
        { error: "缺少工作流 ID" },
        { status: 400 }
      );
    }

    const result = await executeDifyWorkflow(config, {
      workflowId,
      inputs: inputs || {},
      responseMode,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "执行工作流失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
