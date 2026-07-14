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
  Sparkles,
  Target,
  Zap,
  Lightbulb,
} from "lucide-react";

// 情感分析结果类型
interface SentimentResult {
  summary: {
    total: number;
    positive: number;
    neutral: number;
    negative: number;
    positiveRate: number;
    averageSentiment: number;
  };
  keywords: Array<{ word: string; count: number; sentiment: string }>;
  emotions: Array<{ type: string; count: number }>;
  highlights: {
    mostLiked: string;
    mostControversial: string;
    mostPositive: string;
    mostNegative: string;
  };
  insights: string[];
}

// 爆款分析结果类型
interface ViralAnalysisResult {
  选题角度?: string;
  钩子?: string;
  结构?: string;
  "爆点·数据证据"?: string;
  CTA?: string;
  可抄点?: string;
  脚本类型?: string;
  爆款元素?: string;
  情绪波动点?: string;
  画面感?: string | number;
  力量感?: string | number;
  人设类型?: string;
  运营建议?: string;
}

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

  // 爆款分析状态
  const [viralModalOpen, setViralModalOpen] = useState(false);
  const [viralVideo, setViralVideo] = useState<{
    title: string;
    likes: number;
    comments: number;
  } | null>(null);
  const [viralTranscript, setViralTranscript] = useState("");
  const [viralMode, setViralMode] = useState<"six" | "seven">("six");
  const [viralAnalyzing, setViralAnalyzing] = useState(false);
  const [viralResult, setViralResult] = useState<ViralAnalysisResult | null>(null);

  // 情感分析状态
  const [sentimentOpen, setSentimentOpen] = useState(false);
  const [sentimentVideo, setSentimentVideo] = useState<{
    title: string;
    comments: number;
  } | null>(null);
  const [sentimentComments, setSentimentComments] = useState("");
  const [sentimentAnalyzing, setSentimentAnalyzing] = useState(false);
  const [sentimentResult, setSentimentResult] = useState<SentimentResult | null>(null);

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

  // 爆款分析
  const handleViralAnalysis = async () => {
    if (!viralVideo || !viralTranscript.trim()) return;

    setViralAnalyzing(true);
    setViralResult(null);

    try {
      const res = await fetch("/api/viral-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: viralVideo.title,
          transcript: viralTranscript,
          like: viralVideo.likes,
          comment: viralVideo.comments,
          mode: viralMode,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setViralResult(data.data);
      } else {
        alert(data.error || "分析失败");
      }
    } catch {
      alert("分析失败，请检查网络连接");
    } finally {
      setViralAnalyzing(false);
    }
  };

  // 打开爆款分析弹窗
  const openViralModal = (video: { title: string; likes: number; comments: number }) => {
    setViralVideo(video);
    setViralTranscript("");
    setViralResult(null);
    setViralModalOpen(true);
  };

  // 情感分析
  const handleSentimentAnalysis = async () => {
    if (!sentimentVideo || !sentimentComments.trim()) return;

    setSentimentAnalyzing(true);
    setSentimentResult(null);

    try {
      // 解析评论文本，每行一条
      const commentLines = sentimentComments
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      const comments = commentLines.map((content) => ({ content }));

      const res = await fetch("/api/sentiment-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comments,
          videoTitle: sentimentVideo.title,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setSentimentResult(data.data);
      } else {
        alert(data.error || "分析失败");
      }
    } catch {
      alert("分析失败，请检查网络连接");
    } finally {
      setSentimentAnalyzing(false);
    }
  };

  // 打开情感分析弹窗
  const openSentimentModal = (video: { title: string; comments: number }) => {
    setSentimentVideo(video);
    setSentimentComments("");
    setSentimentResult(null);
    setSentimentOpen(true);
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
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                      onClick={() =>
                        openViralModal({
                          title: video.title,
                          likes: video.likes,
                          comments: video.comments,
                        })
                      }
                    >
                      <Sparkles className="w-3 h-3 mr-1" />
                      爆款分析
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                      onClick={() =>
                        openSentimentModal({
                          title: video.title,
                          comments: video.comments,
                        })
                      }
                    >
                      <Heart className="w-3 h-3 mr-1" />
                      情感分析
                    </Button>
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

      {/* 爆款分析弹窗 */}
      {viralModalOpen && viralVideo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                爆款拆解分析
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setViralModalOpen(false);
                  setViralVideo(null);
                  setViralResult(null);
                }}
              >
                关闭
              </Button>
            </div>

            {/* 视频信息 */}
            <div className="bg-slate-50 rounded-lg p-3 mb-4">
              <p className="text-sm font-medium text-slate-900 truncate">
                {viralVideo.title}
              </p>
              <div className="flex gap-4 mt-1 text-xs text-slate-500">
                <span>点赞 {formatNumber(viralVideo.likes)}</span>
                <span>评论 {formatNumber(viralVideo.comments)}</span>
              </div>
            </div>

            {/* 分析模式选择 */}
            {!viralResult && (
              <div className="mb-4">
                <label className="text-sm text-slate-600 mb-2 block">分析模式</label>
                <div className="flex gap-2">
                  <Button
                    variant={viralMode === "six" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViralMode("six")}
                  >
                    六维拆解（选题/钩子/结构/爆点/CTA/可抄点）
                  </Button>
                  <Button
                    variant={viralMode === "seven" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViralMode("seven")}
                  >
                    七维评估（脚本/元素/情绪/画面/力量/人设/建议）
                  </Button>
                </div>
              </div>
            )}

            {/* 转录文案输入 */}
            {!viralResult && (
              <div className="mb-4">
                <label className="text-sm text-slate-600 mb-2 block">
                  视频转录文案
                </label>
                <textarea
                  className="w-full h-32 border border-slate-200 rounded-lg p-3 text-sm"
                  placeholder="粘贴视频的转录文案..."
                  value={viralTranscript}
                  onChange={(e) => setViralTranscript(e.target.value)}
                />
                <p className="text-xs text-slate-400 mt-1">
                  可从剪映、飞书妙记等工具获取转录文案
                </p>
              </div>
            )}

            {/* 分析按钮 */}
            {!viralResult && (
              <Button
                className="w-full"
                onClick={handleViralAnalysis}
                disabled={viralAnalyzing || !viralTranscript.trim()}
              >
                {viralAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    AI 分析中...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    开始爆款分析
                  </>
                )}
              </Button>
            )}

            {/* 分析结果 */}
            {viralResult && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-slate-700">分析结果</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setViralResult(null);
                      setViralTranscript("");
                    }}
                  >
                    重新分析
                  </Button>
                </div>

                {/* 六维拆解结果 */}
                {viralMode === "six" && (
                  <div className="space-y-3">
                    {viralResult.选题角度 && (
                      <div className="bg-blue-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Target className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-900">选题角度</span>
                        </div>
                        <p className="text-sm text-blue-800">{viralResult.选题角度}</p>
                      </div>
                    )}
                    {viralResult.钩子 && (
                      <div className="bg-amber-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Zap className="w-4 h-4 text-amber-600" />
                          <span className="text-sm font-medium text-amber-900">钩子</span>
                        </div>
                        <p className="text-sm text-amber-800">{viralResult.钩子}</p>
                      </div>
                    )}
                    {viralResult.结构 && (
                      <div className="bg-green-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-medium text-green-900">结构</span>
                        </div>
                        <p className="text-sm text-green-800">{viralResult.结构}</p>
                      </div>
                    )}
                    {viralResult["爆点·数据证据"] && (
                      <div className="bg-red-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <TrendingUp className="w-4 h-4 text-red-600" />
                          <span className="text-sm font-medium text-red-900">爆点·数据证据</span>
                        </div>
                        <p className="text-sm text-red-800">{viralResult["爆点·数据证据"]}</p>
                      </div>
                    )}
                    {viralResult.CTA && (
                      <div className="bg-purple-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <MessageCircle className="w-4 h-4 text-purple-600" />
                          <span className="text-sm font-medium text-purple-900">CTA</span>
                        </div>
                        <p className="text-sm text-purple-800">{viralResult.CTA}</p>
                      </div>
                    )}
                    {viralResult.可抄点 && (
                      <div className="bg-emerald-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Lightbulb className="w-4 h-4 text-emerald-600" />
                          <span className="text-sm font-medium text-emerald-900">可抄点</span>
                        </div>
                        <p className="text-sm text-emerald-800">{viralResult.可抄点}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* 七维评估结果 */}
                {viralMode === "seven" && (
                  <div className="space-y-3">
                    {viralResult.脚本类型 && (
                      <div className="bg-blue-50 rounded-lg p-3">
                        <span className="text-sm font-medium text-blue-900">脚本类型：</span>
                        <span className="text-sm text-blue-800">{viralResult.脚本类型}</span>
                      </div>
                    )}
                    {viralResult.爆款元素 && (
                      <div className="bg-amber-50 rounded-lg p-3">
                        <span className="text-sm font-medium text-amber-900">爆款元素：</span>
                        <span className="text-sm text-amber-800">{viralResult.爆款元素}</span>
                      </div>
                    )}
                    {viralResult.情绪波动点 && (
                      <div className="bg-pink-50 rounded-lg p-3">
                        <span className="text-sm font-medium text-pink-900">情绪波动点：</span>
                        <span className="text-sm text-pink-800">{viralResult.情绪波动点}</span>
                      </div>
                    )}
                    {viralResult.画面感 && (
                      <div className="bg-green-50 rounded-lg p-3">
                        <span className="text-sm font-medium text-green-900">画面感：</span>
                        <span className="text-sm text-green-800">{viralResult.画面感}</span>
                      </div>
                    )}
                    {viralResult.力量感 && (
                      <div className="bg-red-50 rounded-lg p-3">
                        <span className="text-sm font-medium text-red-900">力量感：</span>
                        <span className="text-sm text-red-800">{viralResult.力量感}</span>
                      </div>
                    )}
                    {viralResult.人设类型 && (
                      <div className="bg-purple-50 rounded-lg p-3">
                        <span className="text-sm font-medium text-purple-900">人设类型：</span>
                        <span className="text-sm text-purple-800">{viralResult.人设类型}</span>
                      </div>
                    )}
                    {viralResult.运营建议 && (
                      <div className="bg-emerald-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Lightbulb className="w-4 h-4 text-emerald-600" />
                          <span className="text-sm font-medium text-emerald-900">运营建议</span>
                        </div>
                        <p className="text-sm text-emerald-800">{viralResult.运营建议}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 情感分析弹窗 */}
      {sentimentOpen && sentimentVideo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Heart className="w-5 h-5 text-emerald-500" />
                评论情感分析
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSentimentOpen(false);
                  setSentimentVideo(null);
                  setSentimentResult(null);
                }}
              >
                关闭
              </Button>
            </div>

            {/* 视频信息 */}
            <div className="bg-slate-50 rounded-lg p-3 mb-4">
              <p className="text-sm font-medium text-slate-900 truncate">
                {sentimentVideo.title}
              </p>
              <div className="flex gap-4 mt-1 text-xs text-slate-500">
                <span>评论 {formatNumber(sentimentVideo.comments)}</span>
              </div>
            </div>

            {/* 评论输入 */}
            {!sentimentResult && (
              <div className="mb-4">
                <label className="text-sm text-slate-600 mb-2 block">
                  粘贴评论（每行一条）
                </label>
                <textarea
                  className="w-full h-40 border border-slate-200 rounded-lg p-3 text-sm font-mono"
                  placeholder={"太棒了！\n这个视频真的很有用\n求更多教程\n有点无聊...\n学到了！"}
                  value={sentimentComments}
                  onChange={(e) => setSentimentComments(e.target.value)}
                />
                <p className="text-xs text-slate-400 mt-1">
                  可从抖音后台、飞书表格等导出评论数据，每行一条评论
                </p>
              </div>
            )}

            {/* 分析按钮 */}
            {!sentimentResult && (
              <Button
                className="w-full"
                onClick={handleSentimentAnalysis}
                disabled={sentimentAnalyzing || !sentimentComments.trim()}
              >
                {sentimentAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    AI 分析中...
                  </>
                ) : (
                  <>
                    <Heart className="w-4 h-4 mr-2" />
                    开始情感分析
                  </>
                )}
              </Button>
            )}

            {/* 分析结果 */}
            {sentimentResult && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-slate-700">分析结果</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSentimentResult(null);
                      setSentimentComments("");
                    }}
                  >
                    重新分析
                  </Button>
                </div>

                {/* 情感分布 */}
                <div className="bg-slate-50 rounded-lg p-4">
                  <h5 className="text-sm font-medium text-slate-700 mb-3">情感分布</h5>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {sentimentResult.summary.positive}
                      </div>
                      <div className="text-xs text-slate-500">正面</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-slate-500">
                        {sentimentResult.summary.neutral}
                      </div>
                      <div className="text-xs text-slate-500">中性</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-500">
                        {sentimentResult.summary.negative}
                      </div>
                      <div className="text-xs text-slate-500">负面</div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500"
                        style={{ width: `${sentimentResult.summary.positiveRate}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-green-600">
                      {sentimentResult.summary.positiveRate}% 正面
                    </span>
                  </div>
                </div>

                {/* 高频关键词 */}
                {sentimentResult.keywords && sentimentResult.keywords.length > 0 && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h5 className="text-sm font-medium text-blue-900 mb-2">高频关键词</h5>
                    <div className="flex flex-wrap gap-2">
                      {sentimentResult.keywords.map((kw, i) => (
                        <span
                          key={i}
                          className={`px-2 py-1 rounded text-xs ${
                            kw.sentiment === "正面"
                              ? "bg-green-100 text-green-700"
                              : kw.sentiment === "负面"
                              ? "bg-red-100 text-red-700"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {kw.word} ({kw.count})
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 情感类型 */}
                {sentimentResult.emotions && sentimentResult.emotions.length > 0 && (
                  <div className="bg-purple-50 rounded-lg p-4">
                    <h5 className="text-sm font-medium text-purple-900 mb-2">情感类型</h5>
                    <div className="flex flex-wrap gap-2">
                      {sentimentResult.emotions.map((emo, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 rounded text-xs bg-purple-100 text-purple-700"
                        >
                          {emo.type} ({emo.count})
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 评论亮点 */}
                {sentimentResult.highlights && (
                  <div className="bg-amber-50 rounded-lg p-4">
                    <h5 className="text-sm font-medium text-amber-900 mb-2">评论亮点</h5>
                    <div className="space-y-2 text-sm">
                      {sentimentResult.highlights.mostLiked && (
                        <div>
                          <span className="text-amber-700 font-medium">最多赞：</span>
                          <span className="text-amber-800">{sentimentResult.highlights.mostLiked}</span>
                        </div>
                      )}
                      {sentimentResult.highlights.mostPositive && (
                        <div>
                          <span className="text-green-700 font-medium">最正面：</span>
                          <span className="text-green-800">{sentimentResult.highlights.mostPositive}</span>
                        </div>
                      )}
                      {sentimentResult.highlights.mostNegative && (
                        <div>
                          <span className="text-red-700 font-medium">最负面：</span>
                          <span className="text-red-800">{sentimentResult.highlights.mostNegative}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 洞察 */}
                {sentimentResult.insights && sentimentResult.insights.length > 0 && (
                  <div className="bg-emerald-50 rounded-lg p-4">
                    <h5 className="text-sm font-medium text-emerald-900 mb-2">运营洞察</h5>
                    <ul className="space-y-1">
                      {sentimentResult.insights.map((insight, i) => (
                        <li key={i} className="text-sm text-emerald-800 flex items-start gap-2">
                          <Lightbulb className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                          {insight}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
