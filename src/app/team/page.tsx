'use client';

import { useState, useEffect, useCallback } from 'react';
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
  RefreshCw,
  Link2,
  Mail,
  Phone,
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

interface FeishuMember {
  user_id: string;
  name: string;
  email: string;
  avatar_url: string;
  job_title: string;
  mobile: string;
  is_active: boolean;
}

interface FeishuCurrentUser {
  user_id: string;
  name: string;
  email: string;
  avatar_url: string;
  job_title: string;
  department_ids: string[];
}

interface FeishuDepartment {
  department_id: string;
  name: string;
}

const AVATAR_COLORS = [
  'bg-blue-500',
  'bg-violet-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-pink-500',
  'bg-indigo-500',
  'bg-teal-500',
  'bg-rose-500',
];

function getAvatarColor(index: number): string {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

const botCommands = [
  {
    command: '/抓取热点',
    description: '手动触发热点抓取工作流',
    usage: '在飞书群中发送即可触发',
  },
  {
    command: '/生成脚本 [选题名]',
    description: '为指定选题生成脚本大纲',
    usage: '在飞书群中发送即可触发',
  },
  {
    command: '/数据报告',
    description: '获取最新数据汇总报告',
    usage: '在飞书群中发送即可触发',
  },
  {
    command: '/任务分配 [成员] [选题]',
    description: '将选题分配给指定成员',
    usage: '在飞书群中发送即可触发',
  },
  {
    command: '/状态查询',
    description: '查看所有工作流运行状态',
    usage: '在飞书群中发送即可触发',
  },
  {
    command: '/发布提醒',
    description: '查看今日待发布视频列表',
    usage: '在飞书群中发送即可触发',
  },
];

const scheduledTasks = [
  { time: '08:00', task: '自动抓取抖音/视频号热点', type: '自动', status: 'pending' },
  { time: '10:00', task: '热点分析报告推送到运营群', type: '自动', status: 'pending' },
  { time: '12:00', task: '数据回收 — 上午发布视频数据', type: '自动', status: 'pending' },
  { time: '14:00', task: '脚本生成 — 新选题批量处理', type: '手动', status: 'pending' },
  { time: '16:00', task: '热点抓取 — 下午轮次', type: '自动', status: 'pending' },
  { time: '18:00', task: '数据回收 — 全天数据汇总', type: '自动', status: 'pending' },
  { time: '20:00', task: '日报生成 — 推送到飞书群', type: '自动', status: 'pending' },
];

const manualTasks = [
  { title: '视频拍摄与剪辑', description: '根据脚本大纲完成视频制作', icon: '🎬' },
  { title: '多平台手动发布', description: '将成品视频发布到抖音、视频号等平台', icon: '📤' },
  { title: '内容终审', description: '发布前最终审核，确保内容质量', icon: '✅' },
  { title: '评论互动管理', description: '回复用户评论，维护社区氛围', icon: '💬' },
];

export default function TeamPage() {
  const [currentUser, setCurrentUser] = useState<FeishuCurrentUser | null>(null);
  const [members, setMembers] = useState<FeishuMember[]>([]);
  const [departments, setDepartments] = useState<FeishuDepartment[]>([]);
  const [loading, setLoading] = useState(false);
  const [feishuConnected, setFeishuConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 检查飞书连接状态
  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/feishu/status');
      const data = await res.json();
      if (data.success && data.data.connected) {
        setFeishuConnected(true);
        setCurrentUser(data.data.user);
      }
    } catch {
      // ignore
    }
  }, []);

  // 同步飞书通讯录
  const syncContacts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/feishu/sync/contacts');
      const data = await res.json();
      if (data.success) {
        setCurrentUser(data.data.currentUser);
        setMembers(data.data.members);
        setDepartments(data.data.departments);
      } else {
        setError(data.error || '同步失败');
      }
    } catch {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const activeMembers = members.filter((m) => m.is_active);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">团队协作</h1>
          <p className="mt-1 text-sm text-slate-500">
            飞书通讯录同步 · Bot 指令 · 任务调度 · 人工操作管理
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-xs"
            onClick={() => (window.location.href = '/settings')}
          >
            <Settings className="h-3.5 w-3.5" />
            飞书集成
          </Button>
          {feishuConnected ? (
            <Button
              className="gap-2 bg-[#0F172A] text-white hover:bg-slate-800"
              onClick={syncContacts}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? '同步中...' : '同步通讯录'}
            </Button>
          ) : (
            <Button
              className="gap-2 bg-[#0F172A] text-white hover:bg-slate-800"
              onClick={() => (window.location.href = '/settings')}
            >
              <Link2 className="h-4 w-4" />
              连接飞书账号
            </Button>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
          <p className="mt-1 text-xs text-red-500">
            请确保已在「飞书集成」页面连接账号，并开通了通讯录读取权限。
          </p>
        </div>
      )}

      {/* Current User */}
      {currentUser && (
        <Card className="border-slate-200 bg-white">
          <CardContent className="flex items-center gap-4 p-4">
            <Avatar className="h-12 w-12">
              {currentUser.avatar_url ? (
                <img
                  src={currentUser.avatar_url}
                  alt={currentUser.name}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <AvatarFallback className="bg-[#0F172A] text-sm font-medium text-white">
                  {currentUser.name?.charAt(0) || '?'}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-slate-800">
                  {currentUser.name}
                </p>
                <Badge className="rounded-full bg-emerald-100 text-[10px] text-emerald-700">
                  当前登录
                </Badge>
              </div>
              <p className="text-xs text-slate-400">
                {currentUser.job_title || '未设置职位'}
                {currentUser.email && ` · ${currentUser.email}`}
              </p>
            </div>
            <div className="text-right text-xs text-slate-400">
              <p>部门数: {currentUser.department_ids?.length || 0}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Team Members */}
      <Card className="border-slate-200 bg-white">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-slate-800">
              团队成员
            </CardTitle>
            <div className="flex items-center gap-2">
              {departments.length > 0 && (
                <Badge
                  variant="secondary"
                  className="rounded-full bg-indigo-50 text-[10px] text-indigo-600"
                >
                  {departments.length} 个部门
                </Badge>
              )}
              <Badge
                variant="secondary"
                className="rounded-full bg-slate-100 text-xs text-slate-600"
              >
                {activeMembers.length}/{members.length} 在线
              </Badge>
            </div>
          </div>
          <CardDescription className="text-xs text-slate-400">
            {feishuConnected
              ? '点击「同步通讯录」从飞书获取团队成员信息'
              : '请先连接飞书账号以同步团队成员'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {members.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              {members.map((member, idx) => (
                <div
                  key={member.user_id}
                  className="rounded-lg border border-slate-200 p-4 transition-colors hover:bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="h-10 w-10">
                        {member.avatar_url ? (
                          <img
                            src={member.avatar_url}
                            alt={member.name}
                            className="h-full w-full rounded-full object-cover"
                          />
                        ) : (
                          <AvatarFallback
                            className={`${getAvatarColor(idx)} text-sm font-medium text-white`}
                          >
                            {member.name?.charAt(0) || '?'}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${
                          member.is_active ? 'bg-emerald-500' : 'bg-slate-300'
                        }`}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">
                        {member.name}
                      </p>
                      <p className="truncate text-xs text-slate-400">
                        {member.job_title || '未设置职位'}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">
                    {member.email && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Mail className="h-3 w-3" />
                        <span className="truncate">{member.email}</span>
                      </div>
                    )}
                    {member.mobile && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Phone className="h-3 w-3" />
                        <span>{member.mobile}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="mb-3 h-10 w-10 text-slate-200" />
              <p className="text-sm font-medium text-slate-500">
                {feishuConnected ? '尚未同步团队成员' : '请先连接飞书账号'}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {feishuConnected
                  ? '点击右上角「同步通讯录」获取飞书组织中的团队成员'
                  : '连接飞书账号后，可自动同步组织通讯录中的成员信息'}
              </p>
              {feishuConnected && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 gap-2"
                  onClick={syncContacts}
                  disabled={loading}
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                  同步通讯录
                </Button>
              )}
            </div>
          )}
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
                每日调度计划
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
                  <Clock className="h-3.5 w-3.5 text-slate-300" />
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
