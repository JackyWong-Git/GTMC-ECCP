import { NextRequest, NextResponse } from 'next/server';
import { getPlatformConfig } from '@/lib/platform-config';
import { KnowledgeClient, DataSourceType } from 'coze-coding-dev-sdk';
import { getNode, getDocumentContent, DingTalkConfig } from '@/lib/dingtalk-client';

/**
 * POST /api/dingtalk/knowledge
 * 导入钉钉文档到本地知识库
 * 
 * Body:
 * - workspaceId: 知识库 ID
 * - nodeId: 节点 ID
 * - unionId: 用户 unionId
 */
export async function POST(request: NextRequest) {
  try {
    const config = getPlatformConfig();
    
    if (!config.dingtalk?.appKey || !config.dingtalk?.appSecret) {
      return NextResponse.json(
        { error: '钉钉配置未设置，请在平台设置中配置钉钉 App Key 和 App Secret' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { workspaceId, nodeId, unionId } = body;

    console.log('[dingtalk-import] Received request:', { workspaceId, nodeId, unionId });

    if (!workspaceId || !nodeId || !unionId) {
      return NextResponse.json(
        { error: '缺少 workspaceId、nodeId 或 unionId 参数' },
        { status: 400 }
      );
    }

    const dingtalkConfig: DingTalkConfig = {
      appKey: config.dingtalk.appKey,
      appSecret: config.dingtalk.appSecret,
    };

    // 获取节点信息
    const node = await getNode(dingtalkConfig, workspaceId, nodeId, unionId);

    if (!node.docKey) {
      return NextResponse.json(
        { error: '该节点不是文档或无法获取文档内容' },
        { status: 400 }
      );
    }

    // 获取文档内容
    const docContent = await getDocumentContent(dingtalkConfig, node.docKey, unionId);

    // 导入到本地知识库
    const knowledgeClient = new KnowledgeClient();
    const result = await knowledgeClient.addDocuments(
      [{
        source: DataSourceType.TEXT,
        raw_data: docContent.content,
      }],
      'dingtalk_imports'
    );

    return NextResponse.json({
      success: true,
      data: {
        title: docContent.title,
        contentLength: docContent.content.length,
        documentId: result.doc_ids?.[0] || nodeId,
      },
    });
  } catch (error) {
    console.error('DingTalk import API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '导入钉钉文档失败' },
      { status: 500 }
    );
  }
}
