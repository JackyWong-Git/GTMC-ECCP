'use client';

import { useState, useRef } from 'react';
import {
  Play,
  Copy,
  Download,
  BookOpen,
  Loader2,
  Check,
  Video,
  Tv,
  Smartphone,
  Newspaper,
  FileText,
  Monitor,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

// 渠道配置
const CHANNELS = [
  { id: 'k-site', name: 'K站', icon: Monitor, desc: '中长视频 5-15分钟', color: 'bg-blue-500' },
  { id: 'video-account', name: '视频号', icon: Video, desc: '竖屏短视频 15-60秒', color: 'bg-green-500' },
  { id: 'tv', name: '电视台', icon: Tv, desc: '行业新闻/新闻稿', color: 'bg-purple-500' },
  { id: 'douyin', name: '抖音', icon: Smartphone, desc: '短视频 15-60秒', color: 'bg-pink-500' },
  { id: 'internal', name: '内刊', icon: Newspaper, desc: '图文/长文', color: 'bg-orange-500' },
  { id: 'wechat', name: '公众号', icon: FileText, desc: '图文/排版', color: 'bg-emerald-500' },
];

// 风格预设
const STYLES = [
  { id: 'oral', name: '口播达人', desc: '节奏快、金句多' },
  { id: 'story', name: '故事型', desc: '起承转合叙事' },
  { id: 'review', name: '测评专家', desc: '数据对比分析' },
  { id: 'tutorial', name: '教程型', desc: '步骤清晰实操' },
  { id: 'vlog', name: 'Vlog风', desc: '轻松自然日常' },
];

export default function WorkspacePage() {
  const [topic, setTopic] = useState('');
  const [style, setStyle] = useState('oral');
  const [duration, setDuration] = useState('60秒');
  const [selectedChannel, setSelectedChannel] = useState('douyin');
  const [script, setScript] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 生成脚本
  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast.error('请输入选题');
      return;
    }

    setIsGenerating(true);
    setScript('');

    abortControllerRef.current = new AbortController();

    try {
      const res = await fetch('/api/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicTitle: topic,
          platform: CHANNELS.find(c => c.id === selectedChannel)?.name || '抖音',
          style: STYLES.find(s => s.id === style)?.name || '口播达人',
          duration,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!res.ok) throw new Error('生成失败');

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.content) {
                  setScript(prev => prev + data.content);
                }
              } catch {
                // ignore parse errors
              }
            }
          }
        }
      }

      toast.success('脚本生成完成');
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        toast.info('已停止生成');
      } else {
        toast.error('生成失败，请重试');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // 停止生成
  const handleStop = () => {
    abortControllerRef.current?.abort();
  };

  // 复制
  const handleCopy = async () => {
    await navigator.clipboard.writeText(script);
    setCopied(true);
    toast.success('已复制');
    setTimeout(() => setCopied(false), 2000);
  };

  // 下载
  const handleDownload = () => {
    const blob = new Blob([script], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${topic}-${selectedChannel}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('已下载');
  };

  // 存知识库
  const handleSaveToKnowledge = async () => {
    try {
      const res = await fetch('/api/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          title: `${topic} - ${CHANNELS.find(c => c.id === selectedChannel)?.name}脚本`,
          content: script,
          category: 'script',
          tags: [selectedChannel, style],
        }),
      });

      if (res.ok) {
        toast.success('已保存到知识库');
      } else {
        toast.error('保存失败');
      }
    } catch {
      toast.error('保存失败');
    }
  };

  return (
    <div className="flex h-full">
      {/* 左侧：渠道列表 */}
      <div className="w-64 border-r bg-gray-50 p-4">
        <h2 className="mb-4 text-sm font-semibold text-gray-500">渠道</h2>
        <div className="space-y-2">
          {CHANNELS.map((channel) => {
            const Icon = channel.icon;
            return (
              <button
                key={channel.id}
                onClick={() => setSelectedChannel(channel.id)}
                className={`flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors ${
                  selectedChannel === channel.id
                    ? 'bg-white shadow-sm ring-1 ring-gray-200'
                    : 'hover:bg-white'
                }`}
              >
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${channel.color} text-white`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-medium">{channel.name}</div>
                  <div className="text-xs text-gray-500">{channel.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 右侧：编辑区 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 顶部工具栏 */}
        <div className="border-b p-4">
          <div className="flex items-center gap-4">
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="输入选题，如：新能源汽车深度测评"
              className="flex-1 rounded-lg border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              className="rounded-lg border px-3 py-2 text-sm"
            >
              {STYLES.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="rounded-lg border px-3 py-2 text-sm"
            >
              <option value="30秒">30秒</option>
              <option value="60秒">60秒</option>
              <option value="3分钟">3分钟</option>
              <option value="5分钟">5分钟</option>
            </select>
            {isGenerating ? (
              <Button onClick={handleStop} variant="destructive">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                停止
              </Button>
            ) : (
              <Button onClick={handleGenerate}>
                <Play className="mr-2 h-4 w-4" />
                生成
              </Button>
            )}
          </div>
        </div>

        {/* 编辑区 */}
        <div className="flex-1 overflow-auto p-4">
          <Textarea
            value={script}
            onChange={(e) => setScript(e.target.value)}
            placeholder="脚本内容将在这里显示，支持 Markdown 格式..."
            className="h-full min-h-[400px] resize-none font-mono text-sm"
          />
        </div>

        {/* 底部操作栏 */}
        {script && (
          <div className="border-t p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                {script.length} 字 · {CHANNELS.find(c => c.id === selectedChannel)?.name}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                  复制
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="mr-2 h-4 w-4" />
                  下载
                </Button>
                <Button variant="outline" size="sm" onClick={handleSaveToKnowledge}>
                  <BookOpen className="mr-2 h-4 w-4" />
                  存知识库
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
