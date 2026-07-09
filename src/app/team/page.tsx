'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import {
  Users,
  Calendar,
  CheckCircle2,
  Clock,
  UserPlus,
  Shield,
  Activity,
  BookOpen,
  FileText,
  Loader2,
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

const AVATAR_COLORS = [
  'bg-blue-500',
  'bg-violet-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-pink-500',
  'bg-cyan-500',
  'bg-indigo-500',
  'bg-rose-500',
];

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string | null;
  tasks: number;
  completedTasks: number;
  color: string;
}

interface ActivityItem {
  id: string;
  user_name: string;
  action: string;
  topic_title: string;
  created_at: string;
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return '刚刚';
  if (diffMin < 60) return `${diffMin} 分钟前`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} 小时前`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay} 天前`;
  return date.toLocaleDateString('zh-CN');
}

function getActionIcon(action: string) {
  if (action.includes('发布') || action.includes('完成')) return { icon: CheckCircle2, color: 'text-emerald-500' };
  if (action.includes('创建') || action.includes('新增')) return { icon: FileText, color: 'text-violet-500' };
  if (action.includes('导入') || action.includes('知识')) return { icon: BookOpen, color: 'text-cyan-500' };
  if (action.includes('认领')) return { icon: Users, color: 'text-amber-500' };
  return { icon: Activity, color: 'text-slate-500' };
}

export default function TeamPage() {
  const router = useRouter();
  const [supabase, setSupabase] = useState<ReturnType<typeof getSupabaseBrowserClient> | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);

  useEffect(() => {
    try {
      setSupabase(getSupabaseBrowserClient());
    } catch (e) {
      console.error('[team] Failed to initialize Supabase client:', e);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!supabase) return;

    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push('/login');
          return;
        }

        const token = session.access_token;
        const res = await fetch('/api/team', {
          headers: { 'x-session': token },
        });

        if (res.ok) {
          const result = await res.json();
          const data = result.data;

          // Assign colors to members
          const coloredMembers: TeamMember[] = (data.members || []).map((m: TeamMember, i: number) => ({
            ...m,
            department: m.department || '未分配',
            color: AVATAR_COLORS[i % AVATAR_COLORS.length],
          }));

          setMembers(coloredMembers);
          setActivities(data.activities || []);
        }
      } catch (err) {
        console.error('[team] Init error:', err);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [supabase, router]);

  const totalTasks = members.reduce((sum, m) => sum + m.tasks, 0);
  const completedTasks = members.reduce((sum, m) => sum + m.completedTasks, 0);
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        <span className="ml-2 text-slate-500">加载团队数据...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Users className="h-6 w-6 text-blue-600" />
          团队协作
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          查看团队成员工作进度和最近活动
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{members.length}</p>
                <p className="text-xs text-slate-500">团队成员</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{totalTasks}</p>
                <p className="text-xs text-slate-500">总任务数</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{completedTasks}</p>
                <p className="text-xs text-slate-500">已完成</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100">
                <Activity className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{completionRate}%</p>
                <p className="text-xs text-slate-500">完成率</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Team Members */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">团队成员</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => router.push('/settings')}
                >
                  <UserPlus className="h-3.5 w-3.5 mr-1" />
                  邀请成员
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {members.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">
                  暂无团队成员，请先在设置中邀请成员
                </div>
              ) : (
                <div className="space-y-3">
                  {members.map((member) => {
                    const isSelected = selectedMember === member.id;
                    const progress = member.tasks > 0 ? Math.round((member.completedTasks / member.tasks) * 100) : 0;
                    return (
                      <div
                        key={member.id}
                        onClick={() => setSelectedMember(isSelected ? null : member.id)}
                        className={`flex items-center gap-4 rounded-xl border p-4 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-blue-300 bg-blue-50/50 ring-1 ring-blue-200'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className={`${member.color} text-white text-sm font-medium`}>
                            {member.name.slice(0, 1)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-800">{member.name}</span>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {member.role === 'admin' ? '管理员' : '成员'}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">{member.department || '未分配'}</p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full transition-all"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium text-slate-600">{progress}%</span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1">
                            {member.completedTasks}/{member.tasks} 任务
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">最近活动</CardTitle>
              <CardDescription>团队成员的最新操作</CardDescription>
            </CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">
                  暂无活动记录
                </div>
              ) : (
                <div className="space-y-4">
                  {activities.map((activity) => {
                    const { icon: Icon, color } = getActionIcon(activity.action);
                    return (
                      <div key={activity.id} className="flex items-start gap-3">
                        <div className={`mt-0.5 ${color}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-700">
                            <span className="font-medium">{activity.user_name}</span>
                            {' '}{activity.action}
                          </p>
                          {activity.topic_title && (
                            <p className="text-xs text-slate-500 mt-0.5 truncate">
                              {activity.topic_title}
                            </p>
                          )}
                          <p className="text-[10px] text-slate-400 mt-1">
                            {formatTimeAgo(activity.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Links */}
          <Card className="mt-4">
            <CardContent className="pt-5">
              <h4 className="text-sm font-medium text-slate-700 mb-3">协作工具</h4>
              <div className="space-y-2">
                <div
                  onClick={() => router.push('/knowledge')}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 p-3 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <BookOpen className="h-4 w-4 text-cyan-500" />
                  <div>
                    <p className="text-xs font-medium text-slate-700">共享知识库</p>
                    <p className="text-[10px] text-slate-400">团队共享的文档素材库</p>
                  </div>
                </div>
                <div
                  onClick={() => router.push('/topics')}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 p-3 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <Calendar className="h-4 w-4 text-amber-500" />
                  <div>
                    <p className="text-xs font-medium text-slate-700">选题看板</p>
                    <p className="text-[10px] text-slate-400">查看团队选题进度</p>
                  </div>
                </div>
                <div
                  onClick={() => router.push('/settings')}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 p-3 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <Shield className="h-4 w-4 text-emerald-500" />
                  <div>
                    <p className="text-xs font-medium text-slate-700">平台设置</p>
                    <p className="text-[10px] text-slate-400">配置团队参数与权限</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
