/**
 * 钉钉知识库 API 客户端
 * 支持知识库列表、节点列表、文档内容获取
 */

export interface DingTalkConfig {
  appKey: string;
  appSecret: string;
}

export interface DingTalkWorkspace {
  workspaceId: string;
  name: string;
  description?: string;
  docCount: number;
  createdTime: string;
}

export interface DingTalkNode {
  nodeId: string;
  name: string;
  nodeType: string; // file or folder
  docKey?: string;
  url?: string;
  createdTime: string;
  updatedTime: string;
}

// Token 缓存
let tokenCache: { token: string; expiresAt: number } | null = null;

/**
 * 获取钉钉 access_token
 */
export async function getAccessToken(config: DingTalkConfig): Promise<string> {
  // 检查缓存
  if (tokenCache && tokenCache.expiresAt > Date.now()) {
    return tokenCache.token;
  }

  const response = await fetch('https://api.dingtalk.com/v1.0/oauth2/accessToken', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      appKey: config.appKey,
      appSecret: config.appSecret,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[dingtalk] getAccessToken error:', response.status, errorText);
    throw new Error(`Failed to get access token: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  // 缓存 token（钉钉 token 有效期 7200 秒，提前 5 分钟刷新）
  tokenCache = {
    token: data.accessToken,
    expiresAt: Date.now() + (data.expireIn - 300) * 1000,
  };

  return data.accessToken;
}

/**
 * 清除 token 缓存
 */
export function clearTokenCache(): void {
  tokenCache = null;
}

/**
 * 验证钉钉配置是否有效
 */
export async function validateDingTalkConfig(config: DingTalkConfig): Promise<boolean> {
  try {
    await getAccessToken(config);
    return true;
  } catch {
    return false;
  }
}

/**
 * 获取知识库列表
 */
export async function listWorkspaces(config: DingTalkConfig, unionId: string): Promise<DingTalkWorkspace[]> {
  const token = await getAccessToken(config);
  
  const response = await fetch(`https://api.dingtalk.com/v2.0/wiki/workspaces?operatorId=${unionId}`, {
    method: 'GET',
    headers: {
      'x-acs-dingtalk-access-token': token,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[dingtalk] listWorkspaces error:', response.status, errorText);
    throw new Error(`Failed to list workspaces: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return (data.workspaces || []).map((ws: { workspaceId: string; name: string; description?: string; docCount?: number; createdTime?: string }) => ({
    workspaceId: ws.workspaceId,
    name: ws.name,
    description: ws.description,
    docCount: ws.docCount || 0,
    createdTime: ws.createdTime || '',
  }));
}

/**
 * 获取知识库节点列表
 */
export async function listNodes(
  config: DingTalkConfig,
  workspaceId: string,
  unionId: string,
  parentNodeId?: string
): Promise<DingTalkNode[]> {
  const token = await getAccessToken(config);
  
  let url = `https://api.dingtalk.com/v2.0/wiki/nodes?workspaceId=${workspaceId}&operatorId=${unionId}`;
  if (parentNodeId) {
    url += `&parentNodeId=${parentNodeId}`;
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'x-acs-dingtalk-access-token': token,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[dingtalk] listNodes error:', response.status, errorText);
    throw new Error(`Failed to list nodes: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return (data.nodes || []).map((node: { nodeId: string; name: string; nodeType: string; docKey?: string; url?: string; createdTime?: string; updatedTime?: string }) => ({
    nodeId: node.nodeId,
    name: node.name,
    nodeType: node.nodeType,
    docKey: node.docKey,
    url: node.url,
    createdTime: node.createdTime || '',
    updatedTime: node.updatedTime || '',
  }));
}

/**
 * 获取节点信息
 */
export async function getNode(
  config: DingTalkConfig,
  workspaceId: string,
  nodeId: string,
  unionId: string
): Promise<DingTalkNode> {
  const token = await getAccessToken(config);
  
  const response = await fetch(
    `https://api.dingtalk.com/v2.0/wiki/nodes/${nodeId}?workspaceId=${workspaceId}&operatorId=${unionId}`,
    {
      method: 'GET',
      headers: {
        'x-acs-dingtalk-access-token': token,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[dingtalk] getNode error:', response.status, errorText);
    throw new Error(`Failed to get node: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return {
    nodeId: data.nodeId,
    name: data.name,
    nodeType: data.nodeType,
    docKey: data.docKey,
    url: data.url,
    createdTime: data.createdTime || '',
    updatedTime: data.updatedTime || '',
  };
}

/**
 * 获取文档内容（通过 docKey）
 * 注意：钉钉文档内容获取需要使用文档 API
 */
export async function getDocumentContent(
  config: DingTalkConfig,
  docKey: string,
  unionId: string
): Promise<{ title: string; content: string }> {
  const token = await getAccessToken(config);
  
  // 获取文档内容
  const response = await fetch(
    `https://api.dingtalk.com/v1.0/doc/documents/${docKey}?operatorId=${unionId}`,
    {
      method: 'GET',
      headers: {
        'x-acs-dingtalk-access-token': token,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[dingtalk] getDocumentContent error:', response.status, errorText);
    throw new Error(`Failed to get document content: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  // 钉钉文档返回的是 blocks 结构，需要提取文本
  let content = '';
  if (data.body) {
    // 如果是纯文本格式
    if (typeof data.body === 'string') {
      content = data.body;
    } else if (data.body.content) {
      content = data.body.content;
    }
  }
  
  // 如果没有获取到内容，尝试从 blocks 中提取
  if (!content && data.blocks) {
    content = extractTextFromBlocks(data.blocks);
  }

  return {
    title: data.title || '未命名文档',
    content: content || '（文档内容为空或无法解析）',
  };
}

/**
 * 从钉钉文档 blocks 结构中提取文本
 */
function extractTextFromBlocks(blocks: Array<{ blockType: string; text?: { content?: string }; children?: Array<{ text?: { content?: string } }> }>): string {
  const texts: string[] = [];
  
  for (const block of blocks) {
    if (block.text?.content) {
      texts.push(block.text.content);
    }
    if (block.children) {
      for (const child of block.children) {
        if (child.text?.content) {
          texts.push(child.text.content);
        }
      }
    }
  }
  
  return texts.join('\n');
}

/**
 * 通过链接获取节点信息
 */
export async function getNodeByUrl(
  config: DingTalkConfig,
  url: string,
  unionId: string
): Promise<DingTalkNode> {
  const token = await getAccessToken(config);
  
  const response = await fetch(
    `https://api.dingtalk.com/v2.0/wiki/nodes/query?url=${encodeURIComponent(url)}&operatorId=${unionId}`,
    {
      method: 'GET',
      headers: {
        'x-acs-dingtalk-access-token': token,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[dingtalk] getNodeByUrl error:', response.status, errorText);
    throw new Error(`Failed to get node by URL: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return {
    nodeId: data.nodeId,
    name: data.name,
    nodeType: data.nodeType,
    docKey: data.docKey,
    url: data.url,
    createdTime: data.createdTime || '',
    updatedTime: data.updatedTime || '',
  };
}
