import fs from "fs";
import path from "path";

/**
 * 平台配置类型
 */
export interface PlatformConfig {
  feishu: {
    appId: string;
    appSecret: string;
    redirectUri: string;
  };
  douyin: {
    clientKey: string;
    clientSecret: string;
    redirectUri: string;
  };
}

const DEFAULT_CONFIG: PlatformConfig = {
  feishu: {
    appId: "",
    appSecret: "",
    redirectUri: "",
  },
  douyin: {
    clientKey: "",
    clientSecret: "",
    redirectUri: "",
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

  // 尝试从文件读取
  let fileConfig: Partial<PlatformConfig> = {};
  try {
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, "utf-8");
      fileConfig = JSON.parse(content);
    }
  } catch {
    // 文件读取失败，使用默认值
  }

  // 合并环境变量（环境变量优先级更高）
  const config: PlatformConfig = {
    feishu: {
      appId:
        process.env.FEISHU_APP_ID || fileConfig.feishu?.appId || "",
      appSecret:
        process.env.FEISHU_APP_SECRET || fileConfig.feishu?.appSecret || "",
      redirectUri:
        process.env.FEISHU_REDIRECT_URI || fileConfig.feishu?.redirectUri || "",
    },
    douyin: {
      clientKey:
        process.env.DOUYIN_CLIENT_KEY || fileConfig.douyin?.clientKey || "",
      clientSecret:
        process.env.DOUYIN_CLIENT_SECRET || fileConfig.douyin?.clientSecret || "",
      redirectUri:
        process.env.DOUYIN_REDIRECT_URI || fileConfig.douyin?.redirectUri || "",
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
 * 获取飞书配置（便捷方法）
 */
export function getFeishuConfig(): {
  appId: string;
  appSecret: string;
  redirectUri: string;
  isConfigured: boolean;
} {
  const config = getPlatformConfig();
  return {
    ...config.feishu,
    isConfigured: !!(config.feishu.appId && config.feishu.appSecret),
  };
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
