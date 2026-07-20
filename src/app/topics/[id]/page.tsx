"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Play,
  Copy,
  Download,
  BookOpen,
  Check,
  Loader2,
  Sparkles,
  Clock,
  Target,
  TrendingUp,
  Send,
  FileText,
  Video,
  Tv,
  Newspaper,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

// 渠道配置
const CHANNELS = [
  { id: "k-site", name: "K站", icon: Video, desc: "中长视频脚本", color: "bg-blue-500" },
  { id: "video-account", name: "视频号", icon: Send, desc: "竖屏短视频", color: "bg-green-500" },
  { id: "tv", name: "电视台", icon: Tv, desc: "行业新闻稿", color: "bg-purple-500" },
  { id: "douyin", name: "抖音", icon: MessageSquare, desc: "口播种草", color: "bg-pink-500" },
  { id: "internal", name: "内刊", icon: Newspaper, desc: "深度文章", color: "bg-amber-500" },
  { id: "wechat", name: "公众号", icon: FileText, desc: "图文排版", color: "bg-emerald-500" },
];

// 脚本风格预设
const STYLE_PRESETS = [
  { id: "口播达人", label: "口播达人", desc: "快节奏、强观点" },
  { id: "故事型", label: "故事型", desc: "悬念开头、情感共鸣" },
  { id: "测评专家", label: "测评专家", desc: "数据驱动、客观分析" },
  { id: "教程型", label: "教程型", desc: "步骤清晰、实操导向" },
  { id: "Vlog", label: "Vlog", desc: "轻松日常、真实感" },
];

interface Topic {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  source: string;
  createdAt: string;
}

