/**
 * Dify 知识库 API 客户端
 * 支持知识库列表、文档列表、文档内容获取、文档导入
 */

export interface DifyConfig {
  apiKey: string;
  baseUrl: string; // Dify API 基础 URL，如 https://api.dify.ai/v1
}

export interface DifyDataset {
  id: string;
  name: string;
  description?: string;
  document_count: number;
  word_count: number;
  created_at: number;
}

export interface DifyDocument {
  id: string;
  name: string;
  data_source_type: string;
  word_count: number;
  tokens: number;
  indexing_status: string;
  created_at: number;
}

export interface DifySegment {
  id: string;
  position: number;
  content: string;
  word_count: number;
  tokens: number;
  keywords: string[];
  hit_count: number;
  enabled: boolean;
}

// Token 缓存
let tokenCache: { token: string; expiresAt: number } | null = null;

/**
 * 验证 Dify 配置是否有效
 */
export async function validateDifyConfig(config: DifyConfig): Promise<boolean> {
  try {
    const response = await fetch(`${config.baseUrl}/datasets?page=1&limit=1`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * 获取知识库列表
 */
export async function listDatasets(config: DifyConfig, page = 1, limit = 20): Promise<{
  data: DifyDataset[];
  total: number;
  has_more: boolean;
}> {
  const response = await fetch(`${config.baseUrl}/datasets?page=${page}&limit=${limit}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[dify] listDatasets error:', response.status, errorText);
    throw new Error(`Failed to list datasets: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return {
    data: data.data || [],
    total: data.total || 0,
    has_more: data.has_more || false,
  };
}

/**
 * 获取知识库文档列表
 */
export async function listDocuments(config: DifyConfig, datasetId: string, page = 1, limit = 20): Promise<{
  data: DifyDocument[];
  total: number;
  has_more: boolean;
}> {
  const response = await fetch(
    `${config.baseUrl}/datasets/${datasetId}/documents?page=${page}&limit=${limit}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[dify] listDocuments error:', response.status, errorText);
    throw new Error(`Failed to list documents: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return {
    data: data.data || [],
    total: data.total || 0,
    has_more: data.has_more || false,
  };
}

/**
 * 获取文档分段列表（文档内容）
 */
export async function listSegments(config: DifyConfig, datasetId: string, documentId: string): Promise<DifySegment[]> {
  const response = await fetch(
    `${config.baseUrl}/datasets/${datasetId}/documents/${documentId}/segments`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[dify] listSegments error:', response.status, errorText);
    throw new Error(`Failed to list segments: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.data || [];
}

/**
 * 检索知识库（语义搜索）
 */
export async function retrieveDocuments(
  config: DifyConfig,
  datasetId: string,
  query: string,
  topK = 3
): Promise<Array<{ content: string; score: number; document_id: string; document_name: string }>> {
  const response = await fetch(`${config.baseUrl}/datasets/${datasetId}/retrieve`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      retrieval_model: {
        top_k: topK,
        score_threshold: 0.5,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[dify] retrieveDocuments error:', response.status, errorText);
    throw new Error(`Failed to retrieve documents: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return (data.records || []).map((record: { segment: DifySegment; document: { id: string; name: string }; score: number }) => ({
    content: record.segment.content,
    score: record.score || 0,
    document_id: record.document?.id || '',
    document_name: record.document?.name || '',
  }));
}

/**
 * 获取文档完整内容（合并所有分段）
 */
export async function getDocumentContent(
  config: DifyConfig,
  datasetId: string,
  documentId: string
): Promise<{ title: string; content: string }> {
  // 先获取文档信息
  const docsResponse = await fetch(
    `${config.baseUrl}/datasets/${datasetId}/documents?page=1&limit=100`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
    }
  );

  let docTitle = '未命名文档';
  if (docsResponse.ok) {
    const docsData = await docsResponse.json();
    const doc = docsData.data?.find((d: DifyDocument) => d.id === documentId);
    if (doc) {
      docTitle = doc.name;
    }
  }

  // 获取所有分段
  const segments = await listSegments(config, datasetId, documentId);
  
  // 按位置排序并合并内容
  const sortedSegments = segments.sort((a, b) => a.position - b.position);
  const content = sortedSegments.map(s => s.content).join('\n\n');

  return { title: docTitle, content };
}
