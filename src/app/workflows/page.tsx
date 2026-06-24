'use client';

import { useState } from 'react';
import {
  Workflow,
  Play,
  Pause,
  Settings,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  RefreshCw,
  Zap,
  ArrowRight,
  Activity,
  Timer,
  Database,
  Globe,
  Bot,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';

interface WorkflowConfig {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'paused' | 'error';
  trigger: string;
  schedule: string;
  lastRun: string;
  nextRun: string;
  successRate: number;
  totalRuns: number;
  icon: typeof Workflow;
  color: string;
  nodes: string[];
}

const workflows: WorkflowConfig[] = [
  {
    id: 'hot-topic',
    name: '热点抓取流',
    description: '定时抓取抖音/视频号热门内容，分析后自动写入飞书多维表',
    status: 'active',
    trigger: '定时触发',
    schedule: '每2小时',
    lastRun: '2024-12-19 14:00',
    nextRun: '2024-12-19 16:00',
    successRate: 99.2,
    totalRuns: 1248,
    icon: Globe,
    color: 'text-amber-500',
    nodes: ['定时触发器', '抖音热榜API', '视频号热榜API', 'AI内容分析', '飞书多维表写入'],
  },
  {
    id: 'script-gen',
    name: '脚本生成流',
    description: '选中选题后自动调用大模型生成脚本大纲，存入飞书文档',
    status: 'active',
    trigger: '手动/事件触发',
    schedule: '按需',
    lastRun: '2024-12-19 13:45',
    nextRun: '等待触发',
    successRate: 97.8,
    totalRuns: 356,
    icon: Zap,
    color: 'text-violet-500',
    nodes: ['选题变更监听', '竞品内容分析', '大模型脚本生成', '飞书文档创建', '通知负责人'],
  },
  {
    id: 'data-collect',
    name: '数据回收流',
    description: '定时抓取已发布视频的播放量、点赞、评论等数据汇总到多维表',
    status: 'active',
    trigger: '定时触发',
    schedule: '每6小时',
    lastRun: '2024-12-19 12:00',
    nextRun: '2024-12-19 18:00',
    successRate: 98.5,
    totalRuns: 892,
    icon: Database,
    color: 'text-blue-500',
    nodes: ['定时触发器', '抖音数据API', '视频号数据API', '数据清洗', '多维表更新'],
  },
  {
    id: 'feishu-notify',
    name: '飞书通知流',
    description: '将工作流状态和关键事件推送到飞书群，支持手动触发',
    status: 'error',
    trigger: '事件触发',
    schedule: '实时',
    lastRun: '2024-12-19 13:30',
    nextRun: '—',
    successRate: 94.1,
    totalRuns: 2156,
    icon: Bot,
    color: 'text-emerald-500',
    nodes: ['事件监听', '消息格式化', '飞书Bot发送', '状态确认'],
  },
];

const recentLogs = [
  { time: '14:00:12', workflow: '热点抓取流', status: 'success', message: '成功抓取 23 条热门内容，写入多维表' },
  { time: '13:45:33', workflow: '脚本生成流', status: 'success', message: '为「智能家居设备」生成脚本大纲完成' },
  { time: '13:30:08', workflow: '飞书通知流', status: 'error', message: '飞书Bot API 超时，重试中...' },
  { time: '13:30:15', workflow: '飞书通知流', status: 'success', message: '重试成功，消息已推送到运营群' },
  { time: '12:00:05', workflow: '数据回收流', status: 'success', message: '回收 15 个视频数据，更新多维表' },
  { time: '10:00:11', workflow: '热点抓取流', status: 'success', message: '成功抓取 18 条热门内容，写入多维表' },
  { time: '09:15:22', workflow: '脚本生成流', status: 'success', message: '为「沟通技巧」生成脚本大纲完成' },
  { time: '08:00:03', workflow: '热点抓取流', status: 'success', message: '成功抓取 21 条热门内容，写入多维表' },
];

export default function WorkflowsPage() {
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowConfig>(
    workflows[0]
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">工作流管理</h1>
          <p className="mt-1 text-sm text-slate-500">
            Coze 工作流配置与监控 · 集成飞书群通知
          </p>
        </div>
        <Button className="gap-2 bg-[#0F172A] text-white hover:bg-slate-800">
          <Settings className="h-4 w-4" />
          工作流配置
        </Button>
      </div>

      {/* Workflow Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {workflows.map((wf) => {
          const Icon = wf.icon;
          const isSelected = selectedWorkflow.id === wf.id;
          return (
            <Card
              key={wf.id}
              className={`cursor-pointer border transition-all duration-200 hover:shadow-sm ${
                isSelected
                  ? 'border-slate-400 ring-1 ring-slate-200'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
              onClick={() => setSelectedWorkflow(wf)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                      <Icon className={`h-5 w-5 ${wf.color}`} />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-semibold text-slate-800">
                        {wf.name}
                      </CardTitle>
                      <CardDescription className="mt-0.5 text-xs text-slate-400">
                        {wf.trigger} · {wf.schedule}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {wf.status === 'active' ? (
                      <Badge className="rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100">
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        运行中
                      </Badge>
                    ) : wf.status === 'error' ? (
                      <Badge className="rounded-full bg-red-50 text-red-700 hover:bg-red-100">
                        <AlertCircle className="mr-1 h-3 w-3" />
                        异常
                      </Badge>
                    ) : (
                      <Badge className="rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200">
                        <Pause className="mr-1 h-3 w-3" />
                        已暂停
                      </Badge>
                    )}
                    <Switch
                      checked={wf.status === 'active'}
                      className="scale-75"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-slate-500">{wf.description}</p>
                <div className="mt-3 grid grid-cols-3 gap-3 border-t border-slate-100 pt-3">
                  <div>
                    <p className="text-xs text-slate-400">成功率</p>
                    <p className="text-sm font-semibold tabular-nums text-slate-800">
                      {wf.successRate}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">总运行</p>
                    <p className="text-sm font-semibold tabular-nums text-slate-800">
                      {wf.totalRuns}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">下次运行</p>
                    <p className="text-sm font-semibold text-slate-800">
                      {wf.nextRun === '—'
                        ? '—'
                        : wf.nextRun.split(' ')[1]}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Selected Workflow Detail */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Workflow Nodes */}
        <Card className="col-span-2 border-slate-200 bg-white">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-slate-800">
                {selectedWorkflow.name} — 节点流程
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
              >
                <Play className="h-3 w-3" />
                手动触发
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {selectedWorkflow.nodes.map((node, idx) => (
                <div key={node} className="flex items-center gap-2">
                  <div className="flex min-w-[120px] items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <div
                      className={`h-2 w-2 rounded-full ${
                        selectedWorkflow.status === 'active'
                          ? 'bg-emerald-500'
                          : selectedWorkflow.status === 'error'
                            ? 'bg-red-500'
                            : 'bg-slate-400'
                      }`}
                    />
                    <span className="text-xs font-medium text-slate-700">
                      {node}
                    </span>
                  </div>
                  {idx < selectedWorkflow.nodes.length - 1 && (
                    <ArrowRight className="h-4 w-4 shrink-0 text-slate-300" />
                  )}
                </div>
              ))}
            </div>

            {/* Run Info */}
            <div className="mt-4 grid grid-cols-2 gap-4 rounded-lg border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-400">上次运行</p>
                  <p className="text-sm font-medium text-slate-700">
                    {selectedWorkflow.lastRun}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Timer className="h-4 w-4 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-400">下次运行</p>
                  <p className="text-sm font-medium text-slate-700">
                    {selectedWorkflow.nextRun}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Logs */}
        <Card className="border-slate-200 bg-white">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-slate-800">
                运行日志
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-xs text-slate-500"
              >
                <RefreshCw className="h-3 w-3" />
                刷新
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="max-h-[320px] space-y-1 overflow-y-auto">
              {recentLogs.map((log, idx) => (
                <div
                  key={idx}
                  className="rounded-lg p-2.5 transition-colors hover:bg-slate-50"
                >
                  <div className="flex items-center gap-2">
                    {log.status === 'success' ? (
                      <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-500" />
                    ) : (
                      <XCircle className="h-3 w-3 shrink-0 text-red-500" />
                    )}
                    <span className="text-[10px] tabular-nums text-slate-400">
                      {log.time}
                    </span>
                    <Badge
                      variant="secondary"
                      className="rounded-full px-1.5 py-0 text-[9px] text-slate-500"
                    >
                      {log.workflow}
                    </Badge>
                  </div>
                  <p className="mt-1 pl-5 text-xs text-slate-600">
                    {log.message}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Integration Status */}
      <Card className="border-slate-200 bg-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-800">
            集成状态
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                <Workflow className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800">
                  Coze 工作流
                </p>
                <p className="text-xs text-emerald-600">已连接 · 4 个工作流</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50">
                <Database className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800">
                  飞书多维表
                </p>
                <p className="text-xs text-emerald-600">
                  已连接 · 3 张数据表
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
                <Bot className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800">
                  飞书 Bot
                </p>
                <p className="text-xs text-amber-600">
                  连接不稳定 · 需检查配置
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
