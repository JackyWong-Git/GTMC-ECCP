import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/feishu-client";

const FEISHU_API_BASE = "https://open.feishu.cn/open-apis";

/**
 * 产出物记录类型
 */
interface LedgerRecord {
  contentType: string;
  title: string;
  topic?: string;
  platform?: string;
  summary?: string;
  resourceUrl?: string;
  previewUrl?: string;
  model?: string;
  status?: string;
  creator?: string;
  publishTime?: number;
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  notes?: string;
}

/**
 * 将产出物记录转换为多维表字段
 */
function toBitableFields(record: LedgerRecord): Record<string, unknown> {
  const fields: Record<string, unknown> = {
    "内容类型": record.contentType,
    "标题": record.title,
    "创建时间": Date.now(),
  };

  if (record.topic) fields["关联选题"] = record.topic;
  if (record.platform) fields["目标平台"] = record.platform;
  if (record.summary) fields["内容摘要"] = record.summary;
  if (record.resourceUrl) fields["资源链接"] = { link: record.resourceUrl, text: "查看资源" };
  if (record.previewUrl) fields["预览图"] = { link: record.previewUrl, text: "预览" };
  if (record.model) fields["生成模型"] = record.model;
  if (record.status) fields["状态"] = record.status;
  if (record.creator) fields["负责人"] = record.creator;
  if (record.publishTime) fields["发布时间"] = record.publishTime;
  if (record.views !== undefined) fields["播放量"] = record.views;
  if (record.likes !== undefined) fields["点赞数"] = record.likes;
  if (record.comments !== undefined) fields["评论数"] = record.comments;
  if (record.shares !== undefined) fields["分享数"] = record.shares;
  if (record.notes) fields["备注"] = record.notes;

  return fields;
}

/**
 * POST /api/feishu/bitable/add-record
 * 向多维表台账写入一条或多条记录
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
    const { appToken, tableId, records } = body as {
      appToken?: string;
      tableId?: string;
      records?: LedgerRecord[];
    };

    if (!appToken || !tableId) {
      return NextResponse.json(
        { error: "缺少多维表 appToken 或 tableId" },
        { status: 400 }
      );
    }

    if (!records || records.length === 0) {
      return NextResponse.json(
        { error: "缺少记录数据" },
        { status: 400 }
      );
    }

    // 批量写入记录
    const batchRecords = records.map((record) => ({
      fields: toBitableFields(record),
    }));

    const res = await fetch(
      `${FEISHU_API_BASE}/bitable/v1/apps/${appToken}/tables/${tableId}/records/batch_create`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.userAccessToken}`,
        },
        body: JSON.stringify({ records: batchRecords }),
      }
    );

    const data = await res.json();

    if (data.code !== 0) {
      return NextResponse.json(
        { error: `写入记录失败: ${data.msg}` },
        { status: 500 }
      );
    }

    const recordIds = data.data?.records?.map(
      (r: { record_id: string }) => r.record_id
    ) || [];

    return NextResponse.json({
      success: true,
      data: {
        recordIds,
        total: recordIds.length,
        message: `成功写入 ${recordIds.length} 条记录到台账`,
      },
    });
  } catch (error) {
    console.error("写入台账记录失败:", error);
    return NextResponse.json(
      { error: "写入台账记录失败，请稍后重试" },
      { status: 500 }
    );
  }
}
