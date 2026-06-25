import { NextRequest, NextResponse } from "next/server";
import { buildAuthUrl, getAppCredentials } from "@/lib/feishu-client";

/**
 * GET /api/feishu/auth
 * 发起飞书 OAuth 登录，返回授权 URL
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const { redirectUri: configRedirectUri } = getAppCredentials();
    const redirectUri =
      searchParams.get("redirect_uri") ||
      configRedirectUri ||
      `${request.nextUrl.origin}/api/feishu/callback`;

    const state = Math.random().toString(36).substring(2, 15);
    const authUrl = buildAuthUrl(redirectUri, state);

    return NextResponse.json({
      success: true,
      data: {
        authUrl,
        state,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "构建授权 URL 失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
