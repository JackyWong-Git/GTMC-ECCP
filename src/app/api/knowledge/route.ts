import { NextRequest, NextResponse } from "next/server";
import { KnowledgeClient, Config, DataSourceType } from "coze-coding-dev-sdk";
import { setupLLMEnv, DEFAULT_KNOWLEDGE_DATASET } from "@/lib/platform-config";

const DATASET_NAME = DEFAULT_KNOWLEDGE_DATASET;

/**
 * GET /api/knowledge
 * 搜索知识库文档或列出所有文档
 * Query params:
 *   - action=list: 列出所有文档
 *   - q=xxx: 搜索文档
 */
export async function GET(request: NextRequest) {
  try {
    setupLLMEnv();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const query = searchParams.get("q");
    const topK = parseInt(searchParams.get("topK") || "10", 10);

    const config = new Config();
    const client = new KnowledgeClient(config);

    // 列出所有文档
    // 注意：KnowledgeClient 不支持 listDocuments 方法，返回空列表
    if (action === "list") {
      return NextResponse.json({
        success: true,
        data: {
          documents: [],
          total: 0,
          message: "知识库文档列表功能暂不可用，请使用搜索功能查找文档",
        },
      });
    }

    // 搜索文档
    if (!query) {
      return NextResponse.json(
        { error: "缺少搜索关键词参数 q" },
        { status: 400 }
      );
    }

    const response = await client.search(query, undefined, topK, 0.0);

    if (response.code === 0) {
      return NextResponse.json({
        success: true,
        data: {
          chunks: (response.chunks || []).map((chunk: { content: string; score: number; doc_id?: string }) => ({
            content: chunk.content,
            score: chunk.score,
            docId: chunk.doc_id || "",
          })),
          total: response.chunks?.length || 0,
        },
      });
    }

    return NextResponse.json({
      success: false,
      error: response.msg || "搜索失败",
      data: { chunks: [], total: 0 },
    });
  } catch (error) {
    console.error("[knowledge] 搜索失败:", error);
    return NextResponse.json(
      { error: "知识库搜索失败", data: { chunks: [], total: 0 } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/knowledge
 * 添加文档到知识库
 * Body: { content: string, title?: string, url?: string, type?: 'text' | 'url' }
 */
export async function POST(request: NextRequest) {
  try {
    setupLLMEnv();
    const body = await request.json();
    const { content, title, url, type } = body as {
      content?: string;
      title?: string;
      url?: string;
      type?: "text" | "url";
    };

    if (!content && !url) {
      return NextResponse.json(
        { error: "缺少文档内容（content）或链接（url）" },
        { status: 400 }
      );
    }

    // URL 格式校验
    if (type === "url" && url) {
      try {
        const parsedUrl = new URL(url);
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
          return NextResponse.json(
            { error: "URL 必须是 http 或 https 协议" },
            { status: 400 }
          );
        }
      } catch {
        return NextResponse.json(
          { error: "URL 格式无效" },
          { status: 400 }
        );
      }
    }

    // 内容长度限制（最大 100KB）
    const MAX_CONTENT_LENGTH = 100 * 1024;
    if (content && content.length > MAX_CONTENT_LENGTH) {
      return NextResponse.json(
        { error: `内容过长，最大允许 ${MAX_CONTENT_LENGTH / 1024}KB，当前 ${(content.length / 1024).toFixed(1)}KB` },
        { status: 400 }
      );
    }

    const config = new Config();
    const client = new KnowledgeClient(config);

    let documents;
    if (type === "url" && url) {
      documents = [{ source: DataSourceType.URL, url }];
    } else {
      const docContent = title ? `[${title}]\n\n${content}` : content || "";
      documents = [{ source: DataSourceType.TEXT, raw_data: docContent }];
    }

    const response = await client.addDocuments(documents, DATASET_NAME, {
      separator: "\n\n",
      max_tokens: 2000,
      remove_extra_spaces: true,
      remove_urls_emails: false,
    });

    if (response.code === 0) {
      return NextResponse.json({
        success: true,
        data: {
          docIds: response.doc_ids || [],
          message: `文档已成功导入知识库`,
        },
      });
    }

    return NextResponse.json({
      success: false,
      error: response.msg || "文档导入失败",
    });
  } catch (error) {
    console.error("[knowledge] 导入失败:", error);
    return NextResponse.json(
      { error: "知识库导入失败" },
      { status: 500 }
    );
  }
}
