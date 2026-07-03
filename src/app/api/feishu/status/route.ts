import { NextResponse } from "next/server";
import { getSession, clearSession } from "@/lib/feishu-client";

/**
 * GET /api/feishu/status
 * 检查飞书登录状态
 */
export async function GET() {
  const session = getSession();

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
export async function DELETE() {
  clearSession();
  return NextResponse.json({
    success: true,
    data: { message: "已断开飞书连接" },
  });
}
