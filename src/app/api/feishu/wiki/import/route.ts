import { NextRequest, NextResponse } from "next/server";
import { getDocumentBlocks, getWikiNodeInfo, type FeishuConfig } from "@/lib/feishu-client";
import { getFeishuConfig as getFeishuPlatformConfig, KNOWLEDGE_DATASET_NAME } from "@/lib/platform-config";
import { KnowledgeClient, Config, DataSourceType } from "coze-coding-dev-sdk";

/**
 * POST /api/feishu/wiki/import - 导入飞书文档到知识库
 * 支持两种参数：
 * - nodeToken: 知识库节点 token（从 wiki URL 中提取）
 * - documentId: 普通文档 ID
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
    console.log("[feishu/wiki/import] Request body:", JSON.stringify(body));
    const { nodeToken, documentId, title, tags } = body;

    // 如果提供的是 nodeToken（知识库文档），先获取实际的 documentId
    let actualDocumentId = documentId;
    let documentTitle = title;

    if (nodeToken && !documentId) {
      console.log("[feishu/wiki/import] Getting wiki node info for:", nodeToken);
      const nodeInfo = await getWikiNodeInfo(config, nodeToken);
      actualDocumentId = nodeInfo.objToken;
      documentTitle = documentTitle || nodeInfo.title;
      console.log("[feishu/wiki/import] Got node info:", { objToken: nodeInfo.objToken, title: nodeInfo.title });
    }

    if (!actualDocumentId) {
      return NextResponse.json(
        { error: "缺少 documentId 或 nodeToken 参数" },
        { status: 400 }
      );
    }

    // Get document content from Feishu
    const blocks = await getDocumentBlocks(config, actualDocumentId);
    
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
      KNOWLEDGE_DATASET_NAME
    );

    if (result.code !== 0) {
      throw new Error(result.msg || "导入失败");
    }

    return NextResponse.json({
      success: true,
      data: {
        documentId: actualDocumentId,
        nodeToken: nodeToken || null,
        title: documentTitle || `飞书文档-${actualDocumentId}`,
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
