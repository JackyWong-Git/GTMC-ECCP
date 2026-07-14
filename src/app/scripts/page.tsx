'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
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
  Plus,
  Trash2,
  Settings2,
  Palette,
  Upload,
  FileVideo,
  RefreshCw,
  Languages,
  Type,
  ChevronRight,
  SlidersHorizontal,
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
  isCustom?: boolean;
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
  const [isIncomplete, setIsIncomplete] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeResult, setScrapeResult] = useState('');
  const [activeTab, setActiveTab] = useState<'create' | 'scrape'>('create');
  const [mrbeastMode, setMrbeastMode] = useState(false);
  const [showFormulas, setShowFormulas] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFileName, setUploadedFileName] = useState('');

  // 工作流步骤状态
  const [currentStep, setCurrentStep] = useState(1);
  const [creativityLevel, setCreativityLevel] = useState(70);
  const [detailLevel, setDetailLevel] = useState(50);
  const [isRewriting, setIsRewriting] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isGeneratingTitles, setIsGeneratingTitles] = useState(false);
  const [generatedTitles, setGeneratedTitles] = useState<string[]>([]);
  const [translateLang, setTranslateLang] = useState('英语');

  // 从 localStorage 加载脚本
  useEffect(() => {
    try {
      const saved = localStorage.getItem('scripts');
      if (saved) {
        setScripts(JSON.parse(saved));
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  // 保存脚本到 localStorage
  useEffect(() => {
    if (scripts.length > 0) {
      localStorage.setItem('scripts', JSON.stringify(scripts));
    }
  }, [scripts]);

  // 自定义 Agent 状态
  const [customAgents, setCustomAgents] = useState<AgentPreset[]>([]);
  const [showAgentForm, setShowAgentForm] = useState(false);
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
  const [agentForm, setAgentForm] = useState({
    name: '',
    description: '',
    style: '',
    prompt: '',
  });

  // 从 localStorage 加载自定义 Agent
  useEffect(() => {
    try {
      const saved = localStorage.getItem('custom-agents');
      if (saved) {
        const parsed = JSON.parse(saved) as Array<{
          id: string;
          name: string;
          description: string;
          style: string;
          prompt: string;
          color: string;
        }>;
        setCustomAgents(
          parsed.map((a) => ({
            ...a,
            icon: Palette,
            isCustom: true,
          }))
        );
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  // 保存自定义 Agent 到 localStorage
  const saveCustomAgents = useCallback((agents: AgentPreset[]) => {
    const serializable = agents.map(({ id, name, description, style, prompt, color }) => ({
      id, name, description, style, prompt, color,
    }));
    localStorage.setItem('custom-agents', JSON.stringify(serializable));
  }, []);

  // 自定义 Agent 颜色池
  const CUSTOM_COLORS = [
    'text-rose-600 bg-rose-50 border-rose-200',
    'text-teal-600 bg-teal-50 border-teal-200',
    'text-indigo-600 bg-indigo-50 border-indigo-200',
    'text-orange-600 bg-orange-50 border-orange-200',
    'text-cyan-600 bg-cyan-50 border-cyan-200',
    'text-fuchsia-600 bg-fuchsia-50 border-fuchsia-200',
    'text-lime-600 bg-lime-50 border-lime-200',
    'text-sky-600 bg-sky-50 border-sky-200',
  ];

  const getNextColor = useCallback(() => {
    const usedColors = customAgents.map((a) => a.color);
    const available = CUSTOM_COLORS.filter((c) => !usedColors.includes(c));
    return available.length > 0 ? available[0] : CUSTOM_COLORS[customAgents.length % CUSTOM_COLORS.length];
  }, [customAgents]);

  const openCreateForm = useCallback(() => {
    setEditingAgentId(null);
    setAgentForm({ name: '', description: '', style: '', prompt: '' });
    setShowAgentForm(true);
  }, []);

  const openEditForm = useCallback((agent: AgentPreset) => {
    setEditingAgentId(agent.id);
    setAgentForm({
      name: agent.name,
      description: agent.description,
      style: agent.style,
      prompt: agent.prompt,
    });
    setShowAgentForm(true);
  }, []);

  const handleSaveAgent = useCallback(() => {
    if (!agentForm.name.trim() || !agentForm.prompt.trim()) return;

    if (editingAgentId) {
      const updated = customAgents.map((a) =>
        a.id === editingAgentId
          ? { ...a, name: agentForm.name, description: agentForm.description, style: agentForm.style, prompt: agentForm.prompt }
          : a
      );
      setCustomAgents(updated);
      saveCustomAgents(updated);
      if (selectedPreset.id === editingAgentId) {
        const updatedAgent = updated.find((a) => a.id === editingAgentId);
        if (updatedAgent) setSelectedPreset(updatedAgent);
      }
    } else {
      const newAgent: AgentPreset = {
        id: `custom-${Date.now()}`,
        name: agentForm.name,
        icon: Palette,
        description: agentForm.description || '自定义 Agent 风格',
        style: agentForm.style || '自定义风格',
        prompt: agentForm.prompt,
        color: getNextColor(),
        isCustom: true,
      };
      const updated = [...customAgents, newAgent];
      setCustomAgents(updated);
      saveCustomAgents(updated);
    }
    setShowAgentForm(false);
    setEditingAgentId(null);
    setAgentForm({ name: '', description: '', style: '', prompt: '' });
  }, [agentForm, editingAgentId, customAgents, saveCustomAgents, getNextColor, selectedPreset]);

  const handleDeleteAgent = useCallback((agentId: string) => {
    const updated = customAgents.filter((a) => a.id !== agentId);
    setCustomAgents(updated);
    saveCustomAgents(updated);
    if (selectedPreset.id === agentId) {
      setSelectedPreset(AGENT_PRESETS[0]);
    }
  }, [customAgents, saveCustomAgents, selectedPreset]);

  // 合并预设 + 自定义
  const allAgents = [...AGENT_PRESETS, ...customAgents];

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
          mrbeastMode,
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
                // 检测内容是否不完整（没有拍摄建议部分）
                const hasShootingTips = fullContent.includes('拍摄建议') || fullContent.includes('拍摄提示');
                const hasEnding = fullContent.includes('结尾') || fullContent.includes('引导');
                const isIncompleteContent = !hasShootingTips || !hasEnding;
                setIsIncomplete(isIncompleteContent);
                
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
  }, [topicTitle, platform, selectedPreset, mrbeastMode]);

  // 继续生成（当内容不完整时）
  const handleContinueGenerate = useCallback(async () => {
    if (!streamContent.trim()) return;

    setIsGenerating(true);
    setIsIncomplete(false);

    const continuePrompt = `请继续完成上面的脚本，从当前中断的地方继续输出。确保包含完整的"拍摄建议"和"结尾引导"部分。

当前已生成的内容：
${streamContent}

请从中断处继续：`;

    try {
      const response = await fetch('/api/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicTitle: `继续生成：${topicTitle}`,
          platform,
          style: selectedPreset.style,
          duration: '3-5分钟',
          systemPrompt: continuePrompt,
        }),
      });

      if (!response.ok) {
        setStreamContent(prev => prev + '\n\n继续生成失败');
        setIsGenerating(false);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        setIsGenerating(false);
        return;
      }

      const decoder = new TextDecoder();
      let fullContent = streamContent;

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
                // 再次检测是否完整
                const hasShootingTips = fullContent.includes('拍摄建议') || fullContent.includes('拍摄提示');
                const hasEnding = fullContent.includes('结尾') || fullContent.includes('引导');
                setIsIncomplete(!hasShootingTips || !hasEnding);
                
                // 更新脚本列表
                const updatedScript: Script = {
                  id: `script_${Date.now()}`,
                  topicTitle,
                  platform,
                  status: 'completed',
                  generatedAt: new Date().toLocaleString('zh-CN'),
                  wordCount: fullContent.length,
                  content: fullContent,
                  agentPreset: selectedPreset.name,
                };
                setScripts(prev => [updatedScript, ...prev.slice(1)]);
                setSelectedScript(updatedScript);
              }
            } catch {
              // skip
            }
          }
        }
      }
    } catch (err) {
      setStreamContent(prev => prev + `\n\n继续生成失败：${err instanceof Error ? err.message : '网络错误'}`);
    } finally {
      setIsGenerating(false);
    }
  }, [streamContent, topicTitle, platform, selectedPreset]);

  // 一键二创 - 对已有脚本进行二次创作
  const handleRewriteScript = useCallback(async () => {
    if (!streamContent.trim() && !selectedScript) return;

    const sourceContent = streamContent || selectedScript?.content || '';
    setIsRewriting(true);
    setStreamContent('');

    try {
      const response = await fetch('/api/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicTitle: `二创：${topicTitle || selectedScript?.topicTitle}`,
          platform,
          style: selectedPreset.style,
          duration: '3-5分钟',
          systemPrompt: `你是一个专业的脚本改写专家。请对以下脚本进行深度二次创作，要求：
1. 保留核心主题和关键信息
2. 改变表达方式和叙事角度，使其更具原创性
3. 优化开头钩子，增强吸引力
4. 调整节奏和结构，提升观看体验
5. 使用「${selectedPreset.style}」风格

创意度：${creativityLevel}%（越高越有创意，越低越接近原文）
详细度：${detailLevel}%（越高越详细，越低越精简）

原始脚本：
${sourceContent}

请输出完整的二创脚本：`,
        }),
      });

      if (!response.ok) {
        setStreamContent('二创失败，请重试');
        setIsRewriting(false);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        setIsRewriting(false);
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
            } catch {
              // skip
            }
          }
        }
      }
    } catch (err) {
      setStreamContent(`二创失败：${err instanceof Error ? err.message : '网络错误'}`);
    } finally {
      setIsRewriting(false);
    }
  }, [streamContent, selectedScript, topicTitle, platform, selectedPreset, creativityLevel, detailLevel]);

  // 一键翻译
  const handleTranslateScript = useCallback(async () => {
    if (!streamContent.trim() && !selectedScript) return;

    const sourceContent = streamContent || selectedScript?.content || '';
    setIsTranslating(true);

    try {
      const response = await fetch('/api/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicTitle: `翻译：${topicTitle || selectedScript?.topicTitle}`,
          platform,
          style: '翻译',
          duration: '不限',
          systemPrompt: `你是一个专业的视频脚本翻译专家。请将以下脚本翻译成${translateLang}，要求：
1. 保持原文的结构和格式
2. 翻译要自然流畅，符合目标语言的表达习惯
3. 保留专业术语的准确性
4. 适当调整文化差异，使其更适合目标语言的受众

原始脚本：
${sourceContent}

请输出翻译后的完整脚本：`,
        }),
      });

      if (!response.ok) {
        setStreamContent('翻译失败，请重试');
        setIsTranslating(false);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        setIsTranslating(false);
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
            } catch {
              // skip
            }
          }
        }
      }
    } catch (err) {
      setStreamContent(`翻译失败：${err instanceof Error ? err.message : '网络错误'}`);
    } finally {
      setIsTranslating(false);
    }
  }, [streamContent, selectedScript, topicTitle, platform, translateLang]);

  // 智能生成标题
  const handleGenerateTitles = useCallback(async () => {
    if (!streamContent.trim() && !selectedScript) return;

    const sourceContent = streamContent || selectedScript?.content || '';
    setIsGeneratingTitles(true);
    setGeneratedTitles([]);

    try {
      const response = await fetch('/api/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicTitle: '生成标题',
          platform,
          style: '标题生成',
          duration: '不限',
          systemPrompt: `你是一个专业的视频标题生成专家。请根据以下脚本内容，生成5个吸引人的视频标题，要求：
1. 每个标题控制在15字以内
2. 使用不同的标题公式（悬念型、数字型、对比型、痛点型、情感型）
3. 标题要有吸引力，能引发点击欲望
4. 适合${platform}平台的风格

脚本内容：
${sourceContent.slice(0, 500)}

请输出5个标题，每行一个，格式如下：
1. [悬念型] 标题内容
2. [数字型] 标题内容
3. [对比型] 标题内容
4. [痛点型] 标题内容
5. [情感型] 标题内容`,
        }),
      });

      if (!response.ok) {
        setIsGeneratingTitles(false);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        setIsGeneratingTitles(false);
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
              }
            } catch {
              // skip
            }
          }
        }
      }

      // 解析标题
      const titleLines = fullContent.split('\n').filter(line => line.match(/^\d+\./));
      const titles = titleLines.map(line => line.replace(/^\d+\.\s*\[.*?\]\s*/, '').trim()).filter(Boolean);
      setGeneratedTitles(titles.slice(0, 5));
    } catch {
      // ignore errors
    } finally {
      setIsGeneratingTitles(false);
    }
  }, [streamContent, selectedScript, platform]);

  // 扒视频 - 只提取文案
  const handleScrapeVideo = useCallback(async () => {
    if (!videoUrl.trim()) return;

    setIsScraping(true);
    setScrapeResult('');

    try {
      // 判断是否是 URL
      const isUrl = videoUrl.startsWith('http://') || videoUrl.startsWith('https://');

      if (isUrl) {
        // 使用 FetchClient 直接获取视频页面内容
        const videoResponse = await fetch('/api/douyin-trending', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            searchType: 'video',
            videoUrl: videoUrl,
          }),
        });

        if (!videoResponse.ok) {
          setScrapeResult('视频页面获取失败，请检查链接是否有效');
          setIsScraping(false);
          return;
        }

        const videoData = await videoResponse.json();

        if (!videoData.success) {
          setScrapeResult(videoData.error || '视频内容获取失败');
          setIsScraping(false);
          return;
        }

        const videoInfo = videoData.data?.videoInfo;
        if (!videoInfo || !videoInfo.script) {
          setScrapeResult('未能从视频页面提取到文案内容');
          setIsScraping(false);
          return;
        }

        // 格式化输出
        const result = `## ${videoInfo.title}

### 视频文案
${videoInfo.script}

${videoInfo.description ? `### 视频描述\n${videoInfo.description}\n` : ''}
${videoInfo.tags?.length ? `### 标签\n${videoInfo.tags.join('、')}\n` : ''}
${videoInfo.highlights?.length ? `### 亮点\n${videoInfo.highlights.map((h: string) => `- ${h}`).join('\n')}\n` : ''}
### 来源
${videoInfo.sourceUrl}`;

        setScrapeResult(result);
        setIsScraping(false);
      } else {
        // 使用搜索 API 获取视频信息（关键词搜索模式）
        const searchResponse = await fetch('/api/douyin-trending', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: videoUrl, count: 5 }),
        });

        if (!searchResponse.ok) {
          setScrapeResult('视频信息获取失败，请检查关键词是否有效');
          setIsScraping(false);
          return;
        }

        const searchData = await searchResponse.json();
        const videoInfo = searchData.data?.topics?.slice(0, 3) || [];

        if (videoInfo.length === 0) {
          setScrapeResult('未找到相关视频内容，请尝试更换关键词');
          setIsScraping(false);
          return;
        }

        // 格式化搜索结果
        const result = `## 搜索结果：${videoUrl}

${videoInfo.map((v: { title: string; snippet?: string; url?: string }, i: number) =>
  `### ${i + 1}. ${v.title}\n${v.snippet || '暂无描述'}\n${v.url ? `链接：${v.url}` : ''}`
).join('\n\n')}

---
提示：如需提取完整文案，请直接输入视频链接`;

        setScrapeResult(result);
        setIsScraping(false);
      }
    } catch (err) {
      setScrapeResult(`请求失败：${err instanceof Error ? err.message : '网络错误'}`);
    } finally {
      setIsScraping(false);
    }
  }, [videoUrl]);

  // 根据扒取的文案 + Agent 风格再创作
  const handleRewriteFromScrape = useCallback(async () => {
    if (!scrapeResult.trim()) return;

    setIsGenerating(true);
    setStreamContent('');

    const agentStyleGuide = selectedPreset.prompt;
    const agentStyleName = selectedPreset.name;

    const rewritePrompt = `你是一位专业的视频脚本创作师。请基于以下参考文案，严格按照「${agentStyleName}」的 Agent 风格创作一个全新的原创脚本。

## 参考文案（从视频中提取）
${scrapeResult}

## Agent 风格要求
当前选用的 Agent 风格是「${agentStyleName}」，你必须严格遵循以下风格指南：

${agentStyleGuide}

## 创作任务
1. 借鉴参考文案的成功要素（结构、节奏、表达方式）
2. 严格按照「${agentStyleName}」的风格特征进行创作
3. 内容必须是原创的，不能照搬参考文案
4. 为选题"${topicTitle || '请指定选题'}"创作完整脚本`;

    try {
      const response = await fetch('/api/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicTitle: topicTitle || '仿写脚本',
          platform,
          style: selectedPreset.style,
          duration: '3-5分钟',
          systemPrompt: rewritePrompt,
        }),
      });

      if (!response.ok) {
        setStreamContent('脚本生成失败');
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
                const newScript: Script = {
                  id: `script_${Date.now()}`,
                  topicTitle: topicTitle || '仿写脚本',
                  platform,
                  status: 'completed',
                  generatedAt: new Date().toLocaleString('zh-CN'),
                  wordCount: fullContent.length,
                  content: fullContent,
                  agentPreset: `${agentStyleName}（仿写）`,
                  sourceUrl: videoUrl,
                };
                setScripts(prev => [newScript, ...prev]);
                setSelectedScript(newScript);
                setActiveTab('create');
              }
            } catch {
              // skip
            }
          }
        }
      }
    } catch (err) {
      setStreamContent(`请求失败：${err instanceof Error ? err.message : '网络错误'}`);
    } finally {
      setIsGenerating(false);
    }
  }, [scrapeResult, topicTitle, platform, selectedPreset, videoUrl]);

  // 文件上传处理
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setIsScraping(true);
    setScrapeResult('');

    const isVideo = file.type.startsWith('video/');
    const isText = file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md');

    try {
      if (isText) {
        // 文本文件直接读取内容
        const text = await file.text();
        setScrapeResult(text);
        setIsScraping(false);
      } else if (isVideo) {
        // 视频文件：上传到服务器提取文案
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', 'video');

        const response = await fetch('/api/knowledge', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('视频上传失败');
        }

        const result = await response.json();
        if (result.success) {
          // 视频上传后，使用 AI 提取文案
          const extractResponse = await fetch('/api/generate-script', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              topicTitle: `从视频 ${file.name} 提取文案`,
              platform: 'douyin',
              style: 'informative',
              duration: '1-3分钟',
              systemPrompt: `你是一位专业的视频文案提取师。请根据以下视频文件信息，提取或推测视频的核心文案内容。

视频文件名：${file.name}
文件大小：${(file.size / 1024 / 1024).toFixed(2)} MB

请提取视频中的：
1. 开场白/钩子
2. 核心内容要点
3. 结尾/行动号召

如果无法直接提取，请根据视频类型推测可能的文案结构。`,
            }),
          });

          if (extractResponse.ok && extractResponse.body) {
            const reader = extractResponse.body.getReader();
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
                  } catch {
                    // skip
                  }
                }
              }
            }
          }
        }
        setIsScraping(false);
      } else {
        throw new Error('不支持的文件类型，请上传视频或文本文件');
      }
    } catch (err) {
      setScrapeResult(`文件处理失败：${err instanceof Error ? err.message : '未知错误'}`);
      setIsScraping(false);
    }

    // 清空 input 以便重复上传同一文件
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

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
            {allAgents.map((preset) => {
              const Icon = preset.icon;
              const isSelected = selectedPreset.id === preset.id;
              return (
                <div key={preset.id} className="relative group">
                  <button
                    onClick={() => setSelectedPreset(preset)}
                    className={`flex w-full flex-col items-center gap-2 rounded-xl border p-4 transition-all ${
                      isSelected
                        ? `${preset.color} border-current ring-2 ring-offset-1`
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-xs font-medium">{preset.name}</span>
                    <span className="text-[10px] text-slate-400 line-clamp-1">{preset.description}</span>
                    {preset.isCustom && (
                      <Badge variant="outline" className="mt-0.5 text-[9px] px-1.5 py-0 border-slate-300 text-slate-400">
                        自定义
                      </Badge>
                    )}
                  </button>
                  {/* 自定义 Agent 操作按钮 */}
                  {preset.isCustom && (
                    <div className="absolute -top-1 -right-1 hidden group-hover:flex gap-0.5">
                      <button
                        onClick={(e) => { e.stopPropagation(); openEditForm(preset); }}
                        className="rounded-full bg-white p-1 shadow-md border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-300 transition-colors"
                        title="编辑"
                      >
                        <Settings2 className="h-3 w-3" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteAgent(preset.id); }}
                        className="rounded-full bg-white p-1 shadow-md border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-300 transition-colors"
                        title="删除"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            {/* 创建自定义 Agent 按钮 */}
            <button
              onClick={openCreateForm}
              className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 p-4 text-slate-400 transition-all hover:border-violet-400 hover:text-violet-500 hover:bg-violet-50/50"
            >
              <Plus className="h-5 w-5" />
              <span className="text-xs font-medium">自定义 Agent</span>
              <span className="text-[10px] text-slate-400">创建你的专属风格</span>
            </button>
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
          扒文案
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

            {/* MrBeast 模式开关 + 公式参考 */}
            <div className="mt-3 flex items-center gap-3">
              <button
                onClick={() => setMrbeastMode(!mrbeastMode)}
                className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                  mrbeastMode
                    ? 'border-amber-300 bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                    : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span className={`inline-block h-2 w-2 rounded-full ${mrbeastMode ? 'bg-amber-500' : 'bg-slate-300'}`} />
                MrBeast 方法论
              </button>
              {mrbeastMode && (
                <button
                  onClick={() => setShowFormulas(!showFormulas)}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-violet-600 transition-colors"
                >
                  <BookOpen className="h-3 w-3" />
                  {showFormulas ? '收起公式参考' : '查看公式参考'}
                </button>
              )}
              {mrbeastMode && (
                <span className="text-[10px] text-amber-600/70">
                  将使用标题公式 + 缩略图三要素 + Hook 结构 + 阶梯递进生成脚本
                </span>
              )}
            </div>

            {/* MrBeast 公式参考面板 */}
            {mrbeastMode && showFormulas && (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/50 p-4">
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <h4 className="mb-2 font-semibold text-amber-800">标题公式（5种高频模式）</h4>
                    <div className="space-y-1.5">
                      <div className="flex items-start gap-2">
                        <Badge variant="outline" className="shrink-0 border-amber-300 text-amber-700 text-[9px]">金钱锚定</Badge>
                        <span className="text-slate-600">¥[数字] + [动作/对象]</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Badge variant="outline" className="shrink-0 border-amber-300 text-amber-700 text-[9px]">挑战</Badge>
                        <span className="text-slate-600">我[极端动作]了[时间/条件]</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Badge variant="outline" className="shrink-0 border-amber-300 text-amber-700 text-[9px]">时间压力</Badge>
                        <span className="text-slate-600">[时间] + [挑战]</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Badge variant="outline" className="shrink-0 border-amber-300 text-amber-700 text-[9px]">极端对比</Badge>
                        <span className="text-slate-600">[小] vs [大]</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Badge variant="outline" className="shrink-0 border-amber-300 text-amber-700 text-[9px]">情感触发</Badge>
                        <span className="text-slate-600">我[慈善/感人行为]</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="mb-2 font-semibold text-amber-800">前30秒 Hook 结构</h4>
                    <div className="space-y-1.5 text-slate-600">
                      <div><span className="font-medium text-amber-700">0-3秒</span> 概念即画面（视觉化展示核心概念）</div>
                      <div><span className="font-medium text-amber-700">3-8秒</span> 赌注声明（&quot;如果失败，XX就会发生&quot;）</div>
                      <div><span className="font-medium text-amber-700">8-15秒</span> 视觉预告（快速闪过最精彩画面）</div>
                      <div><span className="font-medium text-amber-700">15-30秒</span> 立即开始行动（不铺垫不解释）</div>
                    </div>
                    <h4 className="mt-3 mb-2 font-semibold text-amber-800">缩略图三要素</h4>
                    <div className="space-y-1 text-slate-600">
                      <div>1. 一张脸（带明确情绪表情）</div>
                      <div>2. 一个物体（视觉焦点）</div>
                      <div>3. 一个问题（看到就想知道&quot;怎么回事？&quot;）</div>
                    </div>
                  </div>
                </div>
                <div className="mt-3 border-t border-amber-200 pt-3">
                  <h4 className="mb-1.5 font-semibold text-amber-800">核心公式</h4>
                  <div className="flex items-center gap-4 text-slate-600">
                    <span><span className="font-medium text-amber-700">视频成功</span> = CTR x AVD</span>
                    <span className="text-amber-300">|</span>
                    <span><span className="font-medium text-amber-700">病毒度</span> = 概念简单度 x 执行极端度</span>
                    <span className="text-amber-300">|</span>
                    <span><span className="font-medium text-amber-700">阶梯递进</span> 每段比前一段更大、赌注更高</span>
                  </div>
                </div>
              </div>
            )}

            {/* 工作流步骤指示器 */}
            <div className="mt-4 flex items-center gap-2">
              {[
                { step: 1, label: '输入选题', icon: Edit3 },
                { step: 2, label: 'AI 生成', icon: Sparkles },
                { step: 3, label: '编辑优化', icon: Wand2 },
                { step: 4, label: '导出使用', icon: Download },
              ].map((item, idx) => (
                <div key={item.step} className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentStep(item.step)}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                      currentStep >= item.step
                        ? 'bg-violet-100 text-violet-700'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    <item.icon className="h-3 w-3" />
                    {item.label}
                  </button>
                  {idx < 3 && <ChevronRight className="h-3 w-3 text-slate-300" />}
                </div>
              ))}
            </div>

            {/* AI 操作工具栏 */}
            {(streamContent || selectedScript) && (
              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50/50 p-3">
                <div className="flex items-center gap-2 mb-3">
                  <SlidersHorizontal className="h-3.5 w-3.5 text-slate-500" />
                  <span className="text-xs font-medium text-slate-600">AI 操作工具栏</span>
                </div>

                {/* 参数滑块 */}
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-slate-500">创意度</span>
                      <span className="text-[10px] font-medium text-violet-600">{creativityLevel}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={creativityLevel}
                      onChange={(e) => setCreativityLevel(Number(e.target.value))}
                      className="w-full h-1.5 rounded-full appearance-none bg-slate-200 accent-violet-500"
                    />
                    <div className="flex justify-between text-[9px] text-slate-400 mt-0.5">
                      <span>保守</span>
                      <span>创新</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-slate-500">详细度</span>
                      <span className="text-[10px] font-medium text-violet-600">{detailLevel}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={detailLevel}
                      onChange={(e) => setDetailLevel(Number(e.target.value))}
                      className="w-full h-1.5 rounded-full appearance-none bg-slate-200 accent-violet-500"
                    />
                    <div className="flex justify-between text-[9px] text-slate-400 mt-0.5">
                      <span>精简</span>
                      <span>详细</span>
                    </div>
                  </div>
                </div>

                {/* AI 操作按钮 */}
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1.5 text-xs border-violet-200 text-violet-600 hover:bg-violet-50"
                    onClick={handleRewriteScript}
                    disabled={isRewriting || isGenerating}
                  >
                    {isRewriting ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3 w-3" />
                    )}
                    一键二创
                  </Button>

                  <div className="flex items-center gap-1">
                    <Select value={translateLang} onValueChange={setTranslateLang}>
                      <SelectTrigger className="h-7 w-[80px] rounded-md border-slate-200 text-[10px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="英语">英语</SelectItem>
                        <SelectItem value="日语">日语</SelectItem>
                        <SelectItem value="韩语">韩语</SelectItem>
                        <SelectItem value="西班牙语">西班牙语</SelectItem>
                        <SelectItem value="法语">法语</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1.5 text-xs border-blue-200 text-blue-600 hover:bg-blue-50"
                      onClick={handleTranslateScript}
                      disabled={isTranslating || isGenerating}
                    >
                      {isTranslating ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Languages className="h-3 w-3" />
                      )}
                      翻译
                    </Button>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1.5 text-xs border-amber-200 text-amber-600 hover:bg-amber-50"
                    onClick={handleGenerateTitles}
                    disabled={isGeneratingTitles || isGenerating}
                  >
                    {isGeneratingTitles ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Type className="h-3 w-3" />
                    )}
                    生成标题
                  </Button>

                  <div className="h-4 w-px bg-slate-200" />

                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1.5 text-xs border-slate-200 text-slate-600 hover:bg-slate-50"
                    onClick={() => {
                      const content = streamContent || selectedScript?.content || '';
                      navigator.clipboard.writeText(content);
                    }}
                  >
                    <Copy className="h-3 w-3" />
                    复制
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1.5 text-xs border-slate-200 text-slate-600 hover:bg-slate-50"
                    onClick={() => {
                      const content = streamContent || selectedScript?.content || '';
                      const blob = new Blob([content], { type: 'text/markdown' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${topicTitle || '脚本'}_${new Date().toISOString().slice(0, 10)}.md`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    <Download className="h-3 w-3" />
                    导出
                  </Button>
                </div>

                {/* 生成的标题列表 */}
                {generatedTitles.length > 0 && (
                  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/50 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Type className="h-3.5 w-3.5 text-amber-600" />
                      <span className="text-xs font-medium text-amber-700">推荐标题（点击使用）</span>
                    </div>
                    <div className="space-y-1.5">
                      {generatedTitles.map((title, idx) => (
                        <button
                          key={idx}
                          onClick={() => setTopicTitle(title)}
                          className="block w-full text-left rounded-md px-2 py-1.5 text-xs text-slate-700 hover:bg-amber-100 transition-colors"
                        >
                          <span className="text-amber-500 mr-1.5">{idx + 1}.</span>
                          {title}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

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
                  <div className="flex items-center gap-2">
                    {streamModel && (
                      <Badge variant="secondary" className="rounded-full bg-violet-50 text-[10px] text-violet-600">
                        {streamModel}
                      </Badge>
                    )}
                    {isIncomplete && !isGenerating && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 gap-1 border-amber-300 text-xs text-amber-600 hover:bg-amber-50"
                        onClick={handleContinueGenerate}
                      >
                        <Play className="h-3 w-3" />
                        继续生成
                      </Button>
                    )}
                  </div>
                </div>
                {isIncomplete && !isGenerating && (
                  <div className="mb-2 rounded bg-amber-50 px-2 py-1 text-xs text-amber-600">
                    内容可能不完整，点击「继续生成」补全剩余部分
                  </div>
                )}
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
                扒文案
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-slate-400">
              输入视频链接、上传视频文件或文案文件，AI 提取文案后可根据 Agent 风格再创作
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* URL 输入 */}
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
                {isScraping ? '提取中...' : '扒文案'}
              </Button>
            </div>

            {/* 分隔线 */}
            <div className="my-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs text-slate-400">或</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            {/* 文件上传区域 */}
            <div
              className="relative cursor-pointer rounded-lg border-2 border-dashed border-blue-200 bg-blue-50/30 p-6 text-center transition-colors hover:border-blue-400 hover:bg-blue-50/50"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*,.txt,.md,text/plain"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Upload className="mx-auto h-8 w-8 text-blue-400" />
              <p className="mt-2 text-sm font-medium text-slate-600">
                点击上传视频或文案文件
              </p>
              <p className="mt-1 text-xs text-slate-400">
                支持视频文件（MP4、MOV）或文本文件（TXT、MD）
              </p>
              {uploadedFileName && (
                <div className="mt-3 flex items-center justify-center gap-2">
                  <FileVideo className="h-4 w-4 text-blue-500" />
                  <span className="text-xs text-blue-600">{uploadedFileName}</span>
                </div>
              )}
            </div>

            {/* Scrape Result - 提取的文案 */}
            {(scrapeResult || isScraping) && (
              <div className="mt-4 rounded-lg border border-blue-200 bg-white p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isScraping && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
                    )}
                    <span className="text-xs font-medium text-slate-600">
                      {isScraping ? '正在提取文案...' : '文案提取完成'}
                    </span>
                  </div>
                  {!isScraping && scrapeResult && (
                    <Button
                      size="sm"
                      className="gap-1.5 bg-violet-600 text-xs text-white hover:bg-violet-700"
                      onClick={handleRewriteFromScrape}
                      disabled={isGenerating}
                    >
                      {isGenerating ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5" />
                      )}
                      {isGenerating ? '创作中...' : `用「${selectedPreset.name}」再创作`}
                    </Button>
                  )}
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

            {/* 再创作生成结果 */}
            {(streamContent || isGenerating) && activeTab === 'scrape' && (
              <div className="mt-4 rounded-lg border border-violet-200 bg-white p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isGenerating && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-500" />
                    )}
                    <span className="text-xs font-medium text-slate-600">
                      {isGenerating ? '正在创作...' : '创作完成'}
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

      {/* 自定义 Agent 创建/编辑弹窗 */}
      {showAgentForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 mx-4">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100">
                  <Palette className="h-4 w-4 text-violet-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {editingAgentId ? '编辑自定义 Agent' : '创建自定义 Agent'}
                </h3>
              </div>
              <button
                onClick={() => { setShowAgentForm(false); setEditingAgentId(null); }}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Agent 名称 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Agent 名称 <span className="text-red-500">*</span>
                </label>
                <Input
                  value={agentForm.name}
                  onChange={(e) => setAgentForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="例如：幽默段子手、知识科普达人、情感共鸣型"
                  maxLength={20}
                />
                <p className="mt-1 text-xs text-slate-400">{agentForm.name.length}/20</p>
              </div>

              {/* 风格描述 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  风格描述
                </label>
                <Input
                  value={agentForm.description}
                  onChange={(e) => setAgentForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="简短描述这个 Agent 的特点，例如：幽默风趣，善用比喻和段子"
                  maxLength={50}
                />
              </div>

              {/* 风格关键词 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  风格关键词
                </label>
                <Input
                  value={agentForm.style}
                  onChange={(e) => setAgentForm((prev) => ({ ...prev, style: e.target.value }))}
                  placeholder="例如：幽默、接地气、有梗、节奏感强"
                  maxLength={100}
                />
                <p className="mt-1 text-xs text-slate-400">用逗号分隔关键词，会影响 AI 的创作风格</p>
              </div>

              {/* System Prompt */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  System Prompt <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={agentForm.prompt}
                  onChange={(e) => setAgentForm((prev) => ({ ...prev, prompt: e.target.value }))}
                  placeholder="定义这个 Agent 的角色和创作规则，例如：&#10;&#10;你是一个幽默风趣的短视频脚本创作者。你擅长用段子和比喻来解释复杂概念。&#10;&#10;创作要求：&#10;1. 开头必须有一个出人意料的反转或笑点&#10;2. 中间用 2-3 个生动的类比来阐述核心观点&#10;3. 结尾要有一个让人会心一笑的金句&#10;4. 整体语气轻松幽默，但不低俗"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 resize-none"
                  rows={8}
                  maxLength={2000}
                />
                <p className="mt-1 text-xs text-slate-400">{agentForm.prompt.length}/2000 - 越详细的 Prompt，AI 创作越精准</p>
              </div>

              {/* Prompt 模板提示 */}
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                <p className="text-xs text-amber-700 font-medium mb-1">Prompt 编写建议</p>
                <p className="text-xs text-amber-600">
                  好的 Prompt 应包含：角色定位（你是谁）+ 风格要求（怎么写）+ 结构规范（开头/中间/结尾的要求）+ 禁忌事项（不要做什么）
                </p>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => { setShowAgentForm(false); setEditingAgentId(null); }}
              >
                取消
              </Button>
              <Button
                onClick={handleSaveAgent}
                disabled={!agentForm.name.trim() || !agentForm.prompt.trim()}
                className="bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-50"
              >
                <Save className="h-4 w-4 mr-1.5" />
                {editingAgentId ? '保存修改' : '创建 Agent'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
