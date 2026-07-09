import { NextRequest, NextResponse } from 'next/server';
import { getPlatformConfig } from '@/lib/platform-config';
import { listWorkspaces, listNodes, getNode, DingTalkConfig } from '@/lib/dingtalk-client';

/**
 * GET /api/dingtalk/knowledge
 * 获取钉钉知识库列表或节点列表
 * 
 * Query params:
 * - action: 'workspaces' | 'nodes' | 'node'
 * - workspaceId: 知识库 ID（获取节点列表时需要）
 * - nodeId: 节点 ID（获取节点信息时需要）
 * - parentNodeId: 父节点 ID（可选，获取子节点列表）
 * - unionId: 用户 unionId（必需）
 */
export async function GET(request: NextRequest) {
  try {
    const config = getPlatformConfig();
    
    if (!config.dingtalk?.appKey || !config.dingtalk?.appSecret) {
      return NextResponse.json(
        { error: '钉钉配置未设置，请在平台设置中配置钉钉 App Key 和 App Secret' },
        { status: 400 }
      );
    }

    const dingtalkConfig: DingTalkConfig = {
      appKey: config.dingtalk.appKey,
      appSecret: config.dingtalk.appSecret,
    };

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'workspaces';
    const workspaceId = searchParams.get('workspaceId');
    const nodeId = searchParams.get('nodeId');
    const parentNodeId = searchParams.get('parentNodeId');
    const unionId = searchParams.get('unionId');

    if (!unionId) {
      return NextResponse.json(
        { error: '缺少 unionId 参数，请先配置钉钉用户 ID' },
        { status: 400 }
      );
    }

    if (action === 'workspaces') {
      // 获取知识库列表
      const result = await listWorkspaces(dingtalkConfig, unionId);
      return NextResponse.json({
        success: true,
        data: result,
      });
    }

    if (action === 'nodes') {
      if (!workspaceId) {
        return NextResponse.json(
          { error: '缺少 workspaceId 参数' },
          { status: 400 }
        );
      }
      // 获取节点列表
      const result = await listNodes(dingtalkConfig, workspaceId, unionId, parentNodeId || undefined);
      return NextResponse.json({
        success: true,
        data: result,
      });
    }

    if (action === 'node') {
      if (!workspaceId || !nodeId) {
        return NextResponse.json(
          { error: '缺少 workspaceId 或 nodeId 参数' },
          { status: 400 }
        );
      }
      // 获取节点信息
      const result = await getNode(dingtalkConfig, workspaceId, nodeId, unionId);
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
    console.error('DingTalk knowledge API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取钉钉知识库失败' },
      { status: 500 }
    );
  }
}
