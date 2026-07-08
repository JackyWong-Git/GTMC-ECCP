import { NextRequest, NextResponse } from "next/server";
import { listWikiSpaces, listWikiNodes, type FeishuConfig } from "@/lib/feishu-client";
import { getFeishuConfig as getFeishuPlatformConfig } from "@/lib/platform-config";

/**
 * GET /api/feishu/wiki/spaces - 获取知识库空间列表
 * GET /api/feishu/wiki/spaces?action=nodes&spaceId=xxx&parentToken=xxx - 获取知识库节点列表
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
    const action = searchParams.get("action") || "spaces";

    if (action === "spaces") {
      const spaces = await listWikiSpaces(config);
      return NextResponse.json({ success: true, data: spaces });
    }

    if (action === "nodes") {
      const spaceId = searchParams.get("spaceId");
      const parentToken = searchParams.get("parentToken") || undefined;

      if (!spaceId) {
        return NextResponse.json(
          { error: "缺少 spaceId 参数" },
          { status: 400 }
        );
      }

      const nodes = await listWikiNodes(config, spaceId, parentToken);
      return NextResponse.json({ success: true, data: nodes });
    }

    return NextResponse.json(
      { error: "未知的 action 参数" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[feishu/wiki] GET error:", error);
    let message = "获取飞书知识库数据失败";
    if (error instanceof Error) {
      message = error.message;
      // Provide helpful guidance for permission errors
      if (message.includes("99991672") || message.includes("scope")) {
        message = "飞书应用需要开通知识库权限。请前往飞书开放平台，在应用权限管理中开通「wiki:wiki:readonly」或「wiki:wiki」权限，然后发布新版本。";
      }
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
