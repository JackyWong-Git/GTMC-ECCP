import { NextRequest, NextResponse } from "next/server";
import { getTopicCache, clearTopicCache } from "@/lib/topic-cache";

export async function GET() {
  try {
    const cache = getTopicCache();
    if (!cache) {
      return NextResponse.json({
        success: true,
        data: null,
        message: "暂无缓存数据",
      });
    }

    return NextResponse.json({
      success: true,
      data: cache,
    });
  } catch (error) {
    console.error("读取缓存失败:", error);
    return NextResponse.json(
      { error: "读取缓存失败" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    clearTopicCache();
    return NextResponse.json({
      success: true,
      message: "缓存已清除",
    });
  } catch (error) {
    console.error("清除缓存失败:", error);
    return NextResponse.json(
      { error: "清除缓存失败" },
      { status: 500 }
    );
  }
}
