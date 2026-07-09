import fs from "fs";
import path from "path";

/**
 * 知识库默认数据集名称
 */
export const DEFAULT_KNOWLEDGE_DATASET = "coze_doc_knowledge";
export const KNOWLEDGE_DATASET_NAME = DEFAULT_KNOWLEDGE_DATASET;

/**
 * 平台配置类型
 */
export interface PlatformConfig {
  douyin: {
    clientKey: string;
    clientSecret: string;
    redirectUri: string;
  };
  llm: {
    apiKey: string;
    baseUrl: string;
  };
  feishu: {
    appId: string;
    appSecret: string;
  };
  dify: {
    apiKey: string;
    baseUrl: string;
  };
  dingtalk: {
    appKey: string;
    appSecret: string;
    unionId: string;
  };
  knowledge: {
    datasetName: string;
  };
}

const DEFAULT_CONFIG: PlatformConfig = {
  douyin: {
    clientKey: "",
    clientSecret: "",
    redirectUri: "",
  },
  llm: {
    apiKey: "",
    baseUrl: "",
  },
  feishu: {
    appId: "",
    appSecret: "",
  },
  dify: {
    apiKey: "",
    baseUrl: "",
  },
  dingtalk: {
    appKey: "",
    appSecret: "",
    unionId: "",
  },
  knowledge: {
    datasetName: DEFAULT_KNOWLEDGE_DATASET,
  },
};

/**
 * 配置文件路径
 * 生产环境使用 /tmp，开发环境使用项目根目录
 */
function getConfigPath(): string {
  const isDev = process.env.NODE_ENV !== "production";
  if (isDev) {
    return path.join(process.cwd(), ".platform-config.json");
  }
  return "/tmp/platform-config.json";
}

/**
 * 读取平台配置
 * 优先读取配置文件，其次读取环境变量
 */
export function getPlatformConfig(): PlatformConfig {
  const configPath = getConfigPath();

  let fileConfig: Partial<PlatformConfig> = {};
  try {
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, "utf-8");
      fileConfig = JSON.parse(content);
    }
  } catch {
    // 文件读取失败，使用默认值
  }

  const config: PlatformConfig = {
    douyin: {
      clientKey:
        process.env.DOUYIN_CLIENT_KEY || fileConfig.douyin?.clientKey || "",
      clientSecret:
        process.env.DOUYIN_CLIENT_SECRET || fileConfig.douyin?.clientSecret || "",
      redirectUri:
        process.env.DOUYIN_REDIRECT_URI || fileConfig.douyin?.redirectUri || "",
    },
    llm: {
      apiKey:
        process.env.OPENAI_API_KEY || fileConfig.llm?.apiKey || "",
      baseUrl:
        process.env.OPENAI_BASE_URL || fileConfig.llm?.baseUrl || "",
    },
    feishu: {
      appId:
        process.env.FEISHU_APP_ID || fileConfig.feishu?.appId || "",
      appSecret:
        process.env.FEISHU_APP_SECRET || fileConfig.feishu?.appSecret || "",
    },
    dify: {
      apiKey:
        process.env.DIFY_API_KEY || fileConfig.dify?.apiKey || "",
      baseUrl:
        process.env.DIFY_BASE_URL || fileConfig.dify?.baseUrl || "",
    },
    dingtalk: {
      appKey:
        process.env.DINGTALK_APP_KEY || fileConfig.dingtalk?.appKey || "",
      appSecret:
        process.env.DINGTALK_APP_SECRET || fileConfig.dingtalk?.appSecret || "",
      unionId:
        process.env.DINGTALK_UNION_ID || fileConfig.dingtalk?.unionId || "",
    },
    knowledge: {
      datasetName:
        process.env.KNOWLEDGE_DATASET_NAME || fileConfig.knowledge?.datasetName || KNOWLEDGE_DATASET_NAME,
    },
  };

  return config;
}

/**
 * 保存平台配置到文件
 */
export function savePlatformConfig(config: PlatformConfig): void {
  const configPath = getConfigPath();
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
}

/**
 * 获取抖音配置（便捷方法）
 */
export function getDouyinConfig(): {
  clientKey: string;
  clientSecret: string;
  redirectUri: string;
  isConfigured: boolean;
} {
  const config = getPlatformConfig();
  return {
    ...config.douyin,
    isConfigured: !!(config.douyin.clientKey && config.douyin.clientSecret),
  };
}

/**
 * 获取 LLM 配置（便捷方法）
 */
export function getLLMConfig(): {
  apiKey: string;
  baseUrl: string;
  isConfigured: boolean;
} {
  const config = getPlatformConfig();
  return {
    ...config.llm,
    isConfigured: !!config.llm.apiKey,
  };
}

/**
 * 设置 LLM 环境变量
 */
export function setupLLMEnv(): void {
  const llmConfig = getLLMConfig();
  if (llmConfig.apiKey && !process.env.OPENAI_API_KEY) {
    process.env.OPENAI_API_KEY = llmConfig.apiKey;
  }
  if (llmConfig.baseUrl && !process.env.OPENAI_BASE_URL) {
    process.env.OPENAI_BASE_URL = llmConfig.baseUrl;
  }
}

/**
 * 获取飞书配置（便捷方法）
 */
export function getFeishuConfig(): {
  appId: string;
  appSecret: string;
  isConfigured: boolean;
} {
  const config = getPlatformConfig();
  return {
    ...config.feishu,
    isConfigured: !!(config.feishu.appId && config.feishu.appSecret),
  };
}

/**
 * 获取 Dify 配置（便捷方法）
 */
export function getDifyConfig(): {
  apiKey: string;
  baseUrl: string;
  isConfigured: boolean;
} {
  const config = getPlatformConfig();
  return {
    ...config.dify,
    isConfigured: !!(config.dify.apiKey && config.dify.baseUrl),
  };
}

/**
 * 获取钉钉配置（便捷方法）
 */
export function getDingTalkConfig(): {
  appKey: string;
  appSecret: string;
  unionId: string;
  isConfigured: boolean;
} {
  const config = getPlatformConfig();
  return {
    ...config.dingtalk,
    isConfigured: !!(config.dingtalk.appKey && config.dingtalk.appSecret),
  };
}
