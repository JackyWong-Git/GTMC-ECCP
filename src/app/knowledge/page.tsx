'use client';

import { useState, useCallback, useEffect } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
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
  Database,
  MessageSquare,
  Settings,
  ExternalLink,
  Copy,
  Eye,
  Download,
  Filter,
  MoreHorizontal,
  X,
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

// Types
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
  category?: string;
  featured?: boolean;
}

// 分类定义
interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
}

// 预定义分类
const CATEGORIES: Category[] = [
  { id: 'operations', name: '运营策略', icon: '📊', color: 'bg-blue-100 text-blue-700', description: '运营方法论、增长策略、用户分析' },
  { id: 'content', name: '内容创作', icon: '✍️', color: 'bg-purple-100 text-purple-700', description: '脚本写作、文案技巧、内容规划' },
  { id: 'data', name: '数据分析', icon: '📈', color: 'bg-green-100 text-green-700', description: '数据报告、分析方法、指标解读' },
  { id: 'industry', name: '行业洞察', icon: '🔍', color: 'bg-amber-100 text-amber-700', description: '行业趋势、竞品分析、市场研究' },
  { id: 'tools', name: '工具教程', icon: '🛠️', color: 'bg-cyan-100 text-cyan-700', description: '工具使用、技术教程、效率提升' },
  { id: 'cases', name: '案例复盘', icon: '📝', color: 'bg-rose-100 text-rose-700', description: '成功案例、项目复盘、经验总结' },
  { id: 'other', name: '其他', icon: '📁', color: 'bg-gray-100 text-gray-700', description: '未分类文档' },
];

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

type KnowledgeSource = 'local' | 'feishu' | 'dify' | 'dingtalk';
type LocalView = 'documents' | 'import' | 'search' | 'index';

