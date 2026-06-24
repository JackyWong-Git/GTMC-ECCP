import { NextRequest, NextResponse } from "next/server";
import {
  listWikiSpaces,
  listWikiNodes,
} from "@/lib/feishu-client";

/**
 * GET /api/feishu/sync/wiki
 * 获取知识库空间列表或节点列表
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const spaceId = searchParams.get("space_id");
    const parentNodeToken = searchParams.get("parent_node_token");

    if (spaceId) {
      // 获取指定空间的节点列表
      const nodes = await listWikiNodes(spaceId, parentNodeToken || undefined);

      return NextResponse.json({
        success: true,
        data: {
          type: "nodes",
          spaceId,
          nodes: nodes.map((node) => ({
            nodeToken: node.node_token,
            objToken: node.obj_token,
            objType: node.obj_type,
            title: node.title,
            hasChild: node.has_child,
          })),
          totalNodes: nodes.length,
          syncedAt: new Date().toISOString(),
        },
      });
    } else {
      // 获取知识库空间列表
      const spaces = await listWikiSpaces();

      return NextResponse.json({
        success: true,
        data: {
          type: "spaces",
          spaces: spaces.map((space) => ({
            spaceId: space.space_id,
            name: space.name,
            description: space.description,
          })),
          totalSpaces: spaces.length,
          syncedAt: new Date().toISOString(),
        },
      });
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "获取知识库数据失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
