'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Plus,
  ArrowLeft,
  Save,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Search,
  Database,
  FileText,
  Bell,
  GitBranch,
  ArrowRightLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface ModuleTemplate {
  type: string;
  name: string;
  description: string;
  config: Record<string, unknown>;
  modelId?: string;
  prompt?: string;
  enabled: boolean;
}

interface ModelOption {
  id: string;
  label: string;
  provider: string;
  description: string;
  category: string;
  temperature: number;
}

interface WorkflowModule {
  id: string;
  type: string;
  name: string;
  description: string;
  config: Record<string, unknown>;
  modelId?: string;
  prompt?: string;
  enabled: boolean;
}

const moduleIcons: Record<string, typeof Sparkles> = {
  llm_analysis: Sparkles,
  llm_generate: FileText,
  llm_summary: Sparkles,
  web_search: Search,
  data_fetch: Database,
  feishu_write: FileText,
  feishu_notify: Bell,
  condition: GitBranch,
  transform: ArrowRightLeft,
};

const moduleColors: Record<string, string> = {
  llm_analysis: 'bg-violet-50 border-violet-200 text-violet-700',
  llm_generate: 'bg-blue-50 border-blue-200 text-blue-700',
  llm_summary: 'bg-indigo-50 border-indigo-200 text-indigo-700',
  web_search: 'bg-amber-50 border-amber-200 text-amber-700',
  data_fetch: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  feishu_write: 'bg-cyan-50 border-cyan-200 text-cyan-700',
  feishu_notify: 'bg-pink-50 border-pink-200 text-pink-700',
  condition: 'bg-orange-50 border-orange-200 text-orange-700',
  transform: 'bg-slate-50 border-slate-200 text-slate-700',
};

export default function WorkflowEditorPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>}>
      <WorkflowEditorContent />
    </Suspense>
  );
}

function WorkflowEditorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [trigger, setTrigger] = useState('manual');
  const [schedule, setSchedule] = useState('');
  const [modules, setModules] = useState<WorkflowModule[]>([]);
  const [expandedModule, setExpandedModule] = useState<string | null>(null);

  const [templates, setTemplates] = useState<Record<string, ModuleTemplate>>({});
  const [models, setModels] = useState<ModelOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load templates and models
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const res = await fetch('/api/workflows/templates');
        const data = await res.json();
        if (data.success) {
          setTemplates(data.data.modules);
          setModels(data.data.models);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    loadTemplates();
  }, []);

  // Load existing workflow if editing
  useEffect(() => {
    if (!editId) return;
    const loadWorkflow = async () => {
      try {
        const res = await fetch(`/api/workflows?id=${editId}`);
        const data = await res.json();
        if (data.success) {
          const wf = data.data;
          setName(wf.name);
          setDescription(wf.description);
          setTrigger(wf.trigger);
          setSchedule(wf.schedule || '');
          setModules(wf.modules);
        }
      } catch {
        setMessage({ type: 'error', text: '加载工作流失败' });
      }
    };
    loadWorkflow();
  }, [editId]);

  const addModule = (type: string) => {
    const template = templates[type];
    if (!template) return;
    const newModule: WorkflowModule = {
      id: `mod_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      ...template,
    };
    setModules([...modules, newModule]);
    setExpandedModule(newModule.id);
  };

  const removeModule = (id: string) => {
    setModules(modules.filter((m) => m.id !== id));
    if (expandedModule === id) setExpandedModule(null);
  };

  const updateModule = (id: string, updates: Partial<WorkflowModule>) => {
    setModules(modules.map((m) => (m.id === id ? { ...m, ...updates } : m)));
  };

  const moveModule = (idx: number, direction: 'up' | 'down') => {
    const newModules = [...modules];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= newModules.length) return;
    [newModules[idx], newModules[targetIdx]] = [newModules[targetIdx], newModules[idx]];
    setModules(newModules);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setMessage({ type: 'error', text: '请输入工作流名称' });
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        description,
        trigger,
        schedule,
        modules,
      };
      if (editId) body.id = editId;

      const res = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: editId ? '工作流已更新' : '工作流已创建' });
        if (!editId && data.data?.id) {
          router.replace(`/workflows/create?id=${data.data.id}`);
        }
      } else {
        setMessage({ type: 'error', text: data.error || '保存失败' });
      }
    } catch {
      setMessage({ type: 'error', text: '保存失败' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push('/workflows')} className="gap-1 text-slate-500">
            <ArrowLeft className="h-4 w-4" />
            返回
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {editId ? '编辑工作流' : '新建工作流'}
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              编排 AI Agent 模块，构建自动化运营流程
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2 bg-[#0F172A] text-white hover:bg-slate-800">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? '保存中...' : '保存工作流'}
        </Button>
      </div>

      {/* Message */}
      {message && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {message.text}
          <button onClick={() => setMessage(null)} className="ml-auto text-slate-400 hover:text-slate-600">&times;</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left: Module Palette */}
        <div className="lg:col-span-1">
          <Card className="border-slate-200 sticky top-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-800">模块库</CardTitle>
              <p className="text-[10px] text-slate-400">点击添加到工作流</p>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(templates).map(([type, tmpl]) => {
                const Icon = moduleIcons[type] || Sparkles;
                const colorClass = moduleColors[type] || 'bg-slate-50 border-slate-200 text-slate-700';
                return (
                  <button
                    key={type}
                    onClick={() => addModule(type)}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border text-left transition-all hover:shadow-sm ${colorClass}`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{tmpl.name}</p>
                      <p className="text-[10px] opacity-70 truncate">{tmpl.description}</p>
                    </div>
                    <Plus className="h-3 w-3 shrink-0 ml-auto opacity-50" />
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Right: Workflow Canvas */}
        <div className="lg:col-span-3 space-y-4">
          {/* Basic Info */}
          <Card className="border-slate-200">
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">工作流名称</label>
                  <Input
                    value={name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                    placeholder="例如：热点内容分析流"
                    className="text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">触发方式</label>
                  <select
                    value={trigger}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setTrigger(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="manual">手动触发</option>
                    <option value="schedule">定时触发</option>
                    <option value="event">事件触发</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">描述</label>
                <Input
                  value={description}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDescription(e.target.value)}
                  placeholder="描述这个工作流的用途和目标"
                  className="text-sm"
                />
              </div>
              {trigger === 'schedule' && (
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">执行频率</label>
                  <Input
                    value={schedule}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSchedule(e.target.value)}
                    placeholder="例如：每2小时、每天 09:00"
                    className="text-sm"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Module Chain */}
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-800">
                执行模块 ({modules.length})
              </CardTitle>
              <p className="text-[10px] text-slate-400">模块按顺序从上到下执行，上一个模块的输出作为下一个模块的输入</p>
            </CardHeader>
            <CardContent>
              {modules.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-lg">
                  <p className="text-sm text-slate-400">从左侧模块库中添加模块</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {modules.map((mod, idx) => {
                    const Icon = moduleIcons[mod.type] || Sparkles;
                    const colorClass = moduleColors[mod.type] || 'bg-slate-50 border-slate-200 text-slate-700';
                    const isExpanded = expandedModule === mod.id;

                    return (
                      <div key={mod.id}>
                        {/* Connector */}
                        {idx > 0 && (
                          <div className="flex justify-center py-1">
                            <div className="w-px h-4 bg-slate-300" />
                          </div>
                        )}
                        {/* Module Card */}
                        <div className={`border rounded-lg overflow-hidden ${mod.enabled ? '' : 'opacity-50'}`}>
                          {/* Module Header */}
                          <div
                            className={`flex items-center gap-2 px-4 py-3 cursor-pointer ${colorClass}`}
                            onClick={() => setExpandedModule(isExpanded ? null : mod.id)}
                          >
                            <GripVertical className="h-4 w-4 opacity-30 shrink-0" />
                            <Icon className="h-4 w-4 shrink-0" />
                            <span className="text-xs font-medium flex-1 truncate">{mod.name}</span>
                            <Badge variant="outline" className="text-[9px] shrink-0">
                              #{idx + 1}
                            </Badge>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={(e) => { e.stopPropagation(); moveModule(idx, 'up'); }}
                                disabled={idx === 0}
                                className="p-1 hover:bg-white/50 rounded disabled:opacity-30"
                              >
                                <ChevronUp className="h-3 w-3" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); moveModule(idx, 'down'); }}
                                disabled={idx === modules.length - 1}
                                className="p-1 hover:bg-white/50 rounded disabled:opacity-30"
                              >
                                <ChevronDown className="h-3 w-3" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); removeModule(mod.id); }}
                                className="p-1 hover:bg-red-100 rounded text-red-500"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          </div>

                          {/* Module Config (Expanded) */}
                          {isExpanded && (
                            <div className="bg-white border-t border-slate-100 px-4 py-4 space-y-3">
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="text-[10px] font-medium text-slate-500 mb-1 block">模块名称</label>
                                  <Input
                                    value={mod.name}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateModule(mod.id, { name: e.target.value })}
                                    className="text-xs h-8"
                                  />
                                </div>
                                <div className="flex items-end">
                                  <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={mod.enabled}
                                      onChange={(e) => updateModule(mod.id, { enabled: e.target.checked })}
                                      className="w-4 h-4 rounded border-slate-300"
                                    />
                                    启用此模块
                                  </label>
                                </div>
                              </div>

                              {/* Model Selection (for LLM modules) */}
                              {(mod.type === 'llm_analysis' || mod.type === 'llm_generate' || mod.type === 'llm_summary') && (
                                <div>
                                  <label className="text-[10px] font-medium text-slate-500 mb-1 block">选择模型</label>
                                  <select
                                    value={mod.modelId || ''}
                                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateModule(mod.id, { modelId: e.target.value })}
                                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                  >
                                    {models.map((m) => (
                                      <option key={m.id} value={m.id}>
                                        {m.label} ({m.provider}) — {m.category}
                                      </option>
                                    ))}
                                  </select>
                                  {mod.modelId && (
                                    <p className="text-[10px] text-slate-400 mt-1">
                                      {models.find((m) => m.id === mod.modelId)?.description}
                                    </p>
                                  )}
                                </div>
                              )}

                              {/* Prompt (for LLM modules) */}
                              {(mod.type === 'llm_analysis' || mod.type === 'llm_generate' || mod.type === 'llm_summary') && (
                                <div>
                                  <label className="text-[10px] font-medium text-slate-500 mb-1 block">系统提示词</label>
                                  <textarea
                                    value={mod.prompt || ''}
                                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateModule(mod.id, { prompt: e.target.value })}
                                    placeholder="输入系统提示词，指导模型如何处理输入内容..."
                                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 min-h-[80px] resize-y"
                                  />
                                </div>
                              )}

                              {/* Web Search Config */}
                              {mod.type === 'web_search' && (
                                <div>
                                  <label className="text-[10px] font-medium text-slate-500 mb-1 block">最大结果数</label>
                                  <Input
                                    type="number"
                                    value={(mod.config?.maxResults as number) || 5}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                      updateModule(mod.id, { config: { ...mod.config, maxResults: Number(e.target.value) } })
                                    }
                                    className="text-xs h-8 w-24"
                                    min={1}
                                    max={20}
                                  />
                                </div>
                              )}

                              {/* Condition Config */}
                              {mod.type === 'condition' && (
                                <div className="grid grid-cols-3 gap-2">
                                  <div>
                                    <label className="text-[10px] font-medium text-slate-500 mb-1 block">字段</label>
                                    <Input
                                      value={(mod.config?.field as string) || ''}
                                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                        updateModule(mod.id, { config: { ...mod.config, field: e.target.value } })
                                      }
                                      className="text-xs h-8"
                                      placeholder="字段名"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-medium text-slate-500 mb-1 block">运算符</label>
                                    <select
                                      value={(mod.config?.operator as string) || 'contains'}
                                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                                        updateModule(mod.id, { config: { ...mod.config, operator: e.target.value } })
                                      }
                                      className="w-full px-2 py-2 text-xs border border-slate-200 rounded-lg"
                                    >
                                      <option value="contains">包含</option>
                                      <option value="not_contains">不包含</option>
                                      <option value="equals">等于</option>
                                      <option value="gt">大于</option>
                                      <option value="lt">小于</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-medium text-slate-500 mb-1 block">值</label>
                                    <Input
                                      value={(mod.config?.value as string) || ''}
                                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                        updateModule(mod.id, { config: { ...mod.config, value: e.target.value } })
                                      }
                                      className="text-xs h-8"
                                      placeholder="比较值"
                                    />
                                  </div>
                                </div>
                              )}

                              {/* Transform Config */}
                              {mod.type === 'transform' && (
                                <div>
                                  <label className="text-[10px] font-medium text-slate-500 mb-1 block">操作类型</label>
                                  <select
                                    value={(mod.config?.operation as string) || 'passthrough'}
                                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                                      updateModule(mod.id, { config: { ...mod.config, operation: e.target.value } })
                                    }
                                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                                  >
                                    <option value="passthrough">透传（不处理）</option>
                                    <option value="uppercase">转大写</option>
                                    <option value="lowercase">转小写</option>
                                    <option value="trim">去除首尾空白</option>
                                    <option value="truncate">截断</option>
                                  </select>
                                </div>
                              )}

                              <div>
                                <label className="text-[10px] font-medium text-slate-500 mb-1 block">模块描述</label>
                                <Input
                                  value={mod.description}
                                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateModule(mod.id, { description: e.target.value })}
                                  className="text-xs h-8"
                                  placeholder="描述此模块的作用"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
