import { NextRequest, NextResponse } from "next/server";
import {
  getPlatformConfig,
  savePlatformConfig,
  type PlatformConfig,
} from "@/lib/platform-config";

/**
 * GET /api/config
 * 获取平台配置（脱敏返回，不暴露 secret）
 */
export async function GET() {
  try {
    const config = getPlatformConfig();

    // 脱敏返回：只显示是否已配置，不显示实际值
    return NextResponse.json({
      success: true,
      data: {
        feishu: {
          appId: config.feishu.appId ? `${config.feishu.appId.slice(0, 4)}****` : "",
          appSecret: config.feishu.appSecret ? "******" : "",
          redirectUri: config.feishu.redirectUri || "",
          isConfigured: !!(config.feishu.appId && config.feishu.appSecret),
        },
        douyin: {
          clientKey: config.douyin.clientKey ? `${config.douyin.clientKey.slice(0, 4)}****` : "",
          clientSecret: config.douyin.clientSecret ? "******" : "",
          redirectUri: config.douyin.redirectUri || "",
          isConfigured: !!(config.douyin.clientKey && config.douyin.clientSecret),
        },
        ledger: {
          appToken: config.ledger.appToken || "",
          tableId: config.ledger.tableId || "",
          autoSync: config.ledger.autoSync || false,
          isConfigured: !!(config.ledger.appToken && config.ledger.tableId),
        },
      },
    });
  } catch (error) {
    console.error("获取配置失败:", error);
    return NextResponse.json(
      { error: "获取配置失败" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/config
 * 保存平台配置
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 支持两种格式：嵌套格式 { feishu: { appId, ... } } 和扁平格式 { feishuAppId, ... }
    const feishu = body.feishu ?? {
      appId: body.feishuAppId,
      appSecret: body.feishuAppSecret,
      redirectUri: body.feishuRedirectUri,
    };
    const douyin = body.douyin ?? {
      clientKey: body.douyinClientKey,
      clientSecret: body.douyinClientSecret,
      redirectUri: body.douyinRedirectUri,
    };
    const ledger = body.ledger ?? {
      appToken: body.ledgerAppToken,
      tableId: body.ledgerTableId,
      autoSync: body.ledgerAutoSync,
    };

    // 获取现有配置
    const currentConfig = getPlatformConfig();

    // 合并新配置（只更新传入的字段）
    const newConfig: PlatformConfig = {
      feishu: {
        ...currentConfig.feishu,
        ...feishu,
      },
      douyin: {
        ...currentConfig.douyin,
        ...douyin,
      },
      ledger: {
        ...currentConfig.ledger,
        ...ledger,
      },
    };

    // 保存配置
    savePlatformConfig(newConfig);

    return NextResponse.json({
      success: true,
      message: "配置保存成功",
      data: {
        feishu: {
          isConfigured: !!(newConfig.feishu.appId && newConfig.feishu.appSecret),
        },
        douyin: {
          isConfigured: !!(newConfig.douyin.clientKey && newConfig.douyin.clientSecret),
        },
        ledger: {
          isConfigured: !!(newConfig.ledger.appToken && newConfig.ledger.tableId),
          autoSync: newConfig.ledger.autoSync,
        },
      },
    });
  } catch (error) {
    console.error("保存配置失败:", error);
    return NextResponse.json(
      { error: "保存配置失败" },
      { status: 500 }
    );
  }
}
