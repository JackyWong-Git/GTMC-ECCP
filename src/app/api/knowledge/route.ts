import { NextRequest, NextResponse } from "next/server";
import {
  addDocument,
  listDocuments,
  getDocument,
  updateDocument,
  deleteDocument,
  searchDocuments,
  getKnowledgeStats,
} from "@/lib/knowledge-store";

/**
 * GET /api/knowledge
 * 列出文档、搜索文档、获取统计
 * Query params:
 *   - action=list: 列出所有文档（支持 category, limit, offset）
 *   - action=search&q=xxx: 搜索文档
 *   - action=stats: 获取统计信息
 *   - action=get&id=xxx: 获取单个文档
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "list";

    // 列出文档
    if (action === "list") {
      const category = searchParams.get("category") || undefined;
      const limit = parseInt(searchParams.get("limit") || "50", 10);
      const offset = parseInt(searchParams.get("offset") || "0", 10);

      const result = listDocuments({ category, limit, offset });

      return NextResponse.json({
        success: true,
        data: {
          documents: result.documents,
          total: result.total,
        },
      });
    }

    // 搜索文档
    if (action === "search") {
      const query = searchParams.get("q");
      if (!query) {
        return NextResponse.json(
          { error: "缺少搜索关键词参数 q" },
          { status: 400 }
        );
      }

      const category = searchParams.get("category") || undefined;
      const limit = parseInt(searchParams.get("limit") || "20", 10);

      const result = searchDocuments(query, { category, limit });

      return NextResponse.json({
        success: true,
        data: {
          results: result.results,
          total: result.total,
          query,
        },
      });
    }

    // 获取统计
    if (action === "stats") {
      const stats = getKnowledgeStats();
      return NextResponse.json({
        success: true,
        data: stats,
      });
    }

    // 获取单个文档
    if (action === "get") {
      const id = searchParams.get("id");
      if (!id) {
        return NextResponse.json(
          { error: "缺少文档 ID 参数" },
          { status: 400 }
        );
      }

      const doc = getDocument(id);
      if (!doc) {
        return NextResponse.json(
          { error: "文档不存在" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: doc,
      });
    }

    return NextResponse.json(
      { error: "未知的 action 参数" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[knowledge] GET 失败:", error);
    return NextResponse.json(
      { error: "知识库操作失败" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/knowledge
 * 添加或更新文档
 * Body: { action: 'add' | 'update', ... }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action || "add";

    // 添加文档
    if (action === "add" || action === "import") {
      const { title, content, source, tags, category } = body as {
        title?: string;
        content?: string;
        source?: string;
        tags?: string[];
        category?: string;
      };

      if (!title) {
        return NextResponse.json(
          { error: "缺少文档标题" },
          { status: 400 }
        );
      }

      if (!content) {
        return NextResponse.json(
          { error: "缺少文档内容" },
          { status: 400 }
        );
      }

      const doc = addDocument({
        title,
        content,
        source,
        tags,
        category,
      });

      return NextResponse.json({
        success: true,
        data: doc,
        message: "文档添加成功",
      });
    }

    // 更新文档
    if (action === "update") {
      const { id, ...updates } = body as {
        id?: string;
        title?: string;
        content?: string;
        tags?: string[];
        category?: string;
      };

      if (!id) {
        return NextResponse.json(
          { error: "缺少文档 ID" },
          { status: 400 }
        );
      }

      const doc = updateDocument(id, updates);
      if (!doc) {
        return NextResponse.json(
          { error: "文档不存在" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: doc,
        message: "文档更新成功",
      });
    }

    return NextResponse.json(
      { error: "未知的 action 参数" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[knowledge] POST 失败:", error);
    return NextResponse.json(
      { error: "知识库操作失败" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/knowledge
 * 删除文档
 * Query params: id=xxx
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id") || searchParams.get("docId");

    if (!id) {
      return NextResponse.json(
        { error: "缺少文档 ID 参数" },
        { status: 400 }
      );
    }

    const success = deleteDocument(id);

    if (!success) {
      return NextResponse.json(
        { error: "文档不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "文档删除成功",
    });
  } catch (error) {
    console.error("[knowledge] DELETE 失败:", error);
    return NextResponse.json(
      { error: "知识库操作失败" },
      { status: 500 }
    );
  }
}
