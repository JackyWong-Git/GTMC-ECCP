'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Lock, Loader2, AlertCircle, CheckCircle2, HelpCircle, X } from 'lucide-react';
import { getSupabaseBrowserClientAsync } from '@/lib/supabase-browser';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [showOauthHelp, setShowOauthHelp] = useState(false);

  useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    try {
      // Check Supabase session first
      const supabase = await getSupabaseBrowserClientAsync();
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push('/');
        return;
      }

      // Check Feishu/Douyin session
      const feishuRes = await fetch('/api/feishu/status');
      const feishuData = await feishuRes.json();
      if (feishuData.success && feishuData.data.connected) {
        router.push('/');
        return;
      }

      const douyinRes = await fetch('/api/douyin/status');
      const douyinData = await douyinRes.json();
      if (douyinData.success && douyinData.data.connected) {
        router.push('/');
        return;
      }
    } catch {
      // Not logged in
    }
    setChecking(false);
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading('email');
    setError(null);
    setSuccess(null);

    try {
      const supabase = await getSupabaseBrowserClientAsync();
      
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setSuccess('注册成功！请检查邮箱完成验证后登录。');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push('/');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '登录失败';
      if (message.includes('Invalid login credentials')) {
        setError('邮箱或密码错误');
      } else if (message.includes('Email not confirmed')) {
        setError('请先验证邮箱');
      } else {
        setError(message);
      }
    } finally {
      setLoading(null);
    }
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
        setShowOauthHelp(true);
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
        setShowOauthHelp(true);
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
      <div className="w-full max-w-md space-y-4">
        {/* Main Login Card */}
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mb-4">
              <span className="text-white font-bold text-xl">E</span>
            </div>
            <CardTitle className="text-2xl">ECCP 运营平台</CardTitle>
            <CardDescription>
              {isSignUp ? '创建新账号' : '登录您的账号'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Email/Password Form */}
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">邮箱</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">密码</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-3 rounded-lg">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{success}</span>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
                disabled={loading === 'email'}
              >
                {loading === 'email' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {isSignUp ? '注册中...' : '登录中...'}
                  </>
                ) : (
                  isSignUp ? '注册' : '登录'
                )}
              </Button>
            </form>

            {/* Toggle Sign Up / Sign In */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError(null);
                  setSuccess(null);
                }}
                className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
              >
                {isSignUp ? '已有账号？点击登录' : '没有账号？点击注册'}
              </button>
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-500">或使用以下方式</span>
              </div>
            </div>

            {/* OAuth Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={handleFeishuLogin}
                disabled={loading === 'feishu'}
                className="border-blue-200 hover:bg-blue-50"
              >
                {loading === 'feishu' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3.823 3.823C3.09 4.556 3 5.737 3 8.1v7.8c0 2.363.09 3.544.823 4.277C4.556 20.91 5.737 21 8.1 21h7.8c2.363 0 3.544-.09 4.277-.823C20.91 19.444 21 18.263 21 15.9V8.1c0-2.363-.09-3.544-.823-4.277C19.444 3.09 18.263 3 15.9 3H8.1C5.737 3 4.556 3.09 3.823 3.823z" fill="#3370FF"/>
                    <path d="M13.5 8.5L8 12l5.5 3.5V8.5z" fill="white"/>
                  </svg>
                )}
                飞书登录
              </Button>
              <Button
                variant="outline"
                onClick={handleDouyinLogin}
                disabled={loading === 'douyin'}
                className="border-pink-200 hover:bg-pink-50"
              >
                {loading === 'douyin' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005.8 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1.84-.1z" fill="#FE2C55"/>
                  </svg>
                )}
                抖音登录
              </Button>
            </div>

            {/* Help Link */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => setShowOauthHelp(true)}
                className="text-xs text-slate-500 hover:text-slate-700 flex items-center justify-center gap-1"
              >
                <HelpCircle className="w-3 h-3" />
                飞书/抖音登录配置指南
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-slate-500">
          登录即表示您同意我们的服务条款和隐私政策
        </p>
      </div>

      {/* OAuth Setup Help Modal */}
      {showOauthHelp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">飞书/抖音 OAuth 配置指南</h2>
              <button onClick={() => setShowOauthHelp(false)} className="p-1 hover:bg-slate-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Feishu Setup */}
              <section>
                <h3 className="text-base font-semibold text-blue-600 mb-3">飞书应用配置步骤</h3>
                <ol className="space-y-3 text-sm text-slate-700">
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">1</span>
                    <div>
                      <p className="font-medium">创建飞书应用</p>
                      <p className="text-slate-500">访问 <a href="https://open.feishu.cn/app" target="_blank" className="text-blue-600 hover:underline">open.feishu.cn/app</a>，点击「创建企业自建应用」</p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">2</span>
                    <div>
                      <p className="font-medium">获取应用凭证</p>
                      <p className="text-slate-500">在应用详情页「凭证与基础信息」中复制 App ID 和 App Secret</p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">3</span>
                    <div>
                      <p className="font-medium">配置重定向 URL</p>
                      <p className="text-slate-500">在「安全设置」中添加重定向 URL：</p>
                      <code className="block mt-1 p-2 bg-slate-100 rounded text-xs">
                        {typeof window !== 'undefined' ? window.location.origin : ''}/api/feishu/callback
                      </code>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">4</span>
                    <div>
                      <p className="font-medium">添加权限</p>
                      <p className="text-slate-500">在「权限管理」中开启：获取用户信息、读取多维表、读取知识库等权限</p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">5</span>
                    <div>
                      <p className="font-medium">发布应用</p>
                      <p className="text-slate-500">创建应用版本并提交审核，审核通过后即可使用</p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">6</span>
                    <div>
                      <p className="font-medium">在本平台配置</p>
                      <p className="text-slate-500">前往 <a href="/settings" className="text-blue-600 hover:underline">设置页面</a> 填写 App ID 和 App Secret</p>
                    </div>
                  </li>
                </ol>
              </section>

              {/* Douyin Setup */}
              <section>
                <h3 className="text-base font-semibold text-pink-600 mb-3">抖音开放平台配置步骤</h3>
                <ol className="space-y-3 text-sm text-slate-700">
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-pink-100 text-pink-600 rounded-full flex items-center justify-center text-xs font-medium">1</span>
                    <div>
                      <p className="font-medium">创建抖音应用</p>
                      <p className="text-slate-500">访问 <a href="https://open.douyin.com" target="_blank" className="text-pink-600 hover:underline">open.douyin.com</a>，创建网站应用</p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-pink-100 text-pink-600 rounded-full flex items-center justify-center text-xs font-medium">2</span>
                    <div>
                      <p className="font-medium">获取应用凭证</p>
                      <p className="text-slate-500">在应用详情页复制 Client Key 和 Client Secret</p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-pink-100 text-pink-600 rounded-full flex items-center justify-center text-xs font-medium">3</span>
                    <div>
                      <p className="font-medium">配置回调地址</p>
                      <p className="text-slate-500">在应用设置中配置授权回调地址：</p>
                      <code className="block mt-1 p-2 bg-slate-100 rounded text-xs">
                        {typeof window !== 'undefined' ? window.location.origin : ''}/api/douyin/callback
                      </code>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-pink-100 text-pink-600 rounded-full flex items-center justify-center text-xs font-medium">4</span>
                    <div>
                      <p className="font-medium">在本平台配置</p>
                      <p className="text-slate-500">前往 <a href="/settings" className="text-pink-600 hover:underline">设置页面</a> 填写 Client Key 和 Client Secret</p>
                    </div>
                  </li>
                </ol>
              </section>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-800">
                  <strong>提示：</strong>如果您只是测试或体验平台，建议直接使用邮箱密码登录，无需配置 OAuth。
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
