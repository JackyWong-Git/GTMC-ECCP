import { NextResponse } from "next/server";
import { getDouyinStatus, disconnectDouyin } from "@/lib/douyin-client";

/**
 * GET /api/douyin/status
 * 检查抖音登录状态
 */
export async function GET() {
  const status = getDouyinStatus();
  return NextResponse.json({ success: true, data: status });
}

/**
 * DELETE /api/douyin/status
 * 断开抖音连接
 */
export async function DELETE() {
  disconnectDouyin();
  return NextResponse.json({
    success: true,
    data: { message: "已断开抖音连接" },
  });
}
