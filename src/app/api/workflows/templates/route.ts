import { NextResponse } from "next/server";
import { MODULE_TEMPLATES } from "@/lib/workflow-store";
import { AVAILABLE_MODELS } from "@/lib/llm-config";

/** GET — 获取可用模块模板和模型列表 */
export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      modules: MODULE_TEMPLATES,
      models: AVAILABLE_MODELS,
    },
  });
}
