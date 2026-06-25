import { NextRequest, NextResponse } from "next/server";
import {
  getWorkflows,
  getWorkflow,
  saveWorkflow,
  deleteWorkflow,
  generateId,
  MODULE_TEMPLATES,
  type WorkflowDefinition,
  type WorkflowModule,
  type ModuleType,
} from "@/lib/workflow-store";

/** GET — 获取工作流列表或单个工作流 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (id) {
    const workflow = getWorkflow(id);
    if (!workflow) {
      return NextResponse.json({ success: false, error: "工作流不存在" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: workflow });
  }

  const workflows = getWorkflows();
  return NextResponse.json({ success: true, data: workflows });
}

/** POST — 创建或更新工作流 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, description, trigger, schedule, modules, status } = body;

    if (!name?.trim()) {
      return NextResponse.json({ success: false, error: "工作流名称不能为空" }, { status: 400 });
    }

    // Validate and sanitize modules
    const validModuleTypes: string[] = [
      "llm_analysis", "llm_generate", "llm_summary", "web_search",
      "data_fetch", "feishu_write", "feishu_notify", "condition", "transform"
    ];
    const sanitizedModules: WorkflowModule[] = Array.isArray(modules)
      ? modules.map((m: Record<string, unknown>) => ({
          id: String(m.id || `mod_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`),
          type: (validModuleTypes.includes(String(m.type)) ? m.type : "llm_analysis") as ModuleType,
          name: String(m.name || "未命名模块"),
          description: String(m.description || ""),
          config: (m.config && typeof m.config === "object" ? m.config : {}) as Record<string, unknown>,
          modelId: m.modelId ? String(m.modelId) : undefined,
          prompt: m.prompt ? String(m.prompt) : undefined,
          enabled: m.enabled !== false,
        }))
      : [];

    const now = new Date().toISOString();

    if (id) {
      // 更新
      const existing = getWorkflow(id);
      if (!existing) {
        return NextResponse.json({ success: false, error: "工作流不存在" }, { status: 404 });
      }
      const updated: WorkflowDefinition = {
        ...existing,
        name: name.trim(),
        description: description || "",
        trigger: trigger || existing.trigger,
        schedule: schedule || existing.schedule,
        modules: sanitizedModules.length > 0 ? sanitizedModules : existing.modules,
        status: status || existing.status,
        updatedAt: now,
      };
      saveWorkflow(updated);
      return NextResponse.json({ success: true, data: updated, message: "工作流已更新" });
    }

    // 创建
    const newWorkflow: WorkflowDefinition = {
      id: generateId(),
      name: name.trim(),
      description: description || "",
      status: "draft",
      trigger: trigger || "manual",
      schedule: schedule || "",
      modules: sanitizedModules,
      createdAt: now,
      updatedAt: now,
      runCount: 0,
      successCount: 0,
    };
    saveWorkflow(newWorkflow);
    return NextResponse.json({ success: true, data: newWorkflow, message: "工作流已创建" });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "未知错误";
    console.error("Workflow save error:", errMsg);
    return NextResponse.json({ success: false, error: `请求格式错误: ${errMsg}` }, { status: 400 });
  }
}

/** DELETE — 删除工作流 */
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ success: false, error: "缺少工作流 ID" }, { status: 400 });
  }

  const existing = getWorkflow(id);
  if (!existing) {
    return NextResponse.json({ success: false, error: "工作流不存在" }, { status: 404 });
  }

  deleteWorkflow(id);
  return NextResponse.json({ success: true, message: "工作流已删除" });
}

/** 导出模块模板供前端使用 */
export { MODULE_TEMPLATES };
