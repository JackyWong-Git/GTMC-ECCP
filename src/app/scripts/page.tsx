'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  FileText,
  Sparkles,
  Loader2,
  Copy,
  Download,
  MessageSquare,
  BookOpen,
  Film,
  ShoppingBag,
  Camera,
  Save,
  CheckCircle2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { toast, Toaster } from 'sonner';

// Agent 预设风格
interface AgentPreset {
  id: string;
  name: string;
  icon: typeof FileText;
  description: string;
  style: string;
  color: string;
}

const AGENT_PRESETS: AgentPreset[] = [
  {
    id: 'oral',
    name: '口播达人',
    icon: MessageSquare,
    description: '快节奏口播，信息密度高',
    style: '轻松口语化，节奏快，信息密度高，开头要有强钩子，结尾要有互动引导',
    color: 'text-violet-600 bg-violet-50 border-violet-200',
  },
  {
    id: 'story',
    name: '故事型',
    icon: BookOpen,
    description: '叙事驱动，情感共鸣',
    style: '叙事性强，有起承转合，注重情感共鸣和人物刻画',
    color: 'text-blue-600 bg-blue-50 border-blue-200',
  },
  {
    id: 'review',
    name: '测评型',
    icon: Film,
    description: '专业测评，数据说话',
    style: '专业客观，数据支撑，优缺点分明，有明确结论',
    color: 'text-green-600 bg-green-50 border-green-200',
  },
  {
    id: 'tutorial',
    name: '教程型',
    icon: Camera,
    description: '步骤清晰，实操性强',
    style: '步骤清晰，语言简洁，重点突出，有实操指导',
    color: 'text-amber-600 bg-amber-50 border-amber-200',
  },
  {
    id: 'vlog',
    name: 'Vlog',
    icon: ShoppingBag,
    description: '生活化，真实感强',
    style: '生活化，真实感强，有个人视角和情感表达',
    color: 'text-pink-600 bg-pink-50 border-pink-200',
  },
];

const DURATION_OPTIONS = [
  { value: '30秒', label: '30秒', words: '150-200字' },
  { value: '60秒', label: '60秒', words: '300-400字' },
  { value: '90秒', label: '90秒', words: '450-600字' },
  { value: '3分钟', label: '3分钟', words: '900-1200字' },
];

