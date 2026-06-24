'use client';

import { useState, useRef } from 'react';
import {
  TrendingUp,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Calendar,
  BarChart3,
  Sparkles,
  Loader2,
  X,
  FileText,
  Upload,
  Inbox,
  RefreshCw,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface PlatformStat {
  platform: string;
  videos: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  avgEngagement: number;
  trend: string;
}

interface VideoData {
  id: number;
  title: string;
  platform: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  publishDate: string;
  engagement: number;
}

function formatNumber(num: number): string {
  if (num >= 10000) {
    return `${(num / 10000).toFixed(1)}w`;
  }
  return num.toLocaleString();
}

export default function AnalyticsPage() {
  const [platformStats, setPlatformStats] = useState<PlatformStat[]>([]);
  const [topVideos, setTopVideos] = useState<VideoData[]>([]);
  const [timeRange, setTimeRange] = useState('7d');
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportContent, setReportContent] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalViews = platformStats.reduce((sum, p) => sum + p.totalViews, 0);
  const totalLikes = platformStats.reduce((sum, p) => sum + p.totalLikes, 0);
  const totalComments = platformStats.reduce((sum, p) => sum + p.totalComments, 0);
  const totalShares = platformStats.reduce((sum, p) => sum + p.totalShares, 0);
  const avgEngagement =
    platformStats.length > 0
      ? platformStats.reduce((sum, p) => sum + p.avgEngagement, 0) / platformStats.length
      : 0;

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    setReportContent('');

    try {
      const response = await fetch('/api/data-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: '全平台',
          period: timeRange === '7d' ? '最近7天' : timeRange === '30d' ? '最近30天' : '最近90天',
          metrics: {
            totalViews,
            totalLikes,
            totalComments,
            totalShares,
            videoCount: platformStats.reduce((sum, p) => sum + p.videos, 0),
          },
          topVideos: topVideos.slice(0, 5).map((v) => ({
            title: v.title,
            platform: v.platform,
            views: v.views,
            likes: v.likes,
            engagement: v.engagement,
          })),
        }),
      });

      const data = await response.json();
      if (data.success) {
        setReportContent(data.data.summary);
      }
    } catch (err) {
      console.error('生成报告失败:', err);
    } finally {
      setIsGenerating(false);
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
        // 解析导入的数据为视频数据
        const importedVideos: VideoData[] = data.data.rows.map(
          (row: Record<string, string | number | boolean | null>, index: number) => ({
            id: Date.now() + index,
            title: String(row['视频标题'] || row['title'] || row['标题'] || `视频 ${index + 1}`),
            platform: String(row['平台'] || row['platform'] || '未知'),
            views: Number(row['播放量'] || row['views'] || row['播放'] || 0),
            likes: Number(row['点赞'] || row['likes'] || 0),
            comments: Number(row['评论'] || row['comments'] || 0),
            shares: Number(row['分享'] || row['shares'] || 0),
            publishDate: String(row['发布日期'] || row['publishDate'] || new Date().toISOString().split('T')[0]),
            engagement: Number(row['互动率'] || row['engagement'] || 0),
          })
        );

        setTopVideos(importedVideos);

        // 按平台汇总
        const platformMap = new Map<string, PlatformStat>();
        importedVideos.forEach((video) => {
          const existing = platformMap.get(video.platform);
          if (existing) {
            existing.videos += 1;
            existing.totalViews += video.views;
            existing.totalLikes += video.likes;
            existing.totalComments += video.comments;
            existing.totalShares += video.shares;
          } else {
            platformMap.set(video.platform, {
              platform: video.platform,
              videos: 1,
              totalViews: video.views,
              totalLikes: video.likes,
              totalComments: video.comments,
              totalShares: video.shares,
              avgEngagement: 0,
              trend: 'stable',
            });
          }
        });

        // 计算平均互动率
        platformMap.forEach((stat) => {
          stat.avgEngagement = stat.totalViews > 0
            ? Number((((stat.totalLikes + stat.totalComments) / stat.totalViews) * 100).toFixed(1))
            : 0;
        });

        setPlatformStats(Array.from(platformMap.values()));
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

  const hasData = platformStats.length > 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">数据看板</h1>
          <p className="mt-1 text-sm text-slate-500">
            {hasData
              ? `全平台数据汇总 · ${platformStats.reduce((sum, p) => sum + p.videos, 0)} 个视频`
              : '导入视频数据查看分析看板'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="h-9 w-[130px] rounded-lg border-slate-200 text-sm">
              <Calendar className="mr-2 h-3.5 w-3.5 text-slate-400" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">最近 7 天</SelectItem>
              <SelectItem value="30d">最近 30 天</SelectItem>
              <SelectItem value="90d">最近 90 天</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => setShowImportDialog(true)}
          >
            <Upload className="h-3.5 w-3.5" />
            导入数据
          </Button>
          {hasData && (
            <Button
              className="gap-2 bg-[#0F172A] text-white hover:bg-slate-800"
              onClick={handleGenerateReport}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {isGenerating ? '生成中...' : 'AI 生成周报'}
            </Button>
          )}
        </div>
      </div>

      {/* Empty State */}
      {!hasData && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white py-20">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50">
            <BarChart3 className="h-8 w-8 text-slate-300" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-slate-700">
            暂无数据
          </h3>
          <p className="mt-1.5 max-w-sm text-center text-sm text-slate-400">
            导入视频数据（CSV/JSON）后，这里将展示播放量、点赞、评论等全平台数据汇总看板
          </p>
          <Button
            className="mt-6 gap-2 bg-[#0F172A] text-white hover:bg-slate-800"
            onClick={() => setShowImportDialog(true)}
          >
            <Upload className="h-4 w-4" />
            导入视频数据
          </Button>
        </div>
      )}

      {/* KPI Cards */}
      {hasData && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <Eye className="h-3.5 w-3.5" />
                总播放量
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">
                {formatNumber(totalViews)}
              </p>
            </CardContent>
          </Card>
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <Heart className="h-3.5 w-3.5" />
                总点赞
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">
                {formatNumber(totalLikes)}
              </p>
            </CardContent>
          </Card>
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <MessageCircle className="h-3.5 w-3.5" />
                总评论
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">
                {formatNumber(totalComments)}
              </p>
            </CardContent>
          </Card>
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <Share2 className="h-3.5 w-3.5" />
                总分享
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">
                {formatNumber(totalShares)}
              </p>
            </CardContent>
          </Card>
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <TrendingUp className="h-3.5 w-3.5" />
                平均互动率
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">
                {avgEngagement.toFixed(1)}%
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Platform Stats & Top Videos */}
      {hasData && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Platform Breakdown */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <BarChart3 className="h-4 w-4 text-blue-500" />
                平台数据分布
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {platformStats.map((stat) => (
                  <div
                    key={stat.platform}
                    className="rounded-lg border border-slate-100 p-3"
                  >
                    <div className="flex items-center justify-between">
                      <Badge
                        variant="outline"
                        className="rounded-full text-xs"
                      >
                        {stat.platform}
                      </Badge>
                      <span className="text-xs text-slate-400">
                        {stat.videos} 个视频
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-xs text-slate-400">播放</span>
                        <p className="font-semibold tabular-nums text-slate-800">
                          {formatNumber(stat.totalViews)}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-slate-400">点赞</span>
                        <p className="font-semibold tabular-nums text-slate-800">
                          {formatNumber(stat.totalLikes)}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-slate-400">评论</span>
                        <p className="font-semibold tabular-nums text-slate-800">
                          {formatNumber(stat.totalComments)}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-slate-400">互动率</span>
                        <p className="font-semibold tabular-nums text-emerald-600">
                          {stat.avgEngagement}%
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Videos */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <TrendingUp className="h-4 w-4 text-amber-500" />
                热门视频 TOP 5
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topVideos.slice(0, 5).map((video, index) => (
                  <div
                    key={video.id}
                    className="flex items-start gap-3 rounded-lg border border-slate-100 p-3"
                  >
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">
                        {video.title}
                      </p>
                      <div className="mt-1 flex items-center gap-3 text-xs text-slate-400">
                        <Badge
                          variant="outline"
                          className="rounded-full text-[10px]"
                        >
                          {video.platform}
                        </Badge>
                        <span className="flex items-center gap-0.5">
                          <Eye className="h-3 w-3" />
                          {formatNumber(video.views)}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <Heart className="h-3 w-3" />
                          {formatNumber(video.likes)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
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
                    导入视频数据
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
                      <p>视频标题 / title / 标题 → 视频名称</p>
                      <p>平台 / platform → 发布平台</p>
                      <p>播放量 / views / 播放 → 播放次数</p>
                      <p>点赞 / likes → 点赞数</p>
                      <p>评论 / comments → 评论数</p>
                      <p>分享 / shares → 分享数</p>
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

      {/* Report Dialog */}
      {(isGenerating || reportContent) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50">
                  <FileText className="h-4 w-4 text-violet-500" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    AI 数据周报
                  </h3>
                  <p className="text-xs text-slate-400">
                    Doubao Seed 2.0 Mini · 自动生成运营分析报告
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-400"
                onClick={() => setReportContent('')}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="max-h-[480px] overflow-y-auto px-6 py-5">
              {isGenerating ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
                  <p className="mt-4 text-sm font-medium text-slate-700">
                    AI 正在生成数据周报...
                  </p>
                </div>
              ) : (
                <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                  {reportContent}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-3">
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => setReportContent('')}
              >
                关闭
              </Button>
              {!isGenerating && reportContent && (
                <Button
                  size="sm"
                  className="gap-1.5 bg-violet-500 text-xs text-white hover:bg-violet-600"
                  onClick={handleGenerateReport}
                >
                  <RefreshCw className="h-3 w-3" />
                  重新生成
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
