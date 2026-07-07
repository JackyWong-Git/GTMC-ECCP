import type { Metadata } from 'next';
import './globals.css';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';

export const metadata: Metadata = {
  title: {
    default: 'ECCP - 企业文化内容平台',
    template: '%s | ECCP 企业文化内容平台',
  },
  description:
    '基于 Coze 的自动化运营工作流管理平台，实现选题策划、脚本生成、知识库沉淀与数据汇总的全流程自动化管理。',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        <div className="flex min-h-screen bg-[#F8FAFC]">
          <Sidebar />
          <div className="flex flex-1 flex-col pl-[240px]">
            <Header />
            <main className="flex-1 p-6">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