export default function ScriptsPage() {
  // Load topic from URL params
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');

  // Generation options
  const [selectedAgent, setSelectedAgent] = useState<string>('oral');
  const [duration, setDuration] = useState('60秒');
  const [platform, setPlatform] = useState('抖音');

  // Generation state
  const [generatedScript, setGeneratedScript] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);

  // Load topic from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const topicParam = params.get('topic');
    if (topicParam) {
      setTopic(decodeURIComponent(topicParam));
    }
  }, []);

  // Generate script
  const handleGenerate = useCallback(async () => {
    if (!topic.trim()) {
      toast.error('请输入选题');
      return;
    }

    setIsGenerating(true);
    setGeneratedScript('');
    setGenerationProgress(0);

    const agent = AGENT_PRESETS.find(a => a.id === selectedAgent);

    try {
      const response = await fetch('/api/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicTitle: topic,
          description,
          style: agent?.style || '',
          duration,
          platform,
        }),
      });

      if (!response.ok) {
        throw new Error('生成失败');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        let totalChars = 0;
        const targetChars = duration === '30秒' ? 180 : duration === '60秒' ? 350 : duration === '90秒' ? 520 : 1000;

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
                  setGeneratedScript(prev => prev + data.content);
                  totalChars += data.content.length;
                  setGenerationProgress(Math.min(95, Math.round((totalChars / targetChars) * 100)));
                }
              } catch {
                // Ignore parse errors
              }
            }
          }
        }
      }

      setGenerationProgress(100);
      toast.success('脚本生成完成');
    } catch {
      toast.error('脚本生成失败，请重试');
    } finally {
      setIsGenerating(false);
    }
  }, [topic, description, selectedAgent, duration, platform]);

  // Copy to clipboard
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(generatedScript);
    toast.success('已复制到剪贴板');
  }, [generatedScript]);

  // Download as file
  const handleDownload = useCallback(() => {
    const blob = new Blob([generatedScript], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${topic}-${selectedAgent}-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('下载成功');
  }, [generatedScript, topic, selectedAgent]);

  // Save to knowledge base
  const handleSaveToKnowledge = useCallback(async () => {
    try {
      const agent = AGENT_PRESETS.find(a => a.id === selectedAgent);
      const response = await fetch('/api/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          title: `${topic} - ${agent?.name || '脚本'}`,
          content: generatedScript,
          source: '脚本工坊',
          category: 'content',
          tags: ['脚本', agent?.name || '', platform],
        }),
      });

      if (response.ok) {
        toast.success('已存入知识库');
      } else {
        toast.error('保存失败');
      }
    } catch {
      toast.error('保存失败');
    }
  }, [generatedScript, topic, selectedAgent, platform]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-center" richColors />

      {/* Header */}
      <header className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-violet-600" />
            <h1 className="text-xl font-bold">脚本工坊</h1>
          </div>
          {generatedScript && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleCopy}>
                <Copy className="w-4 h-4 mr-1" />
                复制
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="w-4 h-4 mr-1" />
                下载
              </Button>
              <Button variant="outline" size="sm" onClick={handleSaveToKnowledge}>
                <Save className="w-4 h-4 mr-1" />
                存知识库
              </Button>
            </div>
          )}
        </div>
      </header>

      <main className="p-6 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Input & Options */}
          <div className="lg:col-span-1 space-y-6">
            {/* Topic Input */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">选题</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Input
                    placeholder="输入选题标题"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="mb-3"
                  />
                  <Textarea
                    placeholder="补充描述（可选）：目标受众、核心卖点、参考案例..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Agent Selection */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">风格</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {AGENT_PRESETS.map((agent) => (
                    <button
                      key={agent.id}
                      onClick={() => setSelectedAgent(agent.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                        selectedAgent === agent.id
                          ? agent.color + ' border-current'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <agent.icon className="w-5 h-5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{agent.name}</div>
                        <div className="text-xs text-gray-500 truncate">{agent.description}</div>
                      </div>
                      {selectedAgent === agent.id && (
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Duration & Platform */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">参数</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">时长</label>
                  <div className="grid grid-cols-2 gap-2">
                    {DURATION_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setDuration(opt.value)}
                        className={`p-2 rounded-lg border text-center transition-all ${
                          duration === opt.value
                            ? 'border-violet-500 bg-violet-50 text-violet-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-medium text-sm">{opt.label}</div>
                        <div className="text-xs text-gray-500">{opt.words}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">平台</label>
                  <div className="flex gap-2">
                    {['抖音', '快手', '小红书', 'B站'].map((p) => (
                      <button
                        key={p}
                        onClick={() => setPlatform(p)}
                        className={`px-3 py-1.5 rounded-lg border text-sm transition-all ${
                          platform === p
                            ? 'border-violet-500 bg-violet-50 text-violet-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Generate Button */}
            <Button
              className="w-full h-12 text-base"
              onClick={handleGenerate}
              disabled={isGenerating || !topic.trim()}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  生成中... {generationProgress}%
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  生成脚本
                </>
              )}
            </Button>
          </div>

          {/* Right: Output */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">生成结果</CardTitle>
                  {generatedScript && (
                    <Badge variant="secondary">
                      {generatedScript.length} 字
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isGenerating ? (
                  <div className="space-y-4">
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-violet-500 transition-all duration-300"
                        style={{ width: `${generationProgress}%` }}
                      />
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 min-h-[400px]">
                      <pre className="text-sm whitespace-pre-wrap font-sans text-gray-700">
                        {generatedScript || '正在生成...'}
                        <span className="inline-block w-2 h-4 bg-violet-500 animate-pulse ml-1" />
                      </pre>
                    </div>
                  </div>
                ) : generatedScript ? (
                  <div className="bg-gray-50 rounded-lg p-4 min-h-[400px] max-h-[600px] overflow-y-auto">
                    <pre className="text-sm whitespace-pre-wrap font-sans text-gray-700">
                      {generatedScript}
                    </pre>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                    <FileText className="w-16 h-16 mb-4 opacity-50" />
                    <p className="text-lg font-medium">输入选题，点击生成</p>
                    <p className="text-sm mt-1">AI 将为你创作一份专业脚本</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
