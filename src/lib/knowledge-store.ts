/**
 * 知识库本地存储工具
 * 使用 JSON 文件存储文档，支持增删改查和模糊搜索
 */

import fs from "fs";
import path from "path";

export interface KnowledgeDocument {
  id: string;
  title: string;
  content: string;
  source: string;
  tags: string[];
  category: string;
  createdAt: string;
  updatedAt: string;
  wordCount: number;
}

const KNOWLEDGE_FILE = path.join(process.cwd(), ".knowledge.json");

/**
 * 读取知识库文件
 */
function readKnowledgeStore(): KnowledgeDocument[] {
  try {
    if (!fs.existsSync(KNOWLEDGE_FILE)) {
      return [];
    }
    const data = fs.readFileSync(KNOWLEDGE_FILE, "utf-8");
    return JSON.parse(data) as KnowledgeDocument[];
  } catch {
    return [];
  }
}

/**
 * 写入知识库文件
 */
function writeKnowledgeStore(documents: KnowledgeDocument[]): void {
  fs.writeFileSync(KNOWLEDGE_FILE, JSON.stringify(documents, null, 2), "utf-8");
}

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 添加文档
 */
export function addDocument(params: {
  title: string;
  content: string;
  source?: string;
  tags?: string[];
  category?: string;
}): KnowledgeDocument {
  const documents = readKnowledgeStore();

  const newDoc: KnowledgeDocument = {
    id: generateId(),
    title: params.title,
    content: params.content,
    source: params.source || "local",
    tags: params.tags || [],
    category: params.category || "other",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    wordCount: params.content.length,
  };

  documents.unshift(newDoc);
  writeKnowledgeStore(documents);

  return newDoc;
}

/**
 * 获取所有文档
 */
export function listDocuments(options?: {
  category?: string;
  limit?: number;
  offset?: number;
}): { documents: KnowledgeDocument[]; total: number } {
  let documents = readKnowledgeStore();

  // 按分类过滤
  if (options?.category && options.category !== "all") {
    documents = documents.filter((doc) => doc.category === options.category);
  }

  const total = documents.length;

  // 分页
  const offset = options?.offset || 0;
  const limit = options?.limit || 50;
  documents = documents.slice(offset, offset + limit);

  return { documents, total };
}

/**
 * 获取单个文档
 */
export function getDocument(id: string): KnowledgeDocument | null {
  const documents = readKnowledgeStore();
  return documents.find((doc) => doc.id === id) || null;
}

/**
 * 更新文档
 */
export function updateDocument(
  id: string,
  updates: Partial<Omit<KnowledgeDocument, "id" | "createdAt">>
): KnowledgeDocument | null {
  const documents = readKnowledgeStore();
  const index = documents.findIndex((doc) => doc.id === id);

  if (index === -1) {
    return null;
  }

  const updatedDoc: KnowledgeDocument = {
    ...documents[index],
    ...updates,
    updatedAt: new Date().toISOString(),
    wordCount: updates.content?.length || documents[index].wordCount,
  };

  documents[index] = updatedDoc;
  writeKnowledgeStore(documents);

  return updatedDoc;
}

/**
 * 删除文档
 */
export function deleteDocument(id: string): boolean {
  const documents = readKnowledgeStore();
  const filtered = documents.filter((doc) => doc.id !== id);

  if (filtered.length === documents.length) {
    return false;
  }

  writeKnowledgeStore(filtered);
  return true;
}

/**
 * 模糊搜索文档
 * 使用简单的关键词匹配，支持标题和内容搜索
 */
export function searchDocuments(
  query: string,
  options?: { category?: string; limit?: number }
): { results: KnowledgeDocument[]; total: number } {
  const documents = readKnowledgeStore();
  const queryLower = query.toLowerCase();
  const keywords = queryLower.split(/\s+/).filter(Boolean);

  let results = documents.filter((doc) => {
    const titleLower = doc.title.toLowerCase();
    const contentLower = doc.content.toLowerCase();
    const tagsLower = doc.tags.join(" ").toLowerCase();

    // 所有关键词都必须匹配
    return keywords.every(
      (keyword) =>
        titleLower.includes(keyword) ||
        contentLower.includes(keyword) ||
        tagsLower.includes(keyword)
    );
  });

  // 按分类过滤
  if (options?.category && options.category !== "all") {
    results = results.filter((doc) => doc.category === options.category);
  }

  // 计算相关性分数并排序
  const scored = results.map((doc) => {
    let score = 0;
    const titleLower = doc.title.toLowerCase();
    const contentLower = doc.content.toLowerCase();

    keywords.forEach((keyword) => {
      // 标题匹配权重更高
      if (titleLower.includes(keyword)) score += 10;
      // 内容匹配
      const contentMatches = (contentLower.match(new RegExp(keyword, "g")) || []).length;
      score += contentMatches;
    });

    return { doc, score };
  });

  scored.sort((a, b) => b.score - a.score);

  const limit = options?.limit || 20;
  const limited = scored.slice(0, limit).map((s) => s.doc);

  return { results: limited, total: results.length };
}

/**
 * 获取知识库统计
 */
export function getKnowledgeStats(): {
  totalDocuments: number;
  totalWords: number;
  categories: Record<string, number>;
  sources: Record<string, number>;
  recentDocuments: KnowledgeDocument[];
} {
  const documents = readKnowledgeStore();

  const categories: Record<string, number> = {};
  const sources: Record<string, number> = {};
  let totalWords = 0;

  documents.forEach((doc) => {
    categories[doc.category] = (categories[doc.category] || 0) + 1;
    sources[doc.source] = (sources[doc.source] || 0) + 1;
    totalWords += doc.wordCount;
  });

  return {
    totalDocuments: documents.length,
    totalWords,
    categories,
    sources,
    recentDocuments: documents.slice(0, 5),
  };
}
