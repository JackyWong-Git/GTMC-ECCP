"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  User,
  Clock,
  CheckCircle2,
  Circle,
  Loader2,
  ArrowRight,
  LogOut,
  Search,
  Globe,
  Database,
  TrendingUp,
  Flame,
  Sparkles,
  FileText,
} from "lucide-react";

// Topic status flow
const STATUS_FLOW = [
  { key: "待认领", color: "bg-gray-100 text-gray-700", icon: Circle },
  { key: "脚本制作", color: "bg-blue-100 text-blue-700", icon: Loader2 },
  { key: "拍摄中", color: "bg-amber-100 text-amber-700", icon: Loader2 },
  { key: "待审核", color: "bg-purple-100 text-purple-700", icon: Clock },
  { key: "已发布", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  { key: "已归档", color: "bg-slate-100 text-slate-500", icon: CheckCircle2 },
];

const PRIORITY_COLORS = {
  高: "bg-red-100 text-red-700",
  中: "bg-amber-100 text-amber-700",
  低: "bg-green-100 text-green-700",
};

// Preset keywords for external search
const PRESET_KEYWORDS = [
  { label: "汽车行业", keywords: ["新能源汽车", "智能驾驶", "汽车销量", "车企动态"] },
  { label: "微博热榜", keywords: ["微博热搜", "热门话题", "舆论焦点"] },
  { label: "行业报告", keywords: ["行业分析", "市场报告", "趋势预测"] },
  { label: "危机公关", keywords: ["品牌危机", "舆情监控", "公关策略"] },
];

interface InternalTopic {
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

interface ExternalTopic {
  title: string;
  snippet: string;
  source: string;
  url: string;
  heatScore?: number;
  category?: string;
  contentType?: string;
  trend?: string;
  angle?: string;
}

interface UserInfo {
  id: string;
  email: string;
  name: string;
  role: string;
}

export default function TopicBoardPage() {
  const router = useRouter();
  const [supabase, setSupabase] = useState<ReturnType<typeof getSupabaseBrowserClient> | null>(null);
  const [activeTab, setActiveTab] = useState<"internal" | "external">("internal");
  
  // Internal topics state
  const [internalTopics, setInternalTopics] = useState<InternalTopic[]>([]);
  const [currentUser, setCurrentUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPriority, setNewPriority] = useState("中");
  const [newDeadline, setNewDeadline] = useState("");

  // External topics state
  const [searchQuery, setSearchQuery] = useState("");
  const [externalTopics, setExternalTopics] = useState<ExternalTopic[]>([]);
  const [relatedKeywords, setRelatedKeywords] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  // Initialize supabase client on client side only
  useEffect(() => {
    try {
      setSupabase(getSupabaseBrowserClient());
    } catch (e) {
      console.error("[topics] Failed to initialize Supabase client:", e);
      setLoading(false);
    }
  }, []);

  // Check auth and load internal topics
  useEffect(() => {
    if (!supabase) return;
    
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push("/login");
          return;
        }

        // Get user info
        const userRes = await fetch("/api/auth/session", {
          headers: { "x-session": session.access_token },
        });
        if (userRes.ok) {
          const userData = await userRes.json();
          setCurrentUser(userData.data);
        }

        // Load internal topics
        await loadInternalTopics();
      } catch (err) {
        console.error("Init error:", err);
        setLoading(false);
      }
    };
    init();
  }, [supabase, router]);

  const loadInternalTopics = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/topics");
      if (res.ok) {
        const data = await res.json();
        setInternalTopics(data.data || []);
      }
    } catch (err) {
      console.error("Failed to load topics:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    try {
      const res = await fetch("/api/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          description: newDescription,
          priority: newPriority,
          deadline: newDeadline || null,
        }),
      });

      if (res.ok) {
        setShowCreateModal(false);
        setNewTitle("");
        setNewDescription("");
        setNewPriority("中");
        setNewDeadline("");
        await loadInternalTopics();
      }
    } catch (err) {
      console.error("Failed to create topic:", err);
    }
  };

  const handleClaimTopic = async (topicId: string) => {
    if (!currentUser) return;

    try {
      const res = await fetch(`/api/topics?id=${topicId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "claim" }),
      });

      if (res.ok) {
        await loadInternalTopics();
      }
    } catch (err) {
      console.error("Failed to claim topic:", err);
    }
  };

  const handleAdvanceStatus = async (topicId: string, currentStatus: string) => {
    const currentIndex = STATUS_FLOW.findIndex((s) => s.key === currentStatus);
    if (currentIndex === -1 || currentIndex >= STATUS_FLOW.length - 1) return;

    const nextStatus = STATUS_FLOW[currentIndex + 1].key;

    try {
      const res = await fetch(`/api/topics?id=${topicId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "advance", status: nextStatus }),
      });

      if (res.ok) {
        await loadInternalTopics();
      }
    } catch (err) {
      console.error("Failed to advance status:", err);
    }
  };

  // External search
  const handleExternalSearch = async (query?: string) => {
    const searchTerm = query || searchQuery.trim();
    if (!searchTerm) return;

    setIsSearching(true);
    setSearchError("");
    setExternalTopics([]);
    setRelatedKeywords([]);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      const res = await fetch("/api/douyin-trending", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: searchTerm,
          count: 20,
          searchType: "topics",
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`搜索失败: ${res.status}`);
      }

      const data = await res.json();
      if (data.success && data.data?.topics) {
        setExternalTopics(data.data.topics);
        setRelatedKeywords(data.data.relatedKeywords || []);
      } else {
        setSearchError("未找到相关选题");
      }
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === "AbortError") {
          setSearchError("搜索超时，请稍后重试");
        } else {
          setSearchError(err.message);
        }
      } else {
        setSearchError("搜索失败，请稍后重试");
      }
    } finally {
      setIsSearching(false);
    }
  };

  // Import and claim external topic to internal
  const handleClaimExternalTopic = async (topic: ExternalTopic) => {
    if (!currentUser) {
      router.push("/login");
      return;
    }

    try {
      // First, create the topic
      const createRes = await fetch("/api/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: topic.title,
          description: topic.snippet,
          priority: "中",
          source: topic.source,
          sourceUrl: topic.url,
        }),
      });

      if (createRes.ok) {
        const newTopic = await createRes.json();
        // Then, claim the topic
        if (newTopic.id) {
          await fetch(`/api/topics?id=${newTopic.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "claim" }),
          });
        }
        // Switch to internal tab and reload
        setActiveTab("internal");
        await loadInternalTopics();
      }
    } catch (err) {
      console.error("Failed to claim external topic:", err);
    }
  };

  // Save external topic to knowledge base
  const handleSaveToKnowledge = async (topic: ExternalTopic) => {
    try {
      const res = await fetch("/api/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: topic.title,
          content: topic.snippet || topic.title,
          source: topic.source,
          sourceUrl: topic.url,
          tags: ["热榜", topic.category || "未分类"],
        }),
      });

      if (res.ok) {
        alert("已存入知识库");
      } else {
        const err = await res.json();
        alert(`保存失败: ${err.error || "未知错误"}`);
      }
    } catch (err) {
      console.error("Failed to save to knowledge:", err);
      alert("保存失败，请重试");
    }
  };

  // Save internal topic to knowledge base
  const handleSaveTopicToKnowledge = async (topic: InternalTopic) => {
    try {
      const res = await fetch("/api/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: topic.title,
          content: topic.description || topic.title,
          source: "选题池",
          tags: ["选题", topic.priority || "中"],
        }),
      });

      if (res.ok) {
        alert("已存入知识库");
      } else {
        const err = await res.json();
        alert(`保存失败: ${err.error || "未知错误"}`);
      }
    } catch (err) {
      console.error("Failed to save to knowledge:", err);
      alert("保存失败，请重试");
    }
  };

  // Navigate to script workshop with topic
  const handleGenerateScript = (topic: InternalTopic) => {
    router.push(`/scripts?topic=${encodeURIComponent(topic.title)}`);
  };

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    router.push("/login");
  };

  // Group internal topics by status
  const topicsByStatus = STATUS_FLOW.reduce((acc, status) => {
    acc[status.key] = internalTopics.filter((t) => t.status === status.key);
    return acc;
  }, {} as Record<string, InternalTopic[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">选题中心</h1>
          <Badge variant="outline">{internalTopics.length} 个内部选题</Badge>
        </div>
        <div className="flex items-center gap-4">
          {currentUser && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-blue-600" />
              </div>
              <span className="text-sm font-medium">{currentUser.name || currentUser.email}</span>
              <Badge variant="outline" className="ml-1">
                {currentUser.role}
              </Badge>
            </div>
          )}
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-1" />
            退出
          </Button>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="bg-white border-b px-6">
        <div className="flex gap-6">
          <button
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === "internal"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("internal")}
          >
            <Database className="w-4 h-4 inline mr-2" />
            内部选题
          </button>
          <button
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === "external"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("external")}
          >
            <Globe className="w-4 h-4 inline mr-2" />
            外部选题检索
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="p-6">
        {activeTab === "internal" ? (
          <>
            {/* Action Bar */}
            <div className="flex items-center justify-between mb-6">
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="w-4 h-4 mr-1" />
                发布选题
              </Button>
            </div>

            {/* Kanban Board */}
            <div className="flex gap-4 overflow-x-auto pb-4">
              {STATUS_FLOW.map((status) => (
                <div key={status.key} className="flex-shrink-0 w-72">
                  {/* Column Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <status.icon className="w-4 h-4" />
                      <span className="font-medium">{status.key}</span>
                    </div>
                    <Badge variant="secondary">{topicsByStatus[status.key]?.length || 0}</Badge>
                  </div>

                  {/* Cards */}
                  <div className="space-y-3">
                    {topicsByStatus[status.key]?.map((topic) => (
                      <Card key={topic.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <h3 className="font-medium text-sm mb-2 line-clamp-2">{topic.title}</h3>
                          {topic.description && (
                            <p className="text-xs text-gray-500 mb-3 line-clamp-2">
                              {topic.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mb-3">
                            <Badge className={PRIORITY_COLORS[topic.priority as keyof typeof PRIORITY_COLORS]}>
                              {topic.priority}
                            </Badge>
                            {topic.source && topic.source !== "手动创建" && (
                              <Badge variant="outline" className="text-xs">
                                <Globe className="w-3 h-3 mr-1" />
                                {topic.source}
                              </Badge>
                            )}
                            {topic.assigned_to && (
                              <span className="text-xs text-gray-500">{topic.assigned_to}</span>
                            )}
                          </div>
                          {topic.progress > 0 && (
                            <div className="mb-3">
                              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                                <span>进度</span>
                                <span>{topic.progress}%</span>
                              </div>
                              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-500 transition-all"
                                  style={{ width: `${topic.progress}%` }}
                                />
                              </div>
                            </div>
                          )}
                          <div className="flex items-center gap-2 flex-wrap">
                            {topic.status === "待认领" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleClaimTopic(topic.id)}
                              >
                                认领
                              </Button>
                            )}
                            {topic.status !== "待认领" &&
                              topic.status !== "已发布" &&
                              topic.status !== "已归档" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleAdvanceStatus(topic.id, topic.status)}
                                >
                                  推进
                                  <ArrowRight className="w-3 h-3 ml-1" />
                                </Button>
                              )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleGenerateScript(topic)}
                            >
                              <FileText className="w-3 h-3 mr-1" />
                              生成脚本
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleSaveTopicToKnowledge(topic)}
                            >
                              <Database className="w-3 h-3 mr-1" />
                              知识库
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                    {(!topicsByStatus[status.key] || topicsByStatus[status.key].length === 0) && (
                      <div className="text-center py-8 text-gray-400 text-sm">暂无选题</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            {/* External Search */}
            <div className="max-w-4xl mx-auto">
              {/* Search Box */}
              <Card className="mb-6">
                <CardContent className="p-6">
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        placeholder="输入关键词搜索外部选题（如：新能源汽车、智能驾驶）"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleExternalSearch()}
                        className="pl-10 h-12"
                      />
                    </div>
                    <Button
                      onClick={() => handleExternalSearch()}
                      disabled={isSearching || !searchQuery.trim()}
                      className="h-12 px-6"
                    >
                      {isSearching ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          搜索中...
                        </>
                      ) : (
                        <>
                          <Search className="w-4 h-4 mr-2" />
                          搜索
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Preset Keywords */}
                  <div className="mt-4">
                    <p className="text-sm text-gray-500 mb-2">快速搜索：</p>
                    <div className="flex flex-wrap gap-2">
                      {PRESET_KEYWORDS.map((group) => (
                        <div key={group.label} className="flex items-center gap-1">
                          <span className="text-xs text-gray-400">{group.label}:</span>
                          {group.keywords.map((kw) => (
                            <button
                              key={kw}
                              onClick={() => {
                                setSearchQuery(kw);
                                handleExternalSearch(kw);
                              }}
                              className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                            >
                              {kw}
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Search Results */}
              {searchError && (
                <Card className="mb-6 border-red-200 bg-red-50">
                  <CardContent className="p-4">
                    <p className="text-red-600 text-sm">{searchError}</p>
                  </CardContent>
                </Card>
              )}

              {externalTopics.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-blue-600" />
                      搜索结果
                    </h2>
                    <Badge variant="outline">{externalTopics.length} 条</Badge>
                  </div>

                  {/* Related Keywords */}
                  {relatedKeywords.length > 0 && (
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                      <p className="text-xs font-medium text-blue-700 mb-2">相关关键词</p>
                      <div className="flex flex-wrap gap-2">
                        {relatedKeywords.map((keyword, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              setSearchQuery(keyword);
                              handleExternalSearch(keyword);
                            }}
                            className="px-2 py-1 bg-white border border-blue-200 rounded text-xs text-blue-600 hover:bg-blue-100 transition-colors"
                          >
                            {keyword}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {externalTopics.map((topic, idx) => (
                    <Card key={idx} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              {topic.heatScore && topic.heatScore > 8000 && (
                                <Flame className="w-4 h-4 text-orange-500" />
                              )}
                              <h3 className="font-medium text-sm line-clamp-1">{topic.title}</h3>
                            </div>
                            <p className="text-xs text-gray-500 line-clamp-2 mb-2">
                              {topic.snippet}
                            </p>
                            {/* Content Type & Trend */}
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              {topic.contentType && (
                                <Badge variant="secondary" className="text-xs">
                                  {topic.contentType}
                                </Badge>
                              )}
                              {topic.trend && (
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs ${
                                    topic.trend === "上升" ? "text-green-600 border-green-200" :
                                    topic.trend === "下降" ? "text-red-600 border-red-200" :
                                    "text-gray-600"
                                  }`}
                                >
                                  {topic.trend === "上升" ? "↑" : topic.trend === "下降" ? "↓" : "→"} {topic.trend}
                                </Badge>
                              )}
                              {topic.angle && (
                                <Badge variant="outline" className="text-xs text-purple-600 border-purple-200">
                                  {topic.angle}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-gray-400">
                              <span>{topic.source}</span>
                              {topic.heatScore && (
                                <span className="flex items-center gap-1">
                                  <Sparkles className="w-3 h-3" />
                                  热度 {topic.heatScore}
                                </span>
                              )}
                              {topic.category && <span>{topic.category}</span>}
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(topic.url, "_blank")}
                            >
                              查看原文
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSaveToKnowledge(topic)}
                            >
                              <Database className="w-3 h-3 mr-1" />
                              存知识库
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleClaimExternalTopic(topic)}
                            >
                              <User className="w-3 h-3 mr-1" />
                              认领
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {!isSearching && externalTopics.length === 0 && !searchError && (
                <div className="text-center py-12 text-gray-400">
                  <Globe className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>输入关键词搜索外部选题</p>
                  <p className="text-sm mt-1">支持搜索抖音、微博、行业报告等平台的热门内容</p>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Create Topic Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-4">发布新选题</h2>
              <form onSubmit={handleCreateTopic} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">标题</label>
                  <Input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="输入选题标题"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">描述</label>
                  <textarea
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="输入选题描述（可选）"
                    className="w-full h-24 px-3 py-2 border rounded-md resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">优先级</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="高">高</option>
                    <option value="中">中</option>
                    <option value="低">低</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">截止日期</label>
                  <Input
                    type="date"
                    value={newDeadline}
                    onChange={(e) => setNewDeadline(e.target.value)}
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowCreateModal(false)}
                  >
                    取消
                  </Button>
                  <Button type="submit" className="flex-1">
                    发布
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
