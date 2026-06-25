'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Search,
  Copy,
  Video,
  BarChart3,
  Target,
  BookOpen,
  Layers,
  Clock,
  Zap,
  ArrowRight,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  tags: string[];
  difficulty: string;
  estimatedTime: string;
  modules: Array<{
    type: string;
    name: string;
    description: string;
    enabled: boolean;
  }>;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Video,
  BarChart3,
  Target,
  BookOpen,
  Layers,
};

const CATEGORY_LABELS: Record<string, string> = {
  content: '内容创作',
  data: '数据分析',
  topic: '选题策划',
  story: '故事采集',
  custom: '自定义',
};

const DIFFICULTY_LABELS: Record<string, { label: string; color: string }> = {
  beginner: { label: '入门', color: 'bg-green-100 text-green-700' },
  intermediate: { label: '进阶', color: 'bg-blue-100 text-blue-700' },
  advanced: { label: '高级', color: 'bg-purple-100 text-purple-700' },
};

export default function WorkflowTemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [cloningId, setCloningId] = useState<string | null>(null);
  const [clonedId, setClonedId] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/workflows/templates');
      const data = await res.json();
      if (data.success) {
        // 从 templates API 获取预设模板列表
        const templateList = await fetchTemplateList();
        setTemplates(templateList);
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplateList = async (): Promise<WorkflowTemplate[]> => {
    // 从前端直接获取模板列表
    const res = await fetch('/api/workflows/templates?type=presets');
    const data = await res.json();
    return data.data?.presets || [];
  };

  const handleClone = async (template: WorkflowTemplate) => {
    setCloningId(template.id);
    try {
      const res = await fetch('/api/workflows/clone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: template.id }),
      });
      const data = await res.json();
      if (data.success) {
        setClonedId(template.id);
        setTimeout(() => {
          router.push(`/workflows/create?id=${data.data.id}`);
        }, 1000);
      }
    } catch (error) {
      console.error('Failed to clone template:', error);
    } finally {
      setCloningId(null);
    }
  };

  const filteredTemplates = templates.filter(t => {
    const matchesSearch = !searchQuery ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">工作流模板市场</h1>
          <p className="text-slate-500 mt-1">
            一键克隆预设模板，快速开始你的自动化工作流
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push('/workflows/create')}
        >
          创建空白工作流
        </Button>
      </div>

      {/* 搜索和筛选 */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="搜索模板..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('all')}
          >
            全部
          </Button>
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
            <Button
              key={key}
              variant={selectedCategory === key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(key)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* 模板卡片网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => {
          const IconComponent = ICON_MAP[template.icon] || Zap;
          const difficulty = DIFFICULTY_LABELS[template.difficulty];
          const isCloning = cloningId === template.id;
          const isCloned = clonedId === template.id;

          return (
            <Card
              key={template.id}
              className="hover:shadow-lg transition-shadow border-slate-200"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                      <IconComponent className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{template.name}</CardTitle>
                      <span className={`inline-block px-2 py-0.5 text-xs rounded-full mt-1 ${difficulty?.color || 'bg-slate-100 text-slate-600'}`}>
                        {difficulty?.label || template.difficulty}
                      </span>
                    </div>
                  </div>
                </div>
                <CardDescription className="text-sm text-slate-500 line-clamp-2">
                  {template.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* 标签 */}
                <div className="flex flex-wrap gap-1">
                  {template.tags.slice(0, 4).map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>

                {/* 模块预览 */}
                <div className="space-y-1">
                  <p className="text-xs text-slate-500 font-medium">
                    {template.modules.length} 个模块
                  </p>
                  <div className="flex items-center gap-1 overflow-hidden">
                    {template.modules.slice(0, 5).map((mod, idx) => (
                      <div key={idx} className="flex items-center">
                        <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-xs text-slate-600">
                          {idx + 1}
                        </div>
                        {idx < Math.min(template.modules.length - 1, 4) && (
                          <ArrowRight className="w-3 h-3 text-slate-300 mx-0.5" />
                        )}
                      </div>
                    ))}
                    {template.modules.length > 5 && (
                      <span className="text-xs text-slate-400 ml-1">
                        +{template.modules.length - 5}
                      </span>
                    )}
                  </div>
                </div>

                {/* 底部信息 */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <Clock className="w-3 h-3" />
                    {template.estimatedTime}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleClone(template)}
                    disabled={isCloning || isCloned}
                    className="gap-1"
                  >
                    {isCloning ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        克隆中...
                      </>
                    ) : isCloned ? (
                      <>
                        <CheckCircle2 className="w-3 h-3" />
                        已克隆
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        使用模板
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 空状态 */}
      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">没有找到匹配的模板</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
            }}
          >
            清除筛选
          </Button>
        </div>
      )}
    </div>
  );
}
