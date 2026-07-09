import { NextRequest, NextResponse } from 'next/server';
import { getPlatformConfig } from '@/lib/platform-config';
import { KnowledgeClient, DataSourceType } from 'coze-coding-dev-sdk';
import { getDocumentContent as getDifyDocumentContent, DifyConfig } from '@/lib/dify-client';

/**
 * POST /api/dify/knowledge
 * 导入 Dify 文档到本地知识库
 * 
 * Body:
 * - datasetId: Dify 知识库 ID
 * - documentId: Dify 文档 ID
 */
export async function POST(request: NextRequest) {
  try {
    const config = getPlatformConfig();
    
    if (!config.dify?.apiKey || !config.dify?.baseUrl) {
      return NextResponse.json(
        { error: 'Dify 配置未设置，请在平台设置中配置 Dify API Key 和 Base URL' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { datasetId, documentId } = body;

    console.log('[dify-import] Received request:', { datasetId, documentId });

    if (!datasetId || !documentId) {
      return NextResponse.json(
        { error: '缺少 datasetId 或 documentId 参数' },
        { status: 400 }
      );
    }

    const difyConfig: DifyConfig = {
      apiKey: config.dify.apiKey,
      baseUrl: config.dify.baseUrl,
    };

    // 获取文档内容
    const docContent = await getDifyDocumentContent(difyConfig, datasetId, documentId);

    // 导入到本地知识库
    const knowledgeClient = new KnowledgeClient();
    const result = await knowledgeClient.addDocuments(
      [{
        source: DataSourceType.TEXT,
        raw_data: docContent.content,
      }],
      'dify_imports'
    );

    return NextResponse.json({
      success: true,
      data: {
        title: docContent.title,
        contentLength: docContent.content.length,
        documentId: result.doc_ids?.[0] || documentId,
      },
    });
  } catch (error) {
    console.error('Dify import API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '导入 Dify 文档失败' },
      { status: 500 }
    );
  }
}
