'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    try {
      const res = await fetch('/api/feishu/status');
      const data = await res.json();
      if (data.success && data.data.connected) {
        router.push('/');
        return;
      }
    } catch {
      // Not logged in
    }
    setChecking(false);
  };

  const handleFeishuLogin = async () => {
    setLoading('feishu');
    setError(null);
    try {
      const res = await fetch('/api/feishu/auth');
      const data = await res.json();
      if (data.success && data.data.authUrl) {
        window.location.href = data.data.authUrl;
      } else {
        setError(data.error || '获取飞书授权链接失败');
      }
    } catch {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(null);
    }
  };

  const handleDouyinLogin = async () => {
    setLoading('douyin');
    setError(null);
    try {
      const res = await fetch('/api/douyin/auth');
      const data = await res.json();
      if (data.success && data.data.authUrl) {
        window.location.href = data.data.authUrl;
      } else {
        setError(data.error || '获取抖音授权链接失败');
      }
    } catch {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(null);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 mb-4 shadow-lg">
            <span className="text-2xl font-bold text-white">E</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">ECCP 运营平台</h1>
          <p className="text-slate-500 mt-1">企业内容创作与运营管理平台</p>
        </div>

        {/* Login Card */}
        <Card className="shadow-xl border-0">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl">选择登录方式</CardTitle>
            <CardDescription>使用您的飞书或抖音账号登录平台</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-600 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Feishu Login */}
            <Button
              onClick={handleFeishuLogin}
              disabled={loading !== null}
              className="w-full h-12 text-base font-medium bg-[#3370FF] hover:bg-[#2860E0] text-white"
            >
              {loading === 'feishu' ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  正在跳转飞书授权...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3.806 7.182a.29.29 0 0 1 .47-.162l8.256 6.193c.105.079.12.23.032.327L7.182 19.5a.29.29 0 0 1-.497-.145L3.806 7.182ZM19.81 6.905a.29.29 0 0 0-.46-.207L7.5 14.5a.29.29 0 0 0 .013.463l5.5 3.5a.29.29 0 0 0 .437-.163l6.36-11.395ZM20.5 5.5l-8-4.5a.29.29 0 0 0-.43.27l1.5 12a.29.29 0 0 0 .47.19l6.5-7.5a.29.29 0 0 0-.04-.46Z"/>
                  </svg>
                  飞书账号登录
                </>
              )}
            </Button>

            {/* Douyin Login */}
            <Button
              onClick={handleDouyinLogin}
              disabled={loading !== null}
              variant="outline"
              className="w-full h-12 text-base font-medium border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
            >
              {loading === 'douyin' ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  正在跳转抖音授权...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.84-.1Z"/>
                  </svg>
                  抖音账号登录
                </>
              )}
            </Button>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-slate-400">登录后即表示同意</span>
              </div>
            </div>

            {/* Terms */}
            <p className="text-center text-xs text-slate-400">
              <a href="#" className="hover:text-slate-600">服务条款</a>
              {' · '}
              <a href="#" className="hover:text-slate-600">隐私政策</a>
            </p>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 mt-6">
          © 2026 ECCP 运营平台 · Powered by Coze
        </p>
      </div>
    </div>
  );
}
