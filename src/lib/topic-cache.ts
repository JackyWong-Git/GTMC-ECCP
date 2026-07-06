import fs from 'fs';
import path from 'path';

interface CachedTopic {
  id: number;
  title: string;
  platform: string;
  heat: number;
  likes: number;
  comments: number;
  status: string;
  assignee: string;
  publishDate: string;
  sourceUrl: string;
  tags: string[];
  snippet?: string;
  category?: string;
}

interface TopicCache {
  topics: CachedTopic[];
  fetchedAt: string;
  query: string;
  source: string;
}

function getCacheDir(): string {
  if (process.env.NODE_ENV === 'production') {
    return '/tmp';
  }
  return process.cwd();
}

const CACHE_FILE = path.join(getCacheDir(), '.topic-cache.json');

export function getTopicCache(): TopicCache | null {
  try {
    if (!fs.existsSync(CACHE_FILE)) {
      return null;
    }
    const content = fs.readFileSync(CACHE_FILE, 'utf-8');
    return JSON.parse(content) as TopicCache;
  } catch {
    return null;
  }
}

export function saveTopicCache(data: TopicCache): void {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('保存选题缓存失败:', error);
  }
}

export function clearTopicCache(): void {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      fs.unlinkSync(CACHE_FILE);
    }
  } catch (error) {
    console.error('清除选题缓存失败:', error);
  }
}
