'use client';

import { useState, useEffect } from 'react';
import {
  Lightbulb,
  FileText,
  Video,
  TrendingUp,
  TrendingDown,
  Clock,
  Zap,
  CheckCircle2,
  AlertCircle,
  Play,
  ArrowRight,
  RefreshCw,
  Database,
  Bot,
  Users,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Activity,
  BookOpen,
  BarChart3,
  Calendar,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import Link from 'next/link';

// Workflow steps
const workflowSteps = [
  {
    step: '01',
    title: '热点抓取',
    desc: 'Coze 工作流定时抓取抖音/视频号热门内容',
    model: 'Doubao Seed 2.0 Lite',
    icon: Zap,
    color: 'text-amber-500',
    bg: 'bg-amber-50',
  },
  {
    step: '02',
    title: '选题评估',
    desc: 'AI 分析热度因素、受众画像与选题建议',
    model: 'Doubao Seed 2.0 Lite',
    icon: Lightbulb,
    color: 'text-blue-500',
    bg: 'bg-blue-50',
  },
  {
    step: '03',
    title: '脚本生成',
    desc: '大模型生成脚本大纲，支持流式输出',
    model: 'Qwen 3.5 Plus',
    icon: FileText,
    color: 'text-violet-500',
    bg: 'bg-violet-50',
  },
  {
    step: '04',
    title: '数据回收',
    desc: '定时抓取播放量、点赞、评论等数据',
    model: 'Doubao Seed 2.0 Mini',
    icon: TrendingUp,
    color: 'text-emerald-500',
    bg: 'bg-emerald-50',
  },
];

// Quick actions
const quickActions = [
  { title: '抓取热榜', desc: '获取抖音/视频号实时热门话题', icon: RefreshCw, href: '/workspace', color: 'text-amber-500', bg: 'bg-amber-50' },
  { title: '导入数据', desc: '上传 CSV/JSON 格式的选题或视频数据', icon: Database, href: '/analytics', color: 'text-blue-500', bg: 'bg-blue-50' },
  { title: '生成脚本', desc: '选择选题后 AI 自动生成脚本大纲', icon: FileText, href: '/workspace', color: 'text-violet-500', bg: 'bg-violet-50' },
  { title: '知识库', desc: '管理文档、语义搜索、AI 引用', icon: BookOpen, href: '/knowledge', color: 'text-cyan-500', bg: 'bg-cyan-50' },
];

// Team members
const AVATAR_COLORS = ['bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-500', 'bg-pink-500', 'bg-cyan-500'];

interface TeamMember {
  id: string;
  name: string;
  role: string;
  tasks: number;
  completedTasks: number;
  color: string;
}

const TEAM_MEMBERS: TeamMember[] = [
  { id: '1', name: '张明', role: '运营负责人', tasks: 12, completedTasks: 9, color: AVATAR_COLORS[0] },
  { id: '2', name: '李婷', role: '脚本编辑', tasks: 8, completedTasks: 7, color: AVATAR_COLORS[1] },
  { id: '3', name: '王浩', role: '数据分析', tasks: 6, completedTasks: 5, color: AVATAR_COLORS[2] },
  { id: '4', name: '赵雪', role: '选题策划', tasks: 10, completedTasks: 8, color: AVATAR_COLORS[3] },
  { id: '5', name: '陈磊', role: '视频制作', tasks: 5, completedTasks: 3, color: AVATAR_COLORS[4] },
  { id: '6', name: '刘芳', role: '公众号编辑', tasks: 7, completedTasks: 6, color: AVATAR_COLORS[5] },
];

// Recent activities
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

// Platform data
interface PlatformData {
  platform: string;
  icon: string;
  color: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  videos: number;
  trend: number;
}

const PLATFORM_DATA: PlatformData[] = [
  { platform: '抖音', icon: '🎵', color: 'bg-pink-50 border-pink-200', views: 125800, likes: 8920, comments: 1234, shares: 567, videos: 24, trend: 12.5 },
  { platform: '视频号', icon: '📺', color: 'bg-green-50 border-green-200', views: 89600, likes: 5670, comments: 890, shares: 345, videos: 18, trend: 8.3 },
  { platform: 'KILAKILA', icon: '✨', color: 'bg-purple-50 border-purple-200', views: 45200, likes: 3210, comments: 456, shares: 189, videos: 12, trend: -2.1 },
];

function formatNumber(num: number): string {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + '万';
  }
  return num.toLocaleString();
}

