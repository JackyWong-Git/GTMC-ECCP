/**
 * 抖音开放平台 API 客户端
 * 文档: https://developer.open-douyin.com/docs/resource/zh-CN/dop/develop/openapi/account-permission/douyin-sso
 */

import { getDouyinConfig } from "./platform-config";

const DOUYIN_API_BASE = "https://open.douyin.com";

// 内存存储（生产环境应使用数据库）
interface DouyinSession {
  accessToken: string;
  refreshToken: string;
  openId: string;
  expiresIn: number;
  obtainedAt: number;
  userInfo?: {
    nickname: string;
    avatar: string;
    city: string;
    province: string;
    country: string;
    gender: number;
  };
}

let douyinSession: DouyinSession | null = null;

/**
 * 获取抖音应用凭证（从平台配置或环境变量读取）
 */
function getDouyinCredentials(): {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
} {
  const config = getDouyinConfig();
  return {
    clientId: config.clientKey,
    clientSecret: config.clientSecret,
    redirectUri: config.redirectUri,
  };
}

/**
 * 生成抖音 OAuth 授权 URL
 * 文档: https://developer.open-douyin.com/docs/resource/zh-CN/dop/develop/openapi/account-permission/douyin-sso
 */
export function getDouyinAuthUrl(state: string): string {
  const { clientId, redirectUri } = getDouyinCredentials();

  const params = new URLSearchParams({
    client_key: clientId,
    response_type: "code",
    scope: "user_info,video.list,video.data,item.comment,data.external.user,data.external.item",
    redirect_uri: redirectUri,
    state,
  });

  return `https://open.douyin.com/platform/oauth/connect/?${params.toString()}`;
}

/**
 * 用授权码换取 access_token
 * 文档: https://developer.open-douyin.com/docs/resource/zh-CN/dop/develop/openapi/account-permission/access-token
 */
export async function exchangeDouyinToken(code: string): Promise<DouyinSession> {
  const { clientId, clientSecret } = getDouyinCredentials();

  const response = await fetch(`${DOUYIN_API_BASE}/oauth/access_token/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_key: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
    }),
  });

  const result = await response.json();

  if (result.error_code !== 0) {
    throw new Error(`抖音授权失败: ${result.description || result.error_description || "未知错误"}`);
  }

  const session: DouyinSession = {
    accessToken: result.data.access_token,
    refreshToken: result.data.refresh_token,
    openId: result.data.open_id,
    expiresIn: result.data.expires_in,
    obtainedAt: Date.now(),
  };

  douyinSession = session;
  return session;
}

/**
 * 获取当前用户信息
 * 文档: https://developer.open-douyin.com/docs/resource/zh-CN/dop/develop/openapi/account-permission/get-user-info
 */
export async function getDouyinUserInfo(): Promise<DouyinSession["userInfo"]> {
  if (!douyinSession) {
    throw new Error("未登录抖音");
  }

  const response = await fetch(`${DOUYIN_API_BASE}/oauth/userinfo/`, {
    method: "GET",
    headers: {
      "access-token": douyinSession.accessToken,
    },
  });

  const result = await response.json();

  if (result.error_code !== 0) {
    throw new Error(`获取用户信息失败: ${result.description || "未知错误"}`);
  }

  const userInfo = {
    nickname: result.data.nickname || "",
    avatar: result.data.avatar || "",
    city: result.data.city || "",
    province: result.data.province || "",
    country: result.data.country || "",
    gender: result.data.gender || 0,
  };

  douyinSession.userInfo = userInfo;
  return userInfo;
}

/**
 * 获取用户视频列表
 * 文档: https://developer.open-douyin.com/docs/resource/zh-CN/dop/develop/openapi/video-management/video-data/get-played-video-list
 */
export async function getDouyinVideoList(cursor = 0, count = 10): Promise<{
  list: Array<{
    item_id: string;
    title: string;
    create_time: number;
    cover: string;
    video_status: number;
  }>;
  has_more: boolean;
  cursor: number;
}> {
  if (!douyinSession) {
    throw new Error("未登录抖音");
  }

  const response = await fetch(`${DOUYIN_API_BASE}/api/douyin/v1/video/video_list/`, {
    method: "GET",
    headers: {
      "access-token": douyinSession.accessToken,
    },
  });

  const result = await response.json();

  if (result.error_code !== 0) {
    throw new Error(`获取视频列表失败: ${result.description || "未知错误"}`);
  }

  return {
    list: result.data?.list || [],
    has_more: result.data?.has_more || false,
    cursor: result.data?.cursor || 0,
  };
}

/**
 * 获取视频数据（播放、点赞、评论、分享）
 * 文档: https://developer.open-douyin.com/docs/resource/zh-CN/dop/develop/openapi/video-management/video-data/get-video-basic-data
 */
export async function getDouyinVideoData(itemIds: string[]): Promise<
  Array<{
    item_id: string;
    title: string;
    create_time: number;
    statistics: {
      play_count: number;
      digg_count: number;
      comment_count: number;
      share_count: number;
      forward_count: number;
    };
  }>
> {
  if (!douyinSession) {
    throw new Error("未登录抖音");
  }

  const response = await fetch(`${DOUYIN_API_BASE}/api/douyin/v1/video/video_data/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "access-token": douyinSession.accessToken,
    },
    body: JSON.stringify({
      item_ids: itemIds,
    }),
  });

  const result = await response.json();

  if (result.error_code !== 0) {
    throw new Error(`获取视频数据失败: ${result.description || "未知错误"}`);
  }

  return result.data?.list || [];
}

