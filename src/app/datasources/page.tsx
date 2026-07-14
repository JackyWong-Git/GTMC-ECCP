"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Database,
  Video,
  MessageSquare,
  Download,
  Radio,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Settings,
  ExternalLink,
  Play,
  Heart,
  Share2,
  Eye,
  TrendingUp,
  Zap,
  Globe,
  Hash,
  Users,
  BarChart3,
  Search,
  Plus,
  Trash2,
  Copy,
  FileText,
  Sparkles,
} from "lucide-react";

// 数据源类型
interface DataSource {
  id: string;
  name: string;
  type: "douyin" | "weibo" | "toutiao" | "bilibili" | "xiaohongshu";
  icon: string;
  color: string;
  status: "connected" | "disconnected" | "syncing" | "error";
  lastSync?: string;
  stats?: {
    videos?: number;
    followers?: number;
    totalViews?: number;
    totalLikes?: number;
  };
  config?: Record<string, string>;
}

// 抖音视频数据
interface DouyinVideo {
  id: string;
  title: string;
  cover: string;
  duration: number;
  playCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  createTime: string;
  author: string;
}

// 微博热搜数据
interface WeiboHotTopic {
  rank: number;
  title: string;
  hotValue: number;
  category: string;
  url: string;
  isHot: boolean;
  isNew: boolean;
}

// 直播数据
interface LiveData {
  roomId: string;
  title: string;
  viewerCount: number;
  likeCount: number;
  startTime: string;
  status: "live" | "ended" | "scheduled";
}

// 弹幕数据
interface Barrage {
  id: string;
  content: string;
  timestamp: number;
  userId: string;
  userName: string;
  type: "normal" | "gift" | "enter";
}

