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

    return NextResponse.json({
      success: true,
      data: {
        douyin: {
          clientKey: config.douyin.clientKey ? `${config.douyin.clientKey.slice(0, 4)}****` : "",
          clientSecret: config.douyin.clientSecret ? "******" : "",
          redirectUri: config.douyin.redirectUri || "",
          isConfigured: !!(config.douyin.clientKey && config.douyin.clientSecret),
        },
        llm: {
          apiKey: config.llm.apiKey ? "******" : "",
          baseUrl: config.llm.baseUrl || "",
          isConfigured: !!config.llm.apiKey,
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

    const douyin = body.douyin ?? {
      clientKey: body.douyinClientKey,
      clientSecret: body.douyinClientSecret,
      redirectUri: body.douyinRedirectUri,
    };
    const llm = body.llm ?? {
      apiKey: body.llmApiKey,
      baseUrl: body.llmBaseUrl,
    };

    const currentConfig = getPlatformConfig();

    const newConfig: PlatformConfig = {
      douyin: {
        ...currentConfig.douyin,
        ...douyin,
      },
      llm: {
        ...currentConfig.llm,
        ...llm,
      },
    };

    savePlatformConfig(newConfig);

    return NextResponse.json({
      success: true,
      message: "配置保存成功",
      data: {
        douyin: {
          isConfigured: !!(newConfig.douyin.clientKey && newConfig.douyin.clientSecret),
        },
        llm: {
          isConfigured: !!newConfig.llm.apiKey,
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
