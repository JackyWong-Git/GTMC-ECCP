'use client';

import { useState, useRef, useMemo } from 'react';
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
  sourceUrl: string;
  tags: string[];
}

const statusConfig: Record<
  TopicStatus,
  { color: string; dot: string }
> = {
  选题评估: {
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
  },
  脚本生成中: {
    color: 'bg-violet-50 text-violet-700 border-violet-200',
    dot: 'bg-violet-500',
  },
  待审核: {
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
  },
  拍摄中: {
    color: 'bg-orange-50 text-orange-700 border-orange-200',
    dot: 'bg-orange-500',
  },
  已发布: {
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  已归档: {
    color: 'bg-slate-50 text-slate-600 border-slate-200',
    dot: 'bg-slate-400',
  },
};

export default function TopicsPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [analyzingTopic, setAnalyzingTopic] = useState<Topic | null>(null);
  const [analysisResult, setAnalysisResult] = useState<string>('');
  const [analysisModel, setAnalysisModel] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [lastFetchedAt, setLastFetchedAt] = useState<string>('');
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showWordCloud, setShowWordCloud] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate word cloud data from topics
  const wordCloudData = useMemo(() => {
    const wordFreq: Record<string, number> = {};
    const stopWords = new Set(['的', '了', '是', '在', '和', '与', '为', '被', '把', '从', '到', '对', '等', '及', '或', '但', '不', '也', '都', '就', '会', '要', '有', '这', '那', '个', '上', '下', '中', '大', '小', '多', '少', '新', '旧', '好', '坏', '很', '最', '更', '再', '又', '还', '已', '已经', '正在', '可以', '能', '会', '将', '用', '以', '而', '之', '其', '于', '如', '何', '什么', '怎么', '为什么', '哪', '谁', '吗', '呢', '吧', '啊', '哦', '嗯', '哈', '嘿', '呀', '哇', '哎', '唉', '喂', '嗨', '噢', '喔', '嗯嗯', '好的', '是的', '不是', '没有', '有的', '一些', '一个', '这个', '那个', '这些', '那些', '自己', '别人', '大家', '我们', '你们', '他们', '她们', '它们', '你', '我', '他', '她', '它']);

    topics.forEach((topic) => {
      // Extract words from title
      const titleWords = topic.title
        .replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length >= 2 && !stopWords.has(w));

      titleWords.forEach((word) => {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      });

      // Add tags
      topic.tags.forEach((tag) => {
        if (tag && tag.length >= 2 && !stopWords.has(tag)) {
          wordFreq[tag] = (wordFreq[tag] || 0) + 2;
        }
      });
    });

    // Convert to array and sort by frequency
    return Object.entries(wordFreq)
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 50);
  }, [topics]);

  const filteredTopics = topics.filter((topic) => {
    const matchesSearch = topic.title
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' || topic.status === statusFilter;
    const matchesPlatform =
      platformFilter === 'all' || topic.platform === platformFilter;
    return matchesSearch && matchesStatus && matchesPlatform;
  });

  const handleFetchTrending = async () => {
    setIsFetching(true);
    try {
      const response = await fetch('/api/douyin-trending');
      const data = await response.json();

      if (data.success && data.data.topics) {
        const newTopics: Topic[] = data.data.topics.map(
          (item: {
            rank: number;
            title: string;
            heatScore: number;
            category: string;
            source: string;
            url?: string;
            snippet?: string;
          }, index: number) => ({
            id: Date.now() + index,
            title: item.title,
            platform: item.source || '抖音',
            heat: item.heatScore || Math.floor(9000 - index * 300),
            likes: 0,
            comments: 0,
            status: '选题评估' as TopicStatus,
            assignee: '待分配',
            publishDate: new Date().toISOString().split('T')[0],
            sourceUrl: item.url || '',
            tags: [item.category || '热点', item.snippet ? '热门' : ''],
          })
        );
        setTopics((prev) => {
          const existingTitles = new Set(prev.map((t) => t.title));
          const uniqueNew = newTopics.filter(
            (t: Topic) => !existingTitles.has(t.title)
          );
          return [...uniqueNew, ...prev];
        });
        setLastFetchedAt(new Date().toLocaleTimeString('zh-CN'));
      }
    } catch (err) {
      console.error('抓取热榜失败:', err);
    } finally {
      setIsFetching(false);
    }
  };

  const handleImportFile = async (file: File) => {
    setIsImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/import-data', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success && data.data.rows) {
        const importedTopics: Topic[] = data.data.rows.map(
          (row: Record<string, string | number | boolean | null>, index: number) => ({
            id: Date.now() + index,
            title: String(row['选题名称'] || row['title'] || row['名称'] || `导入选题 ${index + 1}`),
            platform: String(row['来源平台'] || row['platform'] || row['平台'] || '未知'),
            heat: Number(row['热度'] || row['heat'] || row['heatScore'] || 0),
            likes: Number(row['点赞'] || row['likes'] || 0),
            comments: Number(row['评论'] || row['comments'] || 0),
            status: (String(row['状态'] || row['status'] || '选题评估')) as TopicStatus,
            assignee: String(row['负责人'] || row['assignee'] || '待分配'),
            publishDate: String(row['发布时间'] || row['publishDate'] || new Date().toISOString().split('T')[0]),
            sourceUrl: String(row['链接'] || row['url'] || ''),
            tags: String(row['标签'] || row['tags'] || '')
              .split(/[,，、]/)
              .filter(Boolean),
          })
        );
        setTopics((prev) => [...importedTopics, ...prev]);
        setShowImportDialog(false);
      }
    } catch (err) {
      console.error('导入数据失败:', err);
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImportFile(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAnalyzeTopic = async (topic: Topic) => {
    setAnalyzingTopic(topic);
    setAnalysisResult('');
    setAnalysisModel('');
    setIsAnalyzing(true);

    try {
      const response = await fetch('/api/analyze-topic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicTitle: topic.title,
          platform: topic.platform,
          heatData: `热度 ${topic.heat}，点赞 ${topic.likes}，评论 ${topic.comments}`,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setAnalysisResult(data.data.analysis);
        setAnalysisModel(data.data.model);
      } else {
        setAnalysisResult(`分析失败：${data.error || '未知错误'}`);
      }
    } catch (err) {
      setAnalysisResult(
        `请求失败：${err instanceof Error ? err.message : '网络错误'}`
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const closeAnalysis = () => {
    setAnalyzingTopic(null);
    setAnalysisResult('');
    setAnalysisModel('');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">选题池</h1>
          <p className="mt-1 text-sm text-slate-500">
            {topics.length > 0
              ? `共 ${topics.length} 个选题${lastFetchedAt ? ` · 上次抓取 ${lastFetchedAt}` : ''}`
              : '抓取热榜或导入数据开始使用'}
          </p>
        </div>
        <div className="flex items-center gap-2">
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
            className="gap-2 bg-[#0F172A] text-white hover:bg-slate-800"
            onClick={handleFetchTrending}
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
            点击「抓取热榜」自动获取抖音/视频号热门话题，或点击「导入数据」上传 CSV/JSON 格式的选题数据
          </p>
          <div className="mt-6 flex items-center gap-3">
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
              onClick={handleFetchTrending}
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
                          AI 分析
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

      {/* AI Analysis Dialog */}
      {analyzingTopic && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    AI 选题分析
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

            <div className="max-h-[480px] overflow-y-auto px-6 py-5">
              {isAnalyzing ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
                  <p className="mt-4 text-sm font-medium text-slate-700">
                    AI 正在分析选题价值...
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    使用 Doubao Seed 2.0 Lite · 分析热度因素、受众画像与选题建议
                  </p>
                </div>
              ) : (
                <div>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                    {analysisResult}
                  </div>
                  {analysisModel && (
                    <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                        {analysisModel}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        热点内容分析模型
                      </span>
                    </div>
                  )}
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
              {!isAnalyzing && analysisResult && (
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
