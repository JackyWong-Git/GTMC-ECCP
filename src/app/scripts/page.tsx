'use client';

import { useState } from 'react';
import {
  FileText,
  Sparkles,
  Clock,
  CheckCircle2,
  Loader2,
  Copy,
  Download,
  ChevronRight,
  Wand2,
  RefreshCw,
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

interface Script {
  id: number;
  topicTitle: string;
  status: 'generating' | 'completed' | 'reviewing' | 'approved';
  generatedAt: string;
  wordCount: number;
  outline: string[];
  assignee: string;
}

const mockScripts: Script[] = [
  {
    id: 1,
    topicTitle: '2024年最值得入手的智能家居设备',
    status: 'generating',
    generatedAt: '2024-12-19 14:30',
    wordCount: 0,
    outline: [],
    assignee: '张明',
  },
  {
    id: 2,
    topicTitle: '职场新人必看的10个沟通技巧',
    status: 'completed',
    generatedAt: '2024-12-19 10:15',
    wordCount: 1850,
    outline: [
      '开场：用一个职场尴尬场景引入话题',
      '第一部分：倾听的艺术 — 3个实用倾听技巧',
      '第二部分：表达清晰 — 结构化表达方法',
      '第三部分：非暴力沟通 — 处理冲突的4步法',
      '结尾：总结要点 + 互动引导',
    ],
    assignee: '李婷',
  },
  {
    id: 3,
    topicTitle: '一人食快手菜谱：15分钟搞定晚餐',
    status: 'reviewing',
    generatedAt: '2024-12-18 16:45',
    wordCount: 2100,
    outline: [
      '开场：展示成品菜品特写',
      '食材准备：列出5种基础食材',
      '步骤一：预处理食材（3分钟）',
      '步骤二：烹饪过程（8分钟）',
      '步骤三：摆盘与调味（4分钟）',
      '结尾：品尝 + 下期预告',
    ],
    assignee: '张明',
  },
  {
    id: 4,
    topicTitle: '新手养猫指南：从选猫到日常护理',
    status: 'approved',
    generatedAt: '2024-12-17 09:20',
    wordCount: 2400,
    outline: [
      '开场：可爱猫咪日常片段',
      '选猫指南：品种推荐与性格分析',
      '到家准备：必备物品清单',
      '日常护理：喂食、清洁、健康检查',
      '常见问题：新手养猫FAQ',
      '结尾：养猫心得分享',
    ],
    assignee: '赵雪',
  },
];

const statusConfig = {
  generating: {
    label: '生成中',
    icon: Loader2,
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    border: 'border-violet-200',
  },
  completed: {
    label: '已完成',
    icon: CheckCircle2,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
  },
  reviewing: {
    label: '审核中',
    icon: Clock,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
  },
  approved: {
    label: '已通过',
    icon: CheckCircle2,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
  },
};

export default function ScriptsPage() {
  const [selectedScript, setSelectedScript] = useState<Script | null>(
    mockScripts[1]
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">脚本工坊</h1>
          <p className="mt-1 text-sm text-slate-500">
            AI 大模型自动生成脚本大纲 · 减少人工撰写时长
          </p>
        </div>
        <Button className="gap-2 bg-violet-600 text-white hover:bg-violet-700">
          <Wand2 className="h-4 w-4" />
          批量生成脚本
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: '今日生成', value: '8', icon: Sparkles, color: 'text-violet-500' },
          { label: '审核中', value: '3', icon: Clock, color: 'text-amber-500' },
          { label: '已通过', value: '12', icon: CheckCircle2, color: 'text-emerald-500' },
          { label: '平均字数', value: '2.1k', icon: FileText, color: 'text-blue-500' },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4"
            >
              <Icon className={`h-5 w-5 ${stat.color}`} />
              <div>
                <p className="text-lg font-bold tabular-nums text-slate-900">
                  {stat.value}
                </p>
                <p className="text-xs text-slate-500">{stat.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Script List */}
        <div className="col-span-2 space-y-3">
          <h3 className="text-sm font-semibold text-slate-700">脚本列表</h3>
          {mockScripts.map((script) => {
            const config = statusConfig[script.status];
            const StatusIcon = config.icon;
            const isSelected = selectedScript?.id === script.id;

            return (
              <Card
                key={script.id}
                className={`cursor-pointer border transition-all duration-200 hover:shadow-sm ${
                  isSelected
                    ? 'border-violet-300 bg-violet-50/30 ring-1 ring-violet-200'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
                onClick={() => setSelectedScript(script)}
              >
                <CardHeader className="pb-2 pt-4">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-sm font-medium leading-snug text-slate-800">
                      {script.topicTitle}
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className={`shrink-0 rounded-full border px-2 py-0 text-[10px] font-medium ${config.color} ${config.bg} ${config.border}`}
                    >
                      <StatusIcon
                        className={`mr-1 h-2.5 w-2.5 ${
                          script.status === 'generating'
                            ? 'animate-spin'
                            : ''
                        }`}
                      />
                      {config.label}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs text-slate-400">
                    {script.assignee} · {script.generatedAt}
                    {script.wordCount > 0 && ` · ${script.wordCount}字`}
                  </CardDescription>
                </CardHeader>
                {script.outline.length > 0 && (
                  <CardContent className="pt-0">
                    <p className="line-clamp-2 text-xs text-slate-500">
                      {script.outline[0]}
                    </p>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>

        {/* Script Detail */}
        <div className="col-span-3">
          {selectedScript ? (
            <Card className="border-slate-200 bg-white">
              <CardHeader className="border-b border-slate-100 pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold text-slate-900">
                      {selectedScript.topicTitle}
                    </CardTitle>
                    <CardDescription className="mt-1 text-xs text-slate-400">
                      生成时间: {selectedScript.generatedAt} · 负责人:{' '}
                      {selectedScript.assignee}
                      {selectedScript.wordCount > 0 &&
                        ` · ${selectedScript.wordCount}字`}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs"
                    >
                      <Copy className="h-3 w-3" />
                      复制
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs"
                    >
                      <Download className="h-3 w-3" />
                      导出
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs"
                    >
                      <RefreshCw className="h-3 w-3" />
                      重新生成
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-5">
                {selectedScript.status === 'generating' ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="relative">
                      <div className="h-12 w-12 rounded-full border-2 border-violet-200" />
                      <Loader2 className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 animate-spin text-violet-500" />
                    </div>
                    <p className="mt-4 text-sm font-medium text-slate-700">
                      AI 正在生成脚本大纲...
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      正在分析选题热度、竞品内容和受众偏好
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-violet-500" />
                      <h3 className="text-sm font-semibold text-slate-800">
                        脚本大纲
                      </h3>
                    </div>
                    <div className="space-y-2">
                      {selectedScript.outline.map((item, idx) => (
                        <div
                          key={idx}
                          className="group flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-3 transition-colors hover:bg-slate-50"
                        >
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-violet-100 text-xs font-bold text-violet-600">
                            {idx + 1}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-slate-700">{item}</p>
                          </div>
                          <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100" />
                        </div>
                      ))}
                    </div>

                    {/* Script Metadata */}
                    <div className="mt-6 rounded-lg border border-slate-100 bg-slate-50 p-4">
                      <h4 className="mb-3 text-xs font-semibold text-slate-600">
                        生成参数
                      </h4>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-slate-400">模型:</span>
                          <span className="ml-2 text-slate-700">
                            Doubao-pro-256k
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400">风格:</span>
                          <span className="ml-2 text-slate-700">
                            轻松口语化
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400">时长:</span>
                          <span className="ml-2 text-slate-700">
                            3-5分钟
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400">目标平台:</span>
                          <span className="ml-2 text-slate-700">
                            抖音/视频号
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="flex h-[400px] items-center justify-center border-slate-200 bg-white">
              <div className="text-center">
                <FileText className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-3 text-sm text-slate-500">
                  选择一个脚本查看详情
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