export default function KnowledgePage() {
  // Auth state
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Initialize auth
  useEffect(() => {
    const initAuth = async () => {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        setAccessToken(session.access_token);
      }
    };
    initAuth();
  }, []);

  // Navigation state
  const [activeSource, setActiveSource] = useState<KnowledgeSource>('local');
  const [localView, setLocalView] = useState<LocalView>('documents');

  // Local knowledge base state
  const [documents, setDocuments] = useState<DocRecord[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);

  // Import state
  const [importType, setImportType] = useState<'text' | 'url'>('text');
  const [importTitle, setImportTitle] = useState('');
  const [importContent, setImportContent] = useState('');
  const [importUrl, setImportUrl] = useState('');
  const [importTags, setImportTags] = useState('');
  const [importCategory, setImportCategory] = useState('other');
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null);

  // Featured documents state (stored in localStorage)
  const [featuredDocIds, setFeaturedDocIds] = useState<string[]>([]);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchTotal, setSearchTotal] = useState(0);

  // Recent imports state (stored in localStorage)
  const [recentImports, setRecentImports] = useState<Array<{ title: string; type: string; time: string }>>([]);

  // Load recent imports from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('eccp_recent_imports');
    if (stored) {
      try {
        setRecentImports(JSON.parse(stored));
      } catch {
        setRecentImports([]);
      }
    }
    
    // Load featured docs
    const featuredStored = localStorage.getItem('eccp_featured_docs');
    if (featuredStored) {
      try {
        setFeaturedDocIds(JSON.parse(featuredStored));
      } catch {
        setFeaturedDocIds([]);
      }
    }
  }, []);

  // Toggle featured document
  const toggleFeatured = (docId: string) => {
    const updated = featuredDocIds.includes(docId)
      ? featuredDocIds.filter(id => id !== docId)
      : [...featuredDocIds, docId];
    setFeaturedDocIds(updated);
    localStorage.setItem('eccp_featured_docs', JSON.stringify(updated));
  };

  // Add to recent imports
  const addToRecentImports = (title: string, type: string) => {
    const newImport = { title, type, time: new Date().toISOString() };
    const updated = [newImport, ...recentImports].slice(0, 10); // Keep only 10 most recent
    setRecentImports(updated);
    localStorage.setItem('eccp_recent_imports', JSON.stringify(updated));
  };

  // Create topic from search result
  const handleCreateTopicFromSearch = async (content: string) => {
    if (!accessToken) {
      alert('请先登录');
      return;
    }
    try {
      // Extract first 50 chars as title
      const title = content.slice(0, 50) + (content.length > 50 ? '...' : '');
      
      const response = await fetch('/api/topics', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-session': accessToken,
        },
        body: JSON.stringify({
          title,
          description: content.slice(0, 500),
          status: 'pending',
          source: 'knowledge_search',
        }),
      });

      if (response.ok) {
        alert('选题已创建，可在选题池中查看');
      } else {
        alert('创建选题失败');
      }
    } catch (error) {
      console.error('Failed to create topic:', error);
      alert('创建选题失败');
    }
  };

  // Feishu state
  const [feishuSpaces, setFeishuSpaces] = useState<FeishuSpace[]>([]);
  const [feishuNodes, setFeishuNodes] = useState<FeishuNode[]>([]);
  const [selectedSpace, setSelectedSpace] = useState<FeishuSpace | null>(null);
  const [selectedNode, setSelectedNode] = useState<FeishuNode | null>(null);
  const [isLoadingFeishu, setIsLoadingFeishu] = useState(false);
  const [feishuError, setFeishuError] = useState('');
  const [isImportingFeishu, setIsImportingFeishu] = useState(false);

  // Dify state
  const [difyDatasets, setDifyDatasets] = useState<Array<{ id: string; name: string; document_count: number }>>([]);
  const [difyDocuments, setDifyDocuments] = useState<Array<{ id: string; name: string; word_count: number }>>([]);
  const [selectedDifyDataset, setSelectedDifyDataset] = useState<{ id: string; name: string } | null>(null);
  const [isLoadingDify, setIsLoadingDify] = useState(false);
  const [difyError, setDifyError] = useState('');
  const [isImportingDify, setIsImportingDify] = useState(false);

  // DingTalk state
  const [dingtalkWorkspaces, setDingtalkWorkspaces] = useState<Array<{ workspaceId: string; name: string; docCount: number }>>([]);
  const [dingtalkNodes, setDingtalkNodes] = useState<Array<{ nodeId: string; name: string; nodeType: string; docKey?: string }>>([]);
  const [selectedDingtalkWorkspace, setSelectedDingtalkWorkspace] = useState<{ workspaceId: string; name: string } | null>(null);
  const [isLoadingDingtalk, setIsLoadingDingtalk] = useState(false);
  const [dingtalkError, setDingtalkError] = useState('');
  const [isImportingDingtalk, setIsImportingDingtalk] = useState(false);

  // Configuration status state
  const [configStatus, setConfigStatus] = useState<{
    feishu: boolean;
    dify: boolean;
    dingtalk: boolean;
  }>({ feishu: false, dify: false, dingtalk: false });

  // Check configuration status
  const checkConfigStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/config');
      const data = await res.json();
      if (data.success) {
        setConfigStatus({
          feishu: data.data.feishu?.isConfigured || false,
          dify: data.data.dify?.isConfigured || false,
          dingtalk: data.data.dingtalk?.isConfigured || false,
        });
      }
    } catch (error) {
      console.error('Failed to check config status:', error);
    }
  }, []);

  // Load local documents
  const loadDocuments = useCallback(async () => {
    setIsLoadingDocs(true);
    try {
      const res = await fetch('/api/knowledge?action=list');
      const data = await res.json();
      if (data.success) {
        setDocuments(data.data.documents || []);
      }
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setIsLoadingDocs(false);
    }
  }, []);

  useEffect(() => {
    checkConfigStatus();
    if (activeSource === 'local') {
      loadDocuments();
    }
  }, [activeSource, loadDocuments, checkConfigStatus]);

  // Import document
  const handleImport = async () => {
    setIsImporting(true);
    setImportResult(null);

    try {
      const body = importType === 'text'
        ? { type: 'text', title: importTitle, content: importContent, tags: importTags.split(',').map(t => t.trim()).filter(Boolean), category: importCategory }
        : { type: 'url', url: importUrl, tags: importTags.split(',').map(t => t.trim()).filter(Boolean), category: importCategory };

      const res = await fetch('/api/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (data.success) {
        setImportResult({ success: true, message: '导入成功' });
        setImportTitle('');
        setImportContent('');
        setImportUrl('');
        setImportTags('');
        setImportCategory('other');
        loadDocuments();
      } else {
        setImportResult({ success: false, message: data.error || '导入失败' });
      }
    } catch (error) {
      setImportResult({ success: false, message: '网络错误' });
    } finally {
      setIsImporting(false);
    }
  };

  // Delete document
  const handleDelete = async (docId: string) => {
    if (!confirm('确定要删除这个文档吗？')) return;

    try {
      const res = await fetch(`/api/knowledge?docId=${docId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        loadDocuments();
      }
    } catch (error) {
      console.error('Failed to delete document:', error);
    }
  };

  // Search
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const res = await fetch(`/api/knowledge?q=${encodeURIComponent(searchQuery)}&topK=10`);
      const data = await res.json();
      if (data.success) {
        setSearchResults(data.data || []);
        setSearchTotal(data.total || 0);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

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
        setFeishuError(data.error || '加载失败');
      }
    } catch (error) {
      setFeishuError('网络错误');
    } finally {
      setIsLoadingFeishu(false);
    }
  }, []);

  // Load Feishu nodes
  const loadFeishuNodes = async (spaceId: string) => {
    setIsLoadingFeishu(true);
    setFeishuError('');
    try {
      const res = await fetch(`/api/feishu/wiki/spaces?spaceId=${spaceId}`);
      const data = await res.json();
      if (data.success) {
        setFeishuNodes(data.data || []);
      } else {
        setFeishuError(data.error || '加载失败');
      }
    } catch (error) {
      setFeishuError('网络错误');
    } finally {
      setIsLoadingFeishu(false);
    }
  };

  // Import Feishu document
  const handleImportFeishu = async (nodeToken: string, title: string) => {
    setIsImportingFeishu(true);
    try {
      const res = await fetch('/api/feishu/wiki/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeToken }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`已导入: ${title}`);
        if (activeSource === 'local') loadDocuments();
      } else {
        alert(data.error || '导入失败');
      }
    } catch (error) {
      alert('网络错误');
    } finally {
      setIsImportingFeishu(false);
    }
  };

  // Load Dify datasets
  const loadDifyDatasets = useCallback(async () => {
    setIsLoadingDify(true);
    setDifyError('');
    try {
      const res = await fetch('/api/dify/knowledge');
      const data = await res.json();
      if (data.success) {
        setDifyDatasets(data.data || []);
      } else {
        setDifyError(data.error || '加载失败');
      }
    } catch (error) {
      setDifyError('网络错误');
    } finally {
      setIsLoadingDify(false);
    }
  }, []);

  // Load Dify documents
  const loadDifyDocuments = async (datasetId: string) => {
    setIsLoadingDify(true);
    setDifyError('');
    try {
      const res = await fetch(`/api/dify/knowledge?datasetId=${datasetId}`);
      const data = await res.json();
      if (data.success) {
        setDifyDocuments(data.data || []);
      } else {
        setDifyError(data.error || '加载失败');
      }
    } catch (error) {
      setDifyError('网络错误');
    } finally {
      setIsLoadingDify(false);
    }
  };

  // Import Dify document
  const handleImportDify = async (datasetId: string, documentId: string, name: string) => {
    setIsImportingDify(true);
    try {
      const res = await fetch('/api/dify/knowledge/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ datasetId, documentId }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`已导入: ${name}`);
        if (activeSource === 'local') loadDocuments();
      } else {
        alert(data.error || '导入失败');
      }
    } catch (error) {
      alert('网络错误');
    } finally {
      setIsImportingDify(false);
    }
  };

  // Load DingTalk workspaces
  const loadDingtalkWorkspaces = useCallback(async () => {
    setIsLoadingDingtalk(true);
    setDingtalkError('');
    try {
      const res = await fetch('/api/dingtalk/knowledge');
      const data = await res.json();
      if (data.success) {
        setDingtalkWorkspaces(data.data || []);
      } else {
        setDingtalkError(data.error || '加载失败');
      }
    } catch (error) {
      setDingtalkError('网络错误');
    } finally {
      setIsLoadingDingtalk(false);
    }
  }, []);

  // Load DingTalk nodes
  const loadDingtalkNodes = async (workspaceId: string) => {
    setIsLoadingDingtalk(true);
    setDingtalkError('');
    try {
      const res = await fetch(`/api/dingtalk/knowledge?workspaceId=${workspaceId}`);
      const data = await res.json();
      if (data.success) {
        setDingtalkNodes(data.data || []);
      } else {
        setDingtalkError(data.error || '加载失败');
      }
    } catch (error) {
      setDingtalkError('网络错误');
    } finally {
      setIsLoadingDingtalk(false);
    }
  };

  // Import DingTalk document
  const handleImportDingtalk = async (nodeId: string, name: string) => {
    setIsImportingDingtalk(true);
    try {
      const res = await fetch('/api/dingtalk/knowledge/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeId }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`已导入: ${name}`);
        if (activeSource === 'local') loadDocuments();
      } else {
        alert(data.error || '导入失败');
      }
    } catch (error) {
      alert('网络错误');
    } finally {
      setIsImportingDingtalk(false);
    }
  };

  // Handle source change
  const handleSourceChange = (source: KnowledgeSource) => {
    setActiveSource(source);
    if (source === 'feishu') loadFeishuSpaces();
    if (source === 'dify') loadDifyDatasets();
    if (source === 'dingtalk') loadDingtalkWorkspaces();
  };

  return (
    <div className="flex h-full bg-gray-50">
      {/* Left Sidebar - Knowledge Sources */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-600" />
            知识库
          </h2>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          <button
            onClick={() => handleSourceChange('local')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeSource === 'local'
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            本地知识库
            {documents.length > 0 && (
              <span className="ml-auto text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">
                {documents.length}
              </span>
            )}
          </button>

          <button
            onClick={() => handleSourceChange('feishu')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeSource === 'feishu'
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4.025 12.836l4.14-4.14 7.14 7.14-4.14 4.14a2.5 2.5 0 01-3.54 0l-3.6-3.6a2.5 2.5 0 010-3.54z" opacity="0.8"/>
              <path d="M12.836 4.025l4.14 4.14-7.14 7.14-4.14-4.14a2.5 2.5 0 010-3.54l3.6-3.6a2.5 2.5 0 013.54 0z" opacity="0.6"/>
            </svg>
            飞书知识库
          </button>

          <button
            onClick={() => handleSourceChange('dify')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeSource === 'dify'
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Dify 知识库
          </button>

          <button
            onClick={() => handleSourceChange('dingtalk')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeSource === 'dingtalk'
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            钉钉知识库
          </button>
        </nav>

        <div className="p-3 border-t border-gray-200">
          <button
            onClick={() => { setActiveSource('local'); setLocalView('import'); }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            导入文档
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                {activeSource === 'local' && '本地知识库'}
                {activeSource === 'feishu' && '飞书知识库'}
                {activeSource === 'dify' && 'Dify 知识库'}
                {activeSource === 'dingtalk' && '钉钉知识库'}
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {activeSource === 'local' && `共 ${documents.length} 个文档`}
                {activeSource === 'feishu' && '浏览并导入飞书文档'}
                {activeSource === 'dify' && '浏览并导入 Dify 知识库文档'}
                {activeSource === 'dingtalk' && '浏览并导入钉钉知识库文档'}
              </p>
            </div>

            {activeSource === 'local' && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLocalView('index')}
                  className={localView === 'index' ? 'bg-gray-100' : ''}
                >
                  <FolderOpen className="w-4 h-4 mr-1.5" />
                  索引
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLocalView('search')}
                  className={localView === 'search' ? 'bg-gray-100' : ''}
                >
                  <Search className="w-4 h-4 mr-1.5" />
                  检索测试
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLocalView('documents')}
                  className={localView === 'documents' ? 'bg-gray-100' : ''}
                >
                  <FileText className="w-4 h-4 mr-1.5" />
                  文档列表
                </Button>
              </div>
            )}
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {/* Local Knowledge Base */}
          {activeSource === 'local' && (
            <>
              {localView === 'documents' && (
                <div className="space-y-4">
                  {isLoadingDocs ? (
                    <div className="flex items-center justify-center py-20">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                    </div>
                  ) : documents.length === 0 ? (
                    <div className="text-center py-20">
                      <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-1">暂无文档</h3>
                      <p className="text-gray-500 mb-4">点击左侧「导入文档」开始添加知识</p>
                      <Button onClick={() => setLocalView('import')}>
                        <Plus className="w-4 h-4 mr-1.5" />
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
                            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">标签</th>
                            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">创建时间</th>
                            <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">操作</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {documents.map((doc) => {
                            const category = CATEGORIES.find(c => c.id === doc.category) || CATEGORIES[CATEGORIES.length - 1];
                            const isFeatured = featuredDocIds.includes(doc.id);
                            return (
                            <tr key={doc.id} className={`hover:bg-gray-50 transition-colors ${isFeatured ? 'bg-amber-50' : ''}`}>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  {isFeatured && <span className="text-amber-500">★</span>}
                                  <FileText className="w-4 h-4 text-gray-400" />
                                  <span className="font-medium text-gray-900 truncate max-w-xs">{doc.title}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <Badge className={`${category.color} text-xs`}>
                                  {category.icon} {category.name}
                                </Badge>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex gap-1 flex-wrap">
                                  {doc.tags.slice(0, 3).map((tag, i) => (
                                    <Badge key={i} variant="secondary" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                  {doc.tags.length > 3 && (
                                    <span className="text-xs text-gray-400">+{doc.tags.length - 3}</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-500">
                                {new Date(doc.createdAt).toLocaleDateString('zh-CN')}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => toggleFeatured(doc.id)}
                                    className={isFeatured ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-50' : 'text-gray-400 hover:text-gray-600'}
                                    title={isFeatured ? '取消精选' : '设为精选'}
                                  >
                                    {isFeatured ? '★' : '☆'}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDelete(doc.id)}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
              )}

              {localView === 'import' && (
                <div className="max-w-2xl">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Upload className="w-5 h-5" />
                        导入文档
                      </CardTitle>
                      <CardDescription>将文本或网页内容导入到本地知识库</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex gap-2">
                        <Button
                          variant={importType === 'text' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setImportType('text')}
                        >
                          <FileText className="w-4 h-4 mr-1.5" />
                          文本
                        </Button>
                        <Button
                          variant={importType === 'url' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setImportType('url')}
                        >
                          <Link2 className="w-4 h-4 mr-1.5" />
                          网页
                        </Button>
                      </div>

                      {importType === 'text' ? (
                        <>
                          <div>
                            <label className="text-sm font-medium text-gray-700 mb-1.5 block">标题</label>
                            <Input
                              value={importTitle}
                              onChange={(e) => setImportTitle(e.target.value)}
                              placeholder="输入文档标题"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700 mb-1.5 block">内容</label>
                            <textarea
                              value={importContent}
                              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setImportContent(e.target.value)}
                              placeholder="输入文档内容..."
                              rows={8}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                            />
                          </div>
                        </>
                      ) : (
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-1.5 block">网页链接</label>
                          <Input
                            value={importUrl}
                            onChange={(e) => setImportUrl(e.target.value)}
                            placeholder="https://example.com/article"
                          />
                        </div>
                      )}

                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1.5 block">标签（可选）</label>
                        <Input
                          value={importTags}
                          onChange={(e) => setImportTags(e.target.value)}
                          placeholder="用逗号分隔，如：产品, 技术, 教程"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1.5 block">分类</label>
                        <div className="grid grid-cols-2 gap-2">
                          {CATEGORIES.map((cat) => (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => setImportCategory(cat.id)}
                              className={`flex items-center gap-2 p-2 rounded-lg border text-sm transition-colors ${
                                importCategory === cat.id
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <span>{cat.icon}</span>
                              <span className="truncate">{cat.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {importResult && (
                        <div className={`p-3 rounded-lg text-sm ${
                          importResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                        }`}>
                          {importResult.message}
                        </div>
                      )}

                      <Button onClick={handleImport} disabled={isImporting} className="w-full">
                        {isImporting ? (
                          <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />导入中...</>
                        ) : (
                          <><Upload className="w-4 h-4 mr-1.5" />导入</>
                        )}
                      </Button>
                    </CardContent>
                  </Card>

                  {/* 最近导入列表 */}
                  {recentImports.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Clock className="w-4 h-4" />
                          最近导入
                        </CardTitle>
                        <CardDescription>最近导入到知识库的文档</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {recentImports.map((item, i) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium truncate">{item.title}</p>
                                  <p className="text-xs text-gray-500">{item.time}</p>
                                </div>
                              </div>
                              <Badge variant="outline" className="text-xs shrink-0 ml-2">
                                {item.type}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {localView === 'search' && (
                <div className="max-w-2xl space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Search className="w-5 h-5" />
                        语义检索测试
                      </CardTitle>
                      <CardDescription>测试知识库的语义搜索能力</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex gap-2">
                        <Input
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="输入搜索内容..."
                          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        />
                        <Button onClick={handleSearch} disabled={isSearching}>
                          {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                        </Button>
                      </div>

                      {searchResults.length > 0 && (
                        <div className="space-y-3">
                          <p className="text-sm text-gray-500">找到 {searchTotal} 条结果</p>
                          {searchResults.map((result, i) => (
                            <div key={i} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                              <div className="flex items-center justify-between mb-2">
                                <Badge variant="outline" className="text-xs">
                                  相似度: {(result.score * 100).toFixed(1)}%
                                </Badge>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-400">{result.docId.slice(0, 8)}</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleCreateTopicFromSearch(result.content)}
                                    className="text-xs text-blue-600 hover:text-blue-700"
                                  >
                                    <Plus className="w-3 h-3 mr-1" />
                                    创建选题
                                  </Button>
                                </div>
                              </div>
                              <p className="text-sm text-gray-700 line-clamp-3">{result.content}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {localView === 'index' && (
                <div className="space-y-6">
                  {/* 精选文档 */}
                  {featuredDocIds.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                          <span className="text-amber-500">★</span>
                          精选文档
                        </CardTitle>
                        <CardDescription>标记为精选的重要文档</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {documents
                            .filter(doc => featuredDocIds.includes(doc.id))
                            .map((doc) => {
                              const category = CATEGORIES.find(c => c.id === doc.category) || CATEGORIES[CATEGORIES.length - 1];
                              return (
                                <div key={doc.id} className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                                  <div className="flex items-start gap-2">
                                    <FileText className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                                    <div className="min-w-0 flex-1">
                                      <p className="text-sm font-medium text-gray-900 truncate">{doc.title}</p>
                                      <Badge className={`${category.color} text-xs mt-1`}>
                                        {category.icon} {category.name}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* 分类统计 */}
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                    {CATEGORIES.map((cat) => {
                      const count = documents.filter(d => d.category === cat.id).length;
                      return (
                        <div key={cat.id} className="p-3 bg-white rounded-lg border border-gray-200 text-center">
                          <span className="text-2xl">{cat.icon}</span>
                          <p className="text-sm font-medium text-gray-900 mt-1">{cat.name}</p>
                          <p className="text-xs text-gray-500">{count} 篇</p>
                        </div>
                      );
                    })}
                  </div>

                  {/* 按分类展示文档 */}
                  {CATEGORIES.map((cat) => {
                    const catDocs = documents.filter(d => d.category === cat.id);
                    if (catDocs.length === 0) return null;
                    return (
                      <Card key={cat.id}>
                        <CardHeader className="pb-3">
                          <CardTitle className="flex items-center gap-2 text-base">
                            <span>{cat.icon}</span>
                            {cat.name}
                            <Badge variant="secondary" className="text-xs">{catDocs.length}</Badge>
                          </CardTitle>
                          <CardDescription>{cat.description}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {catDocs.map((doc) => {
                              const isFeatured = featuredDocIds.includes(doc.id);
                              return (
                                <div key={doc.id} className={`flex items-center justify-between p-3 rounded-lg ${isFeatured ? 'bg-amber-50' : 'bg-gray-50'}`}>
                                  <div className="flex items-center gap-3 min-w-0 flex-1">
                                    {isFeatured && <span className="text-amber-500">★</span>}
                                    <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                                    <div className="min-w-0 flex-1">
                                      <p className="text-sm font-medium truncate">{doc.title}</p>
                                      <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-xs text-gray-500">
                                          {new Date(doc.createdAt).toLocaleDateString('zh-CN')}
                                        </span>
                                        {doc.tags.slice(0, 2).map((tag, i) => (
                                          <Badge key={i} variant="secondary" className="text-xs">
                                            {tag}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0 ml-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => toggleFeatured(doc.id)}
                                      className={isFeatured ? 'text-amber-600' : 'text-gray-400'}
                                    >
                                      {isFeatured ? '★' : '☆'}
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDelete(doc.id)}
                                      className="text-red-600 hover:text-red-700"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}

                  {documents.length === 0 && (
                    <div className="text-center py-20">
                      <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-1">暂无文档</h3>
                      <p className="text-gray-500 mb-4">导入文档后将按分类展示在这里</p>
                      <Button onClick={() => setLocalView('import')}>
                        <Plus className="w-4 h-4 mr-1.5" />
                        导入文档
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Feishu Knowledge Base */}
          {activeSource === 'feishu' && (
            <div className="space-y-4">
              {/* Configuration Guide */}
              {!configStatus.feishu && (
                <Card className="border-amber-200 bg-amber-50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2 text-amber-800">
                      <Settings className="w-4 h-4" />
                      配置飞书知识库
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-amber-700 space-y-2">
                    <p>要使用飞书知识库功能，请先在设置页面配置飞书应用凭证：</p>
                    <ol className="list-decimal list-inside space-y-1 ml-2">
                      <li>前往 <a href="https://open.feishu.cn/app" target="_blank" rel="noopener noreferrer" className="underline">飞书开放平台</a> 创建应用</li>
                      <li>获取 App ID 和 App Secret</li>
                      <li>开通权限：<code className="bg-amber-100 px-1 rounded">wiki:wiki:readonly</code> 和 <code className="bg-amber-100 px-1 rounded">docx:document:readonly</code></li>
                      <li>发布应用版本</li>
                      <li>在 ECCP 设置页面填入飞书凭证并保存</li>
                    </ol>
                    <Button variant="outline" size="sm" className="mt-3" onClick={() => window.location.href = '/settings'}>
                      前往设置
                    </Button>
                  </CardContent>
                </Card>
              )}

              {isLoadingFeishu ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                </div>
              ) : feishuError ? (
                <div className="text-center py-20">
                  <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-1">加载失败</h3>
                  <p className="text-red-500 mb-4">{feishuError}</p>
                  <Button variant="outline" onClick={loadFeishuSpaces}>
                    <RefreshCw className="w-4 h-4 mr-1.5" />
                    重试
                  </Button>
                </div>
              ) : !selectedSpace ? (
                <>
                  {feishuSpaces.length === 0 ? (
                    <div className="text-center py-20">
                      <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-1">暂无知识库空间</h3>
                      <p className="text-gray-500 mb-4">请先在飞书中创建知识库</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {feishuSpaces.map((space) => (
                        <Card
                          key={space.spaceId}
                          className="cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => {
                            setSelectedSpace(space);
                            loadFeishuNodes(space.spaceId);
                          }}
                        >
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                              <FolderOpen className="w-4 h-4 text-blue-500" />
                              {space.name}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            {space.description && (
                              <p className="text-sm text-gray-500 line-clamp-2">{space.description}</p>
                            )}
                            <ChevronRight className="w-4 h-4 text-gray-400 mt-2" />
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <Button variant="ghost" size="sm" onClick={() => { setSelectedSpace(null); setFeishuNodes([]); }}>
                      <ChevronRight className="w-4 h-4 rotate-180" />
                      返回
                    </Button>
                    <span className="text-sm text-gray-500">{selectedSpace.name}</span>
                  </div>

                  {feishuNodes.length === 0 ? (
                    <div className="text-center py-20">
                      <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-1">暂无文档</h3>
                      <p className="text-gray-500">该知识库空间下没有文档</p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">标题</th>
                            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">类型</th>
                            <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">操作</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {feishuNodes.map((node) => (
                            <tr key={node.nodeToken} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <FileText className="w-4 h-4 text-gray-400" />
                                  <span className="font-medium text-gray-900">{node.title}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <Badge variant="outline" className="text-xs">{node.objType}</Badge>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleImportFeishu(node.nodeToken, node.title)}
                                  disabled={isImportingFeishu}
                                >
                                  <Download className="w-4 h-4 mr-1.5" />
                                  导入
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Dify Knowledge Base */}
          {activeSource === 'dify' && (
            <div className="space-y-4">
              {/* Configuration Guide */}
              {!configStatus.dify && (
                <Card className="border-amber-200 bg-amber-50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2 text-amber-800">
                      <Settings className="w-4 h-4" />
                      配置 Dify 知识库
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-amber-700 space-y-2">
                    <p>要使用 Dify 知识库功能，请先在设置页面配置 Dify API 凭证：</p>
                    <ol className="list-decimal list-inside space-y-1 ml-2">
                      <li>登录 <a href="https://cloud.dify.ai" target="_blank" rel="noopener noreferrer" className="underline">Dify Cloud</a> 或你的自部署 Dify 实例</li>
                      <li>进入「设置」→「API 密钥」</li>
                      <li>创建 Dataset API Key（格式：<code className="bg-amber-100 px-1 rounded">dataset-xxxx</code>）</li>
                      <li>在 ECCP 设置页面填入：
                        <ul className="list-disc list-inside ml-4 mt-1 text-xs">
                          <li>API Key：你的 Dataset API Key</li>
                          <li>Base URL：<code className="bg-amber-100 px-1 rounded">https://api.dify.ai/v1</code>（Cloud）或你的自部署地址</li>
                        </ul>
                      </li>
                    </ol>
                    <Button variant="outline" size="sm" className="mt-3" onClick={() => window.location.href = '/settings'}>
                      前往设置
                    </Button>
                  </CardContent>
                </Card>
              )}

              {isLoadingDify ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                </div>
              ) : difyError ? (
                <div className="text-center py-20">
                  <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-1">加载失败</h3>
                  <p className="text-red-500 mb-4">{difyError}</p>
                  <Button variant="outline" onClick={loadDifyDatasets}>
                    <RefreshCw className="w-4 h-4 mr-1.5" />
                    重试
                  </Button>
                </div>
              ) : !selectedDifyDataset ? (
                <>
                  {difyDatasets.length === 0 ? (
                    <div className="text-center py-20">
                      <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-1">暂无知识库</h3>
                      <p className="text-gray-500 mb-4">请先在 Dify 中创建知识库，或在设置中配置 Dify API Key</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {difyDatasets.map((dataset) => (
                        <Card
                          key={dataset.id}
                          className="cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => {
                            setSelectedDifyDataset(dataset);
                            loadDifyDocuments(dataset.id);
                          }}
                        >
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                              <Database className="w-4 h-4 text-purple-500" />
                              {dataset.name}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-gray-500">{dataset.document_count} 个文档</p>
                            <ChevronRight className="w-4 h-4 text-gray-400 mt-2" />
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <Button variant="ghost" size="sm" onClick={() => { setSelectedDifyDataset(null); setDifyDocuments([]); }}>
                      <ChevronRight className="w-4 h-4 rotate-180" />
                      返回
                    </Button>
                    <span className="text-sm text-gray-500">{selectedDifyDataset.name}</span>
                  </div>

                  {difyDocuments.length === 0 ? (
                    <div className="text-center py-20">
                      <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-1">暂无文档</h3>
                      <p className="text-gray-500">该知识库下没有文档</p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">标题</th>
                            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">字数</th>
                            <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">操作</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {difyDocuments.map((doc) => (
                            <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <FileText className="w-4 h-4 text-gray-400" />
                                  <span className="font-medium text-gray-900">{doc.name}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-500">
                                {doc.word_count.toLocaleString()}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleImportDify(selectedDifyDataset.id, doc.id, doc.name)}
                                  disabled={isImportingDify}
                                >
                                  <Download className="w-4 h-4 mr-1.5" />
                                  导入
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* DingTalk Knowledge Base */}
          {activeSource === 'dingtalk' && (
            <div className="space-y-4">
              {/* Configuration Guide */}
              {!configStatus.dingtalk && (
                <Card className="border-amber-200 bg-amber-50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2 text-amber-800">
                      <Settings className="w-4 h-4" />
                      配置钉钉知识库
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-amber-700 space-y-2">
                    <p>要使用钉钉知识库功能，请先在设置页面配置钉钉应用凭证：</p>
                    <ol className="list-decimal list-inside space-y-1 ml-2">
                      <li>前往 <a href="https://open-dev.dingtalk.com/" target="_blank" rel="noopener noreferrer" className="underline">钉钉开放平台</a> 创建企业内部应用</li>
                      <li>获取 App Key 和 App Secret</li>
                      <li>开通权限：
                        <ul className="list-disc list-inside ml-4 mt-1 text-xs">
                          <li><code className="bg-amber-100 px-1 rounded">Wiki::workspace::read</code> - 查看知识库</li>
                          <li><code className="bg-amber-100 px-1 rounded">Wiki::node::read</code> - 查看知识库节点</li>
                          <li><code className="bg-amber-100 px-1 rounded">Contact::User::readonly</code> - 获取用户信息</li>
                        </ul>
                      </li>
                      <li>获取操作者的 Union ID（可通过钉钉管理后台或 API 获取）</li>
                      <li>在 ECCP 设置页面填入钉钉凭证并保存</li>
                    </ol>
                    <Button variant="outline" size="sm" className="mt-3" onClick={() => window.location.href = '/settings'}>
                      前往设置
                    </Button>
                  </CardContent>
                </Card>
              )}

              {isLoadingDingtalk ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                </div>
              ) : dingtalkError ? (
                <div className="text-center py-20">
                  <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-1">加载失败</h3>
                  <p className="text-red-500 mb-4">{dingtalkError}</p>
                  <Button variant="outline" onClick={loadDingtalkWorkspaces}>
                    <RefreshCw className="w-4 h-4 mr-1.5" />
                    重试
                  </Button>
                </div>
              ) : !selectedDingtalkWorkspace ? (
                <>
                  {dingtalkWorkspaces.length === 0 ? (
                    <div className="text-center py-20">
                      <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-1">暂无知识库</h3>
                      <p className="text-gray-500 mb-4">请先在钉钉中创建知识库，或在设置中配置钉钉凭证</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {dingtalkWorkspaces.map((workspace) => (
                        <Card
                          key={workspace.workspaceId}
                          className="cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => {
                            setSelectedDingtalkWorkspace(workspace);
                            loadDingtalkNodes(workspace.workspaceId);
                          }}
                        >
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                              <FolderOpen className="w-4 h-4 text-blue-500" />
                              {workspace.name}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-gray-500">{workspace.docCount} 个文档</p>
                            <ChevronRight className="w-4 h-4 text-gray-400 mt-2" />
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <Button variant="ghost" size="sm" onClick={() => { setSelectedDingtalkWorkspace(null); setDingtalkNodes([]); }}>
                      <ChevronRight className="w-4 h-4 rotate-180" />
                      返回
                    </Button>
                    <span className="text-sm text-gray-500">{selectedDingtalkWorkspace.name}</span>
                  </div>

                  {dingtalkNodes.length === 0 ? (
                    <div className="text-center py-20">
                      <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-1">暂无文档</h3>
                      <p className="text-gray-500">该知识库下没有文档</p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">标题</th>
                            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">类型</th>
                            <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">操作</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {dingtalkNodes.map((node) => (
                            <tr key={node.nodeId} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <FileText className="w-4 h-4 text-gray-400" />
                                  <span className="font-medium text-gray-900">{node.name}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <Badge variant="outline" className="text-xs">{node.nodeType}</Badge>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleImportDingtalk(node.nodeId, node.name)}
                                  disabled={isImportingDingtalk}
                                >
                                  <Download className="w-4 h-4 mr-1.5" />
                                  导入
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
