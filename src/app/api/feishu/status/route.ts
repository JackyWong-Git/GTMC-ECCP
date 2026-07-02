import { NextRequest, NextResponse } from "next/server";
import { getSession, getSessionByUserId } from "@/lib/feishu-client";

/**
 * GET /api/feishu/status
 * 检查飞书登录状态
 */
export async function GET(request: NextRequest) {
  // 优先从 cookie 获取用户 ID
  const userId = request.cookies.get("feishu_session")?.value;
  const session = userId ? getSessionByUserId(userId) : getSession();

  if (!session) {
    return NextResponse.json({
      success: true,
      data: {
        connected: false,
        user: null,
      },
    });
  }

  return NextResponse.json({
    success: true,
    data: {
      connected: true,
      user: {
        name: session.userInfo.name,
        avatarUrl: session.userInfo.avatarUrl,
        email: session.userInfo.email,
      },
      expiresAt: session.expiresAt,
    },
  });
}

/**
 * DELETE /api/feishu/status
 * 断开飞书连接
 */
export async function DELETE(request: NextRequest) {
  const response = NextResponse.json({
    success: true,
    data: { message: "已断开飞书连接" },
  });

  // 清除 session cookie
  response.cookies.delete("feishu_session");

  return response;
}
