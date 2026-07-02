import { NextRequest, NextResponse } from "next/server";
import { exchangeDouyinToken, getDouyinUserInfo } from "@/lib/douyin-client";
import { getPlatformConfig } from "@/lib/platform-config";

/**
 * GET /api/douyin/callback
 * 抖音 OAuth 回调，换取 access_token 并获取用户信息
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.json(
      { error: `抖音授权失败: ${error}` },
      { status: 400 }
    );
  }

  if (!code) {
    return NextResponse.json(
      { error: "缺少授权码 code" },
      { status: 400 }
    );
  }

  try {
    const session = await exchangeDouyinToken(code);

    // 获取用户信息
    let userInfo = null;
    try {
      userInfo = await getDouyinUserInfo();
    } catch {
      // 用户信息获取失败不影响登录
    }

    // 获取配置的 redirectUri 来提取 origin
    const config = getPlatformConfig();
    const redirectUri = config.douyin.redirectUri || process.env.DOUYIN_REDIRECT_URI;
    let origin = '';
    if (redirectUri) {
      try {
        origin = new URL(redirectUri).origin;
      } catch {
        origin = '';
      }
    }

    // 创建重定向响应
    const redirectUrl = origin ? `${origin}/` : '/';
    const response = NextResponse.redirect(redirectUrl);

    // 设置 session cookie（7天有效期）
    response.cookies.set('douyin_session', session.openId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : "抖音登录失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
