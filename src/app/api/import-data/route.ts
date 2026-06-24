import { NextRequest, NextResponse } from "next/server";

interface ImportRow {
  [key: string]: string | number | boolean | null;
}

interface ImportResult {
  success: boolean;
  data: {
    rows: ImportRow[];
    columns: string[];
    totalRows: number;
    format: "csv" | "json";
    importedAt: string;
  };
  error?: string;
}

function parseCSV(text: string): { rows: ImportRow[]; columns: string[] } {
  const lines = text.trim().split("\n");
  if (lines.length < 2) {
    throw new Error("CSV 文件至少需要包含表头和一行数据");
  }

  // 解析表头
  const columns = lines[0].split(",").map((col) => col.trim().replace(/^["']|["']$/g, ""));

  // 解析数据行
  const rows: ImportRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(",").map((val) => val.trim().replace(/^["']|["']$/g, ""));
    const row: ImportRow = {};

    columns.forEach((col, idx) => {
      const val = values[idx] ?? "";
      // 尝试转换为数字
      const num = Number(val);
      if (val !== "" && !isNaN(num)) {
        row[col] = num;
      } else if (val === "true" || val === "false") {
        row[col] = val === "true";
      } else {
        row[col] = val || null;
      }
    });

    rows.push(row);
  }

  return { rows, columns };
}

function parseJSON(text: string): { rows: ImportRow[]; columns: string[] } {
  const parsed = JSON.parse(text);

  let dataArray: ImportRow[];
  if (Array.isArray(parsed)) {
    dataArray = parsed;
  } else if (parsed.data && Array.isArray(parsed.data)) {
    dataArray = parsed.data;
  } else if (parsed.rows && Array.isArray(parsed.rows)) {
    dataArray = parsed.rows;
  } else {
    throw new Error("JSON 格式不正确，需要是数组或包含 data/rows 字段的对象");
  }

  if (dataArray.length === 0) {
    throw new Error("数据为空");
  }

  // 提取所有列名
  const columnSet = new Set<string>();
  dataArray.forEach((row) => {
    Object.keys(row).forEach((key) => columnSet.add(key));
  });
  const columns = Array.from(columnSet);

  return { rows: dataArray, columns };
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let text: string;
    let format: "csv" | "json";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return NextResponse.json(
          { error: "请上传文件" },
          { status: 400 }
        );
      }

      text = await file.text();
      const fileName = file.name.toLowerCase();

      if (fileName.endsWith(".csv")) {
        format = "csv";
      } else if (fileName.endsWith(".json")) {
        format = "json";
      } else {
        return NextResponse.json(
          { error: "仅支持 CSV 和 JSON 格式文件" },
          { status: 400 }
        );
      }
    } else if (contentType.includes("application/json")) {
      const body = await request.json();
      const { data, format: inputFormat } = body as { data: string; format?: string };

      if (!data) {
        return NextResponse.json(
          { error: "缺少 data 字段" },
          { status: 400 }
        );
      }

      text = data;
      format = (inputFormat === "csv" ? "csv" : "json") as "csv" | "json";
    } else {
      return NextResponse.json(
        { error: "不支持的 Content-Type，请使用 multipart/form-data 或 application/json" },
        { status: 400 }
      );
    }

    let result: { rows: ImportRow[]; columns: string[] };

    if (format === "csv") {
      result = parseCSV(text);
    } else {
      result = parseJSON(text);
    }

    const response: ImportResult = {
      success: true,
      data: {
        rows: result.rows,
        columns: result.columns,
        totalRows: result.rows.length,
        format,
        importedAt: new Date().toISOString(),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "数据解析失败";
    console.error("数据导入失败:", error);
    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }
}
