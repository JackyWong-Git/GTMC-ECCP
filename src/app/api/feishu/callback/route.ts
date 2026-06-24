import { NextRequest, NextResponse } from "next/server";
import { exchangeToken } from "@/lib/feishu-client";

/**
 * GET /api/feishu/callback
 * 飞书 OAuth 回调，用授权码换取 token
 */
export async function GET(request: NextRequest) {
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

    // 重定向到设置页面，带上登录成功标识
    const redirectUrl = new URL("/settings", request.nextUrl.origin);
    redirectUrl.searchParams.set("login", "success");
    redirectUrl.searchParams.set("user", session.userInfo.name);

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "授权回调处理失败";

    // 重定向到设置页面，带上错误信息
    const redirectUrl = new URL("/settings", request.nextUrl.origin);
    redirectUrl.searchParams.set("login", "error");
    redirectUrl.searchParams.set("error", message);

    return NextResponse.redirect(redirectUrl);
  }
}
