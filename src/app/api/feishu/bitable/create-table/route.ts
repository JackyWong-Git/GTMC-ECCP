import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/feishu-client";

const FEISHU_API_BASE = "https://open.feishu.cn/open-apis";

/**
 * 台账字段定义
 */
const LEDGER_FIELDS = [
  { field_name: "内容类型", type: 3, property: { options: [
    { name: "脚本" }, { name: "图片" }, { name: "视频" }, { name: "数据分析" }
  ]}},
  { field_name: "标题", type: 1 },
  { field_name: "关联选题", type: 1 },
  { field_name: "目标平台", type: 3, property: { options: [
    { name: "抖音" }, { name: "视频号" }, { name: "KILAKILA" }, { name: "全平台" }
  ]}},
  { field_name: "内容摘要", type: 1 },
  { field_name: "资源链接", type: 15 },
  { field_name: "预览图", type: 15 },
  { field_name: "生成模型", type: 1 },
  { field_name: "状态", type: 3, property: { options: [
    { name: "待审核" }, { name: "已审核" }, { name: "已发布" }, { name: "已归档" }
  ]}},
  { field_name: "负责人", type: 1 },
  { field_name: "发布时间", type: 5 },
  { field_name: "播放量", type: 2 },
  { field_name: "点赞数", type: 2 },
  { field_name: "评论数", type: 2 },
  { field_name: "分享数", type: 2 },
  { field_name: "备注", type: 1 },
  { field_name: "创建时间", type: 5 },
];

/**
 * POST /api/feishu/bitable/create-table
 * 在指定多维表中创建台账数据表
 */
export async function POST(request: NextRequest) {
  try {
    const session = getSession();
    if (!session) {
      return NextResponse.json(
        { error: "未登录飞书，请先连接飞书账号" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { appToken, tableName } = body as {
      appToken?: string;
      tableName?: string;
    };

    if (!appToken) {
      return NextResponse.json(
        { error: "缺少多维表 appToken" },
        { status: 400 }
      );
    }

    const name = tableName || "产出物台账";

    // 创建数据表
    const createRes = await fetch(
      `${FEISHU_API_BASE}/bitable/v1/apps/${appToken}/tables`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.userAccessToken}`,
        },
        body: JSON.stringify({
          table: {
            name,
            default_view_name: "全部产出物",
            fields: LEDGER_FIELDS,
          },
        }),
      }
    );

    const createData = await createRes.json();

    if (createData.code !== 0) {
      return NextResponse.json(
        { error: `创建数据表失败: ${createData.msg}` },
        { status: 500 }
      );
    }

    const tableId = createData.data?.table_id;

    return NextResponse.json({
      success: true,
      data: {
        tableId,
        tableName: name,
        fields: LEDGER_FIELDS.map((f) => f.field_name),
        message: `数据表「${name}」创建成功，包含 ${LEDGER_FIELDS.length} 个字段`,
      },
    });
  } catch (error) {
    console.error("创建台账数据表失败:", error);
    return NextResponse.json(
      { error: "创建台账数据表失败，请稍后重试" },
      { status: 500 }
    );
  }
}
