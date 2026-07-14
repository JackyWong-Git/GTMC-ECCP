'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast, Toaster } from 'sonner';
import {
  Plus,
  Search,
  PenTool,
  FileText,
  BookOpen,
  MoreHorizontal,
  Trash2,
  Eye,
  Download,
  Copy,
  CheckCircle2,
  Circle,
  Loader2,
  Clock,
  Target,
  Sparkles,
  Send,
  ChevronRight,
  Filter,
  TrendingUp,
  Flame,
  Globe,
  Database,
  X,
  Video,
  Play,
} from 'lucide-react';

// Topic status flow
const STATUS_CONFIG = [
  { key: '待认领', color: 'bg-gray-100 text-gray-700 border-gray-200', icon: Circle, action: '认领并创作', actionIcon: Target },
  { key: '脚本制作', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Loader2, action: '去创作', actionIcon: PenTool },
  { key: '拍摄中', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Loader2, action: '推进到待审核', actionIcon: ChevronRight },
  { key: '待审核', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: Clock, action: '审核通过', actionIcon: CheckCircle2 },
  { key: '已发布', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle2, action: '查看数据', actionIcon: TrendingUp },
  { key: '已归档', color: 'bg-slate-100 text-slate-500 border-slate-200', icon: CheckCircle2, action: '查看', actionIcon: Eye },
];

const PRIORITY_COLORS = {
  高: 'bg-red-100 text-red-700 border-red-200',
  中: 'bg-amber-100 text-amber-700 border-amber-200',
  低: 'bg-green-100 text-green-700 border-green-200',
};

interface Topic {
  id: string;
  title: string;
  description: string;
  created_by: string;
  assigned_to: string | null;
  status: string;
  priority: string;
  deadline: string | null;
  progress: number;
  source: string | null;
  source_url: string | null;
  created_at: string;
  updated_at: string;
}

interface UserInfo {
  id: string;
  email: string;
  name: string;
  role: string;
}

type CreationMode = 'script' | 'article';