export default function DashboardPage() {
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleString('zh-CN', { 
        month: 'long', 
        day: 'numeric',
        weekday: 'long',
        hour: '2-digit',
        minute: '2-digit'
      }));
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // Calculate team stats
  const totalTasks = TEAM_MEMBERS.reduce((sum, m) => sum + m.tasks, 0);
  const completedTasks = TEAM_MEMBERS.reduce((sum, m) => sum + m.completedTasks, 0);
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Calculate platform totals
  const totalViews = PLATFORM_DATA.reduce((sum, p) => sum + p.views, 0);
  const totalLikes = PLATFORM_DATA.reduce((sum, p) => sum + p.likes, 0);
  const totalComments = PLATFORM_DATA.reduce((sum, p) => sum + p.comments, 0);
  const totalVideos = PLATFORM_DATA.reduce((sum, p) => sum + p.videos, 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">运营总览</h1>
          <p className="mt-1 text-sm text-slate-500">
            {currentTime} · 自动化运营工作流 · 选题策划 → 脚本生成 → 知识库沉淀 → 数据回收
          </p>
        </div>
        <Link href="/topics">
          <Button size="sm" className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            抓取热榜
          </Button>
        </Link>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Eye className="h-3.5 w-3.5" />
            总播放量
          </div>
          <p className="mt-2 text-xl font-bold text-slate-900">{formatNumber(totalViews)}</p>
          <p className="mt-1 text-xs text-emerald-600">+12.5% 较上周</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Heart className="h-3.5 w-3.5" />
            总点赞
          </div>
          <p className="mt-2 text-xl font-bold text-slate-900">{formatNumber(totalLikes)}</p>
          <p className="mt-1 text-xs text-emerald-600">+8.3% 较上周</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <MessageCircle className="h-3.5 w-3.5" />
            总评论
          </div>
          <p className="mt-2 text-xl font-bold text-slate-900">{formatNumber(totalComments)}</p>
          <p className="mt-1 text-xs text-emerald-600">+5.2% 较上周</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Video className="h-3.5 w-3.5" />
            视频总数
          </div>
          <p className="mt-2 text-xl font-bold text-slate-900">{totalVideos}</p>
          <p className="mt-1 text-xs text-slate-400">本周新增 3</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Users className="h-3.5 w-3.5" />
            团队人数
          </div>
          <p className="mt-2 text-xl font-bold text-slate-900">{TEAM_MEMBERS.length}</p>
          <p className="mt-1 text-xs text-slate-400">活跃成员 {TEAM_MEMBERS.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <CheckCircle2 className="h-3.5 w-3.5" />
            任务完成率
          </div>
          <p className="mt-2 text-xl font-bold text-slate-900">{completionRate}%</p>
          <p className="mt-1 text-xs text-emerald-600">{completedTasks}/{totalTasks} 已完成</p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column - Platform Data & Workflow */}
        <div className="space-y-6 lg:col-span-2">
          {/* Platform Data */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <BarChart3 className="h-4 w-4 text-blue-500" />
                平台数据概览
              </h3>
              <Link href="/analytics" className="text-xs text-blue-600 hover:text-blue-700">
                查看详情 →
              </Link>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {PLATFORM_DATA.map((platform) => (
                <div key={platform.platform} className={`rounded-lg border p-3 ${platform.color}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{platform.icon}</span>
                    <span className="text-sm font-medium text-slate-700">{platform.platform}</span>
                    {platform.trend > 0 ? (
                      <TrendingUp className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-500" />
                    )}
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-500">播放</span>
                      <p className="font-semibold text-slate-800">{formatNumber(platform.views)}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">点赞</span>
                      <p className="font-semibold text-slate-800">{formatNumber(platform.likes)}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">评论</span>
                      <p className="font-semibold text-slate-800">{formatNumber(platform.comments)}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">视频</span>
                      <p className="font-semibold text-slate-800">{platform.videos}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Workflow Architecture */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <Bot className="h-4 w-4 text-blue-500" />
                自动化工作流
              </h3>
              <Badge variant="outline" className="rounded-full text-[10px]">
                Coze Workflow
              </Badge>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {workflowSteps.map((step, index) => (
                <div key={step.step} className="relative rounded-lg border border-slate-100 p-3">
                  <div className="flex items-center gap-2">
                    <div className={`flex h-7 w-7 items-center justify-center rounded-md ${step.bg}`}>
                      <step.icon className={`h-3.5 w-3.5 ${step.color}`} />
                    </div>
                    <span className="text-[10px] font-bold text-slate-300">{step.step}</span>
                  </div>
                  <h4 className="mt-2 text-xs font-semibold text-slate-800">{step.title}</h4>
                  <p className="mt-0.5 text-[10px] text-slate-400 line-clamp-2">{step.desc}</p>
                  {index < workflowSteps.length - 1 && (
                    <ArrowRight className="absolute -right-1.5 top-1/2 hidden h-3 w-3 -translate-y-1/2 text-slate-300 sm:block" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-800">快捷操作</h3>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {quickActions.map((action) => (
                <Link key={action.title} href={action.href}>
                  <div className="group cursor-pointer rounded-lg border border-slate-100 p-3 transition-all hover:border-slate-200 hover:shadow-sm">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-md ${action.bg}`}>
                      <action.icon className={`h-4 w-4 ${action.color}`} />
                    </div>
                    <h4 className="mt-2 text-xs font-semibold text-slate-800">{action.title}</h4>
                    <p className="mt-0.5 text-[10px] text-slate-400 line-clamp-1">{action.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Team Progress */}
        <div className="space-y-6">
          {/* Team Progress */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <Users className="h-4 w-4 text-blue-500" />
                团队进度
              </h3>
              <Link href="/team" className="text-xs text-blue-600 hover:text-blue-700">
                查看详情 →
              </Link>
            </div>
            
            {/* Progress Bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">整体完成率</span>
                <span className="font-semibold text-slate-800">{completionRate}%</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500 transition-all"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
              <p className="mt-1 text-[10px] text-slate-400">{completedTasks} / {totalTasks} 任务已完成</p>
            </div>

            {/* Team Members */}
            <div className="mt-4 space-y-2">
              {TEAM_MEMBERS.slice(0, 4).map((member) => {
                const memberRate = member.tasks > 0 ? Math.round((member.completedTasks / member.tasks) * 100) : 0;
                return (
                  <div key={member.id} className="flex items-center gap-2.5 rounded-lg border border-slate-100 p-2">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className={`text-[10px] text-white ${member.color}`}>
                        {member.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-700 truncate">{member.name}</span>
                        <span className="text-[10px] text-slate-400">{memberRate}%</span>
                      </div>
                      <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-slate-100">
                        <div 
                          className="h-full rounded-full bg-emerald-500"
                          style={{ width: `${memberRate}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Activities */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <Activity className="h-4 w-4 text-blue-500" />
              最近活动
            </h3>
            <div className="mt-3 space-y-3">
              {RECENT_ACTIVITIES.slice(0, 5).map((activity) => (
                <div key={activity.id} className="flex items-start gap-2.5">
                  <div className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-100`}>
                    <activity.icon className={`h-3 w-3 ${activity.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-700">
                      <span className="font-medium">{activity.user}</span>
                      {' '}{activity.action}{' '}
                      <span className="font-medium text-slate-800">{activity.target}</span>
                    </p>
                    <p className="mt-0.5 text-[10px] text-slate-400">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Workflow Status */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <Clock className="h-4 w-4 text-blue-500" />
              工作流状态
            </h3>
            <div className="mt-3 space-y-2">
              {[
                { name: '热点抓取', status: '运行中', lastRun: '每2小时', color: 'bg-emerald-500' },
                { name: '脚本生成', status: '待触发', lastRun: '手动', color: 'bg-amber-500' },
                { name: '数据回收', status: '运行中', lastRun: '每日 08:00', color: 'bg-emerald-500' },
                { name: '知识库同步', status: '运行中', lastRun: '实时', color: 'bg-emerald-500' },
              ].map((wf) => (
                <div key={wf.name} className="flex items-center justify-between rounded-lg border border-slate-100 px-2.5 py-2">
                  <div className="flex items-center gap-2">
                    <span className={`h-1.5 w-1.5 rounded-full ${wf.color}`} />
                    <span className="text-xs text-slate-700">{wf.name}</span>
                  </div>
                  <Badge
                    variant="outline"
                    className={`rounded-full text-[9px] ${
                      wf.status === '运行中'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
                        : 'border-amber-200 bg-amber-50 text-amber-600'
                    }`}
                  >
                    {wf.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
