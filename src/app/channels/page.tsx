"use client";

import { useState } from "react";
import {
  Video,
  Send,
  Tv,
  MessageSquare,
  Newspaper,
  FileText,
  Settings,
  Plus,
  Check,
  Clock,
  TrendingUp,
  Eye,
  Heart,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// 渠道配置
const CHANNELS = [
  {
    id: "k-site",
    name: "K站",
    icon: Video,
    color: "bg-blue-500",
    desc: "中长视频平台",
    specs: { duration: "3-15分钟", format: "横屏16:9", style: "深度内容" },
    stats: { published: 12, views: "45.2万", engagement: "8.3%" },
  },
  {
    id: "video-account",
    name: "视频号",
    icon: Send,
    color: "bg-green-500",
    desc: "微信视频号",
    specs: { duration: "15-60秒", format: "竖屏9:16", style: "口播/故事" },
    stats: { published: 8, views: "12.8万", engagement: "5.2%" },
  },
  {
    id: "tv",
    name: "电视台",
    icon: Tv,
    color: "bg-purple-500",
    desc: "行业新闻/新闻稿",
    specs: { duration: "1-3分钟", format: "横屏16:9", style: "正式/专业" },
    stats: { published: 5, views: "—", engagement: "—" },
  },
  {
    id: "douyin",
    name: "抖音",
    icon: MessageSquare,
    color: "bg-pink-500",
    desc: "短视频平台",
    specs: { duration: "15-60秒", format: "竖屏9:16", style: "快节奏/种草" },
    stats: { published: 23, views: "128万", engagement: "12.5%" },
  },
  {
    id: "internal",
    name: "内刊",
    icon: Newspaper,
    color: "bg-amber-500",
    desc: "企业内部刊物",
    specs: { duration: "—", format: "图文", style: "深度/专栏" },
    stats: { published: 6, views: "—", engagement: "—" },
  },
  {
    id: "wechat",
    name: "公众号",
    icon: FileText,
    color: "bg-emerald-500",
    desc: "微信订阅号",
    specs: { duration: "—", format: "图文排版", style: "长文/教程" },
    stats: { published: 15, views: "8.6万", engagement: "3.8%" },
  },
];

// 渠道模板
const TEMPLATES = [
  { id: "口播脚本", channels: ["douyin", "video-account"], desc: "快节奏口播，强开头+金句结尾" },
  { id: "故事型", channels: ["k-site", "video-account"], desc: "悬念开头+情感共鸣+价值升华" },
  { id: "测评报告", channels: ["k-site", "douyin"], desc: "数据驱动+对比分析+结论" },
  { id: "新闻稿", channels: ["tv", "internal"], desc: "倒金字塔结构+权威引用" },
  { id: "深度文章", channels: ["wechat", "internal"], desc: "长文+图文混排+引用标注" },
  { id: "种草笔记", channels: ["douyin", "wechat"], desc: "痛点+解决方案+使用体验" },
];

export default function ChannelsPage() {
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);

  const handleConfigure = (channelId: string) => {
    setSelectedChannel(channelId);
    toast.info(`${CHANNELS.find(c => c.id === channelId)?.name} 配置面板开发中`);
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      <div className="max-w-6xl mx-auto p-6">
        {/* 页面标题 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">渠道管理</h1>
          <p className="text-sm text-slate-500 mt-1">
            管理 6 个内容分发渠道的适配模板和发布状态
          </p>
        </div>

        {/* 渠道卡片网格 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {CHANNELS.map((channel) => {
            const Icon = channel.icon;
            return (
              <div
                key={channel.id}
                className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg ${channel.color} flex items-center justify-center`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{channel.name}</h3>
                      <p className="text-xs text-slate-500">{channel.desc}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleConfigure(channel.id)}
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                </div>

                {/* 规格 */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">时长</span>
                    <span className="text-slate-700">{channel.specs.duration}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">格式</span>
                    <span className="text-slate-700">{channel.specs.format}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">风格</span>
                    <span className="text-slate-700">{channel.specs.style}</span>
                  </div>
                </div>

                {/* 统计 */}
                <div className="pt-4 border-t border-slate-100">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-lg font-semibold text-slate-900">{channel.stats.published}</div>
                      <div className="text-xs text-slate-500">已发布</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-slate-900">{channel.stats.views}</div>
                      <div className="text-xs text-slate-500">播放量</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-slate-900">{channel.stats.engagement}</div>
                      <div className="text-xs text-slate-500">互动率</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 内容模板 */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">内容模板</h2>
            <Button variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-1" />
              新建模板
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {TEMPLATES.map((template) => (
              <div
                key={template.id}
                className="p-4 border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50/50 transition-colors cursor-pointer"
              >
                <h4 className="font-medium text-slate-900 mb-1">{template.id}</h4>
                <p className="text-xs text-slate-500 mb-3">{template.desc}</p>
                <div className="flex flex-wrap gap-1">
                  {template.channels.map((chId) => {
                    const ch = CHANNELS.find(c => c.id === chId);
                    if (!ch) return null;
                    const Icon = ch.icon;
                    return (
                      <span
                        key={chId}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded text-xs text-slate-600"
                      >
                        <Icon className="w-3 h-3" />
                        {ch.name}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 发布日历 */}
        <div className="mt-6 bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">发布计划</h2>
          <div className="space-y-3">
            {[
              { title: "新能源汽车横评", channel: "K站", date: "今天 18:00", status: "待发布" },
              { title: "充电桩实测", channel: "抖音", date: "明天 12:00", status: "待发布" },
              { title: "行业周报", channel: "公众号", date: "周五 09:00", status: "草稿" },
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <div>
                    <span className="text-sm font-medium text-slate-900">{item.title}</span>
                    <span className="ml-2 text-xs text-slate-500">→ {item.channel}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500">{item.date}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    item.status === "待发布"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-slate-200 text-slate-600"
                  }`}>
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
