import { NextRequest, NextResponse } from "next/server";
import {
  listUserDocs,
  getDocumentContent,
} from "@/lib/feishu-client";

/**
 * GET /api/feishu/sync/docs
 * 获取用户云文档列表
 *
 * GET /api/feishu/sync/docs?document_id=xxx
 * 获取指定文档内容
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get("document_id");

    if (documentId) {
      // 获取指定文档内容
      const doc = await getDocumentContent(documentId);

      return NextResponse.json({
        success: true,
        data: {
          type: "document",
          documentId,
          title: doc.title,
          content: doc.content,
          syncedAt: new Date().toISOString(),
        },
      });
    } else {
      // 获取用户文档列表
      const docs = await listUserDocs();

      return NextResponse.json({
        success: true,
        data: {
          type: "list",
          docs: docs.map((doc) => ({
            token: doc.token,
            title: doc.title,
            type: doc.type,
            url: doc.url,
          })),
          totalDocs: docs.length,
          syncedAt: new Date().toISOString(),
        },
      });
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "获取云文档数据失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
