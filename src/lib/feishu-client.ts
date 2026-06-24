/**
 * 飞书开放平台 API 客户端
 * 支持 OAuth2.0 用户授权、多维表/知识库/云文档数据同步
 */

const FEISHU_BASE = "https://open.feishu.cn/open-apis";

// 内存存储（生产环境应使用数据库或 Redis）
interface FeishuSession {
  userAccessToken: string;
  refreshToken: string;
  expiresAt: number;
  userInfo: {
    userId: string;
    name: string;
    avatarUrl: string;
    email: string;
  };
}

const sessions = new Map<string, FeishuSession>();

/**
 * 获取飞书应用凭证（从环境变量读取）
 */
function getAppCredentials() {
  const appId = process.env.FEISHU_APP_ID;
  const appSecret = process.env.FEISHU_APP_SECRET;

  if (!appId || !appSecret) {
    throw new Error(
      "飞书应用凭证未配置。请在环境变量中设置 FEISHU_APP_ID 和 FEISHU_APP_SECRET。\n" +
      "前往 https://open.feishu.cn/app 创建应用并获取凭证。"
    );
  }

  return { appId, appSecret };
}

/**
 * 获取 tenant_access_token（应用身份凭证）
 */
export async function getTenantAccessToken(): Promise<string> {
  const { appId, appSecret } = getAppCredentials();

  const response = await fetch(
    `${FEISHU_BASE}/auth/v3/tenant_access_token/internal`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app_id: appId,
        app_secret: appSecret,
      }),
    }
  );

  const data = await response.json();
  if (data.code !== 0) {
    throw new Error(`获取 tenant_access_token 失败: ${data.msg}`);
  }

  return data.tenant_access_token;
}

/**
 * 构建 OAuth 授权 URL
 */
export function buildAuthUrl(redirectUri: string, state: string): string {
  const { appId } = getAppCredentials();

  const params = new URLSearchParams({
    redirect_uri: redirectUri,
    app_id: appId,
    response_type: "code",
    state,
  });

  return `${FEISHU_BASE}/authen/v1/authorize?${params.toString()}`;
}

/**
 * 用授权码换取 user_access_token
 */
export async function exchangeToken(
  code: string
): Promise<FeishuSession> {
  const { appId, appSecret } = getAppCredentials();

  // 1. 获取 app_access_token
  const appTokenRes = await fetch(
    `${FEISHU_BASE}/auth/v3/app_access_token/internal`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app_id: appId,
        app_secret: appSecret,
      }),
    }
  );
  const appTokenData = await appTokenRes.json();
  if (appTokenData.code !== 0) {
    throw new Error(`获取 app_access_token 失败: ${appTokenData.msg}`);
  }

  // 2. 用 code 换取 user_access_token
  const tokenRes = await fetch(
    `${FEISHU_BASE}/authen/v1/oidc/access_token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${appTokenData.app_access_token}`,
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
      }),
    }
  );
  const tokenData = await tokenRes.json();
  if (tokenData.code !== 0) {
    throw new Error(`换取 user_access_token 失败: ${tokenData.msg}`);
  }

  const { access_token, refresh_token, expires_in } = tokenData.data;

  // 3. 获取用户信息
  const userRes = await fetch(
    `${FEISHU_BASE}/authen/v1/user_info`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    }
  );
  const userData = await userRes.json();
  if (userData.code !== 0) {
    throw new Error(`获取用户信息失败: ${userData.msg}`);
  }

  const session: FeishuSession = {
    userAccessToken: access_token,
    refreshToken: refresh_token,
    expiresAt: Date.now() + expires_in * 1000,
    userInfo: {
      userId: userData.data.open_id || userData.data.user_id,
      name: userData.data.name,
      avatarUrl: userData.data.avatar_url,
      email: userData.data.email || "",
    },
  };

  // 存储 session
  sessions.set(session.userInfo.userId, session);

  return session;
}

/**
 * 获取当前登录状态
 */
export function getSession(): FeishuSession | null {
  // 返回第一个有效的 session
  for (const session of sessions.values()) {
    if (session.expiresAt > Date.now()) {
      return session;
    }
  }
  return null;
}

/**
 * 清除登录状态
 */
export function clearSession(): void {
  sessions.clear();
}

/**
 * 带认证的飞书 API 请求
 */
