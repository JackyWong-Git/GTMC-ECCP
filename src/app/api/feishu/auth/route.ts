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

    // 优先使用配置中的重定向 URI，确保与飞书应用配置一致
    const domain = process.env.COZE_PROJECT_DOMAIN_DEFAULT;
    const defaultRedirectUri = domain
      ? `https://${domain}/api/feishu/callback`
      : `${request.nextUrl.origin}/api/feishu/callback`;

    // 优先级：URL 参数 > 配置文件 > 环境变量 > 当前请求 origin
    const redirectUri =
      searchParams.get("redirect_uri") ||
      configRedirectUri ||
      defaultRedirectUri;

    const state = Math.random().toString(36).substring(2, 15);
    const authUrl = buildAuthUrl(redirectUri, state);

    return NextResponse.json({
      success: true,
      data: {
        authUrl,
        state,
        // 返回实际使用的 redirectUri，方便调试
        redirectUri,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "构建授权 URL 失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
