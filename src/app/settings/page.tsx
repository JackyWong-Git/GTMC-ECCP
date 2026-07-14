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
  Mail, Shield, UserCircle, Copy, Play, Pause, MoreVertical, Globe,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface PlatformConfig {
  douyin: { isConfigured: boolean; clientKey?: string; redirectUri?: string };
  llm: { isConfigured: boolean };
  feishu?: { isConfigured: boolean };
  dify?: { isConfigured: boolean };
  dingtalk?: { isConfigured: boolean };
  crawlData?: { isConfigured: boolean };
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

type SettingsTab = "platform" | "team" | "workflows" | "templates" | "mcp";

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
  const [crawlApiKey, setCrawlApiKey] = useState("");

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
      if (crawlApiKey) updates.CRAWL_DATA_API_KEY = crawlApiKey;

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
    { id: "mcp" as SettingsTab, label: "MCP 工具", icon: Zap },
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

            {/* Crawl Data API 配置 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100">
                    <Globe className="h-4 w-4 text-indigo-600" />
                  </div>
                  多平台数据采集
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className={config?.crawlData?.isConfigured ? "border-emerald-300 text-emerald-600" : "border-slate-300 text-slate-400"}>
                    {config?.crawlData?.isConfigured ? "已配置" : "未配置"}
                  </Badge>
                  <span className="text-xs text-slate-400">抖音/小红书/微博/B站等</span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">API Token</label>
                  <Input type={showSecrets ? "text" : "password"} value={crawlApiKey} onChange={(e) => setCrawlApiKey(e.target.value)} placeholder={config?.crawlData?.isConfigured ? "已配置（留空保持不变）" : "输入 JustOneAPI Token"} />
                </div>
                <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg">
                  <p className="font-medium text-slate-700 mb-1">支持平台：</p>
                  <p>抖音、小红书、微博、B站、快手、微信视频号、淘宝、京东、拼多多等 20+ 平台</p>
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

      {/* MCP Tools Tab */}
      {activeTab === "mcp" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-medium text-slate-900">MCP 工具矩阵</h2>
              <p className="text-xs text-slate-500 mt-1">
                将 ECCP 能力暴露为 MCP 工具，让 AI 助手（如 Claude Desktop）可以直接调用
              </p>
            </div>
            <Badge variant="outline" className="border-emerald-200 text-emerald-700 bg-emerald-50">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              API 就绪
            </Badge>
          </div>

          {/* MCP Architecture Overview */}
          <Card className="border-slate-200 bg-gradient-to-br from-slate-50 to-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-900 flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                L5 架构：AI 自主决策
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-3 text-center">
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                  <Eye className="h-5 w-5 text-blue-600 mx-auto mb-1" />
                  <p className="text-xs font-medium text-blue-900">感知层</p>
                  <p className="text-[10px] text-blue-600">数据采集</p>
                </div>
                <div className="rounded-lg border border-purple-200 bg-purple-50 p-3">
                  <Sparkles className="h-5 w-5 text-purple-600 mx-auto mb-1" />
                  <p className="text-xs font-medium text-purple-900">分析层</p>
                  <p className="text-[10px] text-purple-600">智能决策</p>
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <Play className="h-5 w-5 text-amber-600 mx-auto mb-1" />
                  <p className="text-xs font-medium text-amber-900">执行层</p>
                  <p className="text-[10px] text-amber-600">内容生成</p>
                </div>
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                  <BookOpen className="h-5 w-5 text-emerald-600 mx-auto mb-1" />
                  <p className="text-xs font-medium text-emerald-900">记忆层</p>
                  <p className="text-[10px] text-emerald-600">知识管理</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tool Categories */}
          <div className="space-y-4">
            {/* Perception Tools */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-900 flex items-center gap-2">
                  <Eye className="h-4 w-4 text-blue-500" />
                  感知层（眼睛）
                  <Badge variant="outline" className="ml-auto text-xs">5 个工具</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {[
                    { name: 'search_douyin_trending', desc: '获取抖音热搜榜数据' },
                    { name: 'search_weibo_trending', desc: '获取微博热搜榜数据' },
                    { name: 'extract_video_transcript', desc: '从视频 URL 提取口播文案' },
                    { name: 'collect_douyin_comments', desc: '采集抖音视频评论区数据' },
                    { name: 'crawl_platform_data', desc: '从 20+ 平台采集数据' },
                  ].map(tool => (
                    <div key={tool.name} className="flex items-center justify-between rounded-md border border-slate-100 px-3 py-2">
                      <div>
                        <code className="text-xs font-mono text-slate-700">{tool.name}</code>
                        <p className="text-[11px] text-slate-500">{tool.desc}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] border-blue-200 text-blue-600">perception</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Analysis Tools */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-900 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-500" />
                  分析层（大脑）
                  <Badge variant="outline" className="ml-auto text-xs">2 个工具</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {[
                    { name: 'analyze_topic', desc: '多维度热度评估选题价值' },
                    { name: 'sentiment_analysis', desc: '文本情感分析' },
                  ].map(tool => (
                    <div key={tool.name} className="flex items-center justify-between rounded-md border border-slate-100 px-3 py-2">
                      <div>
                        <code className="text-xs font-mono text-slate-700">{tool.name}</code>
                        <p className="text-[11px] text-slate-500">{tool.desc}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] border-purple-200 text-purple-600">analysis</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Execution Tools */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-900 flex items-center gap-2">
                  <Play className="h-4 w-4 text-amber-500" />
                  执行层（手）
                  <Badge variant="outline" className="ml-auto text-xs">2 个工具</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {[
                    { name: 'generate_script', desc: '根据选题生成视频脚本' },
                    { name: 'generate_article', desc: '根据选题生成长文内容' },
                  ].map(tool => (
                    <div key={tool.name} className="flex items-center justify-between rounded-md border border-slate-100 px-3 py-2">
                      <div>
                        <code className="text-xs font-mono text-slate-700">{tool.name}</code>
                        <p className="text-[11px] text-slate-500">{tool.desc}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] border-amber-200 text-amber-600">execution</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Memory Tools */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-900 flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-emerald-500" />
                  记忆层（记忆）
                  <Badge variant="outline" className="ml-auto text-xs">2 个工具</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {[
                    { name: 'save_to_knowledge', desc: '将内容保存到知识库' },
                    { name: 'search_knowledge', desc: '在知识库中语义搜索' },
                  ].map(tool => (
                    <div key={tool.name} className="flex items-center justify-between rounded-md border border-slate-100 px-3 py-2">
                      <div>
                        <code className="text-xs font-mono text-slate-700">{tool.name}</code>
                        <p className="text-[11px] text-slate-500">{tool.desc}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] border-emerald-200 text-emerald-600">memory</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* API Endpoints */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-900">API 端点</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 font-mono text-xs">
                <div className="flex items-center gap-2 rounded bg-slate-50 px-3 py-2">
                  <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px]">GET</Badge>
                  <code className="text-slate-700">/api/mcp?action=list_tools</code>
                </div>
                <div className="flex items-center gap-2 rounded bg-slate-50 px-3 py-2">
                  <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-[10px]">POST</Badge>
                  <code className="text-slate-700">/api/mcp</code>
                  <span className="text-slate-400 ml-auto">执行工具</span>
                </div>
                <div className="flex items-center gap-2 rounded bg-slate-50 px-3 py-2">
                  <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-[10px]">POST</Badge>
                  <code className="text-slate-700">/api/mcp/orchestrate</code>
                  <span className="text-slate-400 ml-auto">AI 编排</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
