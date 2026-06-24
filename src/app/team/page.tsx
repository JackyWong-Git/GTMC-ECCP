'use client';

import {
  Users,
  Bot,
  MessageSquare,
  Calendar,
  CheckCircle2,
  Clock,
  Send,
  Settings,
  UserPlus,
  Shield,
  Activity,
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const teamMembers = [
  {
    name: '张明',
    role: '内容策划',
    avatar: '张',
    tasks: 12,
    completed: 8,
    status: 'online',
    color: 'bg-blue-500',
  },
  {
    name: '李婷',
    role: '脚本编辑',
    avatar: '李',
    tasks: 9,
    completed: 7,
    status: 'online',
    color: 'bg-violet-500',
  },
  {
    name: '王浩',
    role: '视频制作',
    avatar: '王',
    tasks: 15,
    completed: 11,
    status: 'offline',
    color: 'bg-emerald-500',
  },
  {
    name: '赵雪',
    role: '数据分析',
    avatar: '赵',
    tasks: 6,
    completed: 5,
    status: 'online',
    color: 'bg-amber-500',
  },
];

const botCommands = [
  {
    command: '/抓取热点',
    description: '手动触发热点抓取工作流',
    usage: '今日 3 次',
  },
  {
    command: '/生成脚本 [选题名]',
    description: '为指定选题生成脚本大纲',
    usage: '今日 5 次',
  },
  {
    command: '/数据报告',
    description: '获取最新数据汇总报告',
    usage: '今日 2 次',
  },
  {
    command: '/任务分配 [成员] [选题]',
    description: '将选题分配给指定成员',
    usage: '今日 4 次',
  },
  {
    command: '/状态查询',
    description: '查看所有工作流运行状态',
    usage: '今日 8 次',
  },
  {
    command: '/发布提醒',
    description: '查看今日待发布视频列表',
    usage: '今日 1 次',
  },
];

const scheduledTasks = [
  {
    time: '08:00',
    task: '自动抓取抖音/视频号热点',
    type: '自动',
    status: 'completed',
  },
  {
    time: '10:00',
    task: '热点分析报告推送到运营群',
    type: '自动',
    status: 'completed',
  },
  {
    time: '12:00',
    task: '数据回收 — 上午发布视频数据',
    type: '自动',
    status: 'completed',
  },
  {
    time: '14:00',
    task: '脚本生成 — 新选题批量处理',
    type: '手动',
    status: 'pending',
  },
  {
    time: '16:00',
    task: '热点抓取 — 下午轮次',
    type: '自动',
    status: 'pending',
  },
  {
    time: '18:00',
    task: '数据回收 — 全天数据汇总',
    type: '自动',
    status: 'pending',
  },
  {
    time: '20:00',
    task: '日报生成 — 推送到飞书群',
    type: '自动',
    status: 'pending',
  },
];

const manualTasks = [
  {
    title: '视频拍摄与剪辑',
    description: '根据脚本大纲完成视频制作',
    responsible: '王浩',
    icon: '🎬',
  },
  {
    title: '多平台手动发布',
    description: '将成品视频发布到抖音、视频号等平台',
    responsible: '张明',
    icon: '📤',
  },
  {
    title: '内容终审',
    description: '发布前最终审核，确保内容质量',
    responsible: '李婷',
    icon: '✅',
  },
  {
    title: '评论互动管理',
    description: '回复用户评论，维护社区氛围',
    responsible: '赵雪',
    icon: '💬',
  },
];

export default function TeamPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">团队协作</h1>
          <p className="mt-1 text-sm text-slate-500">
            飞书 Bot 集成 · 任务调度 · 人工操作管理
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-xs"
          >
            <Settings className="h-3.5 w-3.5" />
            Bot 配置
          </Button>
          <Button className="gap-2 bg-[#0F172A] text-white hover:bg-slate-800">
            <UserPlus className="h-4 w-4" />
            邀请成员
          </Button>
        </div>
      </div>

      {/* Team Members */}
      <Card className="border-slate-200 bg-white">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-slate-800">
              团队成员
            </CardTitle>
            <Badge
              variant="secondary"
              className="rounded-full bg-slate-100 text-xs text-slate-600"
            >
              {teamMembers.filter((m) => m.status === 'online').length}/
              {teamMembers.length} 在线
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {teamMembers.map((member) => (
              <div
                key={member.name}
                className="rounded-lg border border-slate-200 p-4 transition-colors hover:bg-slate-50"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback
                        className={`${member.color} text-sm font-medium text-white`}
                      >
                        {member.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${
                        member.status === 'online'
                          ? 'bg-emerald-500'
                          : 'bg-slate-300'
                      }`}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {member.name}
                    </p>
                    <p className="text-xs text-slate-400">{member.role}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                  <div className="text-xs text-slate-400">
                    任务进度
                  </div>
                  <div className="text-xs font-medium text-slate-700">
                    {member.completed}/{member.tasks}
                  </div>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${member.color}`}
                    style={{
                      width: `${(member.completed / member.tasks) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Feishu Bot Commands */}
        <Card className="border-slate-200 bg-white">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-emerald-600" />
              <CardTitle className="text-sm font-semibold text-slate-800">
                飞书 Bot 指令
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-slate-400">
              在飞书群中使用以下指令触发工作流或查询状态
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {botCommands.map((cmd) => (
                <div
                  key={cmd.command}
                  className="flex items-center justify-between rounded-lg border border-slate-100 p-3 transition-colors hover:bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <code className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                      {cmd.command}
                    </code>
                    <span className="text-xs text-slate-500">
                      {cmd.description}
                    </span>
                  </div>
                  <span className="shrink-0 text-[10px] text-slate-400">
                    {cmd.usage}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 p-3">
              <Send className="h-4 w-4 text-emerald-600" />
              <p className="text-xs text-emerald-700">
                Bot 已接入「运营自动化」飞书群，支持手动触发和定时自动运行
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Daily Schedule */}
        <Card className="border-slate-200 bg-white">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              <CardTitle className="text-sm font-semibold text-slate-800">
                今日调度计划
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-slate-400">
              自动化任务与人工操作的每日时间线
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {scheduledTasks.map((task, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 rounded-lg p-2.5 transition-colors hover:bg-slate-50"
                >
                  <span className="w-12 shrink-0 text-xs font-medium tabular-nums text-slate-500">
                    {task.time}
                  </span>
                  <div className="h-4 w-px bg-slate-200" />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-slate-700">
                      {task.task}
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className={`rounded-full px-2 py-0 text-[10px] ${
                      task.type === '自动'
                        ? 'bg-blue-50 text-blue-600'
                        : 'bg-amber-50 text-amber-600'
                    }`}
                  >
                    {task.type}
                  </Badge>
                  {task.status === 'completed' ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <Clock className="h-3.5 w-3.5 text-slate-300" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Manual Tasks */}
      <Card className="border-slate-200 bg-white">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-amber-600" />
            <CardTitle className="text-sm font-semibold text-slate-800">
              人工操作范围
            </CardTitle>
          </div>
          <CardDescription className="text-xs text-slate-400">
            以下环节需团队成员手动完成，Coze 工作流负责数据回收与状态管理
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {manualTasks.map((task) => (
              <div
                key={task.title}
                className="rounded-lg border border-amber-200 bg-amber-50/50 p-4"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{task.icon}</span>
                  <h4 className="text-sm font-medium text-slate-800">
                    {task.title}
                  </h4>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {task.description}
                </p>
                <div className="mt-3 flex items-center gap-2 border-t border-amber-200/50 pt-3">
                  <Users className="h-3 w-3 text-slate-400" />
                  <span className="text-xs text-slate-500">
                    负责人: {task.responsible}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Cross-platform Data Flow */}
      <Card className="border-slate-200 bg-white">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-indigo-600" />
            <CardTitle className="text-sm font-semibold text-slate-800">
              跨平台数据流转
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4 overflow-x-auto pb-2">
            {[
              { name: '抖音', desc: '热门内容/视频数据', color: 'bg-pink-100 text-pink-700 border-pink-200' },
              { name: '视频号', desc: '热门内容/视频数据', color: 'bg-green-100 text-green-700 border-green-200' },
              { name: 'Coze 工作流', desc: '数据处理/AI生成', color: 'bg-blue-100 text-blue-700 border-blue-200' },
              { name: '飞书多维表', desc: '数据存储/协同', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
              { name: '飞书文档', desc: '脚本/报告存储', color: 'bg-violet-100 text-violet-700 border-violet-200' },
              { name: '飞书群', desc: '通知/调度/协作', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
            ].map((item, idx) => (
              <div key={item.name} className="flex items-center gap-3">
                <div
                  className={`min-w-[130px] rounded-lg border ${item.color} p-3 text-center`}
                >
                  <p className="text-xs font-semibold">{item.name}</p>
                  <p className="mt-0.5 text-[10px] opacity-70">
                    {item.desc}
                  </p>
                </div>
                {idx < 5 && (
                  <div className="flex items-center">
                    <div className="h-px w-6 bg-slate-300" />
                    <div className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                  </div>
                )}
              </div>
            ))}
          </div>
          <p className="mt-3 text-center text-xs text-slate-400">
            通过飞书插件读写数据，协调各平台发布后的信息同步，实现全流程数据可视化与协作跟踪
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
