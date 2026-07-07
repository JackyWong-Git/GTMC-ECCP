'use client';

import { useState } from 'react';
import {
  Users,
  MessageSquare,
  Calendar,
  CheckCircle2,
  Clock,
  Send,
  UserPlus,
  Shield,
  Activity,
  BookOpen,
  FileText,
  BarChart3,
  Lightbulb,
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
  role: string;
  department: string;
  tasks: number;
  completedTasks: number;
  color: string;
}

// 模拟团队成员数据
const TEAM_MEMBERS: TeamMember[] = [
  { id: '1', name: '张明', role: '运营负责人', department: '内容运营', tasks: 12, completedTasks: 9, color: AVATAR_COLORS[0] },
  { id: '2', name: '李婷', role: '脚本编辑', department: '内容创作', tasks: 8, completedTasks: 7, color: AVATAR_COLORS[1] },
  { id: '3', name: '王浩', role: '数据分析师', department: '数据分析', tasks: 6, completedTasks: 5, color: AVATAR_COLORS[2] },
  { id: '4', name: '赵雪', role: '选题策划', department: '内容运营', tasks: 10, completedTasks: 8, color: AVATAR_COLORS[3] },
  { id: '5', name: '陈磊', role: '视频制作', department: '内容创作', tasks: 5, completedTasks: 3, color: AVATAR_COLORS[4] },
  { id: '6', name: '刘芳', role: '公众号编辑', department: '内容运营', tasks: 7, completedTasks: 6, color: AVATAR_COLORS[5] },
];

interface ActivityItem {
  id: string;
  user: string;
  action: string;
  target: string;
  time: string;
  icon: typeof FileText;
  color: string;
}

const RECENT_ACTIVITIES: ActivityItem[] = [
  { id: '1', user: '张明', action: '创建了工作流', target: '视频脚本全流程', time: '10 分钟前', icon: Activity, color: 'text-violet-500' },
  { id: '2', user: '李婷', action: '导入了知识库文档', target: '2024年汽车行业白皮书', time: '25 分钟前', icon: BookOpen, color: 'text-cyan-500' },
  { id: '3', user: '王浩', action: '生成了数据周报', target: '第 26 周运营数据汇总', time: '1 小时前', icon: BarChart3, color: 'text-emerald-500' },
  { id: '4', user: '赵雪', action: '新增了选题', target: '新能源汽车充电基础设施分析', time: '2 小时前', icon: Lightbulb, color: 'text-amber-500' },
  { id: '5', user: '刘芳', action: '发布了公众号文章', target: '深度解读：智能座舱的未来趋势', time: '3 小时前', icon: FileText, color: 'text-pink-500' },
];

export default function TeamPage() {
  const [selectedMember, setSelectedMember] = useState<string | null>(null);

  const totalTasks = TEAM_MEMBERS.reduce((sum, m) => sum + m.tasks, 0);
  const completedTasks = TEAM_MEMBERS.reduce((sum, m) => sum + m.completedTasks, 0);
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

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
                <p className="text-2xl font-bold text-slate-900">{TEAM_MEMBERS.length}</p>
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
                <Button variant="outline" size="sm" className="text-xs">
                  <UserPlus className="h-3.5 w-3.5 mr-1" />
                  邀请成员
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {TEAM_MEMBERS.map((member) => {
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
                            {member.role}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{member.department}</p>
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
              <div className="space-y-4">
                {RECENT_ACTIVITIES.map((activity) => {
                  const Icon = activity.icon;
                  return (
                    <div key={activity.id} className="flex items-start gap-3">
                      <div className={`mt-0.5 ${activity.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-700">
                          <span className="font-medium">{activity.user}</span>
                          {' '}{activity.action}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">
                          {activity.target}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1">{activity.time}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Quick Links */}
          <Card className="mt-4">
            <CardContent className="pt-5">
              <h4 className="text-sm font-medium text-slate-700 mb-3">协作工具</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 p-3 hover:bg-slate-50 transition-colors cursor-pointer">
                  <BookOpen className="h-4 w-4 text-cyan-500" />
                  <div>
                    <p className="text-xs font-medium text-slate-700">共享知识库</p>
                    <p className="text-[10px] text-slate-400">团队共享的文档素材库</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 p-3 hover:bg-slate-50 transition-colors cursor-pointer">
                  <Calendar className="h-4 w-4 text-amber-500" />
                  <div>
                    <p className="text-xs font-medium text-slate-700">内容日历</p>
                    <p className="text-[10px] text-slate-400">查看团队内容发布计划</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 p-3 hover:bg-slate-50 transition-colors cursor-pointer">
                  <Shield className="h-4 w-4 text-emerald-500" />
                  <div>
                    <p className="text-xs font-medium text-slate-700">权限管理</p>
                    <p className="text-[10px] text-slate-400">配置团队成员操作权限</p>
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
