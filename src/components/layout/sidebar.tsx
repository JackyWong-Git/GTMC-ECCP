'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Lightbulb,
  FileText,
  BarChart3,
  Workflow,
  Users,
  Zap,
  ChevronLeft,
  ChevronRight,
  Settings,
  LayoutTemplate,
  PenSquare,
  BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const navItems = [
  { href: '/', label: '运营总览', icon: LayoutDashboard },
  { href: '/topics', label: '选题池', icon: Lightbulb },
  { href: '/scripts', label: '脚本工坊', icon: FileText },
  { href: '/articles', label: '公众号文章', icon: PenSquare },
  { href: '/analytics', label: '数据看板', icon: BarChart3 },
  { href: '/knowledge', label: '知识库', icon: BookOpen },
  { href: '/workflows', label: '工作流', icon: Workflow },
  { href: '/workflows/templates', label: '模板市场', icon: LayoutTemplate },
  { href: '/team', label: '团队协作', icon: Users },
  { href: '/settings', label: '系统设置', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-slate-800 bg-[#0F172A] transition-all duration-300',
        collapsed ? 'w-[68px]' : 'w-[240px]'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-slate-800 px-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500">
          <Zap className="h-5 w-5 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="truncate text-sm font-semibold text-white">
              运营自动化中心
            </h1>
            <p className="truncate text-xs text-slate-400">
              运营自动化中心
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              )}
            >
              <Icon
                className={cn(
                  'h-[18px] w-[18px] shrink-0 transition-colors',
                  isActive
                    ? 'text-amber-400'
                    : 'text-slate-500 group-hover:text-slate-300'
                )}
              />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <div className="border-t border-slate-800 p-3">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center justify-center rounded-lg px-3 py-2 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-300"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span className="ml-2 text-xs">收起菜单</span>
            </>
          )}
        </button>
      </div>

      {/* Status Indicator */}
      {!collapsed && (
        <div className="border-t border-slate-800 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-xs text-slate-400">系统运行中</span>
          </div>
        </div>
      )}
    </aside>
  );
}
