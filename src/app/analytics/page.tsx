"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  TrendingDown,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Download,
  Upload,
  RefreshCw,
  FileText,
  Play,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";

// 平台数据类型
interface PlatformData {
  platform: string;
  icon: string;
  color: string;
  connected: boolean;
  summary: {
    totalViews: number;
    totalLikes: number;
    totalComments: number;
    totalShares: number;
    videoCount: number;
  } | null;
  videos: Array<{
    id: string;
    title: string;
    platform: string;
    publishDate: string;
    views: number;
    likes: number;
    comments: number;
    shares: number;
  }>;
  lastSynced: string | null;
}

// 初始平台状态
const initialPlatforms: PlatformData[] = [
  {
    platform: "抖音",
    icon: "🎵",
    color: "bg-pink-50 border-pink-200",
    connected: false,
    summary: null,
    videos: [],
    lastSynced: null,
  },
  {
    platform: "视频号",
    icon: "📺",
    color: "bg-green-50 border-green-200",
    connected: false,
    summary: null,
    videos: [],
    lastSynced: null,
  },
  {
    platform: "KILAKILA",
    icon: "✨",
    color: "bg-purple-50 border-purple-200",
    connected: false,
    summary: null,
    videos: [],
    lastSynced: null,
  },
];

export default function AnalyticsPage() {
  const [platforms, setPlatforms] = useState<PlatformData[]>(initialPlatforms);
  const [douyinStatus, setDouyinStatus] = useState<{
    connected: boolean;
    user: { nickname: string; avatar: string } | null;
  } | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importPlatform, setImportPlatform] = useState("");
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState("");

  // 检查抖音登录状态
  useEffect(() => {
    fetch("/api/douyin/status")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setDouyinStatus(data.data);
          if (data.data.connected) {
            setPlatforms((prev) =>
              prev.map((p) =>
                p.platform === "抖音" ? { ...p, connected: true } : p
              )
            );
          }
        }
      })
      .catch(() => {});
  }, []);

  // 同步抖音数据
  const syncDouyin = async () => {
    setSyncing("抖音");
    try {
      const res = await fetch("/api/douyin/sync");
      const data = await res.json();

      if (data.success) {
        setPlatforms((prev) =>
          prev.map((p) =>
            p.platform === "抖音"
              ? {
                  ...p,
                  connected: true,
                  summary: data.data.summary,
                  videos: data.data.videos,
                  lastSynced: data.data.syncedAt,
                }
              : p
          )
        );
      } else {
        alert(data.error || "同步失败");
      }
    } catch {
      alert("同步失败，请检查网络连接");
    } finally {
      setSyncing(null);
    }
  };

  // 导入数据（视频号/KILAKILA）
  const handleImport = async () => {
    setImportError("");

    if (!importText.trim()) {
      setImportError("请输入数据");
      return;
    }

    try {
      const res = await fetch("/api/import-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: importText, format: "json" }),
      });
      const data = await res.json();

      if (data.success) {
        const videos = data.data.rows.map(
          (row: Record<string, unknown>, idx: number) => ({
            id: `import-${Date.now()}-${idx}`,
            title: String(row.title || row["标题"] || "无标题"),
            platform: importPlatform,
            publishDate: String(
              row.publishDate || row["发布日期"] || new Date().toISOString().split("T")[0]
            ),
            views: Number(row.views || row["播放量"] || 0),
            likes: Number(row.likes || row["点赞"] || 0),
            comments: Number(row.comments || row["评论"] || 0),
            shares: Number(row.shares || row["分享"] || 0),
          })
        );

        const totalViews = videos.reduce(
          (sum: number, v: { views: number }) => sum + v.views,
          0
        );
        const totalLikes = videos.reduce(
          (sum: number, v: { likes: number }) => sum + v.likes,
          0
        );
        const totalComments = videos.reduce(
          (sum: number, v: { comments: number }) => sum + v.comments,
          0
        );
        const totalShares = videos.reduce(
          (sum: number, v: { shares: number }) => sum + v.shares,
          0
        );

        setPlatforms((prev) =>
          prev.map((p) =>
            p.platform === importPlatform
              ? {
                  ...p,
                  connected: true,
                  summary: {
                    totalViews,
                    totalLikes,
                    totalComments,
                    totalShares,
                    videoCount: videos.length,
                  },
                  videos,
                  lastSynced: new Date().toISOString(),
                }
              : p
          )
        );

        setImportModalOpen(false);
        setImportText("");
      } else {
        setImportError(data.error || "导入失败");
      }
    } catch {
      setImportError("导入失败，请检查数据格式");
    }
  };

  // 计算全平台汇总
  const allVideos = platforms.flatMap((p) => p.videos);
  const totalViews = platforms.reduce(
    (sum, p) => sum + (p.summary?.totalViews || 0),
    0
  );
  const totalLikes = platforms.reduce(
    (sum, p) => sum + (p.summary?.totalLikes || 0),
    0
  );
  const totalComments = platforms.reduce(
    (sum, p) => sum + (p.summary?.totalComments || 0),
    0
  );
  const totalShares = platforms.reduce(
    (sum, p) => sum + (p.summary?.totalShares || 0),
    0
  );
  const totalVideos = platforms.reduce(
    (sum, p) => sum + (p.summary?.videoCount || 0),
    0
  );
  const engagementRate =
    totalViews > 0
      ? (((totalLikes + totalComments + totalShares) / totalViews) * 100).toFixed(1)
      : "0";

  // 热门视频排行（跨平台）
  const topVideos = [...allVideos]
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);

  const formatNumber = (num: number): string => {
    if (num >= 10000) {
      return (num / 10000).toFixed(1) + "万";
    }
    return num.toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">数据看板</h1>
          <p className="text-sm text-slate-500 mt-1">
            多平台数据汇总 · 抖音 / 视频号 / KILAKILA
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setImportPlatform("视频号");
              setImportModalOpen(true);
            }}
          >
            <Upload className="w-4 h-4 mr-1" />
            导入视频号数据
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setImportPlatform("KILAKILA");
              setImportModalOpen(true);
            }}
          >
            <Upload className="w-4 h-4 mr-1" />
            导入KILAKILA数据
          </Button>
        </div>
      </div>

      {/* 平台连接状态 */}
      <div className="grid grid-cols-3 gap-4">
        {platforms.map((platform) => (
          <Card
            key={platform.platform}
            className={`border ${platform.color}`}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{platform.icon}</span>
                  <div>
                    <p className="font-medium text-slate-900">
                      {platform.platform}
                    </p>
                    <p className="text-xs text-slate-500">
                      {platform.connected
                        ? platform.lastSynced
                          ? `上次同步: ${new Date(platform.lastSynced).toLocaleString("zh-CN")}`
                          : "已连接"
                        : "未连接"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {platform.connected ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-slate-300" />
                  )}
                  {platform.platform === "抖音" && (
                    <Button
                      variant={platform.connected ? "outline" : "default"}
                      size="sm"
                      onClick={
                        platform.connected
                          ? syncDouyin
                          : () => window.open("/api/douyin/auth", "_blank")
                      }
                      disabled={syncing === "抖音"}
                    >
                      {syncing === "抖音" ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : platform.connected ? (
                        <RefreshCw className="w-4 h-4 mr-1" />
                      ) : (
                        <ExternalLink className="w-4 h-4 mr-1" />
                      )}
                      {platform.connected ? "同步" : "登录"}
                    </Button>
                  )}
                  {(platform.platform === "视频号" ||
                    platform.platform === "KILAKILA") && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setImportPlatform(platform.platform);
                        setImportModalOpen(true);
                      }}
                    >
                      <Upload className="w-4 h-4 mr-1" />
                      导入
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 全平台汇总指标 */}
      <div className="grid grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <Play className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">全平台播放</p>
                <p className="text-xl font-bold text-slate-900">
                  {totalViews > 0 ? formatNumber(totalViews) : "-"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                <Heart className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-xs text-slate-500">全平台点赞</p>
                <p className="text-xl font-bold text-slate-900">
                  {totalLikes > 0 ? formatNumber(totalLikes) : "-"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">全平台评论</p>
                <p className="text-xl font-bold text-slate-900">
                  {totalComments > 0 ? formatNumber(totalComments) : "-"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                <Share2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">全平台分享</p>
                <p className="text-xl font-bold text-slate-900">
                  {totalShares > 0 ? formatNumber(totalShares) : "-"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">互动率</p>
                <p className="text-xl font-bold text-slate-900">
                  {totalViews > 0 ? `${engagementRate}%` : "-"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 各平台数据详情 */}
      <div className="grid grid-cols-3 gap-4">
        {platforms.map((platform) => (
          <Card key={platform.platform}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <span>{platform.icon}</span>
                {platform.platform}
                {platform.summary && (
                  <span className="text-xs text-slate-400 font-normal">
                    {platform.summary.videoCount} 条视频
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {platform.summary ? (
                <>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">播放</span>
                      <span className="font-medium">
                        {formatNumber(platform.summary.totalViews)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">点赞</span>
                      <span className="font-medium">
                        {formatNumber(platform.summary.totalLikes)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">评论</span>
                      <span className="font-medium">
                        {formatNumber(platform.summary.totalComments)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">分享</span>
                      <span className="font-medium">
                        {formatNumber(platform.summary.totalShares)}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-4 text-sm text-slate-400">
                  {platform.platform === "抖音"
                    ? "请先登录抖音账号"
                    : "请导入数据"}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 热门视频排行 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">热门视频排行（跨平台）</CardTitle>
        </CardHeader>
        <CardContent>
          {topVideos.length > 0 ? (
            <div className="space-y-3">
              {topVideos.map((video, idx) => (
                <div
                  key={video.id}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-slate-50"
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      idx < 3
                        ? "bg-amber-100 text-amber-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {video.title}
                    </p>
                    <p className="text-xs text-slate-500">
                      {video.platform} · {video.publishDate}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {formatNumber(video.views)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="w-3 h-3" />
                      {formatNumber(video.likes)}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" />
                      {formatNumber(video.comments)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-sm text-slate-400">
              暂无视频数据。请连接平台账号或导入数据。
            </div>
          )}
        </CardContent>
      </Card>

      {/* 数据导入弹窗 */}
      {importModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-lg p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              导入{importPlatform}数据
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-600 mb-2 block">
                  粘贴 JSON 数据
                </label>
                <textarea
                  className="w-full h-40 border border-slate-200 rounded-lg p-3 text-sm font-mono"
                  placeholder={`[
  {
    "title": "视频标题",
    "publishDate": "2024-01-15",
    "views": 125000,
    "likes": 8500,
    "comments": 420,
    "shares": 180
  }
]`}
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                />
                <p className="text-xs text-slate-400 mt-1">
                  支持 JSON 数组格式，字段名支持中文（标题/播放量/点赞/评论/分享）
                </p>
              </div>
              {importError && (
                <p className="text-sm text-red-500">{importError}</p>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setImportModalOpen(false);
                    setImportText("");
                    setImportError("");
                  }}
                >
                  取消
                </Button>
                <Button onClick={handleImport}>导入</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
