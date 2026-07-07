'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Sparkles,
  Download,
  Copy,
  Check,
  Loader2,
  BookOpen,
  TrendingUp,
  Heart,
  ShoppingBag,
  GraduationCap,
  Plus,
  X,
  Edit3,
  Save,
} from 'lucide-react';

// 文章风格预设
const ARTICLE_STYLES = [
  { id: 'deep_analysis', name: '深度分析', icon: BookOpen, color: 'bg-blue-500', desc: '行业洞察、趋势解读' },
  { id: 'industry_report', name: '行业报告', icon: TrendingUp, color: 'bg-emerald-500', desc: '数据驱动、专业研究' },
  { id: 'brand_story', name: '品牌故事', icon: Heart, color: 'bg-pink-500', desc: '情感共鸣、品牌传播' },
  { id: 'product_promo', name: '产品推广', icon: ShoppingBag, color: 'bg-amber-500', desc: '高转化、种草带货' },
  { id: 'tutorial', name: '教程干货', icon: GraduationCap, color: 'bg-purple-500', desc: '手把手教学、实用指南' },
];

interface ArticleHistory {
  id: string;
  topic: string;
  style: string;
  content: string;
  createdAt: string;
}

export default function ArticlesPage() {
  const [topic, setTopic] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('deep_analysis');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [extraRequirements, setExtraRequirements] = useState('');
  const [referenceContent, setReferenceContent] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<ArticleHistory[]>([]);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  // 从 localStorage 加载文章历史
  useEffect(() => {
    try {
      const saved = localStorage.getItem('article-history');
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  // 保存文章历史到 localStorage
  useEffect(() => {
    if (history.length > 0) {
      localStorage.setItem('article-history', JSON.stringify(history));
    }
  }, [history]);

  // 添加关键词
  const addKeyword = () => {
    if (keywordInput.trim() && !keywords.includes(keywordInput.trim())) {
      setKeywords([...keywords, keywordInput.trim()]);
      setKeywordInput('');
    }
  };

  const removeKeyword = (kw: string) => {
    setKeywords(keywords.filter((k) => k !== kw));
  };

  // 生成文章
  const handleGenerate = async () => {
    if (!topic.trim()) return;

    setIsGenerating(true);
    setGeneratedContent('');
    setIsEditing(false);

    try {
      const response = await fetch('/api/generate-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          style: selectedStyle,
          keywords,
          extraRequirements,
          referenceContent,
        }),
      });

      if (!response.ok) {
        throw new Error('生成失败');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                fullContent += data.content;
                setGeneratedContent(fullContent);
              }
              if (data.error) {
                throw new Error(data.error);
              }
            } catch {
              // ignore parse errors
            }
          }
        }
      }

      // 保存到历史
      const newArticle: ArticleHistory = {
        id: Date.now().toString(),
        topic,
        style: selectedStyle,
        content: fullContent,
        createdAt: new Date().toLocaleString('zh-CN'),
      };
      setHistory([newArticle, ...history]);
    } catch (error) {
      console.error('Generation error:', error);
      setGeneratedContent('生成失败，请重试');
    } finally {
      setIsGenerating(false);
    }
  };

  // 复制内容
  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 导出 Markdown
  const handleExportMarkdown = () => {
    const blob = new Blob([generatedContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${topic || '公众号文章'}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 导出 HTML（适配公众号排版）
  const handleExportHTML = () => {
    // 简单的 Markdown 转 HTML
    let html = generatedContent
      .replace(/^# (.+)$/gm, '<h1 style="font-size:24px;font-weight:bold;margin:20px 0 10px;color:#333;">$1</h1>')
      .replace(/^## (.+)$/gm, '<h2 style="font-size:20px;font-weight:bold;margin:16px 0 8px;color:#444;">$1</h2>')
      .replace(/^### (.+)$/gm, '<h3 style="font-size:17px;font-weight:bold;margin:12px 0 6px;color:#555;">$1</h3>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^---$/gm, '<hr style="border:none;border-top:1px solid #eee;margin:20px 0;">')
      .replace(/^\* (.+)$/gm, '<li style="margin:4px 0;padding-left:8px;">$1</li>')
      .replace(/^\d+\. (.+)$/gm, '<li style="margin:4px 0;padding-left:8px;">$1</li>')
      .replace(/\n\n/g, '</p><p style="margin:12px 0;line-height:1.8;color:#333;">')
      .replace(/\n/g, '<br>');

    html = `<div style="max-width:680px;margin:0 auto;padding:20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:16px;line-height:1.8;color:#333;">
<p style="margin:12px 0;line-height:1.8;color:#333;">${html}</p>
</div>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${topic || '公众号文章'}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 保存编辑
  const handleSaveEdit = () => {
    setIsEditing(false);
  };

  // 从历史加载
  const loadFromHistory = (article: ArticleHistory) => {
    setTopic(article.topic);
    setSelectedStyle(article.style);
    setGeneratedContent(article.content);
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">公众号文章</h1>
          <p className="text-sm text-slate-500 mt-1">AI 辅助创作高质量公众号内容</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：配置面板 */}
        <div className="lg:col-span-1 space-y-4">
          {/* 文章风格选择 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                文章风格
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {ARTICLE_STYLES.map((style) => {
                const Icon = style.icon;
                return (
                  <button
                    key={style.id}
                    onClick={() => setSelectedStyle(style.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                      selectedStyle === style.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${style.color} text-white`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900">{style.name}</div>
                      <div className="text-xs text-slate-500 truncate">{style.desc}</div>
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          {/* 文章主题 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">文章主题</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="例如：2024年新能源汽车市场趋势分析"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />

              {/* 关键词 */}
              <div>
                <label className="text-xs text-slate-500 mb-1 block">关键词（可选）</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="添加关键词"
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
                    className="flex-1"
                  />
                  <Button size="sm" variant="outline" onClick={addKeyword}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {keywords.map((kw) => (
                      <Badge key={kw} variant="secondary" className="text-xs">
                        {kw}
                        <button onClick={() => removeKeyword(kw)} className="ml-1">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* 额外要求 */}
              <div>
                <label className="text-xs text-slate-500 mb-1 block">额外要求（可选）</label>
                <Input
                  placeholder="例如：字数2000字左右，语气轻松"
                  value={extraRequirements}
                  onChange={(e) => setExtraRequirements(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* 参考素材 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">参考素材（可选）</CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                placeholder="粘贴参考资料、数据、要点等，AI 会融入文章中..."
                value={referenceContent}
                onChange={(e) => setReferenceContent(e.target.value)}
                className="w-full h-32 px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </CardContent>
          </Card>

          {/* 生成按钮 */}
          <Button
            onClick={handleGenerate}
            disabled={!topic.trim() || isGenerating}
            className="w-full"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                正在创作...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                生成文章
              </>
            )}
          </Button>
        </div>

        {/* 右侧：内容区域 */}
        <div className="lg:col-span-2 space-y-4">
          {/* 工具栏 */}
          {generatedContent && (
            <Card>
              <CardContent className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {ARTICLE_STYLES.find((s) => s.id === selectedStyle)?.name}
                  </Badge>
                  <span className="text-xs text-slate-500">
                    {generatedContent.length} 字
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <Button size="sm" variant="outline" onClick={handleSaveEdit}>
                      <Save className="h-4 w-4 mr-1" />
                      保存
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                      <Edit3 className="h-4 w-4 mr-1" />
                      编辑
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={handleCopy}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleExportMarkdown}>
                    <Download className="h-4 w-4 mr-1" />
                    MD
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleExportHTML}>
                    <Download className="h-4 w-4 mr-1" />
                    HTML
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 内容展示/编辑区 */}
          <Card className="min-h-[500px]">
            <CardContent className="p-6">
              {isGenerating ? (
                <div className="prose prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap font-sans text-slate-700 leading-relaxed">
                    {generatedContent}
                    <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-1" />
                  </pre>
                </div>
              ) : isEditing ? (
                <textarea
                  ref={contentRef}
                  value={generatedContent}
                  onChange={(e) => setGeneratedContent(e.target.value)}
                  className="w-full min-h-[500px] p-4 text-sm font-mono border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : generatedContent ? (
                <div className="prose prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap font-sans text-slate-700 leading-relaxed">
                    {generatedContent}
                  </pre>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[400px] text-slate-400">
                  <FileText className="h-16 w-16 mb-4" />
                  <p className="text-lg font-medium">选择风格，输入主题</p>
                  <p className="text-sm">AI 将为你创作一篇完整的公众号文章</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 历史记录 */}
          {history.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">历史记录</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {history.map((article) => (
                    <button
                      key={article.id}
                      onClick={() => loadFromHistory(article)}
                      className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-900 truncate">
                          {article.topic}
                        </div>
                        <div className="text-xs text-slate-500">
                          {ARTICLE_STYLES.find((s) => s.id === article.style)?.name} · {article.createdAt}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {article.content.length}字
                      </Badge>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
