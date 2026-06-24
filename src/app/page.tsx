'use client';

import {
  Lightbulb,
  FileText,
  Video,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Zap,
  CheckCircle2,
  AlertCircle,
  Play,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const stats = [
  {
    label: '活跃选题',
    value: '47',
    change: '+12',
    trend: 'up',
    icon: Lightbulb,
    color: 'text-amber-500',
    bg: 'bg-amber-50',
  },
  {
    label: '生成脚本',
    value: '23',
    change: '+8',
    trend: 'up',
    icon: FileText,
    color: 'text-violet-500',
    bg: 'bg-violet-50',
  },
  {
    label: '已发布视频',
    value: '156',
    change: '+5',
    trend: 'up',
    icon: Video,
    color: 'text-blue-500',
    bg: 'bg-blue-50',
  },
  {
    label: '本周总播放',
    value: '82.4w',
    change: '+23%',
    trend: 'up',
    icon: TrendingUp,
    color: 'text-emerald-500',
    bg: 'bg-emerald-50',
  },
];

const recentTopics = [
  {
    id: 1,
    title: '2024年最值得入手的智能家居设备',
    platform: '抖音',
    heat: 9800,
    status: '脚本生成中',
    statusColor: 'bg-violet-100 text-violet-700',
    assignee: '张明',
    time: '10分钟前',
  },
  {
    id: 2,
    title: '职场新人必看的10个沟通技巧',
    platform: '视频号',
    heat: 8500,
    status: '待审核',
    statusColor: 'bg-amber-100 text-amber-700',
    assignee: '李婷',
    time: '25分钟前',
  },
  {
    id: 3,
    title: '周末露营装备清单分享',
    platform: '抖音',
    heat: 7200,
    status: '已发布',
    statusColor: 'bg-emerald-100 text-emerald-700',
    assignee: '王浩',
    time: '1小时前',
  },
  {
    id: 4,
    title: 'AI绘画工具横评：哪个最适合新手',
    platform: '视频号',
    heat: 6800,
    status: '选题评估',
    statusColor: 'bg-blue-100 text-blue-700',
    assignee: '赵雪',
    time: '2小时前',
  },
  {
    id: 5,
    title: '一人食快手菜谱：15分钟搞定晚餐',
    platform: '抖音',
    heat: 9200,
    status: '拍摄中',
    statusColor: 'bg-orange-100 text-orange-700',
    assignee: '张明',
    time: '3小时前',
  },
];

const workflowStatus = [
  {
    name: '热点抓取流',
    status: 'running',
    lastRun: '每2小时',
    nextRun: '45分钟后',
    successRate: '99.2%',
  },
  {
    name: '脚本生成流',
    status: 'running',
    lastRun: '按需触发',
    nextRun: '等待触发',
    successRate: '97.8%',
  },
  {
    name: '数据回收流',
    status: 'running',
    lastRun: '每6小时',
    nextRun: '2小时后',
    successRate: '98.5%',
  },
  {
    name: '飞书通知流',
    status: 'warning',
    lastRun: '30分钟前',
    nextRun: '—',
    successRate: '94.1%',
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">运营总览</h1>
          <p className="mt-1 text-sm text-slate-500">
            Coze 工作流 × 飞书多维表 — 全流程自动化运营指挥中心
          </p>
        </div>
        <Button className="gap-2 bg-[#0F172A] text-white hover:bg-slate-800">
          <Zap className="h-4 w-4" />
          手动触发工作流
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="group rounded-xl border border-slate-200 bg-white p-5 transition-all duration-200 hover:border-slate-300 hover:shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.bg}`}
                >
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div
                  className={`flex items-center gap-1 text-xs font-medium ${
                    stat.trend === 'up'
                      ? 'text-emerald-600'
                      : 'text-red-500'
                  }`}
                >
                  {stat.trend === 'up' ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {stat.change}
                </div>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold tabular-nums text-slate-900">
                  {stat.value}
                </p>
                <p className="mt-0.5 text-sm text-slate-500">{stat.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Topics */}
        <div className="col-span-2 rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-900">
              最新选题动态
            </h2>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-slate-500"
            >
              查看全部
            </Button>
          </div>
          <div className="divide-y divide-slate-50">
            {recentTopics.map((topic) => (
              <div
                key={topic.id}
                className="flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-slate-50/50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-xs font-medium text-slate-600">
                    {topic.platform === '抖音' ? '抖' : '视'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {topic.title}
                    </p>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
                      <span>{topic.platform}</span>
                      <span>·</span>
                      <span>热度 {(topic.heat / 10000).toFixed(1)}w</span>
                      <span>·</span>
                      <span>{topic.assignee}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge
                    variant="secondary"
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${topic.statusColor}`}
                  >
                    {topic.status}
                  </Badge>
                  <span className="flex items-center gap-1 text-xs text-slate-400">
                    <Clock className="h-3 w-3" />
                    {topic.time}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Workflow Status */}
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-900">
              工作流状态
            </h2>
            <Badge
              variant="secondary"
              className="rounded-full bg-emerald-50 text-emerald-700"
            >
              3/4 运行中
            </Badge>
          </div>
          <div className="space-y-1 p-3">
            {workflowStatus.map((wf) => (
              <div
                key={wf.name}
                className="rounded-lg p-3 transition-colors hover:bg-slate-50"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {wf.status === 'running' ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                    )}
                    <span className="text-sm font-medium text-slate-800">
                      {wf.name}
                    </span>
                  </div>
                  <span className="text-xs tabular-nums text-slate-400">
                    {wf.successRate}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-3 text-xs text-slate-400">
                  <span>上次: {wf.lastRun}</span>
                  <span>下次: {wf.nextRun}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="border-t border-slate-100 p-4">
            <p className="mb-3 text-xs font-medium text-slate-500">
              快捷操作
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="justify-start gap-2 text-xs"
              >
                <Play className="h-3 w-3" />
                抓取热点
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="justify-start gap-2 text-xs"
              >
                <FileText className="h-3 w-3" />
                生成脚本
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Architecture Overview */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">
          自动化架构概览
        </h2>
        <div className="flex items-center justify-between gap-4 overflow-x-auto pb-2">
          {[
            {
              step: '01',
              title: '热点抓取',
              desc: 'Coze 定时抓取抖音/视频号热门内容',
              color: 'border-amber-300 bg-amber-50',
              textColor: 'text-amber-700',
            },
            {
              step: '02',
              title: '选题入库',
              desc: '分析后自动写入飞书多维表',
              color: 'border-blue-300 bg-blue-50',
              textColor: 'text-blue-700',
            },
            {
              step: '03',
              title: '脚本生成',
              desc: 'AI 大模型自动生成脚本大纲',
              color: 'border-violet-300 bg-violet-50',
              textColor: 'text-violet-700',
            },
            {
              step: '04',
              title: '人工制作',
              desc: '团队拍摄/剪辑/审核发布',
              color: 'border-orange-300 bg-orange-50',
              textColor: 'text-orange-700',
            },
            {
              step: '05',
              title: '数据回收',
              desc: '自动汇总播放/点赞/评论数据',
              color: 'border-emerald-300 bg-emerald-50',
              textColor: 'text-emerald-700',
            },
          ].map((item, idx) => (
            <div key={item.step} className="flex items-center gap-4">
              <div
                className={`min-w-[180px] rounded-lg border-2 ${item.color} p-4`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-bold ${item.textColor}`}
                  >
                    {item.step}
                  </span>
                  <span
                    className={`text-sm font-semibold ${item.textColor}`}
                  >
                    {item.title}
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-slate-500">{item.desc}</p>
              </div>
              {idx < 4 && (
                <div className="flex h-px w-8 items-center">
                  <div className="h-px w-full bg-slate-300" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
