import { NextRequest, NextResponse } from "next/server";
import { exchangeDouyinToken, getDouyinUserInfo } from "@/lib/douyin-client";

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

    return NextResponse.json({
      success: true,
      data: {
        openId: session.openId,
        user: userInfo,
        message: "抖音登录成功",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "抖音登录失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
