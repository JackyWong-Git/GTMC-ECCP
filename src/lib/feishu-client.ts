/**
 * 飞书开放平台 API 客户端
 * 支持知识库（Wiki）文档读取
 */

const FEISHU_BASE = "https://open.feishu.cn/open-apis";

export interface FeishuConfig {
  appId: string;
  appSecret: string;
}

interface TokenCache {
  token: string;
  expiresAt: number;
}

let tokenCache: TokenCache | null = null;

/**
 * 清除 token 缓存（用于权限变更后强制重新获取）
 */
export function clearTokenCache(): void {
  tokenCache = null;
}

/**
 * 获取 tenant_access_token
 */
export async function getTenantAccessToken(config: FeishuConfig): Promise<string> {
  // Check cache
  if (tokenCache && tokenCache.expiresAt > Date.now()) {
    return tokenCache.token;
  }

  const response = await fetch(`${FEISHU_BASE}/auth/v3/tenant_access_token/internal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      app_id: config.appId,
      app_secret: config.appSecret,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[feishu] getTenantAccessToken error:", response.status, errorText);
    throw new Error(`Failed to get tenant_access_token: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  if (data.code !== 0) {
    console.error("[feishu] getTenantAccessToken API error:", data);
    throw new Error(`Feishu auth error: ${data.msg} (code: ${data.code})`);
  }

  // Cache token (expires in 2 hours, cache for 1.5 hours)
  tokenCache = {
    token: data.tenant_access_token,
    expiresAt: Date.now() + (data.expire - 300) * 1000, // 5 min buffer
  };

  return tokenCache.token;
}

/**
 * 获取知识库空间列表
 */
export async function listWikiSpaces(config: FeishuConfig): Promise<WikiSpace[]> {
  const token = await getTenantAccessToken(config);

  const response = await fetch(`${FEISHU_BASE}/wiki/v2/spaces?page_size=50`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[feishu] listWikiSpaces error:", response.status, errorText);
    throw new Error(`Failed to list wiki spaces: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  if (data.code !== 0) {
    throw new Error(`Feishu API error: ${data.msg} (code: ${data.code})`);
  }

  return (data.data?.items || []).map((item: WikiSpaceRaw) => ({
    spaceId: item.space_id,
    name: item.name,
    description: item.description,
    visibility: item.visibility,
  }));
}

/**
 * 获取知识库节点列表
 */
export async function listWikiNodes(
  config: FeishuConfig,
  spaceId: string,
  parentNodeToken?: string
): Promise<WikiNode[]> {
  const token = await getTenantAccessToken(config);

  const params = new URLSearchParams({
    space_id: spaceId,
    page_size: "50",
  });
  if (parentNodeToken) {
    params.set("parent_node_token", parentNodeToken);
  }

  const response = await fetch(`${FEISHU_BASE}/wiki/v2/spaces/${spaceId}/nodes?${params}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to list wiki nodes: ${response.status}`);
  }

  const data = await response.json();
  if (data.code !== 0) {
    throw new Error(`Feishu API error: ${data.msg}`);
  }

  return (data.data?.items || []).map((item: WikiNodeRaw) => ({
    nodeToken: item.node_token,
    objToken: item.obj_token,
    objType: item.obj_type,
    title: item.title,
    hasChild: item.has_child,
    parentNodeToken: item.parent_node_token,
    nodeCreateTime: item.node_create_time,
    objEditTime: item.obj_edit_time,
  }));
}

/**
 * 获取文档内容（docx 格式）
 */
export async function getDocumentContent(
  config: FeishuConfig,
  documentId: string
): Promise<string> {
  const token = await getTenantAccessToken(config);

  // Get document raw content
  const response = await fetch(
    `${FEISHU_BASE}/docx/v1/documents/${documentId}/raw_content`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to get document content: ${response.status}`);
  }

  const data = await response.json();
  if (data.code !== 0) {
    throw new Error(`Feishu API error: ${data.msg}`);
  }

  return data.data?.content || "";
}

/**
 * 获取文档块列表（更详细的内容）
 */
export async function getDocumentBlocks(
  config: FeishuConfig,
  documentId: string
): Promise<DocumentBlock[]> {
  const token = await getTenantAccessToken(config);

  const response = await fetch(
    `${FEISHU_BASE}/docx/v1/documents/${documentId}/blocks?page_size=500`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to get document blocks: ${response.status}`);
  }

  const data = await response.json();
  if (data.code !== 0) {
    throw new Error(`Feishu API error: ${data.msg}`);
  }

  return (data.data?.items || []).map((item: DocumentBlockRaw) => ({
    blockId: item.block_id,
    blockType: item.block_type,
    text: extractTextFromBlock(item),
  }));
}

/**
 * 从 block 中提取文本内容
 */
function extractTextFromBlock(block: DocumentBlockRaw): string {
  const textElements: string[] = [];

  // Handle different block types
  if (block.text?.elements) {
    for (const el of block.text.elements) {
      if (el.text_run?.content) {
        textElements.push(el.text_run.content);
      }
    }
  }

  if (block.heading1?.elements) {
    for (const el of block.heading1.elements) {
      if (el.text_run?.content) {
        textElements.push(el.text_run.content);
      }
    }
  }

  if (block.heading2?.elements) {
    for (const el of block.heading2.elements) {
      if (el.text_run?.content) {
        textElements.push(el.text_run.content);
      }
    }
  }

  if (block.heading3?.elements) {
    for (const el of block.heading3.elements) {
      if (el.text_run?.content) {
        textElements.push(el.text_run.content);
      }
    }
  }

  if (block.bullet?.elements) {
    for (const el of block.bullet.elements) {
      if (el.text_run?.content) {
        textElements.push(`• ${el.text_run.content}`);
      }
    }
  }

  if (block.ordered?.elements) {
    for (const el of block.ordered.elements) {
      if (el.text_run?.content) {
        textElements.push(el.text_run.content);
      }
    }
  }

  if (block.code?.elements) {
    for (const el of block.code.elements) {
      if (el.text_run?.content) {
        textElements.push(el.text_run.content);
      }
    }
  }

  return textElements.join("");
}

/**
 * 搜索知识库文档
 */
export async function searchWikiDocs(
  config: FeishuConfig,
  query: string,
  spaceId?: string
): Promise<SearchResult[]> {
  const token = await getTenantAccessToken(config);

  const body: Record<string, unknown> = {
    search_key: query,
    count: 20,
    offset: 0,
    entity_types: ["doc", "docx", "wiki"],
  };

  if (spaceId) {
    body.space_id = spaceId;
  }

  const response = await fetch(`${FEISHU_BASE}/suite/docs-api/search/object`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Failed to search docs: ${response.status}`);
  }

  const data = await response.json();
  if (data.code !== 0) {
    throw new Error(`Feishu API error: ${data.msg}`);
  }

  return (data.data?.docs_entities || []).map((item: SearchResultRaw) => ({
    docToken: item.docs_token,
    docType: item.docs_type,
    title: item.title,
    url: item.url,
    ownerId: item.owner_id,
    createTime: item.create_time,
    updateTime: item.update_time,
  }));
}