export default function WorkspacePage() {
  const router = useRouter();
  const [supabase, setSupabase] = useState<ReturnType<typeof getSupabaseBrowserClient> | null>(null);
  const [accessToken, setAccessToken] = useState('');
  const [currentUser, setCurrentUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // Topics state
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPriority, setNewPriority] = useState('中');

  // Creation state
  const [creationMode, setCreationMode] = useState<CreationMode>('script');
  const [scriptStyle, setScriptStyle] = useState('口播');
  const [scriptDuration, setScriptDuration] = useState('60');
  const [generatedContent, setGeneratedContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showMenuFor, setShowMenuFor] = useState<string | null>(null);

  // Hot topic search state
  const [showHotTopics, setShowHotTopics] = useState(false);
  const [hotTopics, setHotTopics] = useState<Array<{ title: string; hotValue: number; source: string }>>([]);
  const [isLoadingHotTopics, setIsLoadingHotTopics] = useState(false);

  // Video learning state
  const [showVideoLearn, setShowVideoLearn] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoTranscript, setVideoTranscript] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);

  // Auth-aware fetch
  const authFetch = useCallback((url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers || {});
    if (accessToken) {
      headers.set('x-session', accessToken);
    }
    if (!(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }
    return fetch(url, { ...options, headers });
  }, [accessToken]);

  // Fetch hot topics from multiple sources
  const fetchHotTopics = useCallback(async () => {
    setIsLoadingHotTopics(true);
    try {
      const [douyinRes, weiboRes] = await Promise.allSettled([
        fetch('/api/douyin-trending'),
        fetch('/api/weibo-trending'),
      ]);

      const topics: Array<{ title: string; hotValue: number; source: string }> = [];

      if (douyinRes.status === 'fulfilled' && douyinRes.value.ok) {
        const data = await douyinRes.value.json();
        if (data.success && data.data?.videos) {
          topics.push(...data.data.videos.slice(0, 10).map((v: { title: string; likeCount?: number }) => ({
            title: v.title,
            hotValue: v.likeCount || 0,
            source: '抖音',
          })));
        }
      }

      if (weiboRes.status === 'fulfilled' && weiboRes.value.ok) {
        const data = await weiboRes.value.json();
        if (data.success && data.data?.topics) {
          topics.push(...data.data.topics.slice(0, 10).map((t: { title: string; hotValue: number }) => ({
            title: t.title,
            hotValue: t.hotValue,
            source: '微博',
          })));
        }
      }

      setHotTopics(topics.sort((a, b) => b.hotValue - a.hotValue).slice(0, 15));
    } catch (error) {
      console.error('Failed to fetch hot topics:', error);
      toast.error('获取热榜失败');
    } finally {
      setIsLoadingHotTopics(false);
    }
  }, []);

  // Use hot topic as new topic
  const handleUseHotTopic = (hotTopic: { title: string; hotValue: number; source: string }) => {
    setNewTitle(hotTopic.title);
    setNewDescription(`来自${hotTopic.source}热榜，热度 ${hotTopic.hotValue.toLocaleString()}`);
    setShowHotTopics(false);
    setShowCreateModal(true);
  };

  // Fetch video transcript
  const handleFetchTranscript = async () => {
    if (!videoUrl.trim()) {
      toast.error('请输入视频链接');
      return;
    }

    setIsTranscribing(true);
    setVideoTranscript('');

    try {
      const response = await authFetch('/api/video-transcript', {
        method: 'POST',
        body: JSON.stringify({ url: videoUrl }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.transcript) {
          setVideoTranscript(data.data.transcript);
          toast.success('视频转写完成');
        } else {
          toast.error(data.error || '转写失败');
        }
      } else {
        const error = await response.json();
        toast.error(error.error || '转写失败');
      }
    } catch (error) {
      console.error('Transcript error:', error);
      toast.error('视频转写失败');
    } finally {
      setIsTranscribing(false);
    }
  };

  // Use transcript as inspiration for current topic
  const handleUseTranscript = () => {
    if (!videoTranscript || !selectedTopic) {
      toast.error('请先选择选题并完成视频转写');
      return;
    }
    // Prepend transcript context to the generation
    setGeneratedContent(`【参考素材 - 来自视频学习】\n${videoTranscript.slice(0, 500)}...\n\n---\n\n`);
    setShowVideoLearn(false);
    toast.success('已添加参考素材，点击生成开始创作');
  };

  // Initialize
  useEffect(() => {
    try {
      setSupabase(getSupabaseBrowserClient());
    } catch (e) {
      console.error('Failed to initialize Supabase:', e);
      setLoading(false);
    }
  }, []);

  // Auth check and load topics
  useEffect(() => {
    if (!supabase) return;

    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push('/login');
          return;
        }

        const token = session.access_token;
        setAccessToken(token);

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('users')
            .select('name, role')
            .eq('id', user.id)
            .single();

          setCurrentUser({
            id: user.id,
            email: user.email || '',
            name: profile?.name || user.email?.split('@')[0] || 'User',
            role: profile?.role || 'editor',
          });
        }

        await loadTopics(token);
      } catch (error) {
        console.error('Init error:', error);
        toast.error('初始化失败');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [supabase, router]);

  // Load topics
  const loadTopics = async (token?: string) => {
    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token || accessToken) {
        headers['x-session'] = token || accessToken;
      }

      const response = await fetch('/api/topics', { headers });
      if (response.ok) {
        const data = await response.json();
        setTopics(data.data?.internalTopics || []);
      }
    } catch (error) {
      console.error('Load topics error:', error);
    }
  };

  // Handle claim and advance
  const handleClaimTopic = async (topic: Topic) => {
    try {
      const response = await authFetch('/api/topics', {
        method: 'PATCH',
        body: JSON.stringify({
          id: topic.id,
          assigned_to: currentUser?.id,
          status: '脚本制作',
        }),
      });

      if (response.ok) {
        toast.success('已认领选题，开始创作吧！');
        await loadTopics();
        setSelectedTopic({ ...topic, assigned_to: currentUser?.id || null, status: '脚本制作' });
      } else {
        toast.error('认领失败');
      }
    } catch (error) {
      console.error('Claim error:', error);
      toast.error('认领失败');
    }
  };

  const handleAdvanceStatus = async (topic: Topic) => {
    const statusOrder = STATUS_CONFIG.map(s => s.key);
    const currentIndex = statusOrder.indexOf(topic.status);
    if (currentIndex >= statusOrder.length - 1) {
      toast.info('已是最终状态');
      return;
    }

    const nextStatus = statusOrder[currentIndex + 1];

    try {
      const response = await authFetch('/api/topics', {
        method: 'PATCH',
        body: JSON.stringify({
          id: topic.id,
          status: nextStatus,
        }),
      });

      if (response.ok) {
        toast.success(`已推进到: ${nextStatus}`);
        await loadTopics();
        setSelectedTopic({ ...topic, status: nextStatus });
      } else {
        toast.error('推进失败');
      }
    } catch (error) {
      console.error('Advance error:', error);
      toast.error('推进失败');
    }
  };

  // Handle main action based on status
  const handleMainAction = (topic: Topic) => {
    switch (topic.status) {
      case '待认领':
        handleClaimTopic(topic);
        break;
      case '脚本制作':
      case '拍摄中':
      case '待审核':
        handleAdvanceStatus(topic);
        break;
      case '已发布':
        router.push('/analytics');
        break;
      case '已归档':
        // Just view
        break;
    }
  };

  // Create topic
  const handleCreateTopic = async () => {
    if (!newTitle.trim()) {
      toast.error('请输入选题标题');
      return;
    }

    try {
      const response = await authFetch('/api/topics', {
        method: 'POST',
        body: JSON.stringify({
          title: newTitle,
          description: newDescription,
          priority: newPriority,
        }),
      });

      if (response.ok) {
        toast.success('选题创建成功');
        setShowCreateModal(false);
        setNewTitle('');
        setNewDescription('');
        setNewPriority('中');
        await loadTopics();
      } else {
        toast.error('创建失败');
      }
    } catch (error) {
      console.error('Create error:', error);
      toast.error('创建失败');
    }
  };

  // Delete topic
  const handleDeleteTopic = async (topicId: string) => {
    if (!confirm('确定删除此选题？')) return;

    try {
      const response = await authFetch(`/api/topics?id=${topicId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('已删除');
        await loadTopics();
        if (selectedTopic?.id === topicId) {
          setSelectedTopic(null);
        }
      } else {
        toast.error('删除失败');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('删除失败');
    }
  };

  // Generate content
  const handleGenerate = async () => {
    if (!selectedTopic) {
      toast.error('请先选择一个选题');
      return;
    }

    setIsGenerating(true);
    setGeneratedContent('');

    try {
      const endpoint = creationMode === 'script' ? '/api/generate-script' : '/api/generate-article';
      const body = creationMode === 'script'
        ? { topicTitle: selectedTopic.title, platform: 'douyin' }
        : { topic: selectedTopic.title, keywords: selectedTopic.description };

      const response = await authFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error('生成失败');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  setGeneratedContent(prev => prev + parsed.content);
                }
              } catch {
                // Plain text
                if (data !== '[DONE]') {
                  setGeneratedContent(prev => prev + data);
                }
              }
            }
          }
        }
      }

      toast.success('生成完成');
    } catch (error) {
      console.error('Generate error:', error);
      toast.error('生成失败，请重试');
    } finally {
      setIsGenerating(false);
    }
  };

  // Save to knowledge base
  const handleSaveToKnowledge = async () => {
    if (!generatedContent.trim()) {
      toast.error('没有可保存的内容');
      return;
    }

    try {
      const response = await authFetch('/api/knowledge', {
        method: 'POST',
        body: JSON.stringify({
          action: 'import',
          source: 'local',
          title: `${selectedTopic?.title || '生成内容'} - ${creationMode === 'script' ? '脚本' : '文章'}`,
          content: generatedContent,
          tags: [creationMode === 'script' ? '脚本' : '文章', 'AI生成'],
        }),
      });

      if (response.ok) {
        toast.success('已保存到知识库');
        setShowMenuFor(null);
      } else {
        const error = await response.json();
        toast.error(error.error || '保存失败');
      }
    } catch (error) {
      console.error('Save to knowledge error:', error);
      toast.error('保存失败');
    }
  };

  // Download content
  const handleDownload = () => {
    const blob = new Blob([generatedContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedTopic?.title || 'content'}_${creationMode}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('已下载');
  };

  // Copy content
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedContent);
      toast.success('已复制到剪贴板');
    } catch {
      toast.error('复制失败');
    }
  };

  // Filter topics
  const filteredTopics = topics.filter(topic => {
    const matchesSearch = topic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      topic.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || topic.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Get status config
  const getStatusConfig = (status: string) => {
    return STATUS_CONFIG.find(s => s.key === status) || STATUS_CONFIG[0];
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-slate-50">
      <Toaster position="top-center" />

      {/* Left Panel - Topics */}
      <div className="flex w-[420px] flex-col border-r border-slate-200 bg-white">
        {/* Header */}
        <div className="border-b border-slate-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-slate-900">选题池</h2>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowHotTopics(!showHotTopics);
                  if (!showHotTopics && hotTopics.length === 0) {
                    fetchHotTopics();
                  }
                }}
              >
                <TrendingUp className="h-4 w-4 mr-1" />
                热榜
              </Button>
              <Button size="sm" onClick={() => setShowCreateModal(true)}>
                <Plus className="h-4 w-4 mr-1" />
                新建
              </Button>
            </div>
          </div>

          {/* Hot Topics Panel */}
          {showHotTopics && (
            <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-amber-800">热榜选题</span>
                <button
                  onClick={() => setShowHotTopics(false)}
                  className="text-amber-600 hover:text-amber-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {isLoadingHotTopics ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-amber-600" />
                  <span className="ml-2 text-sm text-amber-700">加载中...</span>
                </div>
              ) : hotTopics.length === 0 ? (
                <p className="text-sm text-amber-700 py-2">暂无热榜数据</p>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {hotTopics.map((topic, index) => (
                    <button
                      key={index}
                      onClick={() => handleUseHotTopic(topic)}
                      className="w-full text-left rounded px-2 py-1.5 text-sm hover:bg-amber-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                          index < 3 ? 'bg-red-500 text-white' : 'bg-amber-200 text-amber-800'
                        }`}>
                          {index + 1}
                        </span>
                        <span className="truncate text-slate-700">{topic.title}</span>
                        <span className="shrink-0 text-xs text-amber-600">{topic.source}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="搜索选题..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Status Filter */}
          <div className="flex gap-1 overflow-x-auto pb-1">
            <button
              onClick={() => setStatusFilter('all')}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                statusFilter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              全部
            </button>
            {STATUS_CONFIG.map(status => (
              <button
                key={status.key}
                onClick={() => setStatusFilter(status.key)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  statusFilter === status.key
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {status.key}
              </button>
            ))}
          </div>
        </div>

        {/* Topic List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filteredTopics.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <FileText className="h-12 w-12 mb-3 opacity-50" />
              <p className="text-sm">暂无选题</p>
              <Button variant="link" size="sm" onClick={() => setShowCreateModal(true)}>
                创建第一个选题
              </Button>
            </div>
          ) : (
            filteredTopics.map(topic => {
              const statusConfig = getStatusConfig(topic.status);
              const StatusIcon = statusConfig.icon;
              const ActionIcon = statusConfig.actionIcon;
              const isSelected = selectedTopic?.id === topic.id;

              return (
                <Card
                  key={topic.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    isSelected ? 'ring-2 ring-blue-500 border-blue-200' : ''
                  }`}
                  onClick={() => setSelectedTopic(topic)}
                >
                  <CardContent className="p-4">
                    {/* Title and Priority */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-medium text-slate-900 line-clamp-2 flex-1">
                        {topic.title}
                      </h3>
                      <Badge className={`shrink-0 text-xs ${PRIORITY_COLORS[topic.priority as keyof typeof PRIORITY_COLORS]}`}>
                        {topic.priority}
                      </Badge>
                    </div>

                    {/* Description */}
                    {topic.description && (
                      <p className="text-sm text-slate-500 line-clamp-2 mb-3">
                        {topic.description}
                      </p>
                    )}

                    {/* Status and Progress */}
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="outline" className={`text-xs ${statusConfig.color}`}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {topic.status}
                      </Badge>
                      {topic.progress > 0 && (
                        <div className="flex items-center gap-1 flex-1">
                          <div className="h-1.5 flex-1 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-blue-500 transition-all"
                              style={{ width: `${topic.progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-400">{topic.progress}%</span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between">
                      <Button
                        size="sm"
                        variant={topic.status === '待认领' ? 'default' : 'outline'}
                        className="flex-1 mr-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMainAction(topic);
                        }}
                      >
                        <ActionIcon className="h-4 w-4 mr-1" />
                        {statusConfig.action}
                      </Button>

                      <div className="relative">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowMenuFor(showMenuFor === topic.id ? null : topic.id);
                          }}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>

                        {showMenuFor === topic.id && (
                          <div className="absolute right-0 top-full mt-1 w-36 rounded-lg border border-slate-200 bg-white py-1 shadow-lg z-10">
                            <button
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSaveToKnowledge();
                              }}
                            >
                              <BookOpen className="h-4 w-4" />
                              存知识库
                            </button>
                            <button
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowMenuFor(null);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                              查看详情
                            </button>
                            <button
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowMenuFor(null);
                                handleDeleteTopic(topic.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                              删除
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Right Panel - Creation */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedTopic ? (
          <>
            {/* Creation Header */}
            <div className="border-b border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className={getStatusConfig(selectedTopic.status).color}>
                      {selectedTopic.status}
                    </Badge>
                    <Badge className={PRIORITY_COLORS[selectedTopic.priority as keyof typeof PRIORITY_COLORS]}>
                      {selectedTopic.priority}
                    </Badge>
                  </div>
                  <h2 className="text-xl font-semibold text-slate-900">{selectedTopic.title}</h2>
                </div>

                {/* Mode Toggle */}
                <div className="flex items-center gap-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowVideoLearn(true)}
                    className="border-purple-200 text-purple-700 hover:bg-purple-50"
                  >
                    <Video className="h-4 w-4 mr-1" />
                    从视频学习
                  </Button>
                  <div className="flex rounded-lg border border-slate-200 p-1">
                  <button
                    onClick={() => setCreationMode('script')}
                    className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                      creationMode === 'script'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <PenTool className="h-4 w-4" />
                    脚本
                  </button>
                  <button
                    onClick={() => setCreationMode('article')}
                    className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                      creationMode === 'article'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <FileText className="h-4 w-4" />
                    文章
                  </button>
                </div>
                </div>
              </div>

              {/* Creation Options */}
              {creationMode === 'script' && (
                <div className="flex gap-4">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">风格</label>
                    <select
                      value={scriptStyle}
                      onChange={(e) => setScriptStyle(e.target.value)}
                      className="rounded-md border border-slate-200 px-3 py-1.5 text-sm"
                    >
                      <option value="口播">口播</option>
                      <option value="剧情">剧情</option>
                      <option value="测评">测评</option>
                      <option value="Vlog">Vlog</option>
                      <option value="教程">教程</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">时长(秒)</label>
                    <Input
                      type="number"
                      value={scriptDuration}
                      onChange={(e) => setScriptDuration(e.target.value)}
                      className="w-24"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Generation Area */}
            <div className="flex-1 overflow-y-auto p-6">
              {generatedContent ? (
                <Card className="h-full">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-base">
                      {creationMode === 'script' ? '脚本内容' : '文章内容'}
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={handleCopy}>
                        <Copy className="h-4 w-4 mr-1" />
                        复制
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleDownload}>
                        <Download className="h-4 w-4 mr-1" />
                        下载
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                      {generatedContent}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-slate-400">
                  <Sparkles className="h-16 w-16 mb-4 opacity-50" />
                  <p className="text-lg mb-2">准备就绪</p>
                  <p className="text-sm">点击下方按钮开始 AI 创作</p>
                </div>
              )}
            </div>

            {/* Generate Button */}
            <div className="border-t border-slate-200 bg-white p-4">
              <Button
                className="w-full"
                size="lg"
                onClick={handleGenerate}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5 mr-2" />
                    {creationMode === 'script' ? '生成脚本' : '生成文章'}
                  </>
                )}
              </Button>
            </div>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-slate-400">
            <PenTool className="h-20 w-20 mb-4 opacity-30" />
            <p className="text-xl mb-2">选择一个选题开始创作</p>
            <p className="text-sm">从左侧选题池中选择选题，AI 将为你生成内容</p>
          </div>
        )}
      </div>

      {/* Create Topic Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>新建选题</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">标题</label>
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="输入选题标题"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">描述</label>
                <Textarea
                  value={newDescription}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewDescription(e.target.value)}
                  placeholder="输入选题描述"
                  rows={3}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">优先级</label>
                <div className="flex gap-2">
                  {['高', '中', '低'].map(p => (
                    <button
                      key={p}
                      onClick={() => setNewPriority(p)}
                      className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                        newPriority === p
                          ? PRIORITY_COLORS[p as keyof typeof PRIORITY_COLORS]
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button variant="outline" className="flex-1" onClick={() => setShowCreateModal(false)}>
                  取消
                </Button>
                <Button className="flex-1" onClick={handleCreateTopic}>
                  创建
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Video Learn Modal */}
      {showVideoLearn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-2xl max-h-[80vh] flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5 text-purple-600" />
                  从视频学习
                </CardTitle>
                <p className="text-sm text-slate-500 mt-1">
                  粘贴竞品视频链接，AI 将提取文案作为创作参考
                </p>
              </div>
              <button
                onClick={() => {
                  setShowVideoLearn(false);
                  setVideoUrl('');
                  setVideoTranscript('');
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto space-y-4">
              {/* URL Input */}
              <div className="flex gap-2">
                <Input
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="粘贴视频链接（支持抖音分享链接、直链等）"
                  className="flex-1"
                />
                <Button
                  onClick={handleFetchTranscript}
                  disabled={isTranscribing || !videoUrl.trim()}
                >
                  {isTranscribing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      转写中
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-1" />
                      提取文案
                    </>
                  )}
                </Button>
              </div>

              {/* Supported platforms hint */}
              <div className="flex flex-wrap gap-2">
                {['抖音', '快手', 'B站', '小红书', '视频号'].map(platform => (
                  <Badge key={platform} variant="outline" className="text-xs">
                    {platform}
                  </Badge>
                ))}
              </div>

              {/* Transcript Result */}
              {videoTranscript && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">提取的文案</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(videoTranscript);
                        toast.success('已复制');
                      }}
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      复制
                    </Button>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">
                      {videoTranscript}
                    </p>
                  </div>
                </div>
              )}

              {/* Use as inspiration */}
              {videoTranscript && selectedTopic && (
                <Button
                  className="w-full"
                  onClick={handleUseTranscript}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  用作「{selectedTopic.title}」的创作参考
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
