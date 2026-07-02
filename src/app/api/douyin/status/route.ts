import { NextRequest, NextResponse } from "next/server";
import { getDouyinStatus, disconnectDouyin, getDouyinSessionByOpenId } from "@/lib/douyin-client";

/**
 * GET /api/douyin/status
 * 检查抖音登录状态
 */
export async function GET(request: NextRequest) {
  // 优先从 cookie 中获取 openId 验证
  const sessionCookie = request.cookies.get('douyin_session');
  if (sessionCookie?.value) {
    const session = getDouyinSessionByOpenId(sessionCookie.value);
    if (session) {
      return NextResponse.json({
        success: true,
        data: {
          connected: true,
          user: session.userInfo || null,
          expiresAt: session.obtainedAt + session.expiresIn * 1000,
        },
      });
    }
  }

  // 回退到内存 session
  const status = getDouyinStatus();
  return NextResponse.json({ success: true, data: status });
}

/**
 * DELETE /api/douyin/status
 * 断开抖音连接
 */
export async function DELETE(request: NextRequest) {
  disconnectDouyin();

  const response = NextResponse.json({
    success: true,
    data: { message: "已断开抖音连接" },
  });

  // 清除 session cookie
  response.cookies.set('douyin_session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });

  return response;
}
