'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  BookOpen,
  Search,
  Plus,
  FileText,
  Link2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Sparkles,
  Upload,
  Globe,
  Clock,
  Tag,
  FolderOpen,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface SearchResult {
  content: string;
  score: number;
  docId: string;
}

interface DocRecord {
  id: string;
  title: string;
  type: 'text' | 'url' | 'feishu';
  content: string;
  createdAt: string;
  tags: string[];
}

interface FeishuSpace {
  spaceId: string;
  name: string;
  description?: string;
}

interface FeishuNode {
  nodeToken: string;
  objToken: string;
  objType: string;
  title: string;
  hasChild: boolean;
  parentNodeToken?: string;
}

export default function KnowledgePage() {
  const [activeTab, setActiveTab] = useState<'import' | 'search' | 'feishu'>('import');
  const [importType, setImportType] = useState<'text' | 'url'>('text');
  const [importTitle, setImportTitle] = useState('');
  const [importContent, setImportContent] = useState('');
  const [importUrl, setImportUrl] = useState('');
  const [importTags, setImportTags] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchTotal, setSearchTotal] = useState(0);

  // Feishu state
  const [feishuSpaces, setFeishuSpaces] = useState<FeishuSpace[]>([]);
  const [feishuNodes, setFeishuNodes] = useState<FeishuNode[]>([]);
  const [selectedSpace, setSelectedSpace] = useState<FeishuSpace | null>(null);
  const [selectedNode, setSelectedNode] = useState<FeishuNode | null>(null);
  const [isLoadingFeishu, setIsLoadingFeishu] = useState(false);
  const [feishuError, setFeishuError] = useState('');
  const [isImportingFeishu, setIsImportingFeishu] = useState(false);

  // 本地文档记录（用于展示历史导入）
  const [docRecords, setDocRecords] = useState<DocRecord[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('knowledge-docs');
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  const saveDocRecords = useCallback((records: DocRecord[]) => {
    setDocRecords(records);
    localStorage.setItem('knowledge-docs', JSON.stringify(records));
  }, []);

  // Load Feishu spaces
  const loadFeishuSpaces = useCallback(async () => {
    setIsLoadingFeishu(true);
    setFeishuError('');
    try {
      const res = await fetch('/api/feishu/wiki/spaces');
      const data = await res.json();
      if (data.success) {
        setFeishuSpaces(data.data || []);
      } else {
        setFeishuError(data.error || '获取飞书知识库失败');
      }
    } catch {
      setFeishuError('网络请求失败，请检查飞书配置');
    } finally {
      setIsLoadingFeishu(false);
    }
  }, []);

  // Load Feishu nodes for a space
  const loadFeishuNodes = useCallback(async (spaceId: string, parentToken?: string) => {
    setIsLoadingFeishu(true);
    setFeishuError('');
    try {
      const params = new URLSearchParams({ action: 'nodes', spaceId });
      if (parentToken) {
        params.set('parentToken', parentToken);
      }
      const res = await fetch(`/api/feishu/wiki/spaces?${params}`);
      const data = await res.json();
      if (data.success) {
        setFeishuNodes(data.data || []);
      } else {
        setFeishuError(data.error || '获取文档列表失败');
      }
    } catch {
      setFeishuError('网络请求失败');
    } finally {
      setIsLoadingFeishu(false);
    }
  }, []);

  // Import Feishu document
  const handleImportFeishu = useCallback(async () => {
    if (!selectedNode) return;

    setIsImportingFeishu(true);
    setImportResult(null);

    try {
      const res = await fetch('/api/feishu/wiki/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: selectedNode.objToken,
          title: selectedNode.title,
          tags: ['飞书', '知识库'],
        }),
      });

      const data = await res.json();

      if (data.success) {
        setImportResult({ success: true, message: `文档「${selectedNode.title}」已导入知识库` });

        // Save to local records
        const newRecord: DocRecord = {
          id: `feishu_${Date.now()}`,
          title: selectedNode.title,
          type: 'feishu',
          content: `飞书文档 - ${selectedNode.objType}`,
          createdAt: new Date().toISOString(),
          tags: ['飞书', '知识库'],
        };
        saveDocRecords([newRecord, ...docRecords]);
      } else {
        setImportResult({ success: false, message: data.error || '导入失败' });
      }
    } catch {
      setImportResult({ success: false, message: '网络请求失败' });
    } finally {
      setIsImportingFeishu(false);
    }
  }, [selectedNode, docRecords, saveDocRecords]);

  // Load spaces when switching to feishu tab
  useEffect(() => {
    if (activeTab === 'feishu' && feishuSpaces.length === 0) {
      loadFeishuSpaces();
    }
  }, [activeTab, feishuSpaces.length, loadFeishuSpaces]);

  // 导入文档
  const handleImport = useCallback(async () => {
    if (importType === 'text' && !importContent.trim()) return;
    if (importType === 'url' && !importUrl.trim()) return;

    setIsImporting(true);
    setImportResult(null);

    try {
      const body = importType === 'url'
        ? { type: 'url', url: importUrl, title: importTitle }
        : { type: 'text', content: importContent, title: importTitle };

      const res = await fetch('/api/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.success) {
        setImportResult({ success: true, message: data.data?.message || '文档已成功导入知识库' });

        // 保存到本地记录
        const newRecord: DocRecord = {
          id: `doc_${Date.now()}`,
          title: importTitle || (importType === 'url' ? importUrl : importContent.slice(0, 30)),
          type: importType,
          content: importType === 'url' ? importUrl : importContent.slice(0, 200),
          createdAt: new Date().toISOString(),
          tags: importTags.split(',').map((t: string) => t.trim()).filter(Boolean),
        };
        saveDocRecords([newRecord, ...docRecords]);

        // 清空表单
        setImportTitle('');
        setImportContent('');
        setImportUrl('');
        setImportTags('');
      } else {
        setImportResult({ success: false, message: data.error || '导入失败' });
      }
    } catch {
      setImportResult({ success: false, message: '网络请求失败' });
    } finally {
      setIsImporting(false);
    }
  }, [importType, importContent, importUrl, importTitle, importTags, docRecords, saveDocRecords]);

  // 搜索知识库
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchResults([]);

    try {
      const res = await fetch(`/api/knowledge?q=${encodeURIComponent(searchQuery)}&topK=10`);
      const data = await res.json();

      if (data.success) {
        setSearchResults(data.data?.chunks || []);
        setSearchTotal(data.data?.total || 0);
      } else {
        setSearchResults([]);
        setSearchTotal(0);
      }
    } catch {
      setSearchResults([]);
      setSearchTotal(0);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery]);

  // 删除本地记录
  const handleDeleteDoc = useCallback((docId: string) => {
    const updated = docRecords.filter((d) => d.id !== docId);
    saveDocRecords(updated);
  }, [docRecords, saveDocRecords]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-cyan-600" />
            云文档知识库
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            导入文档素材，AI 语义检索，为内容创作提供知识支撑
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          <Sparkles className="h-3 w-3 mr-1" />
          语义搜索
        </Badge>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('import')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'import'
              ? 'bg-cyan-100 text-cyan-700'
              : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          <Upload className="h-4 w-4" />
          文档导入
        </button>
        <button
          onClick={() => setActiveTab('feishu')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'feishu'
              ? 'bg-cyan-100 text-cyan-700'
              : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          <FolderOpen className="h-4 w-4" />
          飞书知识库
        </button>
        <button
          onClick={() => setActiveTab('search')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'search'
              ? 'bg-cyan-100 text-cyan-700'
              : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          <Search className="h-4 w-4" />
          语义搜索
        </button>
      </div>

      {/* Import Tab */}
      {activeTab === 'import' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Import Form */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">导入文档</CardTitle>
                <CardDescription>
                  支持文本内容和网页链接导入，系统会自动分块并向量化存储
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Import Type Toggle */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setImportType('text')}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      importType === 'text'
                        ? 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                        : 'text-slate-500 hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <FileText className="h-4 w-4" />
                    文本内容
                  </button>
                  <button
                    onClick={() => setImportType('url')}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      importType === 'url'
                        ? 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                        : 'text-slate-500 hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <Globe className="h-4 w-4" />
                    网页链接
                  </button>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    文档标题（可选）
                  </label>
                  <Input
                    value={importTitle}
                    onChange={(e) => setImportTitle(e.target.value)}
                    placeholder="给文档起个名字，方便后续检索"
                  />
                </div>

                {/* Content / URL */}
                {importType === 'text' ? (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      文档内容 <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={importContent}
                      onChange={(e) => setImportContent(e.target.value)}
                      placeholder="粘贴或输入文档内容，支持文章、笔记、会议纪要、产品资料等任意文本..."
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 resize-none"
                      rows={10}
                    />
                    <p className="mt-1 text-xs text-slate-400">{importContent.length} 字符</p>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      网页链接 <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={importUrl}
                      onChange={(e) => setImportUrl(e.target.value)}
                      placeholder="https://example.com/article"
                    />
                    <p className="mt-1 text-xs text-slate-400">系统会自动抓取网页内容并导入</p>
                  </div>
                )}

                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    标签（可选）
                  </label>
                  <Input
                    value={importTags}
                    onChange={(e) => setImportTags(e.target.value)}
                    placeholder="用逗号分隔，例如：汽车行业, 新能源, 产品分析"
                  />
                </div>

                {/* Import Result */}
                {importResult && (
                  <div className={`flex items-center gap-2 rounded-lg p-3 text-sm ${
                    importResult.success
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    {importResult.success ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    {importResult.message}
                  </div>
                )}

                {/* Submit */}
                <Button
                  onClick={handleImport}
                  disabled={isImporting || (importType === 'text' ? !importContent.trim() : !importUrl.trim())}
                  className="w-full bg-cyan-600 hover:bg-cyan-700 text-white disabled:opacity-50"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      正在导入...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      导入到知识库
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Doc Records Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">导入记录</CardTitle>
                <CardDescription>最近导入的文档</CardDescription>
              </CardHeader>
              <CardContent>
                {docRecords.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">暂无导入记录</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto">
                    {docRecords.map((doc) => (
                      <div
                        key={doc.id}
                        className="group rounded-lg border border-slate-200 p-3 hover:border-slate-300 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-1">
                              {doc.type === 'url' ? (
                                <Link2 className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                              ) : doc.type === 'feishu' ? (
                                <FolderOpen className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                              ) : (
                                <FileText className="h-3.5 w-3.5 text-cyan-500 shrink-0" />
                              )}
                              <span className="text-sm font-medium text-slate-800 truncate">
                                {doc.title}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 line-clamp-2 mb-1.5">
                              {doc.content}
                            </p>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                                <Clock className="h-3 w-3" />
                                {new Date(doc.createdAt).toLocaleDateString('zh-CN')}
                              </span>
                              {doc.tags.length > 0 && (
                                <div className="flex gap-1 flex-wrap">
                                  {doc.tags.slice(0, 2).map((tag) => (
                                    <Badge key={tag} variant="outline" className="text-[9px] px-1 py-0">
                                      {tag}
                                    </Badge>
                                  ))}
                                  {doc.tags.length > 2 && (
                                    <span className="text-[9px] text-slate-400">+{doc.tags.length - 2}</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteDoc(doc.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tips */}
            <Card>
              <CardContent className="pt-5">
                <h4 className="text-sm font-medium text-slate-700 mb-2">使用提示</h4>
                <ul className="space-y-2 text-xs text-slate-500">
                  <li className="flex items-start gap-1.5">
                    <span className="text-cyan-500 mt-0.5">-</span>
                    导入的文档会自动分块并向量化，支持语义搜索
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-cyan-500 mt-0.5">-</span>
                    工作流中的「知识库搜索」模块可自动检索相关素材
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-cyan-500 mt-0.5">-</span>
                    脚本工坊和公众号文章可引用知识库内容作为参考
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-cyan-500 mt-0.5">-</span>
                    支持导入行业报告、竞品分析、品牌资料等任意文档
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Search Tab */}
      {activeTab === 'search' && (
        <div className="space-y-4">
          {/* Search Bar */}
          <Card>
            <CardContent className="pt-5">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="输入关键词或自然语言描述，AI 将从知识库中语义检索相关内容..."
                    className="pl-10"
                  />
                </div>
                <Button
                  onClick={handleSearch}
                  disabled={isSearching || !searchQuery.trim()}
                  className="bg-cyan-600 hover:bg-cyan-700 text-white disabled:opacity-50"
                >
                  {isSearching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-1.5" />
                      搜索
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium text-slate-700">
                  搜索结果
                </h3>
                <Badge variant="outline" className="text-xs">
                  {searchTotal} 条匹配
                </Badge>
              </div>

              {searchResults.map((result, index) => (
                <Card key={index} className="hover:border-cyan-200 transition-colors">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            #{index + 1}
                          </Badge>
                          <div className="flex items-center gap-1">
                            <div className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
                            <span className="text-xs text-slate-500">
                              相关度 {(result.score * 100).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                          {result.content}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(result.content);
                        }}
                        className="shrink-0 text-slate-400 hover:text-slate-600"
                      >
                        复制
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Empty State */}
          {searchResults.length === 0 && !isSearching && searchQuery && (
            <Card>
              <CardContent className="pt-10 pb-10 text-center">
                <Search className="h-10 w-10 mx-auto text-slate-300 mb-3" />
                <p className="text-sm text-slate-500">未找到相关内容</p>
                <p className="text-xs text-slate-400 mt-1">尝试更换关键词或导入更多文档</p>
              </CardContent>
            </Card>
          )}

          {/* Initial State */}
          {!searchQuery && (
            <Card>
              <CardContent className="pt-10 pb-10 text-center">
                <BookOpen className="h-10 w-10 mx-auto text-slate-300 mb-3" />
                <p className="text-sm text-slate-500">输入关键词开始语义搜索</p>
                <p className="text-xs text-slate-400 mt-1">
                  AI 会理解你的意图，从知识库中检索最相关的文档片段
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Feishu Tab */}
      {activeTab === 'feishu' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Feishu Browser */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <FolderOpen className="h-5 w-5 text-blue-500" />
                      飞书知识库
                    </CardTitle>
                    <CardDescription>
                      浏览并导入飞书知识库中的文档
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadFeishuSpaces}
                    disabled={isLoadingFeishu}
                  >
                    <RefreshCw className={`h-4 w-4 mr-1 ${isLoadingFeishu ? 'animate-spin' : ''}`} />
                    刷新
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {feishuError && (
                  <div className="flex items-center gap-2 rounded-lg p-3 text-sm bg-red-50 text-red-700 border border-red-200 mb-4">
                    <AlertCircle className="h-4 w-4" />
                    {feishuError}
                  </div>
                )}

                {isLoadingFeishu && !feishuError && (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                    <span className="ml-2 text-sm text-slate-500">加载中...</span>
                  </div>
                )}

                {!isLoadingFeishu && !selectedSpace && feishuSpaces.length === 0 && !feishuError && (
                  <div className="text-center py-12">
                    <FolderOpen className="h-10 w-10 mx-auto text-slate-300 mb-3" />
                    <p className="text-sm text-slate-500">未找到知识库空间</p>
                    <p className="text-xs text-slate-400 mt-1">
                      请确保飞书应用已配置，且有知识库的访问权限
                    </p>
                  </div>
                )}

                {/* Space List */}
                {!selectedSpace && feishuSpaces.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-700 mb-3">选择知识库空间</p>
                    {feishuSpaces.map((space) => (
                      <button
                        key={space.spaceId}
                        onClick={() => {
                          setSelectedSpace(space);
                          loadFeishuNodes(space.spaceId);
                        }}
                        className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                            <FolderOpen className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-800">{space.name}</p>
                            {space.description && (
                              <p className="text-xs text-slate-500 line-clamp-1">{space.description}</p>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Node List */}
                {selectedSpace && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-3">
                      <button
                        onClick={() => {
                          setSelectedSpace(null);
                          setSelectedNode(null);
                          setFeishuNodes([]);
                        }}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        ← 返回空间列表
                      </button>
                      <span className="text-sm text-slate-500">/ {selectedSpace.name}</span>
                    </div>

                    {feishuNodes.length === 0 && !isLoadingFeishu && (
                      <div className="text-center py-8">
                        <FileText className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                        <p className="text-sm text-slate-500">此空间暂无文档</p>
                      </div>
                    )}

                    {feishuNodes.map((node) => (
                      <div
                        key={node.nodeToken}
                        className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                          selectedNode?.nodeToken === node.nodeToken
                            ? 'border-blue-400 bg-blue-50'
                            : 'border-slate-200 hover:border-blue-300'
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <FileText className="h-5 w-5 text-slate-400 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">{node.title}</p>
                            <p className="text-xs text-slate-500">{node.objType}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {node.hasChild && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => loadFeishuNodes(selectedSpace.spaceId, node.nodeToken)}
                            >
                              展开
                            </Button>
                          )}
                          <Button
                            size="sm"
                            onClick={() => setSelectedNode(node)}
                            variant={selectedNode?.nodeToken === node.nodeToken ? 'default' : 'outline'}
                          >
                            {selectedNode?.nodeToken === node.nodeToken ? '已选择' : '选择'}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Import Button */}
            {selectedNode && (
              <Card>
                <CardContent className="pt-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-700">已选择文档</p>
                      <p className="text-sm text-slate-500">{selectedNode.title}</p>
                    </div>
                    <Button
                      onClick={handleImportFeishu}
                      disabled={isImportingFeishu}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {isImportingFeishu ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          导入中...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          导入到知识库
                        </>
                      )}
                    </Button>
                  </div>
                  {importResult && (
                    <div className={`flex items-center gap-2 rounded-lg p-3 text-sm mt-4 ${
                      importResult.success
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      {importResult.success ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                      {importResult.message}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">飞书配置</CardTitle>
                <CardDescription>连接飞书知识库</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-xs text-slate-500">
                  <li className="flex items-start gap-1.5">
                    <span className="text-blue-500 mt-0.5">1.</span>
                    在「平台设置」中配置飞书应用凭证（App ID 和 App Secret）
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-blue-500 mt-0.5">2.</span>
                    确保飞书应用已开启知识库相关权限
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-blue-500 mt-0.5">3.</span>
                    将应用添加为知识库成员或管理员
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-blue-500 mt-0.5">4.</span>
                    选择文档并导入到本地知识库
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-5">
                <h4 className="text-sm font-medium text-slate-700 mb-2">支持的文档类型</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <FileText className="h-3.5 w-3.5 text-blue-500" />
                    <span>docx - 新版文档</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <FileText className="h-3.5 w-3.5 text-green-500" />
                    <span>sheet - 电子表格</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <FileText className="h-3.5 w-3.5 text-purple-500" />
                    <span>bitable - 多维表格</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <FileText className="h-3.5 w-3.5 text-orange-500" />
                    <span>mindnote - 思维笔记</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
