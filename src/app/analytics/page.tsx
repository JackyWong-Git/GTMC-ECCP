'use client';

import { useState } from 'react';
import {
  TrendingUp,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  BarChart3,
  Sparkles,
  Loader2,
  X,
  FileText,
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

const platformStats = [
  {
    platform: '抖音',
    videos: 89,
    totalViews: 5240000,
    totalLikes: 312000,
    totalComments: 28400,
    totalShares: 15600,
    avgEngagement: 6.8,
    trend: 'up',
  },
  {
    platform: '视频号',
    videos: 67,
    totalViews: 3180000,
    totalLikes: 198000,
    totalComments: 16200,
    totalShares: 9800,
    avgEngagement: 7.1,
    trend: 'up',
  },
];

const topVideos = [
  {
    id: 1,
    title: '一人食快手菜谱：15分钟搞定晚餐',
    platform: '抖音',
    views: 1280000,
    likes: 89000,
    comments: 4200,
    shares: 3100,
    publishDate: '2024-12-18',
    engagement: 7.5,
  },
  {
    id: 2,
    title: '2024年最值得入手的智能家居设备',
    platform: '抖音',
    views: 980000,
    likes: 67000,
    comments: 3800,
    shares: 2400,
    publishDate: '2024-12-15',
    engagement: 7.4,
  },
  {
    id: 3,
    title: '新手养猫指南：从选猫到日常护理',
    platform: '视频号',
    views: 750000,
    likes: 52000,
    comments: 2900,
    shares: 1800,
    publishDate: '2024-12-12',
    engagement: 7.5,
  },
  {
    id: 4,
    title: '周末露营装备清单分享',
    platform: '抖音',
    views: 620000,
    likes: 41000,
    comments: 2100,
    shares: 1500,
    publishDate: '2024-12-10',
    engagement: 7.1,
  },
  {
    id: 5,
    title: '职场新人必看的10个沟通技巧',
    platform: '视频号',
    views: 540000,
    likes: 38000,
    comments: 1800,
    shares: 1200,
    publishDate: '2024-12-08',
    engagement: 7.6,
  },
];

const weeklyData = [
  { day: '周一', views: 120000, likes: 8500, comments: 620 },
  { day: '周二', views: 98000, likes: 7200, comments: 480 },
  { day: '周三', views: 156000, likes: 11000, comments: 890 },
  { day: '周四', views: 134000, likes: 9800, comments: 720 },
  { day: '周五', views: 189000, likes: 14200, comments: 1100 },
  { day: '周六', views: 245000, likes: 18500, comments: 1450 },
  { day: '周日', views: 210000, likes: 15800, comments: 1200 },
];

function formatNumber(num: number): string {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + 'w';
  }
  return num.toLocaleString();
}

