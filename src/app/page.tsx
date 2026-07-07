'use client';

import {
  Lightbulb,
  FileText,
  Video,
  TrendingUp,
  Clock,
  Zap,
  CheckCircle2,
  AlertCircle,
  Play,
  ArrowRight,
  RefreshCw,
  Database,
  Bot,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const workflowSteps = [
  {
    step: '01',
    title: '热点抓取',
    desc: 'Coze 工作流定时抓取抖音/视频号热门内容',
    model: 'Doubao Seed 2.0 Lite',
    status: 'ready',
    icon: Zap,
    color: 'text-amber-500',
    bg: 'bg-amber-50',
  },
  {
    step: '02',
    title: '选题评估',
    desc: 'AI 分析热度因素、受众画像与选题建议',
    model: 'Doubao Seed 2.0 Lite',
    status: 'ready',
    icon: Lightbulb,
    color: 'text-blue-500',
    bg: 'bg-blue-50',
  },
  {
    step: '03',
    title: '脚本生成',
    desc: '大模型生成脚本大纲，支持流式输出',
    model: 'Qwen 3.5 Plus',
    status: 'ready',
    icon: FileText,
    color: 'text-violet-500',
    bg: 'bg-violet-50',
  },
  {
    step: '04',
    title: '数据回收',
    desc: '定时抓取播放量、点赞、评论等数据',
    model: 'Doubao Seed 2.0 Mini',
    status: 'ready',
    icon: TrendingUp,
    color: 'text-emerald-500',
    bg: 'bg-emerald-50',
  },
];

const quickActions = [
  {
    title: '抓取热榜',
    desc: '获取抖音/视频号实时热门话题',
    icon: RefreshCw,
    href: '/topics',
    color: 'text-amber-500',
    bg: 'bg-amber-50',
  },
  {
    title: '导入数据',
    desc: '上传 CSV/JSON 格式的选题或视频数据',
    icon: Database,
    href: '/topics',
    color: 'text-blue-500',
    bg: 'bg-blue-50',
  },
  {
    title: '生成脚本',
    desc: '选择选题后 AI 自动生成脚本大纲',
    icon: FileText,
    href: '/scripts',
    color: 'text-violet-500',
    bg: 'bg-violet-50',
  },
  {
    title: '数据看板',
    desc: '查看全平台播放、点赞、评论汇总',
    icon: TrendingUp,
    href: '/analytics',
    color: 'text-emerald-500',
    bg: 'bg-emerald-50',
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">运营总览</h1>
        <p className="mt-1 text-sm text-slate-500">
          自动化运营工作流 · 选题策划 → 脚本生成 → 知识库沉淀 → 数据回收
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {quickActions.map((action) => (
          <Link key={action.title} href={action.href}>
            <div className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-slate-300 hover:shadow-md">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${action.bg}`}>
                  <action.icon className={`h-5 w-5 ${action.color}`} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">
                    {action.title}
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {action.desc}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1 text-xs font-medium text-slate-400 transition-colors group-hover:text-slate-600">
                前往
                <ArrowRight className="h-3 w-3" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Workflow Architecture */}
      <div>
        <div className="mb-4 flex items-center gap-2">
          <h2 className="text-base font-semibold text-slate-800">
            自动化工作流
          </h2>
          <Badge variant="outline" className="rounded-full text-[10px]">
            Coze Workflow
          </Badge>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {workflowSteps.map((step, index) => (
            <div
              key={step.step}
              className="relative rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${step.bg}`}>
                  <step.icon className={`h-4.5 w-4.5 ${step.color}`} />
                </div>
                <span className="text-[10px] font-bold text-slate-300">
                  {step.step}
                </span>
              </div>
              <h3 className="mt-3 text-sm font-semibold text-slate-800">
                {step.title}
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                {step.desc}
              </p>
              <div className="mt-3 flex items-center gap-1.5">
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                  {step.model}
                </span>
              </div>
              {index < workflowSteps.length - 1 && (
                <div className="absolute -right-2 top-1/2 hidden -translate-y-1/2 lg:block">
                  <ArrowRight className="h-4 w-4 text-slate-300" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* System Status */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Workflow Status */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <Bot className="h-4 w-4 text-blue-500" />
            工作流状态
          </h3>
          <div className="mt-4 space-y-3">
            {[
              { name: '热点抓取工作流', status: '运行中', lastRun: '每2小时', color: 'bg-emerald-500' },
              { name: '脚本生成工作流', status: '待触发', lastRun: '手动触发', color: 'bg-amber-500' },
              { name: '数据回收工作流', status: '运行中', lastRun: '每日 08:00', color: 'bg-emerald-500' },
              { name: '知识库同步工作流', status: '运行中', lastRun: '实时', color: 'bg-emerald-500' },
            ].map((wf) => (
              <div
                key={wf.name}
                className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2.5"
              >
                <div className="flex items-center gap-2.5">
                  <span className={`h-2 w-2 rounded-full ${wf.color}`} />
                  <span className="text-sm text-slate-700">{wf.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400">{wf.lastRun}</span>
                  <Badge
                    variant="outline"
                    className={`rounded-full text-[10px] ${
                      wf.status === '运行中'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
                        : 'border-amber-200 bg-amber-50 text-amber-600'
                    }`}
                  >
                    {wf.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Manual Operations */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            人工操作范围
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            以下环节需要团队成员手动完成，Coze 工作流负责数据回收与状态管理
          </p>
          <div className="mt-4 space-y-3">
            {[
              { task: '视频拍摄与剪辑', owner: '制作团队', icon: Video },
              { task: '多平台手动发布', owner: '运营团队', icon: Play },
              { task: '内容终审与合规检查', owner: '审核负责人', icon: CheckCircle2 },
              { task: '知识库文档协作编辑', owner: '全体团队', icon: FileText },
            ].map((item) => (
              <div
                key={item.task}
                className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2.5"
              >
                <div className="flex items-center gap-2.5">
                  <item.icon className="h-4 w-4 text-slate-400" />
                  <span className="text-sm text-slate-700">{item.task}</span>
                </div>
                <Badge
                  variant="outline"
                  className="rounded-full border-slate-200 text-[10px] text-slate-500"
                >
                  {item.owner}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Getting Started Guide */}
      <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-blue-800">
          <Clock className="h-4 w-4" />
          快速开始
        </h3>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-lg bg-white p-3">
            <p className="text-xs font-medium text-blue-700">1. 抓取热榜</p>
            <p className="mt-1 text-[11px] text-slate-500">
              前往「选题池」点击「抓取热榜」获取抖音/视频号实时热门话题
            </p>
          </div>
          <div className="rounded-lg bg-white p-3">
            <p className="text-xs font-medium text-blue-700">2. 生成脚本</p>
            <p className="mt-1 text-[11px] text-slate-500">
              选择选题后点击「生成脚本」，AI 将自动生成视频脚本大纲
            </p>
          </div>
          <div className="rounded-lg bg-white p-3">
            <p className="text-xs font-medium text-blue-700">3. 导入数据</p>
            <p className="mt-1 text-[11px] text-slate-500">
              在「数据看板」导入视频数据（CSV/JSON），查看全平台数据分析
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
