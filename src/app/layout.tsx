import type { Metadata } from 'next';
import './globals.css';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { SupabaseConfigProvider } from '@/lib/supabase-config-inject';

export const metadata: Metadata = {
  title: {
    default: '运营自动化中心',
    template: '%s | 运营自动化中心',
  },
  description:
    '基于 Coze 和飞书的自动化运营工作流，实现选题策划、脚本生成、数据汇总与团队协作的全流程自动化管理。',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        <SupabaseConfigProvider>
          <div className="flex min-h-screen bg-[#F8FAFC]">
            <Sidebar />
            <div className="flex flex-1 flex-col pl-[240px]">
              <Header />
              <main className="flex-1 p-6">{children}</main>
            </div>
          </div>
        </SupabaseConfigProvider>
      </body>
    </html>
  );
}
