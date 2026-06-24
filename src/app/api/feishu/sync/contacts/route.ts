/**
 * 飞书通讯录同步 API
 * GET - 获取团队成员列表（当前用户 + 同部门成员）
 */

import { NextResponse } from "next/server";
import { getTeamMembers, getSession } from "@/lib/feishu-client";

export async function GET() {
  try {
    // 检查登录状态
    const session = getSession();
    if (!session) {
      return NextResponse.json(
        { error: "未登录飞书，请先在「飞书集成」页面连接飞书账号" },
        { status: 401 }
      );
    }

    // 获取团队成员
    const teamData = await getTeamMembers();

    return NextResponse.json({
      success: true,
      data: teamData,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "获取团队成员失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
