"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  created_at: string;
  updated_at: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

export default function TopicBoardPage() {
  const router = useRouter();
  const [supabase, setSupabase] = useState<ReturnType<typeof getSupabaseBrowserClient> | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Create form state
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPriority, setNewPriority] = useState("中");
  const [newDeadline, setNewDeadline] = useState("");

  // Initialize supabase client on client side only
  useEffect(() => {
    setSupabase(getSupabaseBrowserClient());
  }, []);

  // Check auth and load data
  useEffect(() => {
    if (!supabase) return;
    
    const init = async () => {
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

      // Load topics
      await loadTopics();
    };
    init();
  }, [supabase, router]);

  const loadTopics = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/topics");
      if (res.ok) {
        const data = await res.json();
        setTopics(data.data || []);
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
        await loadTopics();
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
        body: JSON.stringify({
          action: "claim",
        }),
      });

      if (res.ok) {
        await loadTopics();
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
        body: JSON.stringify({
          action: "advance",
          status: nextStatus,
        }),
      });

      if (res.ok) {
        await loadTopics();
      }
    } catch (err) {
      console.error("Failed to advance status:", err);
    }
  };

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    router.push("/login");
  };

  // Group topics by status
  const topicsByStatus = STATUS_FLOW.reduce((acc, status) => {
    acc[status.key] = topics.filter((t) => t.status === status.key);
    return acc;
  }, {} as Record<string, Topic[]>);

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
          <h1 className="text-xl font-bold">选题看板</h1>
          <Badge variant="outline">{topics.length} 个选题</Badge>
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

      {/* Main Content */}
      <main className="p-6">
        {/* Action Bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-1" />
              发布选题
            </Button>
          </div>
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
                      {/* Title */}
                      <h3 className="font-medium text-sm mb-2 line-clamp-2">{topic.title}</h3>

                      {/* Description */}
                      {topic.description && (
                        <p className="text-xs text-gray-500 mb-3 line-clamp-2">
                          {topic.description}
                        </p>
                      )}

                      {/* Meta */}
                      <div className="flex items-center gap-2 mb-3">
                        <Badge className={PRIORITY_COLORS[topic.priority as keyof typeof PRIORITY_COLORS]}>
                          {topic.priority}
                        </Badge>
                        {topic.assigned_to && (
                          <span className="text-xs text-gray-500">
                            {topic.assigned_to}
                          </span>
                        )}
                      </div>

                      {/* Progress */}
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

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {topic.status === "待认领" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full"
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
                              className="w-full"
                              onClick={() => handleAdvanceStatus(topic.id, topic.status)}
                            >
                              推进
                              <ArrowRight className="w-3 h-3 ml-1" />
                            </Button>
                          )}
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {(!topicsByStatus[status.key] || topicsByStatus[status.key].length === 0) && (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    暂无选题
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>发布新选题</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateTopic} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">标题</label>
                  <Input
                    placeholder="请输入选题标题"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">描述</label>
                  <Input
                    placeholder="请输入选题描述"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">优先级</label>
                    <select
                      className="w-full h-10 px-3 border rounded-md"
                      value={newPriority}
                      onChange={(e) => setNewPriority(e.target.value)}
                    >
                      <option value="高">高</option>
                      <option value="中">中</option>
                      <option value="低">低</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">截止日期</label>
                    <Input
                      type="date"
                      value={newDeadline}
                      onChange={(e) => setNewDeadline(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-4">
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
