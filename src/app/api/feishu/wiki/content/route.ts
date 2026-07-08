import { NextRequest, NextResponse } from "next/server";
import { getDocumentContent, getDocumentBlocks, type FeishuConfig } from "@/lib/feishu-client";
import { getFeishuConfig as getFeishuPlatformConfig } from "@/lib/platform-config";

/**
 * GET /api/feishu/wiki/content?documentId=xxx - 获取文档内容
 */
export async function GET(request: NextRequest) {
  try {
    const platformConfig = getFeishuPlatformConfig();
    if (!platformConfig.isConfigured) {
      return NextResponse.json(
        { error: "飞书配置未设置，请在平台设置中配置飞书应用凭证" },
        { status: 400 }
      );
    }

    const config: FeishuConfig = {
      appId: platformConfig.appId,
      appSecret: platformConfig.appSecret,
    };

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get("documentId");
    const format = searchParams.get("format") || "text"; // text or blocks

    if (!documentId) {
      return NextResponse.json(
        { error: "缺少 documentId 参数" },
        { status: 400 }
      );
    }

    if (format === "blocks") {
      const blocks = await getDocumentBlocks(config, documentId);
      return NextResponse.json({ success: true, data: blocks });
    }

    const content = await getDocumentContent(config, documentId);
    return NextResponse.json({ success: true, data: { content } });
  } catch (error) {
    console.error("[feishu/wiki/content] GET error:", error);
    const message = error instanceof Error ? error.message : "获取文档内容失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
