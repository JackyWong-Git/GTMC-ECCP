import { NextRequest, NextResponse } from "next/server";
import { exchangeToken, getAppCredentials } from "@/lib/feishu-client";

/**
 * 从配置的重定向 URI 中提取 origin
 */
function getOriginFromConfig(): string | null {
  const { redirectUri } = getAppCredentials();
  if (redirectUri) {
    try {
      const url = new URL(redirectUri);
      return url.origin;
    } catch {
      // ignore
    }
  }
  return null;
}

/**
 * GET /api/feishu/callback
 * 飞书 OAuth 回调，用授权码换取 token
 */
export async function GET(request: NextRequest) {
  // 优先从配置的重定向 URI 中提取 origin，确保与飞书应用配置一致
  const configOrigin = getOriginFromConfig();
  const domain = process.env.COZE_PROJECT_DOMAIN_DEFAULT;
  const origin =
    configOrigin ||
    (domain ? `https://${domain}` : request.nextUrl.origin);

  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.json(
        { error: "缺少授权码 code" },
        { status: 400 }
      );
    }

    const session = await exchangeToken(code);

    // 重定向到首页（或原始请求的页面）
    const redirectTo = searchParams.get("state") || "/";
    const redirectUrl = new URL(redirectTo.startsWith("/") ? redirectTo : "/", origin);

    // 创建响应并设置 session cookie
    const response = NextResponse.redirect(redirectUrl);
    const maxAge = Math.floor((session.expiresAt - Date.now()) / 1000);
    response.cookies.set("feishu_session", session.userInfo.userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: maxAge > 0 ? maxAge : 3600,
      path: "/",
    });

    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "授权回调处理失败";

    // 重定向到登录页，带上错误信息
    const redirectUrl = new URL("/login", origin);
    redirectUrl.searchParams.set("error", message);

    return NextResponse.redirect(redirectUrl);
  }
}
