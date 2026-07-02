import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 公开路由（无需登录）
const PUBLIC_PATHS = [
  '/login',
  '/api/feishu/auth',
  '/api/feishu/callback',
  '/api/feishu/status',
  '/api/douyin/auth',
  '/api/douyin/callback',
  '/api/douyin/status',
  '/api/config',
];

// 静态资源路由
const STATIC_PATHS = ['/_next', '/favicon', '/api'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 跳过静态资源和 API 路由（除了状态检查）
  if (STATIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // 跳过公开路由
  if (PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next();
  }

  // 检查飞书或抖音 session cookie
  const feishuSession = request.cookies.get('feishu_session');
  const douyinSession = request.cookies.get('douyin_session');

  // 未登录则重定向到登录页
  if (!feishuSession && !douyinSession) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * 匹配所有路由，除了:
     * - _next/static (静态文件)
     * - _next/image (图片优化)
     * - favicon.ico (图标)
     * - public 目录中的文件
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
