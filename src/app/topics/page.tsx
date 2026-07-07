'use client';

import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import {
  Search,
  Filter,
  MoreHorizontal,
  ArrowUpDown,
  Flame,
  Clock,
  User,
  Sparkles,
  Loader2,
  X,
  RefreshCw,
  Upload,
  Inbox,
  TrendingUp,
  Cloud,
  Database,
  Target,
  FileText,
  Users,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type TopicStatus =
  | '选题评估'
  | '脚本生成中'
  | '待审核'
  | '拍摄中'
  | '已发布'
  | '已归档';

interface Topic {
  id: number;
  title: string;
  platform: string;
  heat: number;
  likes: number;
  comments: number;
  status: TopicStatus;
  assignee: string;
  publishDate: string;
  tags: string[];
}

interface TopicAnalysisResult {
  summary: string;
  audience: string[];
  score: number;
  suggestions: string[];
  keywords: string[];
}

interface PresetKeyword {
  label: string;
  query: string;
  icon: string;
}

const statusConfig: Record<
  TopicStatus,
  { color: string; dot: string; label: string }
> = {
  选题评估: {
    color: 'border-amber-200 bg-amber-50 text-amber-700',
    dot: 'bg-amber-400',
    label: '选题评估',
  },
  脚本生成中: {
    color: 'border-violet-200 bg-violet-50 text-violet-700',
    dot: 'bg-violet-400',
    label: '脚本生成中',
  },
  待审核: {
    color: 'border-blue-200 bg-blue-50 text-blue-700',
    dot: 'bg-blue-400',
    label: '待审核',
  },
  拍摄中: {
    color: 'border-cyan-200 bg-cyan-50 text-cyan-700',
    dot: 'bg-cyan-400',
    label: '拍摄中',
  },
  已发布: {
    color: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    dot: 'bg-emerald-400',
    label: '已发布',
  },
  已归档: {
    color: 'border-slate-200 bg-slate-50 text-slate-500',
    dot: 'bg-slate-400',
    label: '已归档',
  },
};

const PRESET_KEYWORDS: PresetKeyword[] = [
  { label: '汽车行业', query: '汽车行业 新能源 智能驾驶', icon: '🚗' },
  { label: '行业危机', query: '汽车行业危机 公关 负面舆情', icon: '⚠️' },
  { label: '微博汽车热榜', query: '微博 汽车热搜 话题榜', icon: '🔥' },
  { label: '行业报告', query: '汽车行业报告 市场分析 销量数据', icon: '📊' },
  { label: '新能源趋势', query: '新能源汽车 电池技术 充电桩', icon: '⚡' },
  { label: '智能驾驶', query: '自动驾驶 智能座舱 ADAS', icon: '🤖' },
];

export default function TopicsPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [isFetching, setIsFetching] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(null);
  const [showWordCloud, setShowWordCloud] = useState(false);
  const [customQuery, setCustomQuery] = useState('');
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const [presetKeywords, setPresetKeywords] = useState<PresetKeyword[]>(PRESET_KEYWORDS);
  const [isLoadingCache, setIsLoadingCache] = useState(false);
  const [cacheInfo, setCacheInfo] = useState<{ count: number; fetchedAt: string } | null>(null);

  // 从 localStorage 加载选题
  useEffect(() => {
    try {
      const saved = localStorage.getItem('topics');
      if (saved) {
        setTopics(JSON.parse(saved));
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  // 保存选题到 localStorage
  useEffect(() => {
    if (topics.length > 0) {
      localStorage.setItem('topics', JSON.stringify(topics));
    }
  }, [topics]);

  // Topic analysis state
  const [analyzingTopic, setAnalyzingTopic] = useState<Topic | null>(null);
  const [analysisResult, setAnalysisResult] = useState<TopicAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisModel, setAnalysisModel] = useState('');
  const [audienceFilter, setAudienceFilter] = useState<string>('all');

  // Enhanced search state
  const [timeRange, setTimeRange] = useState<string>('1w');
  const [searchImages, setSearchImages] = useState<Array<{ title: string; url: string; source: string }>>([]);
  const [isSearchingImages, setIsSearchingImages] = useState(false);
  const [recommendations, setRecommendations] = useState<Array<{ title: string; angle: string; reason: string; heatScore: number }>>([]);
  const [isRecommending, setIsRecommending] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load cache info on mount
  useEffect(() => {
    loadCacheInfo();
  }, []);

  const loadCacheInfo = async () => {
    try {
      const res = await fetch('/api/topic-cache');
      const data = await res.json();
      if (data.success && data.data) {
        setCacheInfo({ count: data.data.count, fetchedAt: data.data.fetchedAt });
      }
    } catch {
      // ignore
    }
  };

  const handleLoadCache = async () => {
    setIsLoadingCache(true);
    try {
      const res = await fetch('/api/topic-cache');
      const data = await res.json();
      if (data.success && data.data && data.data.topics.length > 0) {
        setTopics(data.data.topics);
        setLastFetchedAt(data.data.fetchedAt);
      }
    } catch (err) {
      console.error('Failed to load cache:', err);
    } finally {
      setIsLoadingCache(false);
    }
  };

  const handleFetchTrending = async (query?: string) => {
    setIsFetching(true);
    try {
      const searchQuery = query || customQuery || undefined;

      // Add timeout for long-running requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

      const res = await fetch('/api/douyin-trending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          timeRange,
          count: 20,
          searchType: 'topics',
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      if (data.success && data.data && data.data.topics && data.data.topics.length > 0) {
        const newTopics: Topic[] = data.data.topics.map(
          (item: { title: string; heatScore: number; source: string; category: string }, idx: number) => ({
            id: Date.now() + idx,
            title: item.title,
            platform: item.source || '综合',
            heat: item.heatScore || 0,
            likes: Math.floor((item.heatScore || 0) * 0.08),
            comments: Math.floor((item.heatScore || 0) * 0.02),
            status: '选题评估' as TopicStatus,
            assignee: '待分配',
            publishDate: new Date().toISOString().split('T')[0],
            tags: [item.category || '热点', item.source || '综合'],
          })
        );
        setTopics((prev) => [...newTopics, ...prev]);
        setLastFetchedAt(new Date().toLocaleString('zh-CN'));
        loadCacheInfo();
      } else {
        console.warn('No topics returned from API:', data);
        alert('未搜索到相关选题，请尝试其他关键词或稍后重试');
      }
    } catch (err) {
      console.error('Failed to fetch trending:', err);
      if (err instanceof Error && err.name === 'AbortError') {
        alert('搜索超时，请稍后重试或尝试更简短的关键词');
      } else {
        alert('搜索失败，请检查网络连接后重试');
      }
    } finally {
      setIsFetching(false);
    }
  };

  // 图片搜索
  const handleSearchImages = async (query: string) => {
    if (!query.trim()) return;
    setIsSearchingImages(true);
    setSearchImages([]);
    try {
      const res = await fetch('/api/douyin-trending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          count: 12,
          searchType: 'images',
        }),
      });
      const data = await res.json();
      if (data.success && data.data && data.data.images) {
        setSearchImages(data.data.images);
      }
    } catch (err) {
      console.error('Failed to search images:', err);
    } finally {
      setIsSearchingImages(false);
    }
  };

  // 选题推荐
  const handleGetRecommendations = async () => {
    if (topics.length === 0) {
      alert('请先搜索或导入一些选题');
      return;
    }
    setIsRecommending(true);
    setRecommendations([]);
    try {
      const existingTitles = topics.slice(0, 10).map((t) => t.title);
      const res = await fetch('/api/douyin-trending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchType: 'recommend',
          existingTopics: existingTitles,
        }),
      });
      const data = await res.json();
      if (data.success && data.data && data.data.recommendations) {
        setRecommendations(data.data.recommendations);
      }
    } catch (err) {
      console.error('Failed to get recommendations:', err);
    } finally {
      setIsRecommending(false);
    }
  };

  const handlePresetClick = (keyword: PresetKeyword) => {
    setCustomQuery(keyword.query);
    handleFetchTrending(keyword.query);
  };

  const handleAnalyzeTopic = async (topic: Topic) => {
    setAnalyzingTopic(topic);
    setIsAnalyzing(true);
    setAnalysisResult(null);
    setAnalysisModel('');

    try {
      const res = await fetch('/api/topic-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: topic.title,
          platform: topic.platform,
          heat: topic.heat,
          likes: topic.likes,
          comments: topic.comments,
          tags: topic.tags,
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setAnalysisResult(data.data);
        setAnalysisModel(data.model || 'Doubao Seed 2.0 Lite');
      }
    } catch (err) {
      console.error('Failed to analyze topic:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const closeAnalysis = () => {
    setAnalyzingTopic(null);
    setAnalysisResult(null);
    setAnalysisModel('');
    setAudienceFilter('all');
  };

  const handleImportData = async (file: File) => {
    setIsImporting(true);
    try {
      const text = await file.text();
      const format = file.name.endsWith('.csv') ? 'csv' : 'json';
      const res = await fetch('/api/import-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: text, format }),
      });
      const data = await res.json();
      if (data.success && data.data?.rows) {
        const imported: Topic[] = data.data.rows.map(
          (row: Record<string, string | number>, idx: number) => ({
            id: Date.now() + idx,
            title: String(row['选题名称'] || row['title'] || row['名称'] || '未命名选题'),
            platform: String(row['来源平台'] || row['platform'] || row['平台'] || '未知'),
            heat: Number(row['热度'] || row['heat'] || row['heatScore'] || 0),
            likes: Number(row['点赞'] || row['likes'] || 0),
            comments: Number(row['评论'] || row['comments'] || 0),
            status: (String(row['状态'] || row['status'] || '选题评估')) as TopicStatus,
            assignee: String(row['负责人'] || row['assignee'] || '待分配'),
            publishDate: String(
              row['发布时间'] || row['publishDate'] || new Date().toISOString().split('T')[0]
            ),
            tags: String(row['标签'] || row['tags'] || '')
              .split(',')
              .map((t: string) => t.trim())
              .filter(Boolean),
          })
        );
        setTopics((prev) => [...imported, ...prev]);
        setShowImportDialog(false);
      }
    } catch (err) {
      console.error('Failed to import:', err);
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImportData(file);
    }
  };

  // Word cloud data extraction
  const wordCloudData = useMemo(() => {
    const wordFreq: Record<string, number> = {};
    topics.forEach((topic) => {
      topic.tags.forEach((tag) => {
        if (tag && tag.length > 1) {
          wordFreq[tag] = (wordFreq[tag] || 0) + 1;
        }
      });
      const words = topic.title
        .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length >= 2);
      words.forEach((word) => {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      });
    });
    return Object.entries(wordFreq)
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 50);
  }, [topics]);

  const filteredTopics = useMemo(() => {
    return topics.filter((topic) => {
      const matchesSearch =
        !searchQuery ||
        topic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        topic.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = statusFilter === 'all' || topic.status === statusFilter;
      const matchesPlatform =
        platformFilter === 'all' || topic.platform === platformFilter;
      return matchesSearch && matchesStatus && matchesPlatform;
    });
  }, [topics, searchQuery, statusFilter, platformFilter]);

  // Filter analysis audience
  const filteredAudience = useMemo(() => {
    if (!analysisResult) return [];
    if (audienceFilter === 'all') return analysisResult.audience;
    return analysisResult.audience.filter((a) =>
      a.toLowerCase().includes(audienceFilter.toLowerCase())
    );
  }, [analysisResult, audienceFilter]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">选题池</h1>
          <p className="mt-1 text-sm text-slate-500">
            {topics.length > 0
              ? `共 ${topics.length} 个选题${lastFetchedAt ? ` · 上次抓取 ${lastFetchedAt}` : ''}`
              : '搜索热点、抓取热榜或导入数据开始使用'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {cacheInfo && cacheInfo.count > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={handleLoadCache}
              disabled={isLoadingCache}
            >
              {isLoadingCache ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Database className="h-3.5 w-3.5" />
              )}
              加载缓存 ({cacheInfo.count})
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => setShowImportDialog(true)}
            disabled={isImporting}
          >
            <Upload className="h-3.5 w-3.5" />
            导入数据
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => setShowSearchPanel(!showSearchPanel)}
          >
            <Search className="h-3.5 w-3.5" />
            选题搜索
          </Button>
          <Button
            className="gap-2 bg-[#0F172A] text-white hover:bg-slate-800"
            onClick={() => handleFetchTrending()}
            disabled={isFetching}
          >
            {isFetching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {isFetching ? '抓取中...' : '抓取热榜'}
          </Button>
        </div>
      </div>

      {/* Search Panel */}
      {showSearchPanel && (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Target className="h-4 w-4 text-amber-500" />
              选题搜索
            </h3>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-slate-400"
              onClick={() => setShowSearchPanel(false)}
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
          </div>

          {/* Custom search input with time range */}
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="输入自定义搜索词，如：比亚迪 新能源 SUV..."
                value={customQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setCustomQuery(e.target.value)
                }
                onKeyDown={(e: React.KeyboardEvent) => {
                  if (e.key === 'Enter' && customQuery.trim()) {
                    handleFetchTrending(customQuery.trim());
                  }
                }}
                className="h-10 rounded-lg border-slate-200 bg-slate-50 pl-9 text-sm"
              />
            </div>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="h-10 w-[120px] rounded-lg border-slate-200 text-sm">
                <Clock className="mr-2 h-3.5 w-3.5 text-slate-400" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1d">近 1 天</SelectItem>
                <SelectItem value="3d">近 3 天</SelectItem>
                <SelectItem value="1w">近 1 周</SelectItem>
                <SelectItem value="1m">近 1 月</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              className="gap-1.5 bg-amber-500 text-white hover:bg-amber-600"
              onClick={() => handleFetchTrending(customQuery.trim())}
              disabled={isFetching}
            >
              {isFetching ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Search className="h-3.5 w-3.5" />
              )}
              搜索
            </Button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 mb-4">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => handleSearchImages(customQuery || '汽车 热门')}
              disabled={isSearchingImages}
            >
              {isSearchingImages ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileText className="h-3.5 w-3.5" />
              )}
              找配图
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={handleGetRecommendations}
              disabled={isRecommending || topics.length === 0}
            >
              {isRecommending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              AI 推荐选题
            </Button>
          </div>

          {/* Preset keywords */}
          <div>
            <p className="text-xs text-slate-500 mb-2">预设关键词（点击直接搜索）</p>
            <div className="flex flex-wrap gap-2">
              {presetKeywords.map((kw) => (
                <button
                  key={kw.label}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 transition-all hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700"
                  onClick={() => handlePresetClick(kw)}
                  disabled={isFetching}
                >
                  <span>{kw.icon}</span>
                  <span>{kw.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Image search results */}
          {searchImages.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-500 mb-2">相关配图</p>
              <div className="grid grid-cols-4 gap-2">
                {searchImages.slice(0, 8).map((img, idx) => (
                  <a
                    key={idx}
                    href={img.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative aspect-video overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
                  >
                    <img
                      src={img.url}
                      alt={img.title}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-500 mb-2">AI 推荐选题</p>
              <div className="space-y-2">
                {recommendations.map((rec, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-700">{rec.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{rec.angle} · {rec.reason}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-200 bg-amber-50">
                        热度 {rec.heatScore}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        onClick={() => {
                          setTopics((prev) => [
                            {
                              id: Date.now() + idx,
                              title: rec.title,
                              platform: 'AI推荐',
                              heat: rec.heatScore * 100,
                              likes: 0,
                              comments: 0,
                              status: '选题评估',
                              assignee: '待分配',
                              publishDate: new Date().toISOString().split('T')[0],
                              tags: ['AI推荐', rec.angle],
                            },
                            ...prev,
                          ]);
                        }}
                      >
                        加入选题池
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      {topics.length > 0 && (
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="搜索选题名称..."
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSearchQuery(e.target.value)
              }
              className="h-9 max-w-[320px] rounded-lg border-slate-200 bg-white pl-9 text-sm"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-[140px] rounded-lg border-slate-200 text-sm">
              <Filter className="mr-2 h-3.5 w-3.5 text-slate-400" />
              <SelectValue placeholder="全部状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="选题评估">选题评估</SelectItem>
              <SelectItem value="脚本生成中">脚本生成中</SelectItem>
              <SelectItem value="待审核">待审核</SelectItem>
              <SelectItem value="拍摄中">拍摄中</SelectItem>
              <SelectItem value="已发布">已发布</SelectItem>
              <SelectItem value="已归档">已归档</SelectItem>
            </SelectContent>
          </Select>
          <Select value={platformFilter} onValueChange={setPlatformFilter}>
            <SelectTrigger className="h-9 w-[140px] rounded-lg border-slate-200 text-sm">
              <SelectValue placeholder="全部平台" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部平台</SelectItem>
              <SelectItem value="抖音">抖音</SelectItem>
              <SelectItem value="视频号">视频号</SelectItem>
              <SelectItem value="快手">快手</SelectItem>
              <SelectItem value="微博">微博</SelectItem>
              <SelectItem value="综合">综合</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant={showWordCloud ? 'default' : 'outline'}
            size="sm"
            className={`gap-1.5 text-xs ${showWordCloud ? 'bg-amber-500 text-white hover:bg-amber-600' : ''}`}
            onClick={() => setShowWordCloud(!showWordCloud)}
          >
            <Cloud className="h-3.5 w-3.5" />
            词云
          </Button>
        </div>
      )}

      {/* Word Cloud */}
      {showWordCloud && wordCloudData.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-700">热点词云</h3>
            <Badge variant="outline" className="text-[10px] text-slate-400">
              {wordCloudData.length} 个关键词
            </Badge>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 min-h-[120px]">
            {wordCloudData.map((item, idx) => {
              const maxCount = wordCloudData[0]?.count || 1;
              const ratio = item.count / maxCount;
              const fontSize = Math.max(12, Math.min(36, 12 + ratio * 24));
              const opacity = 0.4 + ratio * 0.6;
              const colors = [
                'text-amber-600',
                'text-blue-600',
                'text-violet-600',
                'text-emerald-600',
                'text-rose-600',
                'text-cyan-600',
                'text-orange-600',
                'text-indigo-600',
              ];
              const color = colors[idx % colors.length];
              return (
                <span
                  key={item.word}
                  className={`${color} font-medium transition-all hover:scale-110 cursor-default`}
                  style={{ fontSize: `${fontSize}px`, opacity }}
                  title={`${item.word}: 出现 ${item.count} 次`}
                >
                  {item.word}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {topics.length === 0 && !isFetching && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white py-20">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50">
            <Inbox className="h-8 w-8 text-slate-300" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-slate-700">
            选题池为空
          </h3>
          <p className="mt-1.5 max-w-sm text-center text-sm text-slate-400">
            使用「选题搜索」查找特定话题，或点击「抓取热榜」获取热门话题，也可「导入数据」上传已有选题
          </p>
          <div className="mt-6 flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => setShowSearchPanel(true)}
            >
              <Search className="h-3.5 w-3.5" />
              选题搜索
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => setShowImportDialog(true)}
            >
              <Upload className="h-3.5 w-3.5" />
              导入数据
            </Button>
            <Button
              className="gap-2 bg-[#0F172A] text-white hover:bg-slate-800"
              onClick={() => handleFetchTrending()}
            >
              <TrendingUp className="h-4 w-4" />
              抓取热榜
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      {topics.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-100 hover:bg-transparent">
                <TableHead className="w-[300px] text-xs font-semibold text-slate-600">
                  <div className="flex items-center gap-1">
                    选题名称
                    <ArrowUpDown className="h-3 w-3 text-slate-400" />
                  </div>
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-600">
                  来源平台
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-600">
                  <div className="flex items-center gap-1">
                    热度数据
                    <ArrowUpDown className="h-3 w-3 text-slate-400" />
                  </div>
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-600">
                  状态
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-600">
                  <div className="flex items-center gap-1">
                    负责人
                    <User className="h-3 w-3 text-slate-400" />
                  </div>
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-600">
                  <div className="flex items-center gap-1">
                    发布时间
                    <Clock className="h-3 w-3 text-slate-400" />
                  </div>
                </TableHead>
                <TableHead className="w-[120px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTopics.map((topic) => {
                const config = statusConfig[topic.status] || statusConfig['选题评估'];
                return (
                  <TableRow
                    key={topic.id}
                    className="border-slate-50 transition-colors hover:bg-slate-50/50"
                  >
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          {topic.title}
                        </p>
                        <div className="mt-1 flex gap-1.5">
                          {topic.tags.filter(Boolean).map((tag) => (
                            <span
                              key={tag}
                              className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="rounded-full border-slate-200 text-xs font-normal text-slate-600"
                      >
                        {topic.platform}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1 text-sm font-medium tabular-nums text-slate-800">
                          <Flame className="h-3.5 w-3.5 text-orange-400" />
                          {topic.heat >= 10000
                            ? `${(topic.heat / 10000).toFixed(1)}w`
                            : topic.heat.toLocaleString()}
                        </div>
                        <div className="flex gap-3 text-xs text-slate-400">
                          <span>赞 {topic.likes}</span>
                          <span>评论 {topic.comments}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.color}`}
                      >
                        <span
                          className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${config.dot}`}
                        />
                        {topic.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[10px] font-medium text-slate-600">
                          {topic.assignee[0]}
                        </div>
                        <span className="text-sm text-slate-600">
                          {topic.assignee}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm tabular-nums text-slate-500">
                        {topic.publishDate}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1 px-2 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                          onClick={() => handleAnalyzeTopic(topic)}
                          disabled={isAnalyzing}
                        >
                          <Sparkles className="h-3 w-3" />
                          分析
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-400 hover:text-slate-600"
                        >
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {/* Table Footer */}
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
            <p className="text-xs text-slate-400">
              显示 {filteredTopics.length} / {topics.length} 条记录
            </p>
          </div>
        </div>
      )}

      {/* Import Dialog */}
      {showImportDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
                  <Upload className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    导入数据
                  </h3>
                  <p className="text-xs text-slate-400">
                    支持 CSV / JSON 格式
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-400"
                onClick={() => setShowImportDialog(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="px-6 py-5">
              {isImporting ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  <p className="mt-4 text-sm text-slate-600">正在解析数据...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div
                    className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 py-10 transition-colors hover:border-blue-300 hover:bg-blue-50/30"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-8 w-8 text-slate-300" />
                    <p className="mt-3 text-sm font-medium text-slate-600">
                      点击上传文件
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      支持 .csv 和 .json 格式
                    </p>
                  </div>

                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs font-medium text-slate-600">
                      CSV 字段映射说明
                    </p>
                    <div className="mt-2 space-y-1 text-[11px] text-slate-400">
                      <p>选题名称 / title / 名称 → 选题标题</p>
                      <p>来源平台 / platform / 平台 → 平台来源</p>
                      <p>热度 / heat / heatScore → 热度分数</p>
                      <p>标签 / tags → 内容标签（逗号分隔）</p>
                    </div>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.json"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-3">
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => setShowImportDialog(false)}
              >
                取消
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Topic Analysis Dialog */}
      {analyzingTopic && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-3xl rounded-xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    选题分析
                  </h3>
                  <p className="text-xs text-slate-400">
                    {analyzingTopic.title} · {analyzingTopic.platform}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-400"
                onClick={closeAnalysis}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="max-h-[520px] overflow-y-auto px-6 py-5">
              {isAnalyzing ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
                  <p className="mt-4 text-sm font-medium text-slate-700">
                    AI 正在分析选题价值...
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    分析内容摘要、受众画像与选题建议
                  </p>
                </div>
              ) : analysisResult ? (
                <div className="space-y-5">
                  {/* Score */}
                  <div className="flex items-center gap-4 rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 p-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white shadow-sm">
                      <span className="text-2xl font-bold text-amber-600">
                        {analysisResult.score}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">选题价值评分</p>
                      <p className="text-xs text-slate-500">
                        {analysisResult.score >= 80
                          ? '高价值选题，建议优先推进'
                          : analysisResult.score >= 60
                            ? '中等价值，可考虑优化角度'
                            : '价值较低，建议更换选题'}
                      </p>
                    </div>
                  </div>

                  {/* Summary */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4 text-blue-500" />
                      <h4 className="text-sm font-semibold text-slate-700">内容摘要</h4>
                    </div>
                    <p className="text-sm leading-relaxed text-slate-600 bg-slate-50 rounded-lg p-3">
                      {analysisResult.summary}
                    </p>
                  </div>

                  {/* Keywords */}
                  {analysisResult.keywords.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-slate-700 mb-2">关键词</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {analysisResult.keywords.map((kw) => (
                          <Badge
                            key={kw}
                            variant="outline"
                            className="rounded-full border-amber-200 bg-amber-50 text-xs text-amber-700"
                          >
                            {kw}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Audience */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-violet-500" />
                        <h4 className="text-sm font-semibold text-slate-700">目标受众</h4>
                      </div>
                      <Select value={audienceFilter} onValueChange={setAudienceFilter}>
                        <SelectTrigger className="h-7 w-[120px] rounded-md border-slate-200 text-xs">
                          <SelectValue placeholder="筛选受众" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">全部受众</SelectItem>
                          <SelectItem value="年轻">年轻群体</SelectItem>
                          <SelectItem value="女性">女性用户</SelectItem>
                          <SelectItem value="男性">男性用户</SelectItem>
                          <SelectItem value="家庭">家庭用户</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {filteredAudience.map((aud) => (
                        <div
                          key={aud}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs text-violet-700"
                        >
                          <User className="h-3 w-3" />
                          {aud}
                        </div>
                      ))}
                      {filteredAudience.length === 0 && (
                        <p className="text-xs text-slate-400">无匹配受众</p>
                      )}
                    </div>
                  </div>

                  {/* Suggestions */}
                  {analysisResult.suggestions.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="h-4 w-4 text-emerald-500" />
                        <h4 className="text-sm font-semibold text-slate-700">优化建议</h4>
                      </div>
                      <ul className="space-y-2">
                        {analysisResult.suggestions.map((sug, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-2 text-sm text-slate-600"
                          >
                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-medium text-emerald-600">
                              {idx + 1}
                            </span>
                            {sug}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Model info */}
                  {analysisModel && (
                    <div className="flex items-center gap-2 border-t border-slate-100 pt-3">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                        {analysisModel}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        选题分析模型
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <Sparkles className="h-8 w-8 mb-2" />
                  <p className="text-sm">分析失败，请重试</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-3">
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={closeAnalysis}
              >
                关闭
              </Button>
              {!isAnalyzing && (
                <Button
                  size="sm"
                  className="gap-1.5 bg-amber-500 text-xs text-white hover:bg-amber-600"
                  onClick={() => handleAnalyzeTopic(analyzingTopic)}
                >
                  <RefreshCw className="h-3 w-3" />
                  重新分析
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
