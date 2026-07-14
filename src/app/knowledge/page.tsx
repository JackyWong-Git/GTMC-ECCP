'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import {
  Search,
  Plus,
  FileText,
  Trash2,
  Loader2,
  AlertCircle,
  BookOpen,
  Sparkles,
  MessageSquare,
  Download,
  X,
  Star,
  FolderOpen,
  ChevronRight,
  RefreshCw,
  Settings,
  ExternalLink,
  Tag,
  Clock,
  Eye,
  Zap,
  TrendingUp,
  HelpCircle,
  Target,
} from 'lucide-react';

// Search result interface
interface SearchResult {
  id: string;
  title: string;
  content: string;
  source: string;
  score: number;
}

// Document interface
interface Document {
  id: string;
  title: string;
  content: string;
  source: string;
  tags: string[];
  category?: string;
  createdAt: string;
  isFeatured?: boolean;
}

// Category definitions
interface Category {
  id: string;
  name: string;
  icon: React.ElementType;
  color: string;
}

const CATEGORIES: Category[] = [
  { id: 'operations', name: '运营策略', icon: Zap, color: 'bg-blue-100 text-blue-700' },
  { id: 'content', name: '内容创作', icon: FileText, color: 'bg-purple-100 text-purple-700' },
  { id: 'data', name: '数据分析', icon: Eye, color: 'bg-green-100 text-green-700' },
  { id: 'industry', name: '行业洞察', icon: TrendingUp, color: 'bg-amber-100 text-amber-700' },
  { id: 'tools', name: '工具教程', icon: Settings, color: 'bg-cyan-100 text-cyan-700' },
  { id: 'cases', name: '案例复盘', icon: BookOpen, color: 'bg-pink-100 text-pink-700' },
  { id: 'other', name: '其他', icon: FolderOpen, color: 'bg-gray-100 text-gray-700' },
];

// Source badges
const SOURCE_BADGES: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  local: { label: '本地', color: 'bg-blue-100 text-blue-700', icon: BookOpen },
  feishu: { label: '飞书', color: 'bg-indigo-100 text-indigo-700', icon: FileText },
  dify: { label: 'Dify', color: 'bg-purple-100 text-purple-700', icon: Sparkles },
  dingtalk: { label: '钉钉', color: 'bg-cyan-100 text-cyan-700', icon: MessageSquare },
};

// Import source tabs
const IMPORT_SOURCES = [
  { id: 'text', label: '文本', icon: FileText },
  { id: 'url', label: '网页', icon: ExternalLink },
  { id: 'feishu', label: '飞书', icon: BookOpen },
  { id: 'dingtalk', label: '钉钉', icon: MessageSquare },
];