/**
 * 获取用户账号数据（近30天汇总）
 * 文档: https://developer.open-douyin.com/docs/resource/zh-CN/dop/develop/openapi/video-management/video-data/get-user-item-data
 */
export async function getDouyinUserData(): Promise<{
  total_play: number;
  total_like: number;
  total_comment: number;
  total_share: number;
  avg_play_duration: number;
}> {
  if (!douyinSession) {
    throw new Error("未登录抖音");
  }

  const response = await fetch(`${DOUYIN_API_BASE}/api/douyin/v1/video/item_data/`, {
    method: "GET",
    headers: {
      "access-token": douyinSession.accessToken,
    },
  });

  const result = await response.json();

  if (result.error_code !== 0) {
    throw new Error(`获取账号数据失败: ${result.description || "未知错误"}`);
  }

  return {
    total_play: result.data?.total_play || 0,
    total_like: result.data?.total_like || 0,
    total_comment: result.data?.total_comment || 0,
    total_share: result.data?.total_share || 0,
    avg_play_duration: result.data?.avg_play_duration || 0,
  };
}

/**
 * 获取当前抖音登录状态
 */
export function getDouyinStatus(): {
  connected: boolean;
  user: DouyinSession["userInfo"] | null;
  expiresAt: number | null;
} {
  if (!douyinSession) {
    return { connected: false, user: null, expiresAt: null };
  }

  const expiresAt = douyinSession.obtainedAt + douyinSession.expiresIn * 1000;
  const isExpired = Date.now() > expiresAt;

  if (isExpired) {
    douyinSession = null;
    return { connected: false, user: null, expiresAt: null };
  }

  return {
    connected: true,
    user: douyinSession.userInfo || null,
    expiresAt,
  };
}

/**
 * 断开抖音连接
 */
export function disconnectDouyin(): void {
  douyinSession = null;
}

/**
 * 根据 openId 获取抖音 session
 */
export function getDouyinSessionByOpenId(openId: string): DouyinSession | null {
  if (!douyinSession || douyinSession.openId !== openId) {
    return null;
  }
  const expiresAt = douyinSession.obtainedAt + douyinSession.expiresIn * 1000;
  if (Date.now() > expiresAt) {
    douyinSession = null;
    return null;
  }
  return douyinSession;
}
