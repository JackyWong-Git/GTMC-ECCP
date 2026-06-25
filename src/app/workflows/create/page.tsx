'use client';

import { useState, useEffect, useCallback, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Plus,
  ArrowLeft,
  Save,
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
  Play,
  Bot,
  Send,
  Wand2,
  Trash2,
  Settings,
  ChevronRight,
  Zap,
  MessageSquare,
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

/* ─── Types ─── */
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

interface WorkflowNode {
  id: string;
  type: string;
  name: string;
  description: string;
  config: Record<string, unknown>;
  modelId?: string;
  prompt?: string;
  enabled: boolean;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/* ─── Constants ─── */
const nodeIcons: Record<string, typeof Sparkles> = {
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

const nodeColors: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  llm_analysis: { bg: 'bg-violet-50', border: 'border-violet-300', text: 'text-violet-700', dot: 'bg-violet-500' },
  llm_generate: { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700', dot: 'bg-blue-500' },
  llm_summary: { bg: 'bg-indigo-50', border: 'border-indigo-300', text: 'text-indigo-700', dot: 'bg-indigo-500' },
  web_search: { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-700', dot: 'bg-amber-500' },
  data_fetch: { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  feishu_write: { bg: 'bg-cyan-50', border: 'border-cyan-300', text: 'text-cyan-700', dot: 'bg-cyan-500' },
  feishu_notify: { bg: 'bg-pink-50', border: 'border-pink-300', text: 'text-pink-700', dot: 'bg-pink-500' },
  condition: { bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-700', dot: 'bg-orange-500' },
  transform: { bg: 'bg-slate-100', border: 'border-slate-300', text: 'text-slate-700', dot: 'bg-slate-500' },
};

/* ─── Page Wrapper ─── */
export default function WorkflowEditorPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>}>
      <WorkflowEditorContent />
    </Suspense>
  );
}

/* ─── Main Editor ─── */
function WorkflowEditorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [trigger, setTrigger] = useState('manual');
  const [schedule, setSchedule] = useState('');
  const [nodes, setNodes] = useState<WorkflowNode[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const [templates, setTemplates] = useState<Record<string, ModuleTemplate>>({});
  const [models, setModels] = useState<ModelOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // AI Assistant
  const [showAI, setShowAI] = useState(false);
  const [aiMessages, setAiMessages] = useState<ChatMessage[]>([]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Run
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<{ success: boolean; output: string } | null>(null);

  // Load templates
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/workflows/templates');
        const data = await res.json();
        if (data.success) {
          setTemplates(data.data.modules);
          setModels(data.data.models);
        }
      } catch { /* ignore */ } finally { setLoading(false); }
    };
    load();
  }, []);

  // Load existing workflow
  useEffect(() => {
    if (!editId) return;
    const load = async () => {
      try {
        const res = await fetch(`/api/workflows?id=${editId}`);
        const data = await res.json();
        if (data.success) {
          const wf = data.data;
          setName(wf.name);
          setDescription(wf.description);
          setTrigger(wf.trigger);
          setSchedule(wf.schedule || '');
          setNodes(wf.modules);
        }
      } catch { setMessage({ type: 'error', text: '加载工作流失败' }); }
    };
    load();
  }, [editId]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiMessages]);

  const addNode = (type: string) => {
    const tmpl = templates[type];
    if (!tmpl) return;
    const newNode: WorkflowNode = {
      id: `node_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      ...tmpl,
    };
    setNodes([...nodes, newNode]);
    setSelectedNodeId(newNode.id);
  };

  const removeNode = (id: string) => {
    setNodes(nodes.filter((n) => n.id !== id));
    if (selectedNodeId === id) setSelectedNodeId(null);
  };

  const updateNode = (id: string, updates: Partial<WorkflowNode>) => {
    setNodes(nodes.map((n) => (n.id === id ? { ...n, ...updates } : n)));
  };

  const moveNode = (idx: number, dir: 'up' | 'down') => {
    const arr = [...nodes];
    const target = dir === 'up' ? idx - 1 : idx + 1;
    if (target < 0 || target >= arr.length) return;
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    setNodes(arr);
  };

  const handleSave = async () => {
    if (!name.trim()) { setMessage({ type: 'error', text: '请输入工作流名称' }); return; }
    setSaving(true);
    try {
      const body: Record<string, unknown> = { name: name.trim(), description, trigger, schedule, modules: nodes };
      if (editId) body.id = editId;
      const res = await fetch('/api/workflows', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: editId ? '工作流已更新' : '工作流已创建' });
        if (!editId && data.data?.id) router.replace(`/workflows/create?id=${data.data.id}`);
      } else { setMessage({ type: 'error', text: data.error || '保存失败' }); }
    } catch { setMessage({ type: 'error', text: '保存失败' }); } finally { setSaving(false); }
  };

  const handleRun = async () => {
    if (!editId) { setMessage({ type: 'error', text: '请先保存工作流再执行' }); return; }
    setRunning(true);
    setRunResult(null);
    try {
      const res = await fetch('/api/workflows/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workflowId: editId, input: '请开始执行工作流' }) });
      const data = await res.json();
      if (data.success) {
        setRunResult({ success: true, output: data.data.finalOutput || '执行完成' });
      } else {
        setRunResult({ success: false, output: data.error || '执行失败' });
      }
    } catch { setRunResult({ success: false, output: '请求失败' }); } finally { setRunning(false); }
  };

  // AI Assistant
  const handleAiSend = async () => {
    if (!aiInput.trim() || aiLoading) return;
    const userMsg = aiInput.trim();
    setAiInput('');
    setAiMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setAiLoading(true);

    try {
      const res = await fetch('/api/workflows/ai-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          history: aiMessages,
          availableModels: models.map((m) => ({ id: m.id, label: m.label, category: m.category })),
          availableModules: Object.keys(templates),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAiMessages((prev) => [...prev, { role: 'assistant', content: data.data.reply }]);
        // If AI returned a workflow config, apply it
        if (data.data.workflow) {
          const wf = data.data.workflow;
          if (wf.name) setName(wf.name);
          if (wf.description) setDescription(wf.description);
          if (wf.trigger) setTrigger(wf.trigger);
          if (wf.modules && Array.isArray(wf.modules)) {
            const validTypes = Object.keys(templates);
            const newNodes = wf.modules.map((m: Record<string, unknown>) => {
              const rawType = String(m.type || 'llm_analysis');
              const nodeType = validTypes.includes(rawType) ? rawType : 'llm_analysis';
              const template = templates[nodeType];
              return {
                id: `node_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                type: nodeType,
                name: String(m.name || template?.name || '未命名模块'),
                description: String(m.description || template?.description || ''),
                config: (m.config && typeof m.config === 'object' ? m.config : {}) as Record<string, unknown>,
                modelId: String(m.modelId || template?.modelId || ''),
                prompt: String(m.prompt || template?.prompt || ''),
                enabled: m.enabled !== false,
              };
            });
            setNodes(newNodes);
          }
        }
      } else {
        setAiMessages((prev) => [...prev, { role: 'assistant', content: '抱歉，我遇到了一些问题，请重试。' }]);
      }
    } catch {
      setAiMessages((prev) => [...prev, { role: 'assistant', content: '网络请求失败，请重试。' }]);
    } finally { setAiLoading(false); }
  };

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;
  }

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col -m-4">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/workflows')} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
            <ArrowLeft className="h-4 w-4" /> 返回
          </button>
          <div className="w-px h-5 bg-slate-200" />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="未命名工作流"
            className="text-base font-semibold text-slate-900 bg-transparent border-none outline-none placeholder:text-slate-300 w-64"
          />
          <Badge variant="outline" className="text-[10px] text-slate-400">
            {nodes.length} 个节点
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setShowAI(!showAI)}>
            <Bot className="h-3.5 w-3.5" />
            AI 助手
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleRun} disabled={running || nodes.length === 0}>
            {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            执行
          </Button>
          <Button size="sm" className="gap-1.5 text-xs bg-[#0F172A] text-white hover:bg-slate-800" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            保存
          </Button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`mx-4 mt-2 flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.type === 'success' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
          {message.text}
          <button onClick={() => setMessage(null)} className="ml-auto">&times;</button>
        </div>
      )}

      {/* Run Result */}
      {runResult && (
        <div className={`mx-4 mt-2 px-3 py-2 rounded-lg text-xs ${runResult.success ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          <div className="flex items-center gap-2 mb-1">
            {runResult.success ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
            <span className="font-medium">{runResult.success ? '执行成功' : '执行失败'}</span>
            <button onClick={() => setRunResult(null)} className="ml-auto">&times;</button>
          </div>
          <pre className="text-[10px] whitespace-pre-wrap max-h-32 overflow-y-auto bg-white/50 p-2 rounded">{runResult.output}</pre>
        </div>
      )}

      {/* Main Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Node Palette */}
        <div className="w-56 border-r border-slate-200 bg-slate-50 overflow-y-auto shrink-0">
          <div className="p-3">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">节点库</p>
            <div className="space-y-1.5">
              {Object.entries(templates).map(([type, tmpl]) => {
                const Icon = nodeIcons[type] || Sparkles;
                const colors = nodeColors[type] || nodeColors.transform;
                return (
                  <button
                    key={type}
                    onClick={() => addNode(type)}
                    className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg border text-left transition-all hover:shadow-sm ${colors.bg} ${colors.border} ${colors.text}`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium truncate">{tmpl.name}</p>
                      <p className="text-[9px] opacity-60 truncate">{tmpl.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Workflow Settings */}
          <div className="p-3 border-t border-slate-200">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">工作流设置</p>
            <div className="space-y-2">
              <div>
                <label className="text-[10px] text-slate-500 block mb-0.5">描述</label>
                <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="工作流描述" className="w-full px-2 py-1.5 text-[11px] border border-slate-200 rounded-md bg-white" />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block mb-0.5">触发方式</label>
                <select value={trigger} onChange={(e) => setTrigger(e.target.value)} className="w-full px-2 py-1.5 text-[11px] border border-slate-200 rounded-md bg-white">
                  <option value="manual">手动触发</option>
                  <option value="schedule">定时触发</option>
                  <option value="event">事件触发</option>
                </select>
              </div>
              {trigger === 'schedule' && (
                <div>
                  <label className="text-[10px] text-slate-500 block mb-0.5">执行频率</label>
                  <input value={schedule} onChange={(e) => setSchedule(e.target.value)} placeholder="每2小时" className="w-full px-2 py-1.5 text-[11px] border border-slate-200 rounded-md bg-white" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Center: Node Canvas */}
        <div className="flex-1 overflow-auto bg-[#fafbfc] relative">
          {nodes.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                <Zap className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-base font-medium text-slate-500 mb-2">从左侧添加节点</h3>
              <p className="text-xs text-slate-400 mb-4 text-center max-w-xs">或点击「AI 助手」描述你的需求，自动生成工作流</p>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setShowAI(true)}>
                <Bot className="h-3.5 w-3.5" />
                让 AI 帮我创建
              </Button>
            </div>
          ) : (
            <div className="p-8 flex flex-col items-center">
              {/* Start Node */}
              <div className="flex flex-col items-center">
                <div className="w-24 h-8 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center">
                  <Play className="w-3 h-3 text-emerald-600 mr-1" />
                  <span className="text-[10px] font-medium text-emerald-700">开始</span>
                </div>
                <div className="w-px h-6 bg-slate-300" />
              </div>

              {/* Nodes */}
              {nodes.map((node, idx) => {
                const Icon = nodeIcons[node.type] || Sparkles;
                const colors = nodeColors[node.type] || nodeColors.transform;
                const isSelected = selectedNodeId === node.id;
                return (
                  <div key={node.id} className="flex flex-col items-center">
                    <button
                      onClick={() => setSelectedNodeId(isSelected ? null : node.id)}
                      className={`relative w-72 rounded-xl border-2 transition-all ${isSelected ? `${colors.border} shadow-md ring-2 ring-blue-200` : `border-slate-200 hover:border-slate-300 hover:shadow-sm`} bg-white`}
                    >
                      <div className="flex items-center gap-2.5 px-4 py-3">
                        <div className={`w-8 h-8 rounded-lg ${colors.bg} flex items-center justify-center shrink-0`}>
                          <Icon className={`w-4 h-4 ${colors.text}`} />
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-xs font-semibold text-slate-800 truncate">{node.name}</p>
                          <p className="text-[10px] text-slate-400 truncate">{node.description || node.type}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {!node.enabled && <Badge variant="outline" className="text-[8px] text-slate-400">禁用</Badge>}
                          {node.modelId && (
                            <Badge variant="outline" className="text-[8px] text-blue-500 border-blue-200">
                              {models.find((m) => m.id === node.modelId)?.label?.split(' ').slice(0, 2).join(' ') || 'AI'}
                            </Badge>
                          )}
                        </div>
                      </div>
                      {/* Node index badge */}
                      <div className={`absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full ${colors.dot} flex items-center justify-center`}>
                        <span className="text-[9px] font-bold text-white">{idx + 1}</span>
                      </div>
                    </button>
                    {/* Connector */}
                    <div className="w-px h-6 bg-slate-300" />
                  </div>
                );
              })}

              {/* End Node */}
              <div className="w-24 h-8 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center">
                <CheckCircle2 className="w-3 h-3 text-slate-500 mr-1" />
                <span className="text-[10px] font-medium text-slate-600">结束</span>
              </div>
            </div>
          )}
        </div>

        {/* Right: Node Config / AI Panel */}
        <div className="w-80 border-l border-slate-200 bg-white overflow-y-auto shrink-0">
          {showAI ? (
            /* AI Assistant Panel */
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-semibold text-slate-800">AI 工作流助手</span>
                </div>
                <button onClick={() => setShowAI(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {aiMessages.length === 0 && (
                  <div className="text-center py-8">
                    <Wand2 className="w-8 h-8 text-blue-300 mx-auto mb-3" />
                    <p className="text-xs text-slate-500 mb-4">描述你的运营需求，AI 会自动创建工作流</p>
                    <div className="space-y-2">
                      {['帮我创建一个自动抓取抖音热点并生成脚本的工作流', '创建一个数据分析工作流，自动汇总播放量和互动数据', '创建飞书通知流，定时推送运营报告到群里'].map((hint) => (
                        <button
                          key={hint}
                          onClick={() => { setAiInput(hint); }}
                          className="w-full text-left text-[11px] px-3 py-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                        >
                          {hint}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {aiMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[90%] px-3 py-2 rounded-xl text-xs ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))}
                {aiLoading && (
                  <div className="flex justify-start">
                    <div className="bg-slate-100 px-3 py-2 rounded-xl">
                      <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              <div className="p-3 border-t border-slate-100">
                <div className="flex gap-2">
                  <input
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAiSend()}
                    placeholder="描述你的运营需求..."
                    className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <button onClick={handleAiSend} disabled={aiLoading || !aiInput.trim()} className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ) : selectedNode ? (
            /* Node Config Panel */
            <div>
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-semibold text-slate-800">节点配置</span>
                </div>
                <button onClick={() => setSelectedNodeId(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="text-[10px] font-medium text-slate-500 mb-1 block">节点名称</label>
                  <Input value={selectedNode.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateNode(selectedNode.id, { name: e.target.value })} className="text-xs h-8" />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-slate-500 mb-1 block">描述</label>
                  <Input value={selectedNode.description} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateNode(selectedNode.id, { description: e.target.value })} className="text-xs h-8" />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={selectedNode.enabled} onChange={(e) => updateNode(selectedNode.id, { enabled: e.target.checked })} className="w-4 h-4 rounded border-slate-300" id="nodeEnabled" />
                  <label htmlFor="nodeEnabled" className="text-xs text-slate-600">启用此节点</label>
                </div>

                {/* Model Selection */}
                {(selectedNode.type === 'llm_analysis' || selectedNode.type === 'llm_generate' || selectedNode.type === 'llm_summary') && (
                  <>
                    <div>
                      <label className="text-[10px] font-medium text-slate-500 mb-1 block">选择模型</label>
                      <div className="space-y-1.5">
                        {models.map((m) => (
                          <button
                            key={m.id}
                            onClick={() => updateNode(selectedNode.id, { modelId: m.id })}
                            className={`w-full text-left px-3 py-2 rounded-lg border text-[11px] transition-all ${selectedNode.modelId === m.id ? 'border-blue-400 bg-blue-50 ring-1 ring-blue-200' : 'border-slate-200 hover:border-slate-300'}`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-slate-800">{m.label}</span>
                              <Badge variant="outline" className="text-[8px]">{m.category}</Badge>
                            </div>
                            <p className="text-[9px] text-slate-400 mt-0.5">{m.provider} · {m.description}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-slate-500 mb-1 block">系统提示词</label>
                      <textarea
                        value={selectedNode.prompt || ''}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateNode(selectedNode.id, { prompt: e.target.value })}
                        placeholder="输入系统提示词..."
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 min-h-[100px] resize-y"
                      />
                    </div>
                  </>
                )}

                {/* Web Search Config */}
                {selectedNode.type === 'web_search' && (
                  <div>
                    <label className="text-[10px] font-medium text-slate-500 mb-1 block">最大结果数</label>
                    <Input type="number" value={(selectedNode.config?.maxResults as number) || 5} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateNode(selectedNode.id, { config: { ...selectedNode.config, maxResults: Number(e.target.value) } })} className="text-xs h-8 w-24" min={1} max={20} />
                  </div>
                )}

                {/* Condition Config */}
                {selectedNode.type === 'condition' && (
                  <div className="space-y-2">
                    <div>
                      <label className="text-[10px] font-medium text-slate-500 mb-1 block">运算符</label>
                      <select value={(selectedNode.config?.operator as string) || 'contains'} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateNode(selectedNode.id, { config: { ...selectedNode.config, operator: e.target.value } })} className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg">
                        <option value="contains">包含</option>
                        <option value="not_contains">不包含</option>
                        <option value="equals">等于</option>
                        <option value="gt">大于</option>
                        <option value="lt">小于</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-slate-500 mb-1 block">比较值</label>
                      <Input value={(selectedNode.config?.value as string) || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateNode(selectedNode.id, { config: { ...selectedNode.config, value: e.target.value } })} className="text-xs h-8" />
                    </div>
                  </div>
                )}

                {/* Transform Config */}
                {selectedNode.type === 'transform' && (
                  <div>
                    <label className="text-[10px] font-medium text-slate-500 mb-1 block">操作类型</label>
                    <select value={(selectedNode.config?.operation as string) || 'passthrough'} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateNode(selectedNode.id, { config: { ...selectedNode.config, operation: e.target.value } })} className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg">
                      <option value="passthrough">透传</option>
                      <option value="uppercase">转大写</option>
                      <option value="lowercase">转小写</option>
                      <option value="trim">去除空白</option>
                      <option value="truncate">截断</option>
                    </select>
                  </div>
                )}

                {/* Node Actions */}
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 text-[10px] h-7" onClick={() => { const idx = nodes.findIndex((n) => n.id === selectedNode.id); moveNode(idx, 'up'); }} disabled={nodes.indexOf(selectedNode) === 0}>
                      上移
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 text-[10px] h-7" onClick={() => { const idx = nodes.findIndex((n) => n.id === selectedNode.id); moveNode(idx, 'down'); }} disabled={nodes.indexOf(selectedNode) === nodes.length - 1}>
                      下移
                    </Button>
                  </div>
                  <Button variant="outline" size="sm" className="w-full text-[10px] h-7 text-red-600 border-red-200 hover:bg-red-50" onClick={() => removeNode(selectedNode.id)}>
                    <Trash2 className="w-3 h-3 mr-1" /> 删除节点
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* Empty Right Panel */
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <MessageSquare className="w-8 h-8 text-slate-200 mb-3" />
              <p className="text-xs text-slate-400">点击节点查看配置</p>
              <p className="text-[10px] text-slate-300 mt-1">或开启 AI 助手自动创建</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
