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
        feishu: {
          appId: config.feishu.appId ? `${config.feishu.appId.slice(0, 8)}****` : "",
          appSecret: config.feishu.appSecret ? "******" : "",
          isConfigured: !!(config.feishu.appId && config.feishu.appSecret),
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
 * 保存平台配置（白名单校验，只允许写入已知字段）
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const currentConfig = getPlatformConfig();

    // 白名单校验：只允许写入已知字段
    const allowedDouyinFields = ['clientKey', 'clientSecret', 'redirectUri'];
    const allowedLlmFields = ['apiKey', 'baseUrl'];
    const allowedFeishuFields = ['appId', 'appSecret'];

    const douyin = body.douyin ?? {
      clientKey: body.douyinClientKey,
      clientSecret: body.douyinClientSecret,
      redirectUri: body.douyinRedirectUri,
    };
    const llm = body.llm ?? {
      apiKey: body.llmApiKey,
      baseUrl: body.llmBaseUrl,
    };
    const feishu = body.feishu ?? {
      appId: body.feishuAppId,
      appSecret: body.feishuAppSecret,
    };

    // 过滤只允许已知字段
    const sanitizedDouyin = { ...currentConfig.douyin };
    if (douyin && typeof douyin === 'object') {
      for (const key of allowedDouyinFields) {
        if (key in douyin && typeof douyin[key] === 'string') {
          (sanitizedDouyin as Record<string, string>)[key] = douyin[key];
        }
      }
    }

    const sanitizedLlm = { ...currentConfig.llm };
    if (llm && typeof llm === 'object') {
      for (const key of allowedLlmFields) {
        if (key in llm && typeof llm[key] === 'string') {
          (sanitizedLlm as Record<string, string>)[key] = llm[key];
        }
      }
    }

    const sanitizedFeishu = { ...currentConfig.feishu };
    if (feishu && typeof feishu === 'object') {
      for (const key of allowedFeishuFields) {
        if (key in feishu && typeof feishu[key] === 'string') {
          (sanitizedFeishu as Record<string, string>)[key] = feishu[key];
        }
      }
    }

    const newConfig: PlatformConfig = {
      douyin: sanitizedDouyin,
      llm: sanitizedLlm,
      feishu: sanitizedFeishu,
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
        feishu: {
          isConfigured: !!(newConfig.feishu.appId && newConfig.feishu.appSecret),
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
