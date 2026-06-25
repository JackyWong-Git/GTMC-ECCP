import { NextResponse } from "next/server";
import { MODULE_TEMPLATES } from "@/lib/workflow-store";
import { AVAILABLE_MODELS } from "@/lib/llm-config";
import { getAllTemplates } from "@/lib/workflow-templates";

/** GET — 获取可用模块模板、模型列表和预设工作流模板 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');

  // 如果请求预设模板列表
  if (type === 'presets') {
    const presets = getAllTemplates();
    return NextResponse.json({
      success: true,
      data: { presets },
    });
  }

  // 默认返回模块模板和模型列表
  return NextResponse.json({
    success: true,
    data: {
      modules: MODULE_TEMPLATES,
      models: AVAILABLE_MODELS,
    },
  });
}
