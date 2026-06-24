import { NextRequest, NextResponse } from "next/server";
import { getDouyinAuthUrl } from "@/lib/douyin-client";

/**
 * GET /api/douyin/auth
 * 发起抖音 OAuth 登录
 */
export async function GET(request: NextRequest) {
  const clientId = process.env.DOUYIN_CLIENT_KEY;
  const clientSecret = process.env.DOUYIN_CLIENT_SECRET;
  const redirectUri = process.env.DOUYIN_REDIRECT_URI;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      {
        error:
          "抖音应用凭证未配置。请在环境变量中设置 DOUYIN_CLIENT_KEY 和 DOUYIN_CLIENT_SECRET。\n前往 https://developer.open-douyin.com 创建应用并获取凭证。",
      },
      { status: 400 }
    );
  }

  if (!redirectUri) {
    return NextResponse.json(
      {
        error:
          "抖音回调地址未配置。请在环境变量中设置 DOUYIN_REDIRECT_URI。\n格式: https://你的域名/api/douyin/callback",
      },
      { status: 400 }
    );
  }

  const state = Math.random().toString(36).substring(2, 15);
  const authUrl = getDouyinAuthUrl(state);

  return NextResponse.json({
    success: true,
    data: {
      authUrl,
      state,
      message: "请在浏览器中打开授权链接完成抖音登录",
    },
  });
}
