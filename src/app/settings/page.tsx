"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Settings, Save, Loader2, CheckCircle2, AlertCircle,
  Eye, EyeOff, Sparkles, Video, FileText, Zap, MessageSquare,
  BookOpen, Users, Workflow, LayoutTemplate, Plus, Trash2,
  Mail, Shield, UserCircle, Copy, Play, Pause, MoreVertical,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface PlatformConfig {
  douyin: { isConfigured: boolean; clientKey?: string; redirectUri?: string };
  llm: { isConfigured: boolean };
  feishu?: { isConfigured: boolean };
  dify?: { isConfigured: boolean };
  dingtalk?: { isConfigured: boolean };
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  department?: string;
  taskCount: number;
  status: "active" | "inactive";
  joinedAt: string;
}

interface WorkflowItem {
  id: string;
  name: string;
  description: string;
  moduleCount: number;
  status: "active" | "paused" | "draft";
  lastRun?: string;
  runCount: number;
}

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  moduleCount: number;
  useCount: number;
}

type SettingsTab = "platform" | "team" | "workflows" | "templates";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("platform");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSecrets, setShowSecrets] = useState(false);
  const [config, setConfig] = useState<PlatformConfig | null>(null);

  // Platform config states
  const [douyinKey, setDouyinKey] = useState("");
  const [douyinSecret, setDouyinSecret] = useState("");
  const [douyinRedirect, setDouyinRedirect] = useState("");
  const [llmApiKey, setLlmApiKey] = useState("");
  const [llmBaseUrl, setLlmBaseUrl] = useState("");
  const [feishuAppId, setFeishuAppId] = useState("");
  const [feishuAppSecret, setFeishuAppSecret] = useState("");
  const [difyApiKey, setDifyApiKey] = useState("");
  const [difyBaseUrl, setDifyBaseUrl] = useState("");
  const [dingtalkAppKey, setDingtalkAppKey] = useState("");
  const [dingtalkAppSecret, setDingtalkAppSecret] = useState("");
  const [dingtalkUnionId, setDingtalkUnionId] = useState("");

  // Team states
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("editor");

  // Workflow states
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);

  useEffect(() => {
    loadConfig();
    loadTeam();
    loadWorkflows();
    loadTemplates();
  }, []);

  async function loadConfig() {
    try {
      const res = await fetch("/api/config");
      const json = await res.json();
      if (json.success) {
        setConfig(json.data);
        if (json.data.douyin) {
          setDouyinRedirect(json.data.douyin.redirectUri || "");
        }
      }
    } catch (error) {
      console.error("Failed to load config:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadTeam() {
    try {
      const res = await fetch("/api/team");
      const json = await res.json();
      if (json.success && json.data?.members) {
        setTeamMembers(json.data.members);
      }
    } catch (error) {
      console.error("Failed to load team:", error);
    }
  }

  async function loadWorkflows() {
    try {
      const res = await fetch("/api/workflows");
      const json = await res.json();
      if (json.success && json.data?.workflows) {
        setWorkflows(json.data.workflows);
      }
    } catch (error) {
      console.error("Failed to load workflows:", error);
    }
  }

  async function loadTemplates() {
    try {
      const res = await fetch("/api/workflows/templates");
      const json = await res.json();
      if (json.success && json.data?.templates) {
        setTemplates(json.data.templates);
      }
    } catch (error) {
      console.error("Failed to load templates:", error);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const updates: Record<string, string> = {};
      if (douyinKey) updates.DOUYIN_CLIENT_KEY = douyinKey;
      if (douyinSecret) updates.DOUYIN_CLIENT_SECRET = douyinSecret;
      if (douyinRedirect) updates.DOUYIN_REDIRECT_URI = douyinRedirect;
      if (llmApiKey) updates.LLM_API_KEY = llmApiKey;
      if (llmBaseUrl) updates.LLM_BASE_URL = llmBaseUrl;
      if (feishuAppId) updates.FEISHU_APP_ID = feishuAppId;
      if (feishuAppSecret) updates.FEISHU_APP_SECRET = feishuAppSecret;
      if (difyApiKey) updates.DIFY_API_KEY = difyApiKey;
      if (difyBaseUrl) updates.DIFY_BASE_URL = difyBaseUrl;
      if (dingtalkAppKey) updates.DINGTALK_APP_KEY = dingtalkAppKey;
      if (dingtalkAppSecret) updates.DINGTALK_APP_SECRET = dingtalkAppSecret;
      if (dingtalkUnionId) updates.DINGTALK_UNION_ID = dingtalkUnionId;

      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      const json = await res.json();

      if (json.success) {
        toast.success("配置已保存");
        setDouyinKey(""); setDouyinSecret("");
        setLlmApiKey(""); setLlmBaseUrl("");
        setFeishuAppId(""); setFeishuAppSecret("");
        setDifyApiKey(""); setDifyBaseUrl("");
        setDingtalkAppKey(""); setDingtalkAppSecret(""); setDingtalkUnionId("");
        loadConfig();
      } else {
        toast.error(json.error || "保存失败");
      }
    } catch (error) {
      toast.error("保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function handleInvite() {
    if (!inviteEmail) {
      toast.error("请输入邮箱");
      return;
    }
    toast.success(`邀请已发送至 ${inviteEmail}`);
    setInviteEmail("");
  }

  async function handleDeleteWorkflow(id: string) {
    if (!confirm("确定删除此工作流？")) return;
    try {
      await fetch(`/api/workflows?id=${id}`, { method: "DELETE" });
      toast.success("工作流已删除");
      loadWorkflows();
    } catch (error) {
      toast.error("删除失败");
    }
  }

  const tabs = [
    { id: "platform" as SettingsTab, label: "平台配置", icon: Settings },
    { id: "team" as SettingsTab, label: "团队管理", icon: Users },
    { id: "workflows" as SettingsTab, label: "工作流", icon: Workflow },
    { id: "templates" as SettingsTab, label: "模板市场", icon: LayoutTemplate },
  ];

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">系统设置</h1>
          <p className="text-sm text-slate-500 mt-0.5">管理平台配置、团队、工作流和模板</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowSecrets(!showSecrets)}
        >
          {showSecrets ? <EyeOff className="h-4 w-4 mr-1.5" /> : <Eye className="h-4 w-4 mr-1.5" />}
          {showSecrets ? "隐藏密钥" : "显示密钥"}
        </Button>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-slate-900 text-slate-900"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Platform Config Tab */}
      {activeTab === "platform" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* LLM API 配置 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100">
                    <Sparkles className="h-4 w-4 text-violet-600" />
                  </div>
                  AI 模型配置
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className={config?.llm.isConfigured ? "border-emerald-300 text-emerald-600" : "border-slate-300 text-slate-400"}>
                    {config?.llm.isConfigured ? "已配置" : "未配置"}
                  </Badge>
                  <span className="text-xs text-slate-400">脚本生成、文章写作、数据分析</span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">API Key <span className="text-red-500">*</span></label>
                  <Input type={showSecrets ? "text" : "password"} value={llmApiKey} onChange={(e) => setLlmApiKey(e.target.value)} placeholder={config?.llm.isConfigured ? "已配置（留空保持不变）" : "输入 API Key"} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Base URL（可选）</label>
                  <Input value={llmBaseUrl} onChange={(e) => setLlmBaseUrl(e.target.value)} placeholder="自定义 API 地址" />
                </div>
              </CardContent>
            </Card>

            {/* 抖音配置 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-100">
                    <Video className="h-4 w-4 text-pink-600" />
                  </div>
                  抖音开放平台
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className={config?.douyin.isConfigured ? "border-emerald-300 text-emerald-600" : "border-slate-300 text-slate-400"}>
                    {config?.douyin.isConfigured ? "已配置" : "未配置"}
                  </Badge>
                  <span className="text-xs text-slate-400">数据看板、选题热榜</span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Client Key</label>
                  <Input type={showSecrets ? "text" : "password"} value={douyinKey} onChange={(e) => setDouyinKey(e.target.value)} placeholder={config?.douyin.isConfigured ? "已配置（留空保持不变）" : "输入 Client Key"} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Client Secret</label>
                  <Input type={showSecrets ? "text" : "password"} value={douyinSecret} onChange={(e) => setDouyinSecret(e.target.value)} placeholder={config?.douyin.isConfigured ? "已配置（留空保持不变）" : "输入 Client Secret"} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">回调地址</label>
                  <Input value={douyinRedirect} onChange={(e) => setDouyinRedirect(e.target.value)} placeholder="https://your-domain.com/api/douyin/callback" />
                </div>
              </CardContent>
            </Card>

            {/* 飞书配置 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
                    <FileText className="h-4 w-4 text-blue-600" />
                  </div>
                  飞书知识库
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className={config?.feishu?.isConfigured ? "border-emerald-300 text-emerald-600" : "border-slate-300 text-slate-400"}>
                    {config?.feishu?.isConfigured ? "已配置" : "未配置"}
                  </Badge>
                  <span className="text-xs text-slate-400">飞书多维表格、云文档</span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">App ID</label>
                  <Input value={feishuAppId} onChange={(e) => setFeishuAppId(e.target.value)} placeholder={config?.feishu?.isConfigured ? "已配置（留空保持不变）" : "输入飞书 App ID"} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">App Secret</label>
                  <Input type={showSecrets ? "text" : "password"} value={feishuAppSecret} onChange={(e) => setFeishuAppSecret(e.target.value)} placeholder={config?.feishu?.isConfigured ? "已配置（留空保持不变）" : "输入飞书 App Secret"} />
                </div>
              </CardContent>
            </Card>

            {/* Dify 配置 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100">
                    <Zap className="h-4 w-4 text-purple-600" />
                  </div>
                  Dify 知识库
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className={config?.dify?.isConfigured ? "border-emerald-300 text-emerald-600" : "border-slate-300 text-slate-400"}>
                    {config?.dify?.isConfigured ? "已配置" : "未配置"}
                  </Badge>
                  <span className="text-xs text-slate-400">Dify 知识库 API</span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">API Key</label>
                  <Input type={showSecrets ? "text" : "password"} value={difyApiKey} onChange={(e) => setDifyApiKey(e.target.value)} placeholder={config?.dify?.isConfigured ? "已配置（留空保持不变）" : "输入 Dify API Key"} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Base URL（可选）</label>
                  <Input value={difyBaseUrl} onChange={(e) => setDifyBaseUrl(e.target.value)} placeholder="https://api.dify.ai/v1" />
                </div>
              </CardContent>
            </Card>

            {/* 钉钉配置 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100">
                    <MessageSquare className="h-4 w-4 text-orange-600" />
                  </div>
                  钉钉知识库
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className={config?.dingtalk?.isConfigured ? "border-emerald-300 text-emerald-600" : "border-slate-300 text-slate-400"}>
                    {config?.dingtalk?.isConfigured ? "已配置" : "未配置"}
                  </Badge>
                  <span className="text-xs text-slate-400">钉钉文档、群消息</span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">App Key</label>
                  <Input value={dingtalkAppKey} onChange={(e) => setDingtalkAppKey(e.target.value)} placeholder={config?.dingtalk?.isConfigured ? "已配置（留空保持不变）" : "输入钉钉 App Key"} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">App Secret</label>
                  <Input type={showSecrets ? "text" : "password"} value={dingtalkAppSecret} onChange={(e) => setDingtalkAppSecret(e.target.value)} placeholder={config?.dingtalk?.isConfigured ? "已配置（留空保持不变）" : "输入钉钉 App Secret"} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Union ID（可选）</label>
                  <Input value={dingtalkUnionId} onChange={(e) => setDingtalkUnionId(e.target.value)} placeholder="输入钉钉用户 Union ID" />
                </div>
              </CardContent>
            </Card>

            {/* 知识库说明 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-100">
                    <BookOpen className="h-4 w-4 text-cyan-600" />
                  </div>
                  云文档知识库
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="outline" className="border-emerald-300 text-emerald-600">已启用</Badge>
                  <span className="text-xs text-slate-400">内置集成，无需额外配置</span>
                </div>
                <ul className="space-y-2 text-xs text-slate-500">
                  <li className="flex items-start gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />导入文档素材（文本/网页链接）</li>
                  <li className="flex items-start gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />AI 语义搜索，快速检索</li>
                  <li className="flex items-start gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />工作流自动存储/检索</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving} className="bg-slate-900 hover:bg-slate-800 text-white">
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />保存中...</> : <><Save className="h-4 w-4 mr-2" />保存配置</>}
            </Button>
          </div>
        </div>
      )}

      {/* Team Tab */}
      {activeTab === "team" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* 成员列表 */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-slate-600" />
                  团队成员 ({teamMembers.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {teamMembers.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-8">暂无团队成员</p>
                ) : (
                  <div className="space-y-3">
                    {teamMembers.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                            <UserCircle className="h-5 w-5 text-slate-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">{member.name}</p>
                            <p className="text-xs text-slate-500">{member.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className={member.status === "active" ? "border-emerald-300 text-emerald-600" : "border-slate-300 text-slate-400"}>
                            {member.status === "active" ? "在线" : "离线"}
                          </Badge>
                          <span className="text-xs text-slate-500">{member.role}</span>
                          <span className="text-xs text-slate-400">{member.taskCount} 任务</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 邀请成员 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Mail className="h-4 w-4 text-slate-600" />
                  邀请成员
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">邮箱</label>
                  <Input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="member@company.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">角色</label>
                  <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
                    <option value="admin">管理员</option>
                    <option value="editor">编辑</option>
                    <option value="viewer">查看者</option>
                  </select>
                </div>
                <Button onClick={handleInvite} className="w-full bg-slate-900 hover:bg-slate-800 text-white">
                  <Mail className="h-4 w-4 mr-2" />发送邀请
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Workflows Tab */}
      {activeTab === "workflows" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-medium text-slate-900">工作流列表 ({workflows.length})</h2>
            <Link href="/workflows/create">
              <Button size="sm" className="bg-slate-900 hover:bg-slate-800 text-white">
                <Plus className="h-4 w-4 mr-1.5" />新建工作流
              </Button>
            </Link>
          </div>

          {workflows.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Workflow className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500">暂无工作流，点击上方按钮创建</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {workflows.map((wf) => (
                <Card key={wf.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-sm font-medium text-slate-900 line-clamp-1">{wf.name}</CardTitle>
                      <Badge variant="outline" className={wf.status === "active" ? "border-emerald-300 text-emerald-600" : wf.status === "paused" ? "border-amber-300 text-amber-600" : "border-slate-300 text-slate-400"}>
                        {wf.status === "active" ? "运行中" : wf.status === "paused" ? "已暂停" : "草稿"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-slate-500 line-clamp-2 mb-3">{wf.description}</p>
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>{wf.moduleCount} 模块</span>
                      <span>运行 {wf.runCount} 次</span>
                    </div>
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                      <Button size="sm" variant="outline" className="flex-1 h-7 text-xs">
                        <Play className="h-3 w-3 mr-1" />执行
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleDeleteWorkflow(wf.id)}>
                        <Trash2 className="h-3 w-3 text-red-500" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === "templates" && (
        <div className="space-y-6">
          <h2 className="text-base font-medium text-slate-900">模板市场 ({templates.length})</h2>

          {templates.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <LayoutTemplate className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500">暂无可用模板</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {templates.map((tpl) => (
                <Card key={tpl.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-sm font-medium text-slate-900 line-clamp-1">{tpl.name}</CardTitle>
                      <Badge variant="outline" className="border-slate-200 text-slate-500">{tpl.category}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-slate-500 line-clamp-2 mb-3">{tpl.description}</p>
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>{tpl.moduleCount} 模块</span>
                      <span>使用 {tpl.useCount} 次</span>
                    </div>
                    <Button size="sm" variant="outline" className="w-full mt-3 h-7 text-xs">
                      <Copy className="h-3 w-3 mr-1" />使用此模板
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