export default function DataSourcesPage() {
  // 数据源列表
  const [dataSources, setDataSources] = useState<DataSource[]>([
    {
      id: "douyin",
      name: "抖音",
      type: "douyin",
      icon: "🎵",
      color: "bg-pink-50 border-pink-200",
      status: "disconnected",
    },
    {
      id: "weibo",
      name: "微博",
      type: "weibo",
      icon: "🔥",
      color: "bg-red-50 border-red-200",
      status: "disconnected",
    },
    {
      id: "toutiao",
      name: "今日头条",
      type: "toutiao",
      icon: "📰",
      color: "bg-blue-50 border-blue-200",
      status: "disconnected",
    },
    {
      id: "bilibili",
      name: "哔哩哔哩",
      type: "bilibili",
      icon: "📺",
      color: "bg-cyan-50 border-cyan-200",
      status: "disconnected",
    },
    {
      id: "xiaohongshu",
      name: "小红书",
      type: "xiaohongshu",
      icon: "📕",
      color: "bg-rose-50 border-rose-200",
      status: "disconnected",
    },
  ]);

  // 活跃标签
  const [activeTab, setActiveTab] = useState<string>("overview");
  
  // 抖音相关状态
  const [douyinVideos, setDouyinVideos] = useState<DouyinVideo[]>([]);
  const [douyinLoading, setDouyinLoading] = useState(false);
  
  // 微博相关状态
  const [weiboTopics, setWeiboTopics] = useState<WeiboHotTopic[]>([]);
  const [weiboLoading, setWeiboLoading] = useState(false);
  
  // 直播相关状态
  const [liveData, setLiveData] = useState<LiveData | null>(null);
  const [barrages, setBarrages] = useState<Barrage[]>([]);
  const [liveRoomId, setLiveRoomId] = useState("");
  
  // 视频下载
  const [downloadUrl, setDownloadUrl] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [downloadResult, setDownloadResult] = useState<{ success: boolean; url?: string; error?: string } | null>(null);

  // 检查抖音连接状态
  useEffect(() => {
    fetch("/api/douyin/status")
      .then((res) => res.json())
      .then((data) => {
        if (data.connected) {
          setDataSources((prev) =>
            prev.map((ds) =>
              ds.id === "douyin"
                ? { ...ds, status: "connected", stats: data.stats }
                : ds
            )
          );
        }
      })
      .catch(() => {});
  }, []);

  // 同步抖音数据
  const handleSyncDouyin = useCallback(async () => {
    setDouyinLoading(true);
    try {
      const res = await fetch("/api/douyin/sync");
      const data = await res.json();
      if (data.success) {
        setDouyinVideos(data.data.videos || []);
        setDataSources((prev) =>
          prev.map((ds) =>
            ds.id === "douyin"
              ? { ...ds, status: "connected", lastSync: new Date().toISOString() }
              : ds
          )
        );
      }
    } catch (err) {
      console.error("Sync failed:", err);
    } finally {
      setDouyinLoading(false);
    }
  }, []);

  // 获取微博热搜
  const handleFetchWeibo = useCallback(async () => {
    setWeiboLoading(true);
    try {
      const res = await fetch("/api/weibo-trending");
      const data = await res.json();
      if (data.success) {
        setWeiboTopics(data.data.topics || []);
        setDataSources((prev) =>
          prev.map((ds) =>
            ds.id === "weibo"
              ? { ...ds, status: "connected", lastSync: new Date().toISOString() }
              : ds
          )
        );
      }
    } catch (err) {
      console.error("Fetch weibo failed:", err);
    } finally {
      setWeiboLoading(false);
    }
  }, []);

  // 获取直播数据
  const handleFetchLive = useCallback(async () => {
    if (!liveRoomId) return;
    try {
      const res = await fetch(`/api/douyin-live?roomId=${liveRoomId}`);
      const data = await res.json();
      if (data.success) {
        setLiveData(data.data.live);
        setBarrages(data.data.barrages || []);
      }
    } catch (err) {
      console.error("Fetch live failed:", err);
    }
  }, [liveRoomId]);

  // 下载视频
  const handleDownloadVideo = useCallback(async () => {
    if (!downloadUrl) return;
    setDownloading(true);
    setDownloadResult(null);
    try {
      const res = await fetch("/api/video-download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: downloadUrl }),
      });
      const data = await res.json();
      setDownloadResult(data);
    } catch (err) {
      setDownloadResult({ success: false, error: "下载失败" });
    } finally {
      setDownloading(false);
    }
  }, [downloadUrl]);

  // 格式化数字
  const formatNumber = (num: number): string => {
    if (num >= 100000000) return (num / 100000000).toFixed(1) + "亿";
    if (num >= 10000) return (num / 10000).toFixed(1) + "万";
    return num.toLocaleString();
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">数据源管理</h1>
            <p className="mt-1 text-sm text-slate-500">
              连接多个平台，统一管理数据采集与分析
            </p>
          </div>
          <Button onClick={() => setActiveTab("settings")}>
            <Settings className="mr-2 h-4 w-4" />
            配置管理
          </Button>
        </div>

        {/* 标签导航 */}
        <div className="flex gap-2 border-b border-slate-200 pb-4">
          {[
            { id: "overview", label: "总览", icon: Database },
            { id: "douyin", label: "抖音", icon: Video },
            { id: "weibo", label: "微博", icon: TrendingUp },
            { id: "live", label: "直播监控", icon: Radio },
            { id: "download", label: "视频下载", icon: Download },
            { id: "settings", label: "设置", icon: Settings },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* 总览视图 */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* 数据源卡片 */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {dataSources.map((source) => (
                <Card key={source.id} className={source.color}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{source.icon}</span>
                        <div>
                          <CardTitle className="text-lg">{source.name}</CardTitle>
                          <CardDescription className="text-xs">
                            {source.status === "connected" && "已连接"}
                            {source.status === "disconnected" && "未连接"}
                            {source.status === "syncing" && "同步中..."}
                            {source.status === "error" && "连接错误"}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge
                        variant={source.status === "connected" ? "default" : "secondary"}
                        className={
                          source.status === "connected"
                            ? "bg-green-100 text-green-700"
                            : ""
                        }
                      >
                        {source.status === "connected" && <CheckCircle2 className="mr-1 h-3 w-3" />}
                        {source.status === "error" && <AlertCircle className="mr-1 h-3 w-3" />}
                        {source.status === "connected" ? "在线" : "离线"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {source.stats && (
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-slate-500">视频数</p>
                          <p className="font-semibold">{source.stats.videos || 0}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">粉丝数</p>
                          <p className="font-semibold">{formatNumber(source.stats.followers || 0)}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">总播放</p>
                          <p className="font-semibold">{formatNumber(source.stats.totalViews || 0)}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">总点赞</p>
                          <p className="font-semibold">{formatNumber(source.stats.totalLikes || 0)}</p>
                        </div>
                      </div>
                    )}
                    {source.lastSync && (
                      <p className="mt-2 text-xs text-slate-400">
                        最后同步: {new Date(source.lastSync).toLocaleString()}
                      </p>
                    )}
                    <div className="mt-4 flex gap-2">
                      {source.id === "douyin" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setActiveTab("douyin");
                            handleSyncDouyin();
                          }}
                          disabled={douyinLoading}
                        >
                          {douyinLoading ? (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          ) : (
                            <RefreshCw className="mr-1 h-3 w-3" />
                          )}
                          同步
                        </Button>
                      )}
                      {source.id === "weibo" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setActiveTab("weibo");
                            handleFetchWeibo();
                          }}
                          disabled={weiboLoading}
                        >
                          {weiboLoading ? (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          ) : (
                            <RefreshCw className="mr-1 h-3 w-3" />
                          )}
                          获取热搜
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setActiveTab(source.id)}
                      >
                        详情
                        <ExternalLink className="ml-1 h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* 快速操作 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-amber-500" />
                  快速操作
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  <Button
                    variant="outline"
                    className="h-20 flex-col items-center justify-center gap-2"
                    onClick={() => setActiveTab("douyin")}
                  >
                    <Video className="h-5 w-5 text-pink-500" />
                    <span className="text-xs">抖音视频</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-20 flex-col items-center justify-center gap-2"
                    onClick={() => setActiveTab("weibo")}
                  >
                    <TrendingUp className="h-5 w-5 text-red-500" />
                    <span className="text-xs">微博热搜</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-20 flex-col items-center justify-center gap-2"
                    onClick={() => setActiveTab("live")}
                  >
                    <Radio className="h-5 w-5 text-green-500" />
                    <span className="text-xs">直播监控</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-20 flex-col items-center justify-center gap-2"
                    onClick={() => setActiveTab("download")}
                  >
                    <Download className="h-5 w-5 text-blue-500" />
                    <span className="text-xs">视频下载</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 抖音详情 */}
        {activeTab === "douyin" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Video className="h-5 w-5 text-pink-500" />
                    抖音视频数据
                  </CardTitle>
                  <Button onClick={handleSyncDouyin} disabled={douyinLoading}>
                    {douyinLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    同步数据
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {douyinVideos.length === 0 ? (
                  <div className="flex h-40 items-center justify-center text-slate-400">
                    <p>暂无数据，点击同步按钮获取抖音视频数据</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {douyinVideos.map((video) => (
                      <div
                        key={video.id}
                        className="flex gap-4 rounded-lg border border-slate-200 p-4"
                      >
                        <div className="h-24 w-32 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                          {video.cover ? (
                            <img
                              src={video.cover}
                              alt={video.title}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center">
                              <Video className="h-8 w-8 text-slate-300" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium text-slate-900 line-clamp-2">
                            {video.title}
                          </h3>
                          <p className="mt-1 text-xs text-slate-500">
                            {video.author} · {video.createTime}
                          </p>
                          <div className="mt-2 flex gap-4 text-sm text-slate-600">
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              {formatNumber(video.playCount)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Heart className="h-3 w-3" />
                              {formatNumber(video.likeCount)}
                            </span>
                            <span className="flex items-center gap-1">
                              <MessageSquare className="h-3 w-3" />
                              {formatNumber(video.commentCount)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Share2 className="h-3 w-3" />
                              {formatNumber(video.shareCount)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* 微博热搜 */}
        {activeTab === "weibo" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-red-500" />
                    微博热搜榜
                  </CardTitle>
                  <Button onClick={handleFetchWeibo} disabled={weiboLoading}>
                    {weiboLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    获取热搜
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {weiboTopics.length === 0 ? (
                  <div className="flex h-40 items-center justify-center text-slate-400">
                    <p>暂无数据，点击获取热搜按钮获取微博热搜数据</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {weiboTopics.map((topic) => (
                      <div
                        key={topic.rank}
                        className="flex items-center gap-4 rounded-lg border border-slate-200 p-3 hover:bg-slate-50"
                      >
                        <span
                          className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                            topic.rank <= 3
                              ? "bg-red-100 text-red-600"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {topic.rank}
                        </span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-900">
                              {topic.title}
                            </span>
                            {topic.isHot && (
                              <Badge variant="destructive" className="text-xs">
                                热
                              </Badge>
                            )}
                            {topic.isNew && (
                              <Badge className="bg-blue-100 text-blue-700 text-xs">
                                新
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-slate-500">
                            {topic.category} · 热度 {formatNumber(topic.hotValue)}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => window.open(topic.url, "_blank")}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* 直播监控 */}
        {activeTab === "live" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Radio className="h-5 w-5 text-green-500" />
                  直播间监控
                </CardTitle>
                <CardDescription>
                  输入直播间 ID 实时监控直播数据和弹幕
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    placeholder="输入抖音直播间 ID"
                    value={liveRoomId}
                    onChange={(e) => setLiveRoomId(e.target.value)}
                  />
                  <Button onClick={handleFetchLive}>
                    <Search className="mr-2 h-4 w-4" />
                    开始监控
                  </Button>
                </div>

                {liveData && (
                  <div className="mt-6 space-y-4">
                    <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 animate-pulse rounded-full bg-red-500" />
                        <span className="font-medium text-green-800">
                          {liveData.status === "live" ? "直播中" : "已结束"}
                        </span>
                      </div>
                      <h3 className="mt-2 text-lg font-semibold">{liveData.title}</h3>
                      <div className="mt-2 flex gap-4 text-sm text-green-700">
                        <span>观看: {formatNumber(liveData.viewerCount)}</span>
                        <span>点赞: {formatNumber(liveData.likeCount)}</span>
                      </div>
                    </div>

                    <div>
                      <h4 className="mb-2 font-medium">实时弹幕</h4>
                      <div className="max-h-60 overflow-y-auto rounded-lg border border-slate-200 p-3">
                        {barrages.length === 0 ? (
                          <p className="text-center text-sm text-slate-400">
                            暂无弹幕数据
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {barrages.map((barrage) => (
                              <div
                                key={barrage.id}
                                className="flex items-start gap-2 text-sm"
                              >
                                <span className="font-medium text-slate-600">
                                  {barrage.userName}:
                                </span>
                                <span className="text-slate-800">
                                  {barrage.content}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* 视频下载 */}
        {activeTab === "download" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5 text-blue-500" />
                  视频下载
                </CardTitle>
                <CardDescription>
                  支持抖音、微博、B站等平台视频下载
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    placeholder="粘贴视频分享链接"
                    value={downloadUrl}
                    onChange={(e) => setDownloadUrl(e.target.value)}
                  />
                  <Button onClick={handleDownloadVideo} disabled={downloading}>
                    {downloading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    下载
                  </Button>
                </div>

                {downloadResult && (
                  <div
                    className={`mt-4 rounded-lg p-4 ${
                      downloadResult.success
                        ? "bg-green-50 border border-green-200"
                        : "bg-red-50 border border-red-200"
                    }`}
                  >
                    {downloadResult.success ? (
                      <div className="flex items-center gap-2 text-green-700">
                        <CheckCircle2 className="h-5 w-5" />
                        <span>解析成功</span>
                        {downloadResult.url && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(downloadResult.url, "_blank")}
                          >
                            打开下载链接
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-red-700">
                        <AlertCircle className="h-5 w-5" />
                        <span>{downloadResult.error || "下载失败"}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-6">
                  <h4 className="mb-2 text-sm font-medium text-slate-700">
                    支持的平台
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {["抖音", "微博", "B站", "快手", "小红书", "今日头条"].map(
                      (platform) => (
                        <Badge key={platform} variant="outline">
                          {platform}
                        </Badge>
                      )
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 设置 */}
        {activeTab === "settings" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>数据源配置</CardTitle>
                <CardDescription>
                  配置各平台的 API 密钥和连接参数
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="rounded-lg border border-slate-200 p-4">
                    <h3 className="flex items-center gap-2 font-medium">
                      <span className="text-xl">🎵</span>
                      抖音开放平台
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      连接抖音开放平台获取视频数据、直播数据
                    </p>
                    <Button
                      variant="outline"
                      className="mt-3"
                      onClick={() => (window.location.href = "/settings")}
                    >
                      前往设置
                    </Button>
                  </div>

                  <div className="rounded-lg border border-slate-200 p-4">
                    <h3 className="flex items-center gap-2 font-medium">
                      <span className="text-xl">🔥</span>
                      微博 API
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      获取微博热搜、用户数据
                    </p>
                    <Button
                      variant="outline"
                      className="mt-3"
                      onClick={() => (window.location.href = "/settings")}
                    >
                      前往设置
                    </Button>
                  </div>

                  <div className="rounded-lg border border-slate-200 p-4">
                    <h3 className="flex items-center gap-2 font-medium">
                      <span className="text-xl">🤖</span>
                      Dify 工作流
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      连接 Dify AI 工作流实现自动化处理
                    </p>
                    <Button
                      variant="outline"
                      className="mt-3"
                      onClick={() => (window.location.href = "/settings")}
                    >
                      前往设置
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
