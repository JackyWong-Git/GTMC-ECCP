"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  Settings,
  Key,
  Save,
  Eye,
  EyeOff,
  Video,
  Sparkles,
  BookOpen,
} from "lucide-react";

interface ConfigData {
  douyin: {
    clientKey: string;
    clientSecret: string;
    redirectUri: string;
    isConfigured: boolean;
  };
  llm: {
    apiKey: string;
    baseUrl: string;
    isConfigured: boolean;
  };
}

export default function SettingsPage() {
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showSecrets, setShowSecrets] = useState(false);

  // 表单状态
  const [douyinKey, setDouyinKey] = useState("");
  const [douyinSecret, setDouyinSecret] = useState("");
  const [douyinRedirect, setDouyinRedirect] = useState("");
  const [llmApiKey, setLlmApiKey] = useState("");
  const [llmBaseUrl, setLlmBaseUrl] = useState("");

  // 加载配置
  useEffect(() => {
    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setConfig(data.data);
          setDouyinRedirect(data.data.douyin?.redirectUri || "");
          setLlmBaseUrl(data.data.llm?.baseUrl || "");
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // 保存配置
  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveResult(null);

    try {
      const body: Record<string, unknown> = {};

      if (douyinKey || douyinSecret || douyinRedirect) {
        body.douyin = {
          clientKey: douyinKey || undefined,
          clientSecret: douyinSecret || undefined,
          redirectUri: douyinRedirect || undefined,
        };
      }

      if (llmApiKey || llmBaseUrl) {
        body.llm = {
          apiKey: llmApiKey || undefined,
          baseUrl: llmBaseUrl || undefined,
        };
      }

      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.success) {
        setSaveResult({ success: true, message: "配置保存成功" });
        // 重新加载配置
        const refreshRes = await fetch("/api/config");
        const refreshData = await refreshRes.json();
        if (refreshData.success) {
          setConfig(refreshData.data);
        }
        // 清空密码输入
        setDouyinKey("");
        setDouyinSecret("");
        setLlmApiKey("");
      } else {
        setSaveResult({ success: false, message: data.error || "保存失败" });
      }
    } catch {
      setSaveResult({ success: false, message: "网络请求失败" });
    } finally {
      setSaving(false);
    }
  }, [douyinKey, douyinSecret, douyinRedirect, llmApiKey, llmBaseUrl]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Settings className="h-6 w-6 text-slate-600" />
            系统设置
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            配置平台集成凭证和 AI 模型参数
          </p>
        </div>
        <button
          onClick={() => setShowSecrets(!showSecrets)}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors"
        >
          {showSecrets ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {showSecrets ? "隐藏密钥" : "显示密钥"}
        </button>
      </div>

      {/* Save Result */}
      {saveResult && (
        <div className={`flex items-center gap-2 rounded-lg p-3 text-sm ${
          saveResult.success
            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
            : "bg-red-50 text-red-700 border border-red-200"
        }`}>
          {saveResult.success ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {saveResult.message}
        </div>
      )}

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
              <span className="text-xs text-slate-400">脚本生成、文章写作、数据分析等核心 AI 能力</span>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                API Key <span className="text-red-500">*</span>
              </label>
              <Input
                type={showSecrets ? "text" : "password"}
                value={llmApiKey}
                onChange={(e) => setLlmApiKey(e.target.value)}
                placeholder={config?.llm.isConfigured ? "已配置（留空保持不变）" : "输入 API Key"}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Base URL（可选）
              </label>
              <Input
                value={llmBaseUrl}
                onChange={(e) => setLlmBaseUrl(e.target.value)}
                placeholder="自定义 API 地址（留空使用默认）"
              />
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
              <span className="text-xs text-slate-400">数据看板、选题热榜等抖音数据源</span>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Client Key
              </label>
              <Input
                type={showSecrets ? "text" : "password"}
                value={douyinKey}
                onChange={(e) => setDouyinKey(e.target.value)}
                placeholder={config?.douyin.isConfigured ? "已配置（留空保持不变）" : "输入 Client Key"}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Client Secret
              </label>
              <Input
                type={showSecrets ? "text" : "password"}
                value={douyinSecret}
                onChange={(e) => setDouyinSecret(e.target.value)}
                placeholder={config?.douyin.isConfigured ? "已配置（留空保持不变）" : "输入 Client Secret"}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                回调地址
              </label>
              <Input
                value={douyinRedirect}
                onChange={(e) => setDouyinRedirect(e.target.value)}
                placeholder="https://your-domain.com/api/douyin/callback"
              />
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
              <Badge variant="outline" className="border-emerald-300 text-emerald-600">
                已启用
              </Badge>
              <span className="text-xs text-slate-400">内置集成，无需额外配置</span>
            </div>
            <p className="text-sm text-slate-600 mb-3">
              知识库已集成到平台各模块中，支持：
            </p>
            <ul className="space-y-2 text-xs text-slate-500">
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                在「知识库」页面导入文档素材（文本/网页链接）
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                AI 语义搜索，快速检索相关知识
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                工作流「知识库写入」模块自动存储产出内容
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                工作流「知识库搜索」模块自动检索参考素材
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-slate-900 hover:bg-slate-800 text-white disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              保存中...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              保存配置
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
