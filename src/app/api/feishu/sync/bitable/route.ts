import { NextRequest, NextResponse } from "next/server";
import {
  listBitableTables,
  readBitableRecords,
} from "@/lib/feishu-client";

/**
 * GET /api/feishu/sync/bitable?app_token=xxx
 * 获取多维表的数据表列表
 *
 * POST /api/feishu/sync/bitable
 * 读取多维表记录
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const appToken = searchParams.get("app_token");

    if (!appToken) {
      return NextResponse.json(
        { error: "缺少 app_token 参数" },
        { status: 400 }
      );
    }

    const tables = await listBitableTables(appToken);

    return NextResponse.json({
      success: true,
      data: { tables },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "获取多维表列表失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { app_token, table_id, page_size } = body;

    if (!app_token || !table_id) {
      return NextResponse.json(
        { error: "缺少 app_token 或 table_id 参数" },
        { status: 400 }
      );
    }

    const records = await readBitableRecords(
      app_token,
      table_id,
      page_size || 100
    );

    // 将飞书多维表记录转换为平台通用格式
    const rows = records.map((record) => {
      const row: Record<string, unknown> = {
        record_id: record.record_id,
      };

      // 展开 fields
      for (const [key, value] of Object.entries(record.fields)) {
        // 处理飞书字段类型
        if (Array.isArray(value)) {
          // 人员字段、多选字段等
          row[key] = value
            .map((v: { text?: string; name?: string; value?: string }) =>
              v.text || v.name || v.value || String(v)
            )
            .join(", ");
        } else if (typeof value === "object" && value !== null) {
          // 单选字段、链接字段等
          row[key] =
            (value as { text?: string; value?: string }).text ||
            (value as { text?: string; value?: string }).value ||
            JSON.stringify(value);
        } else {
          row[key] = value;
        }
      }

      return row;
    });

    // 提取列名
    const columns = new Set<string>();
    rows.forEach((row) => {
      Object.keys(row).forEach((key) => {
        if (key !== "record_id") columns.add(key);
      });
    });

    return NextResponse.json({
      success: true,
      data: {
        rows,
        columns: Array.from(columns),
        totalRows: rows.length,
        source: "feishu_bitable",
        appToken: app_token,
        tableId: table_id,
        syncedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "读取多维表记录失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
