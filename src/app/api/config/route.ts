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
        dify: {
          apiKey: config.dify.apiKey ? "******" : "",
          baseUrl: config.dify.baseUrl || "",
          isConfigured: !!(config.dify.apiKey && config.dify.baseUrl),
        },
        dingtalk: {
          appKey: config.dingtalk.appKey ? `${config.dingtalk.appKey.slice(0, 8)}****` : "",
          appSecret: config.dingtalk.appSecret ? "******" : "",
          unionId: config.dingtalk.unionId || "",
          isConfigured: !!(config.dingtalk.appKey && config.dingtalk.appSecret),
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
    const allowedDifyFields = ['apiKey', 'baseUrl'];
    const allowedDingtalkFields = ['appKey', 'appSecret', 'unionId'];

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
    const dify = body.dify ?? {
      apiKey: body.difyApiKey,
      baseUrl: body.difyBaseUrl,
    };
    const dingtalk = body.dingtalk ?? {
      appKey: body.dingtalkAppKey,
      appSecret: body.dingtalkAppSecret,
      unionId: body.dingtalkUnionId,
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

    const sanitizedDify = { ...currentConfig.dify };
    if (dify && typeof dify === 'object') {
      for (const key of allowedDifyFields) {
        if (key in dify && typeof dify[key] === 'string') {
          (sanitizedDify as Record<string, string>)[key] = dify[key];
        }
      }
    }

    const sanitizedDingtalk = { ...currentConfig.dingtalk };
    if (dingtalk && typeof dingtalk === 'object') {
      for (const key of allowedDingtalkFields) {
        if (key in dingtalk && typeof dingtalk[key] === 'string') {
          (sanitizedDingtalk as Record<string, string>)[key] = dingtalk[key];
        }
      }
    }

    const newConfig: PlatformConfig = {
      douyin: sanitizedDouyin,
      llm: sanitizedLlm,
      feishu: sanitizedFeishu,
      dify: sanitizedDify,
      dingtalk: sanitizedDingtalk,
      knowledge: currentConfig.knowledge,
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
        dify: {
          isConfigured: !!(newConfig.dify.apiKey && newConfig.dify.baseUrl),
        },
        dingtalk: {
          isConfigured: !!(newConfig.dingtalk.appKey && newConfig.dingtalk.appSecret),
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