export default function AnalyticsPage() {
  const maxViews = Math.max(...weeklyData.map((d) => d.views));
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportResult, setReportResult] = useState<string>('');
  const [reportModel, setReportModel] = useState<string>('');
  const [showReport, setShowReport] = useState(false);

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    setReportResult('');
    setReportModel('');
    setShowReport(true);

    try {
      const response = await fetch('/api/data-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: '全平台（抖音 + 视频号）',
          period: '最近7天',
          metrics: {
            totalViews: 8420000,
            totalLikes: 510000,
            totalComments: 44600,
            totalShares: 25400,
            videoCount: 156,
            topVideos: [
              { title: '一人食快手菜谱：15分钟搞定晚餐', views: 1280000, likes: 89000 },
              { title: '2024年最值得入手的智能家居设备', views: 980000, likes: 67000 },
              { title: '新手养猫指南：从选猫到日常护理', views: 750000, likes: 52000 },
            ],
          },
        }),
      });

      const data = await response.json();
      if (data.success) {
        setReportResult(data.data.summary);
        setReportModel(data.data.model);
      } else {
        setReportResult(`生成失败：${data.error || '未知错误'}`);
      }
    } catch (err) {
      setReportResult(
        `请求失败：${err instanceof Error ? err.message : '网络错误'}`
      );
    } finally {
      setIsGeneratingReport(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">数据看板</h1>
          <p className="mt-1 text-sm text-slate-500">
            全平台数据汇总 · 自动回收播放/点赞/评论数据
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select defaultValue="7d">
            <SelectTrigger className="h-9 w-[140px] rounded-lg border-slate-200 text-sm">
              <Calendar className="mr-2 h-3.5 w-3.5 text-slate-400" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">最近7天</SelectItem>
              <SelectItem value="30d">最近30天</SelectItem>
              <SelectItem value="90d">最近90天</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-xs"
          >
            <BarChart3 className="h-3.5 w-3.5" />
            导出报告
          </Button>
        </div>
      </div>

      {/* Platform Overview */}
      <div className="grid grid-cols-2 gap-4">
        {platformStats.map((platform) => (
          <Card
            key={platform.platform}
            className="border-slate-200 bg-white"
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-slate-800">
                  {platform.platform}
                </CardTitle>
                <Badge
                  variant="secondary"
                  className="rounded-full bg-slate-100 text-xs text-slate-600"
                >
                  {platform.videos} 个视频
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Eye className="h-3 w-3" />
                    总播放
                  </div>
                  <p className="mt-1 text-lg font-bold tabular-nums text-slate-900">
                    {formatNumber(platform.totalViews)}
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Heart className="h-3 w-3" />
                    总点赞
                  </div>
                  <p className="mt-1 text-lg font-bold tabular-nums text-slate-900">
                    {formatNumber(platform.totalLikes)}
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <MessageCircle className="h-3 w-3" />
                    总评论
                  </div>
                  <p className="mt-1 text-lg font-bold tabular-nums text-slate-900">
                    {formatNumber(platform.totalComments)}
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Share2 className="h-3 w-3" />
                    总分享
                  </div>
                  <p className="mt-1 text-lg font-bold tabular-nums text-slate-900">
                    {formatNumber(platform.totalShares)}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
                <span className="text-xs text-slate-400">平均互动率</span>
                <span className="text-sm font-semibold tabular-nums text-emerald-600">
                  {platform.avgEngagement}%
                </span>
                {platform.trend === 'up' ? (
                  <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-red-500" />
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Weekly Trend Chart */}
      <Card className="border-slate-200 bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-800">
            本周播放量趋势
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3 pt-2">
            {weeklyData.map((day) => {
              const height = (day.views / maxViews) * 160;
              return (
                <div
                  key={day.day}
                  className="group flex flex-1 flex-col items-center gap-2"
                >
                  <div className="relative w-full">
                    <div
                      className="w-full rounded-t-md bg-gradient-to-t from-blue-500 to-blue-400 transition-all duration-300 group-hover:from-blue-600 group-hover:to-blue-500"
                      style={{ height: `${height}px` }}
                    />
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 px-2 py-1 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                      {formatNumber(day.views)}
                    </div>
                  </div>
                  <span className="text-xs text-slate-400">{day.day}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex items-center gap-6 border-t border-slate-100 pt-4">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
              <span className="text-xs text-slate-500">播放量</span>
            </div>
            <div className="text-xs text-slate-400">
              周总计:{' '}
              <span className="font-semibold text-slate-700">
                {formatNumber(
                  weeklyData.reduce((sum, d) => sum + d.views, 0)
                )}
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs text-emerald-600">
              <TrendingUp className="h-3 w-3" />
              较上周 +18.5%
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Videos Table */}
      <Card className="border-slate-200 bg-white">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-slate-800">
              热门视频排行
            </CardTitle>
            <Badge
              variant="secondary"
              className="rounded-full bg-emerald-50 text-xs text-emerald-700"
            >
              数据已自动回收
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {topVideos.map((video, idx) => (
              <div
                key={video.id}
                className="flex items-center justify-between rounded-lg p-3 transition-colors hover:bg-slate-50"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ${
                      idx < 3
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {idx + 1}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {video.title}
                    </p>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
                      <span>{video.platform}</span>
                      <span>·</span>
                      <span>{video.publishDate}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums text-slate-800">
                      {formatNumber(video.views)}
                    </p>
                    <p className="text-[10px] text-slate-400">播放</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums text-slate-800">
                      {formatNumber(video.likes)}
                    </p>
                    <p className="text-[10px] text-slate-400">点赞</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums text-slate-800">
                      {formatNumber(video.comments)}
                    </p>
                    <p className="text-[10px] text-slate-400">评论</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums text-emerald-600">
                      {video.engagement}%
                    </p>
                    <p className="text-[10px] text-slate-400">互动率</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AI Report Dialog */}
      {showReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">AI 数据周报</h3>
                  {reportModel && (
                    <p className="text-xs text-slate-400">
                      由 {reportModel} 生成
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setShowReport(false)}
                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
              {isGeneratingReport ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  <p className="mt-4 text-sm text-slate-500">
                    正在分析全平台数据，生成周报...
                  </p>
                </div>
              ) : (
                <div className="prose prose-sm max-w-none text-slate-700">
                  {reportResult.split('\n').map((line, i) => (
                    <p key={i} className={line ? 'mb-2' : 'mb-4'}>
                      {line}
                    </p>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
              <button
                onClick={() => setShowReport(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
              >
                关闭
              </button>
              {!isGeneratingReport && reportResult && (
                <button
                  onClick={handleGenerateReport}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                >
                  重新生成
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
