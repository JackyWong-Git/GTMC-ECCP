import { NextRequest, NextResponse } from 'next/server';
import { getPlatformConfig } from '@/lib/platform-config';
import { listDatasets, listDocuments, getDocumentContent, DifyConfig } from '@/lib/dify-client';

/**
 * GET /api/dify/knowledge
 * 获取 Dify 知识库列表或文档列表
 * 
 * Query params:
 * - action: 'datasets' | 'documents' | 'content'
 * - datasetId: 知识库 ID（获取文档列表时需要）
 * - documentId: 文档 ID（获取文档内容时需要）
 */
export async function GET(request: NextRequest) {
  try {
    const config = getPlatformConfig();
    
    if (!config.dify?.apiKey || !config.dify?.baseUrl) {
      return NextResponse.json(
        { error: 'Dify 配置未设置，请在平台设置中配置 Dify API Key 和 Base URL' },
        { status: 400 }
      );
    }

    const difyConfig: DifyConfig = {
      apiKey: config.dify.apiKey,
      baseUrl: config.dify.baseUrl,
    };

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'datasets';
    const datasetId = searchParams.get('datasetId');
    const documentId = searchParams.get('documentId');

    if (action === 'datasets') {
      // 获取知识库列表
      const result = await listDatasets(difyConfig);
      return NextResponse.json({
        success: true,
        data: result.data,
        total: result.total,
        hasMore: result.has_more,
      });
    }

    if (action === 'documents') {
      if (!datasetId) {
        return NextResponse.json(
          { error: '缺少 datasetId 参数' },
          { status: 400 }
        );
      }
      // 获取文档列表
      const result = await listDocuments(difyConfig, datasetId);
      return NextResponse.json({
        success: true,
        data: result.data,
        total: result.total,
        hasMore: result.has_more,
      });
    }

    if (action === 'content') {
      if (!datasetId || !documentId) {
        return NextResponse.json(
          { error: '缺少 datasetId 或 documentId 参数' },
          { status: 400 }
        );
      }
      // 获取文档内容
      const result = await getDocumentContent(difyConfig, datasetId, documentId);
      return NextResponse.json({
        success: true,
        data: result,
      });
    }

    return NextResponse.json(
      { error: '无效的 action 参数' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Dify knowledge API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取 Dify 知识库失败' },
      { status: 500 }
    );
  }
}
