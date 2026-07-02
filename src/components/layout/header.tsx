'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Search, RefreshCw, LogOut, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface UserInfo {
  name: string;
  avatarUrl: string;
  email: string;
}

export function Header() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const res = await fetch('/api/feishu/status');
      const data = await res.json();
      if (data.success && data.data.connected) {
        setUser(data.data.user);
      }
    } catch {
      // ignore
    }
  }

  async function handleLogout() {
    setLoading(true);
    try {
      await fetch('/api/feishu/status', { method: 'DELETE' });
      router.push('/login');
    } catch {
      setLoading(false);
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-6 backdrop-blur-sm">
      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="搜索选题、脚本、数据..."
            className="h-9 w-[320px] rounded-lg border-slate-200 bg-slate-50 pl-9 text-sm"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-slate-600 hover:text-slate-900"
        >
          <RefreshCw className="h-4 w-4" />
          <span className="text-xs">同步数据</span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-slate-600 hover:text-slate-900"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-amber-500" />
        </Button>
        <div className="ml-2 flex items-center gap-2">
          {user ? (
            <>
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-medium text-white">
                  {user.name.charAt(0)}
                </div>
              )}
              <span className="text-sm font-medium text-slate-700">{user.name}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                disabled={loading}
                className="ml-1 h-8 w-8 text-slate-400 hover:text-red-500"
                title="退出登录"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="h-4 w-4" />
                )}
              </Button>
            </>
          ) : (
            <>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-medium text-white">
                运
              </div>
              <span className="text-sm font-medium text-slate-700">运营团队</span>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