async function feishuFetch(
  path: string,
  token: string,
  options?: RequestInit
): Promise<unknown> {
  const response = await fetch(`${FEISHU_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  const data = await response.json();
  if (data.code !== 0) {
    throw new Error(`飞书 API 错误 [${path}]: ${data.msg} (code: ${data.code})`);
  }

  return data.data;
}

/**
 * 获取有效的 access token（自动刷新）
 */
async function getValidToken(): Promise<string> {
  const session = getSession();
  if (!session) {
    throw new Error("未登录飞书，请先连接飞书账号");
  }

  // 如果 token 即将过期（5分钟内），尝试刷新
  if (session.expiresAt - Date.now() < 5 * 60 * 1000) {
    try {
      const { appId, appSecret } = getAppCredentials();
      const appTokenRes = await fetch(
        `${FEISHU_BASE}/auth/v3/app_access_token/internal`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
        }
      );
      const appTokenData = await appTokenRes.json();

      const refreshRes = await fetch(
        `${FEISHU_BASE}/authen/v1/oidc/refresh_access_token`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${appTokenData.app_access_token}`,
          },
          body: JSON.stringify({
            grant_type: "refresh_token",
            refresh_token: session.refreshToken,
          }),
        }
      );
      const refreshData = await refreshRes.json();
      if (refreshData.code === 0) {
        session.userAccessToken = refreshData.data.access_token;
        session.refreshToken = refreshData.data.refresh_token;
        session.expiresAt = Date.now() + refreshData.data.expires_in * 1000;
      }
    } catch {
      // 刷新失败，使用现有 token
    }
  }

  return session.userAccessToken;
}

// ==================== 多维表 API ====================

export interface BitableRecord {
  record_id: string;
  fields: Record<string, unknown>;
}

/**
 * 获取多维表的数据表列表
 */
export async function listBitableTables(
  appToken: string
): Promise<{ table_id: string; name: string }[]> {
  const token = await getValidToken();
  const data = (await feishuFetch(
    `/bitable/v1/apps/${appToken}/tables`,
    token
  )) as { items: { table_id: string; name: string }[] };
  return data.items || [];
}

/**
 * 读取多维表记录
 */
export async function readBitableRecords(
  appToken: string,
  tableId: string,
  pageSize = 100
): Promise<BitableRecord[]> {
  const token = await getValidToken();
  const data = (await feishuFetch(
    `/bitable/v1/apps/${appToken}/tables/${tableId}/records?page_size=${pageSize}`,
    token
  )) as { items: BitableRecord[] };
  return data.items || [];
}

// ==================== 知识库 API ====================

export interface WikiNode {
  node_token: string;
  obj_token: string;
  obj_type: string;
  title: string;
  has_child: boolean;
}

/**
 * 获取知识库空间列表
 */
export async function listWikiSpaces(): Promise<
  { space_id: string; name: string; description: string }[]
> {
  const token = await getValidToken();
  const data = (await feishuFetch("/wiki/v2/spaces", token)) as {
    items: { space_id: string; name: string; description: string }[];
  };
  return data.items || [];
}

/**
 * 获取知识库节点列表
 */
export async function listWikiNodes(
  spaceId: string,
  parentNodeToken?: string
): Promise<WikiNode[]> {
  const token = await getValidToken();
  const parentParam = parentNodeToken
    ? `&parent_node_token=${parentNodeToken}`
    : "";
  const data = (await feishuFetch(
    `/wiki/v2/spaces/${spaceId}/nodes?page_size=50${parentParam}`,
    token
  )) as { items: WikiNode[] };
  return data.items || [];
}

// ==================== 云文档 API ====================

/**
 * 获取文档内容
 */
export async function getDocumentContent(
  documentId: string
): Promise<{ title: string; content: string }> {
  const token = await getValidToken();

  // 获取文档元信息
  const meta = (await feishuFetch(
    `/docx/v1/documents/${documentId}`,
    token
  )) as { document: { title: string } };

  // 获取文档原始内容
  const content = (await feishuFetch(
    `/docx/v1/documents/${documentId}/raw_content`,
    token
  )) as { content: string };

  return {
    title: meta.document?.title || "未命名文档",
    content: content.content || "",
  };
}

/**
 * 获取用户云文档列表
 */
export async function listUserDocs(): Promise<
  { token: string; title: string; type: string; url: string }[]
> {
  const token = await getValidToken();

  // 获取根文件夹
  const rootData = (await feishuFetch(
    "/drive/explorer/v2/root_folder/meta",
    token
  )) as { token: string };

  // 获取文件夹下的文件列表
  const filesData = (await feishuFetch(
    `/drive/v1/files?folder_token=${rootData.token}&page_size=50`,
    token
  )) as {
    files: { token: string; name: string; type: string; url: string }[];
  };

  return (filesData.files || []).map((f) => ({
    token: f.token,
    title: f.name,
    type: f.type,
    url: f.url,
  }));
}