// Type definitions
interface WikiSpaceRaw {
  space_id: string;
  name: string;
  description?: string;
  visibility?: string;
}

interface WikiNodeRaw {
  node_token: string;
  obj_token: string;
  obj_type: string;
  title: string;
  has_child: boolean;
  parent_node_token?: string;
  node_create_time?: string;
  obj_edit_time?: string;
}

interface DocumentBlockRaw {
  block_id: string;
  block_type: number;
  text?: { elements?: TextElement[] };
  heading1?: { elements?: TextElement[] };
  heading2?: { elements?: TextElement[] };
  heading3?: { elements?: TextElement[] };
  bullet?: { elements?: TextElement[] };
  ordered?: { elements?: TextElement[] };
  code?: { elements?: TextElement[] };
}

interface TextElement {
  text_run?: { content: string };
}

interface SearchResultRaw {
  docs_token: string;
  docs_type: string;
  title: string;
  url?: string;
  owner_id?: string;
  create_time?: string;
  update_time?: string;
}

// Exported types
export interface WikiSpace {
  spaceId: string;
  name: string;
  description?: string;
  visibility?: string;
}

export interface WikiNode {
  nodeToken: string;
  objToken: string;
  objType: string;
  title: string;
  hasChild: boolean;
  parentNodeToken?: string;
  nodeCreateTime?: string;
  objEditTime?: string;
}

export interface DocumentBlock {
  blockId: string;
  blockType: number;
  text: string;
}

export interface SearchResult {
  docToken: string;
  docType: string;
  title: string;
  url?: string;
  ownerId?: string;
  createTime?: string;
  updateTime?: string;
}
