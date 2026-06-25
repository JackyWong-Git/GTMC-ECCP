'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Play,
  Pause,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  Zap,
  MoreVertical,
  ChevronDown,
  ChevronUp,
  Activity,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface WorkflowModule {
  id: string;
  type: string;
  name: string;
  enabled: boolean;
}

interface Workflow {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'paused' | 'draft';
  trigger: string;
  schedule?: string;
  modules: WorkflowModule[];
  createdAt: string;
  updatedAt: string;
  lastRunAt?: string;
  runCount: number;
  successCount: number;
}

interface RunLog {
  id: string;
  workflowId: string;
  workflowName: string;
  status: 'running' | 'success' | 'error';
  startedAt: string;
  finishedAt?: string;
  moduleResults: {
    moduleId: string;
    moduleName: string;
    status: string;
    output?: string;
    error?: string;
    duration: number;
  }[];
  error?: string;
}

const statusConfig = {
  active: { label: '运行中', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  paused: { label: '已暂停', color: 'bg-slate-100 text-slate-600 border-slate-200', icon: Pause },
  draft: { label: '草稿', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: Pencil },
};

const triggerLabels: Record<string, string> = {
  manual: '手动触发',
  schedule: '定时触发',
  event: '事件触发',
};

export default function WorkflowsPage() {
  const router = useRouter();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [runResult, setRunResult] = useState<{ workflowId: string; success: boolean; message: string } | null>(null);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [logs, setLogs] = useState<RunLog[]>([]);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const fetchWorkflows = useCallback(async () => {
    try {
      const res = await fetch('/api/workflows');
      const data = await res.json();
      if (data.success) {
        setWorkflows(data.data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  const handleRun = async (workflowId: string) => {
    setRunningId(workflowId);
    setRunResult(null);
    try {
      const res = await fetch('/api/workflows/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowId, input: '请开始执行工作流' }),
      });
      const data = await res.json();
      if (data.success) {
        setRunResult({ workflowId, success: true, message: `执行完成，${data.data.moduleResults?.length || 0} 个模块已运行` });
        fetchWorkflows();
      } else {
        setRunResult({ workflowId, success: false, message: data.error || '执行失败' });
      }
    } catch {
      setRunResult({ workflowId, success: false, message: '请求失败' });
    } finally {
      setRunningId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此工作流？')) return;
    try {
      await fetch(`/api/workflows?id=${id}`, { method: 'DELETE' });
      fetchWorkflows();
    } catch {
      // ignore
    }
  };

  const handleToggleStatus = async (workflow: Workflow) => {
    const newStatus = workflow.status === 'active' ? 'paused' : 'active';
    try {
      await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: workflow.id, name: workflow.name, status: newStatus }),
      });
      fetchWorkflows();
    } catch {
      // ignore
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
        <div>
          <h1 className="text-2xl font-bold text-slate-900">工作流管理</h1>
          <p className="mt-1 text-sm text-slate-500">
            创建和管理自动化工作流，编排 AI Agent 模块完成运营任务
          </p>
        </div>
        <Button
          onClick={() => router.push('/workflows/create')}
          className="gap-2 bg-[#0F172A] text-white hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" />
          新建工作流
        </Button>
      </div>

      {/* Run Result Message */}
      {runResult && (
        <div
          className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm ${
            runResult.success
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {runResult.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {runResult.message}
          <button onClick={() => setRunResult(null)} className="ml-auto text-slate-400 hover:text-slate-600">
            &times;
          </button>
        </div>
      )}

      {/* Empty State */}
      {workflows.length === 0 && (
        <Card className="border-dashed border-2 border-slate-200">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <Zap className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-700 mb-2">还没有工作流</h3>
            <p className="text-sm text-slate-500 mb-6 text-center max-w-md">
              创建一个工作流，将 AI 分析、内容生成、数据抓取等模块串联起来，实现运营自动化
            </p>
            <Button
              onClick={() => router.push('/workflows/create')}
              className="gap-2 bg-[#0F172A] text-white hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              创建第一个工作流
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Workflow Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {workflows.map((wf) => {
          const status = statusConfig[wf.status];
          const StatusIcon = status.icon;
          const successRate = wf.runCount > 0 ? Math.round((wf.successCount / wf.runCount) * 100) : 0;

          return (
            <Card
              key={wf.id}
              className="border border-slate-200 hover:border-slate-300 transition-all duration-200 hover:shadow-sm"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className="text-sm font-semibold text-slate-800 truncate">
                        {wf.name}
                      </CardTitle>
                      <Badge className={`rounded-full text-[10px] ${status.color}`}>
                        <StatusIcon className="mr-1 h-3 w-3" />
                        {status.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2">{wf.description}</p>
                  </div>
                  <div className="relative ml-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => setMenuOpen(menuOpen === wf.id ? null : wf.id)}
                    >
                      <MoreVertical className="h-4 w-4 text-slate-400" />
                    </Button>
                    {menuOpen === wf.id && (
                      <div className="absolute right-0 top-8 z-10 w-36 bg-white border border-slate-200 rounded-lg shadow-lg py-1">
                        <button
                          onClick={() => { router.push(`/workflows/create?id=${wf.id}`); setMenuOpen(null); }}
                          className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                        >
                          <Pencil className="w-3 h-3" /> 编辑
                        </button>
                        <button
                          onClick={() => { handleToggleStatus(wf); setMenuOpen(null); }}
                          className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                        >
                          {wf.status === 'active' ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                          {wf.status === 'active' ? '暂停' : '启用'}
                        </button>
                        <button
                          onClick={() => { handleDelete(wf.id); setMenuOpen(null); }}
                          className="w-full px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
                        >
                          <Trash2 className="w-3 h-3" /> 删除
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Module Preview */}
                <div className="flex items-center gap-1 mb-3 overflow-x-auto pb-1">
                  {wf.modules.slice(0, 5).map((mod, idx) => (
                    <div key={mod.id} className="flex items-center gap-1">
                      <span className={`text-[10px] px-2 py-1 rounded-md whitespace-nowrap ${mod.enabled ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-400'}`}>
                        {mod.name}
                      </span>
                      {idx < Math.min(wf.modules.length, 5) - 1 && (
                        <span className="text-slate-300 text-[10px]">&rarr;</span>
                      )}
                    </div>
                  ))}
                  {wf.modules.length > 5 && (
                    <span className="text-[10px] text-slate-400">+{wf.modules.length - 5}</span>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-2 border-t border-slate-100 pt-3">
                  <div>
                    <p className="text-[10px] text-slate-400">触发方式</p>
                    <p className="text-xs font-medium text-slate-700">{triggerLabels[wf.trigger] || wf.trigger}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400">模块数</p>
                    <p className="text-xs font-medium text-slate-700 tabular-nums">{wf.modules.length}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400">运行次数</p>
                    <p className="text-xs font-medium text-slate-700 tabular-nums">{wf.runCount}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400">成功率</p>
                    <p className="text-xs font-medium text-slate-700 tabular-nums">{wf.runCount > 0 ? `${successRate}%` : '—'}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 gap-1.5 text-xs"
                    onClick={() => handleRun(wf.id)}
                    disabled={runningId === wf.id || wf.modules.length === 0}
                  >
                    {runningId === wf.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Play className="h-3 w-3" />
                    )}
                    执行
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 gap-1.5 text-xs"
                    onClick={() => router.push(`/workflows/create?id=${wf.id}`)}
                  >
                    <Pencil className="h-3 w-3" />
                    编辑
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Run Logs */}
      {workflows.length > 0 && (
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <Activity className="w-4 h-4 text-slate-400" />
                运行日志
              </CardTitle>
              <Button variant="ghost" size="sm" className="h-7 text-xs text-slate-500" onClick={fetchWorkflows}>
                刷新
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">暂无运行记录，点击「执行」按钮运行工作流</p>
            ) : (
              <div className="max-h-[320px] space-y-1 overflow-y-auto">
                {logs.map((log) => (
                  <div key={log.id} className="rounded-lg border border-slate-100 overflow-hidden">
                    <button
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 text-left"
                      onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                    >
                      {log.status === 'success' ? (
                        <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-500" />
                      ) : log.status === 'error' ? (
                        <AlertCircle className="h-3 w-3 shrink-0 text-red-500" />
                      ) : (
                        <Loader2 className="h-3 w-3 shrink-0 text-blue-500 animate-spin" />
                      )}
                      <span className="text-xs font-medium text-slate-700">{log.workflowName}</span>
                      <span className="text-[10px] text-slate-400 tabular-nums">
                        {new Date(log.startedAt).toLocaleTimeString()}
                      </span>
                      <span className="text-[10px] text-slate-400 ml-auto">
                        {log.moduleResults.length} 个模块
                      </span>
                      {expandedLog === log.id ? (
                        <ChevronUp className="h-3 w-3 text-slate-400" />
                      ) : (
                        <ChevronDown className="h-3 w-3 text-slate-400" />
                      )}
                    </button>
                    {expandedLog === log.id && (
                      <div className="border-t border-slate-100 px-3 py-2 bg-slate-50">
                        {log.moduleResults.map((mr) => (
                          <div key={mr.moduleId} className="flex items-center gap-2 py-1">
                            {mr.status === 'success' ? (
                              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                            ) : (
                              <AlertCircle className="h-3 w-3 text-red-500" />
                            )}
                            <span className="text-xs text-slate-700">{mr.moduleName}</span>
                            <span className="text-[10px] text-slate-400 tabular-nums">{mr.duration}ms</span>
                            {mr.error && <span className="text-[10px] text-red-500">{mr.error}</span>}
                          </div>
                        ))}
                        {log.error && (
                          <p className="text-xs text-red-600 mt-2 pt-2 border-t border-slate-200">{log.error}</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