export default function KnowledgePage() {
  // Documents state
  const [documents, setDocuments] = useState<Document[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Document[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Import modal state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importSource, setImportSource] = useState('text');
  const [importTitle, setImportTitle] = useState('');
  const [importContent, setImportContent] = useState('');
  const [importUrl, setImportUrl] = useState('');
  const [importCategory, setImportCategory] = useState('other');
  const [importTags, setImportTags] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  // Featured documents
  const [featuredIds, setFeaturedIds] = useState<string[]>([]);

  // Config status
  const [configStatus, setConfigStatus] = useState({ feishu: false, dify: false, dingtalk: false });

  // Load documents
  const loadDocuments = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/knowledge?action=list');
      const data = await res.json();
      if (data.success) {
        const docs = (data.data?.documents || []).map((d: Record<string, unknown>) => ({
          id: d.id || d.doc_id,
          title: d.title || d.name || 'Untitled',
          content: d.content || '',
          source: d.source || 'local',
          tags: d.tags || [],
          category: d.category || 'other',
          createdAt: d.createdAt || d.created_at || new Date().toISOString(),
        }));
        setDocuments(docs);
      }
    } catch (error) {
      console.error('Load documents failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load config status
  const loadConfigStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/config');
      const data = await res.json();
      if (data.success) {
        setConfigStatus({
          feishu: !!data.data?.feishu?.appId,
          dify: !!data.data?.dify?.apiKey,
          dingtalk: !!data.data?.dingtalk?.appKey,
        });
      }
    } catch (error) {
      console.error('Load config failed:', error);
    }
  }, []);

  // Load featured IDs from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('featuredDocs');
    if (saved) {
      setFeaturedIds(JSON.parse(saved));
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadDocuments();
    loadConfigStatus();
  }, [loadDocuments, loadConfigStatus]);

  // Search
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch('/api/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'search', query: searchQuery, topK: 10 }),
      });
      const data = await res.json();
      if (data.success) {
        setSearchResults(data.data || []);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Import document
  const handleImport = async () => {
    if (!importTitle.trim()) {
      alert('请输入标题');
      return;
    }

    setIsImporting(true);
    try {
      let content = importContent;
      if (importSource === 'url' && importUrl) {
        // Fetch URL content
        const urlRes = await fetch('/api/knowledge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'fetch_url', url: importUrl }),
        });
        const urlData = await urlRes.json();
        if (urlData.success) {
          content = urlData.data?.content || '';
        }
      }

      const res = await fetch('/api/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'import',
          title: importTitle,
          content,
          source: 'local',
          category: importCategory,
          tags: importTags.split(',').map(t => t.trim()).filter(Boolean),
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert('导入成功');
        setShowImportModal(false);
        setImportTitle('');
        setImportContent('');
        setImportUrl('');
        setImportTags('');
        loadDocuments();
      } else {
        alert(data.error || '导入失败');
      }
    } catch (error) {
      alert('网络错误');
    } finally {
      setIsImporting(false);
    }
  };

  // Delete document
  const handleDelete = async (docId: string) => {
    if (!confirm('确定删除此文档？')) return;

    try {
      const res = await fetch(`/api/knowledge?docId=${docId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        loadDocuments();
      } else {
        alert(data.error || '删除失败');
      }
    } catch (error) {
      alert('网络错误');
    }
  };

  // Toggle featured
  const toggleFeatured = (docId: string) => {
    const newIds = featuredIds.includes(docId)
      ? featuredIds.filter(id => id !== docId)
      : [...featuredIds, docId];
    setFeaturedIds(newIds);
    localStorage.setItem('featuredDocs', JSON.stringify(newIds));
  };

  // Create topic from search result
  const createTopicFromSearch = async (result: Document) => {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('请先登录');
        return;
      }

      const response = await fetch('/api/topics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session': session.access_token,
        },
        body: JSON.stringify({
          title: result.title,
          source: '知识库',
          priority: '中',
          status: '待认领',
          description: result.content.slice(0, 200),
        }),
      });

      if (!response.ok) {
        throw new Error('创建选题失败');
      }

      toast.success('选题已创建');
    } catch (error) {
      console.error('创建选题失败:', error);
      toast.error('创建选题失败');
    }
  };

  // Filter documents
  const filteredDocs = documents.filter(doc =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Get featured documents
  const featuredDocs = filteredDocs.filter(doc => featuredIds.includes(doc.id));
  const regularDocs = filteredDocs.filter(doc => !featuredIds.includes(doc.id));

  // Get category by ID
  const getCategory = (id: string) => CATEGORIES.find(c => c.id === id) || CATEGORIES[6];

  // Get source badge
  const getSourceBadge = (source: string) => SOURCE_BADGES[source] || SOURCE_BADGES.local;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                知识库
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                共 {documents.length} 个文档
                {featuredDocs.length > 0 && ` · ${featuredDocs.length} 个精选`}
              </p>
            </div>
            <Button onClick={() => setShowImportModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              导入文档
            </Button>
          </div>

          {/* Search Bar */}
          <div className="mt-4 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="搜索知识库..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              />
            </div>
            <Button variant="outline" onClick={handleSearch} disabled={isSearching}>
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-medium text-gray-500 mb-3">
              搜索结果 ({searchResults.length})
            </h2>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {searchResults.map((result, idx) => (
                <div
                  key={idx}
                  className="p-4 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">{result.title}</h3>
                      <p className="text-sm text-gray-500 line-clamp-2 mt-1">{result.content}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          相关度: {(result as unknown as { score?: number }).score?.toFixed(2) || 'N/A'}
                        </Badge>
                        {result.tags?.map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => createTopicFromSearch(result)}
                      className="shrink-0"
                    >
                      <Target className="w-4 h-4 mr-1" />
                      创建选题
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Featured Documents */}
        {featuredDocs.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-1">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              精选文档
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {featuredDocs.map(doc => {
                const category = getCategory(doc.category || 'other');
                const source = getSourceBadge(doc.source);
                const SourceIcon = source.icon;
                const CategoryIcon = category.icon;

                return (
                  <Card key={doc.id} className="hover:shadow-md transition-shadow border-amber-200 bg-amber-50/30">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-medium text-gray-900 line-clamp-2 flex-1">{doc.title}</h3>
                        <button
                          onClick={() => toggleFeatured(doc.id)}
                          className="text-amber-500 hover:text-amber-600"
                        >
                          <Star className="w-4 h-4 fill-amber-500" />
                        </button>
                      </div>
                      <p className="text-sm text-gray-500 line-clamp-2 mb-3">{doc.content}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={`text-xs ${category.color}`}>
                          <CategoryIcon className="w-3 h-3 mr-1" />
                          {category.name}
                        </Badge>
                        <Badge variant="outline" className={`text-xs ${source.color}`}>
                          <SourceIcon className="w-3 h-3 mr-1" />
                          {source.label}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* All Documents */}
        <div>
          <h2 className="text-sm font-medium text-gray-500 mb-3">
            全部文档 ({regularDocs.length})
          </h2>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : regularDocs.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">暂无文档</h3>
              <p className="text-gray-500 mb-4">点击"导入文档"开始构建你的知识库</p>
              <Button onClick={() => setShowImportModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                导入文档
              </Button>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">标题</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">分类</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">来源</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">标签</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">时间</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {regularDocs.map(doc => {
                    const category = getCategory(doc.category || 'other');
                    const source = getSourceBadge(doc.source);
                    const SourceIcon = source.icon;
                    const CategoryIcon = category.icon;
                    const isFeatured = featuredIds.includes(doc.id);

                    return (
                      <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                            <span className="font-medium text-gray-900 truncate max-w-xs">{doc.title}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={`text-xs ${category.color}`}>
                            <CategoryIcon className="w-3 h-3 mr-1" />
                            {category.name}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={`text-xs ${source.color}`}>
                            <SourceIcon className="w-3 h-3 mr-1" />
                            {source.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1 flex-wrap max-w-xs">
                            {doc.tags.slice(0, 2).map(tag => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {doc.tags.length > 2 && (
                              <Badge variant="secondary" className="text-xs">
                                +{doc.tags.length - 2}
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-500">
                            {new Date(doc.createdAt).toLocaleDateString('zh-CN')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleFeatured(doc.id)}
                              className={isFeatured ? 'text-amber-500' : 'text-gray-400'}
                            >
                              <Star className={`w-4 h-4 ${isFeatured ? 'fill-amber-500' : ''}`} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(doc.id)}
                              className="text-red-500 hover:text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-lg mx-4">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">导入文档</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowImportModal(false)}>
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Source Tabs */}
              <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
                {IMPORT_SOURCES.map(src => {
                  const Icon = src.icon;
                  return (
                    <button
                      key={src.id}
                      onClick={() => setImportSource(src.id)}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        importSource === src.id
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {src.label}
                    </button>
                  );
                })}
              </div>

              {/* Title */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">标题</label>
                <Input
                  value={importTitle}
                  onChange={(e) => setImportTitle(e.target.value)}
                  placeholder="输入文档标题"
                />
              </div>

              {/* Content based on source */}
              {importSource === 'text' && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">内容</label>
                  <Textarea
                    value={importContent}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setImportContent(e.target.value)}
                    placeholder="粘贴文档内容..."
                    rows={6}
                  />
                </div>
              )}

              {importSource === 'url' && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">网页链接</label>
                  <Input
                    value={importUrl}
                    onChange={(e) => setImportUrl(e.target.value)}
                    placeholder="https://example.com/article"
                  />
                  <p className="text-xs text-gray-500 mt-1">系统将自动抓取网页内容</p>
                </div>
              )}

              {importSource === 'feishu' && (
                <div className="text-center py-6">
                  {!configStatus.feishu ? (
                    <>
                      <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 mb-3">请先配置飞书应用</p>
                      <Button variant="outline" size="sm" onClick={() => window.location.href = '/settings'}>
                        前往设置
                      </Button>
                    </>
                  ) : (
                    <>
                      <BookOpen className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">飞书文档导入功能开发中...</p>
                    </>
                  )}
                </div>
              )}

              {importSource === 'dingtalk' && (
                <div className="text-center py-6">
                  {!configStatus.dingtalk ? (
                    <>
                      <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 mb-3">请先配置钉钉应用</p>
                      <Button variant="outline" size="sm" onClick={() => window.location.href = '/settings'}>
                        前往设置
                      </Button>
                    </>
                  ) : (
                    <>
                      <MessageSquare className="w-8 h-8 text-cyan-500 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">钉钉文档导入功能开发中...</p>
                    </>
                  )}
                </div>
              )}

              {/* Category */}
              {(importSource === 'text' || importSource === 'url') && (
                <>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">分类</label>
                    <div className="grid grid-cols-4 gap-2">
                      {CATEGORIES.map(cat => {
                        const Icon = cat.icon;
                        return (
                          <button
                            key={cat.id}
                            onClick={() => setImportCategory(cat.id)}
                            className={`flex flex-col items-center gap-1 p-2 rounded-lg text-xs transition-colors ${
                              importCategory === cat.id
                                ? cat.color + ' ring-2 ring-offset-1 ring-blue-500'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                            {cat.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">标签</label>
                    <Input
                      value={importTags}
                      onChange={(e) => setImportTags(e.target.value)}
                      placeholder="用逗号分隔，如：运营, 策略, 案例"
                    />
                  </div>
                </>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-4">
                <Button variant="outline" className="flex-1" onClick={() => setShowImportModal(false)}>
                  取消
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleImport}
                  disabled={isImporting || (importSource === 'text' && !importContent) || (importSource === 'url' && !importUrl)}
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      导入中...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      导入
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