export default function TopicWorkspacePage() {
  const router = useRouter();
  const params = useParams();
  const topicId = params.id as string;

  const [topic, setTopic] = useState<Topic | null>(null);
  const [loading, setLoading] = useState(true);

  // 脚本编辑
  const [script, setScript] = useState("");
  const [style, setStyle] = useState("口播达人");
  const [duration, setDuration] = useState("60秒");
  const [platform, setPlatform] = useState("抖音");
  const [generating, setGenerating] = useState(false);

  // 渠道适配
  const [activeChannel, setActiveChannel] = useState("douyin");
  const [channelScripts, setChannelScripts] = useState<Record<string, string>>({});

  useEffect(() => {
    loadTopic();
  }, [topicId]);

  const loadTopic = async () => {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }

      const res = await fetch(`/api/topics?id=${topicId}`, {
        headers: { "x-session": session.access_token },
      });
      const json = await res.json();
      if (json.success) {
        setTopic(json.data);
      }
    } catch (err) {
      console.error("加载选题失败:", err);
      toast.error("加载选题失败");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = useCallback(async () => {
    if (!topic) return;
    setGenerating(true);
    setScript("");

    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch("/api/generate-script", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session": session?.access_token || "",
        },
        body: JSON.stringify({
          topicTitle: topic.title,
          description: topic.description,
          style,
          duration,
          platform,
        }),
      });

      if (!res.ok) throw new Error("生成失败");

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                fullContent += data.content;
                setScript(fullContent);
              }
            } catch {
              // ignore parse errors
            }
          }
        }
      }

      // 保存到当前渠道
      setChannelScripts(prev => ({ ...prev, [activeChannel]: fullContent }));
      toast.success("脚本生成完成");
    } catch (err) {
      console.error("生成脚本失败:", err);
      toast.error("生成脚本失败，请重试");
    } finally {
      setGenerating(false);
    }
  }, [topic, style, duration, platform, activeChannel]);

  const handleCopy = () => {
    navigator.clipboard.writeText(script);
    toast.success("已复制到剪贴板");
  };

  const handleDownload = () => {
    const blob = new Blob([script], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${topic?.title || "脚本"}_${platform}_${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("已下载");
  };

  const handleSaveToKnowledge = async () => {
    if (!script || !topic) return;

    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch("/api/knowledge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session": session?.access_token || "",
        },
        body: JSON.stringify({
          action: "add",
          title: `${topic.title} - ${platform}脚本`,
          content: script,
          category: "script",
          tags: [platform, style, topic.category],
        }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success("已保存到知识库");
      } else {
        toast.error(json.message || "保存失败");
      }
    } catch (err) {
      console.error("保存失败:", err);
      toast.error("保存失败");
    }
  };

  const handleAdaptForChannel = (channelId: string) => {
    setActiveChannel(channelId);
    const channel = CHANNELS.find(c => c.id === channelId);
    if (channel) {
      setPlatform(channel.name);
      // 如果该渠道已有脚本，加载它
      if (channelScripts[channelId]) {
        setScript(channelScripts[channelId]);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-slate-500">选题不存在</p>
        <Button onClick={() => router.push("/topics")}>返回选题池</Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* 顶部导航 */}
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push("/topics")}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            返回
          </Button>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">{topic.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded">
                {topic.status}
              </span>
              <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                {topic.priority}
              </span>
              <span className="text-xs text-slate-500">{topic.category}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleSaveToKnowledge} disabled={!script}>
            <BookOpen className="w-4 h-4 mr-1" />
            存知识库
          </Button>
          <Button size="sm" onClick={handleGenerate} disabled={generating}>
            {generating ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-1" />
            )}
            {generating ? "生成中..." : "生成脚本"}
          </Button>
        </div>
      </header>

      {/* 主内容区 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧：渠道列表 */}
        <aside className="w-56 bg-white border-r border-slate-200 overflow-y-auto">
          <div className="p-4">
            <h3 className="text-xs font-medium text-slate-500 uppercase mb-3">渠道适配</h3>
            <div className="space-y-1">
              {CHANNELS.map((channel) => {
                const Icon = channel.icon;
                const isActive = activeChannel === channel.id;
                const hasScript = !!channelScripts[channel.id];
                return (
                  <button
                    key={channel.id}
                    onClick={() => handleAdaptForChannel(channel.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                      isActive
                        ? "bg-slate-100 text-slate-900"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg ${channel.color} flex items-center justify-center`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{channel.name}</span>
                        {hasScript && <Check className="w-3 h-3 text-green-500" />}
                      </div>
                      <p className="text-xs text-slate-500 truncate">{channel.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 风格预设 */}
          <div className="p-4 border-t border-slate-200">
            <h3 className="text-xs font-medium text-slate-500 uppercase mb-3">脚本风格</h3>
            <div className="space-y-1">
              {STYLE_PRESETS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setStyle(s.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    style === s.id
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <div className="font-medium">{s.label}</div>
                  <div className="text-xs text-slate-500">{s.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 参数 */}
          <div className="p-4 border-t border-slate-200">
            <h3 className="text-xs font-medium text-slate-500 uppercase mb-3">参数</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 flex items-center gap-1 mb-1">
                  <Clock className="w-3 h-3" /> 时长
                </label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg"
                >
                  <option>30秒</option>
                  <option>60秒</option>
                  <option>3分钟</option>
                  <option>5分钟</option>
                  <option>10分钟</option>
                </select>
              </div>
            </div>
          </div>
        </aside>

        {/* 右侧：编辑器 */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* 工具栏 */}
          <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-slate-200">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">
                当前渠道：<strong>{CHANNELS.find(c => c.id === activeChannel)?.name}</strong>
              </span>
              <span className="text-xs text-slate-400">|</span>
              <span className="text-xs text-slate-500">
                {script.length} 字
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleCopy} disabled={!script}>
                <Copy className="w-4 h-4 mr-1" />
                复制
              </Button>
              <Button variant="ghost" size="sm" onClick={handleDownload} disabled={!script}>
                <Download className="w-4 h-4 mr-1" />
                下载
              </Button>
            </div>
          </div>

          {/* 编辑区 */}
          <div className="flex-1 p-4 overflow-y-auto">
            {script ? (
              <Textarea
                value={script}
                onChange={(e) => setScript(e.target.value)}
                className="h-full min-h-[400px] font-mono text-sm resize-none border-slate-200 focus:border-blue-400"
                placeholder="开始编辑脚本..."
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                  <Sparkles className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-medium text-slate-700 mb-2">
                  为「{CHANNELS.find(c => c.id === activeChannel)?.name}」生成脚本
                </h3>
                <p className="text-sm text-slate-500 mb-4 max-w-md">
                  选择风格和时长，点击「生成脚本」按钮，AI 将根据选题内容自动生成适配该渠道的脚本大纲。
                </p>
                <div className="flex items-center gap-4 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Target className="w-3 h-3" /> {style}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {duration}
                  </span>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
