import { NextRequest, NextResponse } from "next/server";
import { getDocumentBlocks, type FeishuConfig } from "@/lib/feishu-client";
import { getFeishuConfig as getFeishuPlatformConfig } from "@/lib/platform-config";
import { KnowledgeClient, Config, DataSourceType } from "coze-coding-dev-sdk";

/**
 * POST /api/feishu/wiki/import - 导入飞书文档到知识库
 */
export async function POST(request: NextRequest) {
  try {
    const platformConfig = getFeishuPlatformConfig();
    if (!platformConfig.isConfigured) {
      return NextResponse.json(
        { error: "飞书配置未设置，请在平台设置中配置飞书应用凭证" },
        { status: 400 }
      );
    }

    const config: FeishuConfig = {
      appId: platformConfig.appId,
      appSecret: platformConfig.appSecret,
    };

    const body = await request.json();
    const { documentId, title, tags } = body;

    if (!documentId) {
      return NextResponse.json(
        { error: "缺少 documentId 参数" },
        { status: 400 }
      );
    }

    // Get document content from Feishu
    const blocks = await getDocumentBlocks(config, documentId);
    
    // Convert blocks to text
    const content = blocks
      .map((block) => block.text)
      .filter((text) => text.length > 0)
      .join("\n");

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: "文档内容为空" },
        { status: 400 }
      );
    }

    // Import to knowledge base using addDocuments
    const sdkConfig = new Config();
    const knowledgeClient = new KnowledgeClient(sdkConfig);
    
    const result = await knowledgeClient.addDocuments(
      [{
        source: DataSourceType.TEXT,
        raw_data: content,
      }],
      "coze_doc_knowledge"
    );

    if (result.code !== 0) {
      throw new Error(result.msg || "导入失败");
    }

    return NextResponse.json({
      success: true,
      data: {
        documentId,
        title: title || `飞书文档-${documentId}`,
        contentLength: content.length,
        docIds: result.doc_ids,
        tags: tags || ["飞书", "知识库"],
      },
    });
  } catch (error) {
    console.error("[feishu/wiki/import] POST error:", error);
    const message = error instanceof Error ? error.message : "导入文档失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
