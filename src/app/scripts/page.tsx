'use client';

import { useState, useCallback, useRef } from 'react';
import {
  FileText,
  Sparkles,
  Clock,
  CheckCircle2,
  Loader2,
  Copy,
  Download,
  Wand2,
  Play,
  Video,
  Edit3,
  Save,
  X,
  Link,
  Search,
  Film,
  MessageSquare,
  BookOpen,
  ShoppingBag,
  Camera,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Agent 预设风格
interface AgentPreset {
  id: string;
  name: string;
  icon: typeof Wand2;
  description: string;
  style: string;
  prompt: string;
  color: string;
}

const AGENT_PRESETS: AgentPreset[] = [
  {
    id: 'oral',
    name: '口播达人',
    icon: MessageSquare,
    description: '快节奏口播，信息密度高，适合短视频',
    style: '轻松口语化，节奏快，信息密度高',
    prompt: '你是一个专业的短视频口播达人。请用轻松口语化的风格撰写脚本，节奏要快，每句话都要有信息量。开头要有强钩子，中间要有3-5个核心观点，结尾要有互动引导。',
    color: 'text-violet-600 bg-violet-50 border-violet-200',
  },
  {
    id: 'story',
    name: '故事型',
    icon: BookOpen,
    description: '叙事驱动，情感共鸣，适合品牌故事',
    style: '叙事型，有情感共鸣，节奏舒缓',
    prompt: '你是一个擅长讲故事的脚本创作者。请用叙事驱动的方式撰写脚本，注重情感共鸣和人物刻画。要有起承转合，让观众产生代入感。',
    color: 'text-amber-600 bg-amber-50 border-amber-200',
  },
  {
    id: 'review',
    name: '测评专家',
    icon: Search,
    description: '专业测评，数据对比，适合产品种草',
    style: '专业严谨，数据驱动，客观对比',
    prompt: '你是一个专业的产品测评专家。请用严谨客观的态度撰写测评脚本，要有数据支撑和横向对比。包含产品参数、使用体验、优缺点分析和购买建议。',
    color: 'text-blue-600 bg-blue-50 border-blue-200',
  },
  {
    id: 'vlog',
    name: 'Vlog 导演',
    icon: Camera,
    description: '生活化记录，自然真实，适合日常分享',
    style: '生活化，自然真实，有代入感',
    prompt: '你是一个Vlog导演。请用生活化的方式撰写脚本，注重场景描写和细节刻画。要有真实感和代入感，让观众感觉像是在看朋友的日常。',
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  },
  {
    id: 'seeding',
    name: '种草达人',
    icon: ShoppingBag,
    description: '产品推荐，痛点切入，适合带货',
    style: '种草型，痛点切入，产品亮点突出',
    prompt: '你是一个种草达人。请从用户痛点切入，突出产品亮点和使用场景。要有真实的使用感受分享，以及明确的推荐理由。结尾要有购买引导。',
    color: 'text-pink-600 bg-pink-50 border-pink-200',
  },
];

interface Script {
  id: string;
  topicTitle: string;
  platform: string;
  status: 'generating' | 'completed' | 'editing' | 'approved';
  generatedAt: string;
  wordCount: number;
  content: string;
  agentPreset: string;
  sourceUrl?: string;
}

export default function ScriptsPage() {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [selectedScript, setSelectedScript] = useState<Script | null>(null);
  const [topicTitle, setTopicTitle] = useState('');
  const [platform, setPlatform] = useState('抖音');
  const [selectedPreset, setSelectedPreset] = useState<AgentPreset>(AGENT_PRESETS[0]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamContent, setStreamContent] = useState('');
  const [streamModel, setStreamModel] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeResult, setScrapeResult] = useState('');
  const [activeTab, setActiveTab] = useState<'create' | 'scrape'>('create');
  const editorRef = useRef<HTMLTextAreaElement>(null);

  // 生成脚本
  const handleGenerateScript = useCallback(async () => {
    if (!topicTitle.trim()) return;

    setIsGenerating(true);
    setStreamContent('');
    setStreamModel('');

    try {
      const response = await fetch('/api/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicTitle,
          platform,
          style: selectedPreset.style,
          duration: '3-5分钟',
          systemPrompt: selectedPreset.prompt,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        setStreamContent(`生成失败：${errData.error || '未知错误'}`);
        setIsGenerating(false);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        setStreamContent('无法读取流式响应');
        setIsGenerating(false);
        return;
      }

      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                fullContent += data.content;
                setStreamContent(fullContent);
              }
              if (data.done) {
                setStreamModel(data.model || '');
                // 保存到脚本列表
                const newScript: Script = {
                  id: `script_${Date.now()}`,
                  topicTitle,
                  platform,
                  status: 'completed',
                  generatedAt: new Date().toLocaleString('zh-CN'),
                  wordCount: fullContent.length,
                  content: fullContent,
                  agentPreset: selectedPreset.name,
                };
                setScripts(prev => [newScript, ...prev]);
                setSelectedScript(newScript);
              }
              if (data.error) {
                fullContent += `\n\n错误：${data.error}`;
                setStreamContent(fullContent);
              }
            } catch {
              // skip malformed JSON lines
            }
          }
        }
      }
    } catch (err) {
      setStreamContent(`请求失败：${err instanceof Error ? err.message : '网络错误'}`);
    } finally {
      setIsGenerating(false);
    }
  }, [topicTitle, platform, selectedPreset]);

  // 扒视频仿写
  const handleScrapeVideo = useCallback(async () => {
    if (!videoUrl.trim()) return;

    setIsScraping(true);
    setScrapeResult('');

    try {
      // 使用搜索 API 获取视频信息
      const searchResponse = await fetch('/api/douyin-trending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: videoUrl, count: 5 }),
      });

      if (!searchResponse.ok) {
        setScrapeResult('视频信息获取失败，请检查链接是否有效');
        setIsScraping(false);
        return;
      }

      const searchData = await searchResponse.json();
      const videoInfo = searchData.data?.slice(0, 3) || [];

      // 分析视频内容并生成仿写脚本
      const analysisPrompt = `请分析以下视频内容的特点和成功要素，然后基于这些要素创作一个全新的脚本（不要抄袭，要原创）：

${videoInfo.map((v: { title: string; summary?: string }, i: number) =>
  `视频${i + 1}：${v.title}\n${v.summary || ''}`
).join('\n\n')}

请从以下角度分析：
1. 内容结构（开头钩子、中间节奏、结尾引导）
2. 表达风格（语气、节奏、情感）
3. 成功要素（为什么能火）
4. 仿写建议（如何创作类似风格但原创的内容）

然后基于分析，为选题"${topicTitle || '请指定选题'}"创作一个完整的脚本。`;

      const response = await fetch('/api/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicTitle: topicTitle || '视频仿写',
          platform,
          style: selectedPreset.style,
          duration: '3-5分钟',
          systemPrompt: analysisPrompt,
        }),
      });

      if (!response.ok) {
        setScrapeResult('脚本生成失败');
        setIsScraping(false);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        setScrapeResult('无法读取流式响应');
        setIsScraping(false);
        return;
      }

      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                fullContent += data.content;
                setScrapeResult(fullContent);
              }
              if (data.done) {
                const newScript: Script = {
                  id: `script_${Date.now()}`,
                  topicTitle: topicTitle || '视频仿写',
                  platform,
                  status: 'completed',
                  generatedAt: new Date().toLocaleString('zh-CN'),
                  wordCount: fullContent.length,
                  content: fullContent,
                  agentPreset: `${selectedPreset.name}（仿写）`,
                  sourceUrl: videoUrl,
                };
                setScripts(prev => [newScript, ...prev]);
                setSelectedScript(newScript);
              }
            } catch {
              // skip
            }
          }
        }
      }
    } catch (err) {
      setScrapeResult(`请求失败：${err instanceof Error ? err.message : '网络错误'}`);
    } finally {
      setIsScraping(false);
    }
  }, [videoUrl, topicTitle, platform, selectedPreset]);

  // 复制脚本
  const handleCopy = useCallback((content: string) => {
    navigator.clipboard.writeText(content);
  }, []);

  // 导出脚本
  const handleExport = useCallback((script: Script, format: 'md' | 'txt') => {
    const content = format === 'md'
      ? `# ${script.topicTitle}\n\n**平台**: ${script.platform}\n**风格**: ${script.agentPreset}\n**生成时间**: ${script.generatedAt}\n**字数**: ${script.wordCount}\n\n---\n\n${script.content}`
      : script.content;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${script.topicTitle}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // 开始编辑
  const handleStartEdit = useCallback(() => {
    if (selectedScript) {
      setEditContent(selectedScript.content);
      setIsEditing(true);
    }
  }, [selectedScript]);

  // 保存编辑
  const handleSaveEdit = useCallback(() => {
    if (selectedScript) {
      const updatedScript = {
        ...selectedScript,
        content: editContent,
        wordCount: editContent.length,
        status: 'editing' as const,
      };
      setSelectedScript(updatedScript);
      setScripts(prev => prev.map(s => s.id === selectedScript.id ? updatedScript : s));
      setIsEditing(false);
    }
  }, [selectedScript, editContent]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">脚本工坊</h1>
          <p className="mt-1 text-sm text-slate-500">
            多风格 Agent 预设 · 流式生成 · 可编辑导出 · 视频仿写
          </p>
        </div>
      </div>

      {/* Agent Presets */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-500" />
            <CardTitle className="text-sm font-semibold text-slate-800">
              选择 Agent 风格
            </CardTitle>
          </div>
          <CardDescription className="text-xs text-slate-400">
            不同的 Agent 有不同的创作风格，选择最适合你选题的 Agent
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-3">
            {AGENT_PRESETS.map((preset) => {
              const Icon = preset.icon;
              const isSelected = selectedPreset.id === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => setSelectedPreset(preset)}
                  className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-all ${
                    isSelected
                      ? `${preset.color} border-current ring-2 ring-offset-1`
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-xs font-medium">{preset.name}</span>
                  <span className="text-[10px] text-slate-400 line-clamp-1">{preset.description}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Tabs: Create / Scrape */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('create')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'create'
              ? 'bg-violet-100 text-violet-700'
              : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          <Wand2 className="h-4 w-4" />
          选题创作
        </button>
        <button
          onClick={() => setActiveTab('scrape')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'scrape'
              ? 'bg-violet-100 text-violet-700'
              : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          <Video className="h-4 w-4" />
          扒视频仿写
        </button>
      </div>

      {/* Create Tab */}
      {activeTab === 'create' && (
        <Card className="border-violet-200 bg-gradient-to-r from-violet-50/50 to-white">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-violet-500" />
              <CardTitle className="text-sm font-semibold text-slate-800">
                从选题生成脚本
              </CardTitle>
              <Badge variant="secondary" className="ml-2 rounded-full text-[10px]">
                {selectedPreset.name}
              </Badge>
            </div>
            <CardDescription className="text-xs text-slate-400">
              输入选题或从选题池选择，{selectedPreset.name} Agent 将为你生成完整脚本
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Input
                placeholder="输入选题名称，例如：比亚迪新能源 SUV 深度测评"
                value={topicTitle}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTopicTitle(e.target.value)}
                className="h-9 flex-1 rounded-lg border-slate-200 text-sm"
                onKeyDown={(e: React.KeyboardEvent) => {
                  if (e.key === 'Enter' && !isGenerating) handleGenerateScript();
                }}
              />
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger className="h-9 w-[120px] rounded-lg border-slate-200 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="抖音">抖音</SelectItem>
                  <SelectItem value="视频号">视频号</SelectItem>
                  <SelectItem value="小红书">小红书</SelectItem>
                  <SelectItem value="B站">B站</SelectItem>
                </SelectContent>
              </Select>
              <Button
                className="gap-2 bg-violet-600 text-white hover:bg-violet-700"
                onClick={handleGenerateScript}
                disabled={isGenerating || !topicTitle.trim()}
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                {isGenerating ? '生成中...' : '生成脚本'}
              </Button>
            </div>

            {/* Streaming Output */}
            {(streamContent || isGenerating) && (
              <div className="mt-4 rounded-lg border border-violet-200 bg-white p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isGenerating && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-500" />
                    )}
                    <span className="text-xs font-medium text-slate-600">
                      {isGenerating ? '正在生成...' : '生成完成'}
                    </span>
                  </div>
                  {streamModel && (
                    <Badge variant="secondary" className="rounded-full bg-violet-50 text-[10px] text-violet-600">
                      {streamModel}
                    </Badge>
                  )}
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                    {streamContent}
                    {isGenerating && (
                      <span className="inline-block h-4 w-0.5 animate-pulse bg-violet-500" />
                    )}
                  </pre>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Scrape Tab */}
      {activeTab === 'scrape' && (
        <Card className="border-blue-200 bg-gradient-to-r from-blue-50/50 to-white">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Film className="h-4 w-4 text-blue-500" />
              <CardTitle className="text-sm font-semibold text-slate-800">
                扒视频仿写
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-slate-400">
              输入爆款视频链接或关键词，AI 分析成功要素后为你创作原创脚本
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Link className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="输入视频链接或搜索关键词，例如：抖音爆款汽车测评"
                  value={videoUrl}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVideoUrl(e.target.value)}
                  className="h-9 rounded-lg border-slate-200 pl-9 text-sm"
                  onKeyDown={(e: React.KeyboardEvent) => {
                    if (e.key === 'Enter' && !isScraping) handleScrapeVideo();
                  }}
                />
              </div>
              <Input
                placeholder="仿写选题（可选）"
                value={topicTitle}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTopicTitle(e.target.value)}
                className="h-9 w-[200px] rounded-lg border-slate-200 text-sm"
              />
              <Button
                className="gap-2 bg-blue-600 text-white hover:bg-blue-700"
                onClick={handleScrapeVideo}
                disabled={isScraping || !videoUrl.trim()}
              >
                {isScraping ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Video className="h-4 w-4" />
                )}
                {isScraping ? '分析中...' : '扒视频仿写'}
              </Button>
            </div>

            {/* Scrape Result */}
            {(scrapeResult || isScraping) && (
              <div className="mt-4 rounded-lg border border-blue-200 bg-white p-4">
                <div className="mb-2 flex items-center gap-2">
                  {isScraping && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
                  )}
                  <span className="text-xs font-medium text-slate-600">
                    {isScraping ? '正在分析视频并生成脚本...' : '仿写完成'}
                  </span>
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                    {scrapeResult}
                    {isScraping && (
                      <span className="inline-block h-4 w-0.5 animate-pulse bg-blue-500" />
                    )}
                  </pre>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Script List */}
        <div className="col-span-2 space-y-3">
          <h3 className="text-sm font-semibold text-slate-700">
            脚本列表 ({scripts.length})
          </h3>
          {scripts.length === 0 ? (
            <Card className="flex h-[200px] items-center justify-center border-slate-200 bg-white">
              <div className="text-center">
                <FileText className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-2 text-xs text-slate-400">
                  还没有脚本，开始创作吧
                </p>
              </div>
            </Card>
          ) : (
            scripts.map((script) => {
              const isSelected = selectedScript?.id === script.id;
              return (
                <Card
                  key={script.id}
                  className={`cursor-pointer border transition-all duration-200 hover:shadow-sm ${
                    isSelected
                      ? 'border-violet-300 bg-violet-50/30 ring-1 ring-violet-200'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                  onClick={() => { setSelectedScript(script); setIsEditing(false); }}
                >
                  <CardHeader className="pb-2 pt-4">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-sm font-medium leading-snug text-slate-800">
                        {script.topicTitle}
                      </CardTitle>
                      <Badge
                        variant="outline"
                        className={`shrink-0 rounded-full border px-2 py-0 text-[10px] font-medium ${
                          script.status === 'completed'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
                            : script.status === 'editing'
                            ? 'border-amber-200 bg-amber-50 text-amber-600'
                            : 'border-blue-200 bg-blue-50 text-blue-600'
                        }`}
                      >
                        {script.status === 'completed' ? '已完成' : script.status === 'editing' ? '已编辑' : '已通过'}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs text-slate-400">
                      {script.platform} · {script.agentPreset} · {script.wordCount}字
                    </CardDescription>
                    {script.sourceUrl && (
                      <Badge variant="secondary" className="mt-1 w-fit rounded-full text-[10px]">
                        <Video className="mr-1 h-2.5 w-2.5" />
                        仿写
                      </Badge>
                    )}
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="line-clamp-2 text-xs text-slate-500">
                      {script.content.slice(0, 100)}...
                    </p>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Script Detail */}
        <div className="col-span-3">
          {selectedScript ? (
            <Card className="border-slate-200 bg-white">
              <CardHeader className="border-b border-slate-100 pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold text-slate-900">
                      {selectedScript.topicTitle}
                    </CardTitle>
                    <CardDescription className="mt-1 text-xs text-slate-400">
                      {selectedScript.platform} · {selectedScript.agentPreset} · {selectedScript.wordCount}字 · {selectedScript.generatedAt}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {isEditing ? (
                      <>
                        <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleSaveEdit}>
                          <Save className="h-3 w-3" />
                          保存
                        </Button>
                        <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setIsEditing(false)}>
                          <X className="h-3 w-3" />
                          取消
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleStartEdit}>
                          <Edit3 className="h-3 w-3" />
                          编辑
                        </Button>
                        <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => handleCopy(selectedScript.content)}>
                          <Copy className="h-3 w-3" />
                          复制
                        </Button>
                        <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => handleExport(selectedScript, 'md')}>
                          <Download className="h-3 w-3" />
                          导出 MD
                        </Button>
                        <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => handleExport(selectedScript, 'txt')}>
                          <Download className="h-3 w-3" />
                          导出 TXT
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-5">
                {isEditing ? (
                  <textarea
                    ref={editorRef}
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="min-h-[400px] w-full rounded-lg border border-slate-200 p-4 text-sm leading-relaxed text-slate-700 focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-100"
                    autoFocus
                  />
                ) : (
                  <div className="max-h-[500px] overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                      {selectedScript.content}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="flex h-[400px] items-center justify-center border-slate-200 bg-white">
              <div className="text-center">
                <FileText className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-3 text-sm text-slate-500">
                  选择一个脚本查看详情
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
