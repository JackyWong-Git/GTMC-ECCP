"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Link2,
  Unlink,
  Database,
  BookOpen,
  FileText,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  ChevronRight,
  Table,
  Settings,
  Key,
  Save,
  Eye,
  EyeOff,
} from "lucide-react";

interface FeishuUser {
  name: string;
  avatarUrl: string;
  email: string;
}

interface BitableTable {
  table_id: string;
  name: string;
}

interface WikiSpace {
  spaceId: string;
  name: string;
  description: string;
}

interface WikiNode {
  nodeToken: string;
  objToken: string;
  objType: string;
  title: string;
  hasChild: boolean;
}

interface DocItem {
  token: string;
  title: string;
  type: string;
  url: string;
}

interface PlatformConfig {
  feishuAppId: string;
  feishuAppSecret: string;
  feishuRedirectUri: string;
  douyinClientKey: string;
  douyinClientSecret: string;
  douyinRedirectUri: string;
  ledgerAppToken: string;
  ledgerTableId: string;
  ledgerAutoSync: boolean;
  llmApiKey: string;
  llmBaseUrl: string;
}

export default function SettingsPage() {
  const [connected, setConnected] = useState(false);
  const [user, setUser] = useState<FeishuUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  // 平台凭证配置
  const [config, setConfig] = useState<PlatformConfig>({
    feishuAppId: "",
    feishuAppSecret: "",
    feishuRedirectUri: "",
    douyinClientKey: "",
    douyinClientSecret: "",
    douyinRedirectUri: "",
    ledgerAppToken: "",
    ledgerTableId: "",
    ledgerAutoSync: true,
    llmApiKey: "",
    llmBaseUrl: "",
  });
  const [configLoading, setConfigLoading] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);
  const [showSecrets, setShowSecrets] = useState(false);

  // 多维表
  const [bitableAppToken, setBitableAppToken] = useState("");
  const [bitableTables, setBitableTables] = useState<BitableTable[]>([]);
  const [bitableLoading, setBitableLoading] = useState(false);
  const [bitableRecords, setBitableRecords] = useState<Record<string, unknown>[]>([]);
  const [syncingBitable, setSyncingBitable] = useState(false);

  // 知识库
  const [wikiSpaces, setWikiSpaces] = useState<WikiSpace[]>([]);
  const [wikiNodes, setWikiNodes] = useState<WikiNode[]>([]);
  const [selectedSpace, setSelectedSpace] = useState("");
  const [wikiLoading, setWikiLoading] = useState(false);

  // 云文档
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);

  // 台账配置
  const [creatingLedger, setCreatingLedger] = useState(false);
  const [ledgerCreated, setLedgerCreated] = useState(false);

  // 消息
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // 加载平台配置
  const loadConfig = useCallback(async () => {
    setConfigLoading(true);
    try {
      const res = await fetch("/api/config");
      const data = await res.json();
      if (data.success) {
        const d = data.data;
        setConfig({
          feishuAppId: d.feishu?.appId || d.feishuAppId || "",
          feishuAppSecret: d.feishu?.appSecret || d.feishuAppSecret || "",
          feishuRedirectUri: d.feishu?.redirectUri || d.feishuRedirectUri || "",
          douyinClientKey: d.douyin?.clientKey || d.douyinClientKey || "",
          douyinClientSecret: d.douyin?.clientSecret || d.douyinClientSecret || "",
          douyinRedirectUri: d.douyin?.redirectUri || d.douyinRedirectUri || "",
          ledgerAppToken: d.ledger?.appToken || d.ledgerAppToken || "",
          ledgerTableId: d.ledger?.tableId || d.ledgerTableId || "",
          ledgerAutoSync: d.ledger?.autoSync !== false,
          llmApiKey: d.llm?.apiKey || d.llmApiKey || "",
          llmBaseUrl: d.llm?.baseUrl || d.llmBaseUrl || "",
        });
      }
    } catch {
      // ignore
    } finally {
      setConfigLoading(false);
    }
  }, []);

  // 保存平台配置
  const saveConfig = async () => {
    setConfigSaving(true);
    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: "凭证配置已保存" });
      } else {
        setMessage({ type: "error", text: data.error || "保存失败" });
      }
    } catch {
      setMessage({ type: "error", text: "保存配置失败" });
    } finally {
      setConfigSaving(false);
    }
  };

  // 检查登录状态
  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/feishu/status");
      const data = await res.json();
      if (data.success && data.data.connected) {
        setConnected(true);
        setUser(data.data.user);
      } else {
        setConnected(false);
        setUser(null);
      }
    } catch {
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
    loadConfig();

    // 检查 URL 参数
    const params = new URLSearchParams(window.location.search);
    if (params.get("login") === "success") {
      setMessage({ type: "success", text: "飞书账号连接成功！" });
      checkStatus();
    } else if (params.get("login") === "error") {
      setMessage({ type: "error", text: params.get("error") || "连接失败" });
    }
  }, [checkStatus]);

  // 连接飞书
  const handleConnect = async () => {
    setConnecting(true);
    try {
      const res = await fetch("/api/feishu/auth");
      const data = await res.json();
      if (data.success) {
        window.location.href = data.data.authUrl;
      } else {
        setMessage({ type: "error", text: data.error });
      }
    } catch {
      setMessage({ type: "error", text: "获取授权链接失败" });
    } finally {
      setConnecting(false);
    }
  };

  // 断开连接
  const handleDisconnect = async () => {
    try {
      await fetch("/api/feishu/status", { method: "DELETE" });
      setConnected(false);
      setUser(null);
      setBitableTables([]);
      setWikiSpaces([]);
      setDocs([]);
      setMessage({ type: "success", text: "已断开飞书连接" });
    } catch {
      setMessage({ type: "error", text: "断开连接失败" });
    }
  };

  // 加载多维表
  const loadBitableTables = async () => {
    if (!bitableAppToken.trim()) {
      setMessage({ type: "error", text: "请输入多维表 App Token" });
      return;
    }
    setBitableLoading(true);
    try {
      const res = await fetch(
        `/api/feishu/sync/bitable?app_token=${encodeURIComponent(bitableAppToken.trim())}`
      );
      const data = await res.json();
      if (data.success) {
        setBitableTables(data.data.tables);
        setMessage({ type: "success", text: `找到 ${data.data.tables.length} 个数据表` });
      } else {
        setMessage({ type: "error", text: data.error });
      }
    } catch {
      setMessage({ type: "error", text: "获取多维表列表失败" });
    } finally {
      setBitableLoading(false);
    }
  };

  // 同步多维表记录
  const syncBitableRecords = async (tableId: string) => {
    setSyncingBitable(true);
    try {
      const res = await fetch("/api/feishu/sync/bitable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          app_token: bitableAppToken.trim(),
          table_id: tableId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setBitableRecords(data.data.rows);
        setMessage({
          type: "success",
          text: `成功同步 ${data.data.totalRows} 条记录`,
        });
      } else {
        setMessage({ type: "error", text: data.error });
      }
    } catch {
      setMessage({ type: "error", text: "同步记录失败" });
    } finally {
      setSyncingBitable(false);
    }
  };

  // 加载知识库
  const loadWikiSpaces = async () => {
    setWikiLoading(true);
    try {
      const res = await fetch("/api/feishu/sync/wiki");
      const data = await res.json();
      if (data.success) {
        setWikiSpaces(data.data.spaces);
        setMessage({ type: "success", text: `找到 ${data.data.totalSpaces} 个知识库空间` });
      } else {
        setMessage({ type: "error", text: data.error });
      }
    } catch {
      setMessage({ type: "error", text: "获取知识库列表失败" });
    } finally {
      setWikiLoading(false);
    }
  };

  // 加载知识库节点
  const loadWikiNodes = async (spaceId: string) => {
    setSelectedSpace(spaceId);
    setWikiLoading(true);
    try {
      const res = await fetch(`/api/feishu/sync/wiki?space_id=${spaceId}`);
      const data = await res.json();
      if (data.success) {
        setWikiNodes(data.data.nodes);
      } else {
        setMessage({ type: "error", text: data.error });
      }
    } catch {
      setMessage({ type: "error", text: "获取知识库节点失败" });
    } finally {
      setWikiLoading(false);
    }
  };

  // 加载云文档
  const loadDocs = async () => {
    setDocsLoading(true);
    try {
      const res = await fetch("/api/feishu/sync/docs");
      const data = await res.json();
      if (data.success) {
        setDocs(data.data.docs);
        setMessage({ type: "success", text: `找到 ${data.data.totalDocs} 个文档` });
      } else {
        setMessage({ type: "error", text: data.error });
      }
    } catch {
      setMessage({ type: "error", text: "获取云文档列表失败" });
    } finally {
      setDocsLoading(false);
    }
  };

  // 创建台账多维表
  const createLedgerTable = async () => {
    setCreatingLedger(true);
    try {
      const res = await fetch("/api/feishu/bitable/create-table", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appToken: config.ledgerAppToken || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setConfig((prev) => ({
          ...prev,
          ledgerAppToken: data.data.appToken,
          ledgerTableId: data.data.tableId,
        }));
        setLedgerCreated(true);
        setMessage({ type: "success", text: "台账多维表创建成功！" });
        // 自动保存配置
        await fetch("/api/config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...config,
            ledgerAppToken: data.data.appToken,
            ledgerTableId: data.data.tableId,
            ledgerAutoSync: true,
          }),
        });
      } else {
        setMessage({ type: "error", text: data.error });
      }
    } catch {
      setMessage({ type: "error", text: "创建台账失败" });
    } finally {
      setCreatingLedger(false);
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
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">飞书集成设置</h1>
        <p className="text-sm text-slate-500 mt-1">
          连接飞书账号，同步多维表、知识库和云文档数据到运营平台
        </p>
      </div>

      {/* 消息提示 */}
      {message && (
        <div
          className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          {message.text}
          <button
            onClick={() => setMessage(null)}
            className="ml-auto text-slate-400 hover:text-slate-600"
          >
            &times;
          </button>
        </div>
      )}

      {/* 平台凭证配置 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Key className="w-4 h-4" />
            平台凭证配置
          </CardTitle>
          <p className="text-xs text-slate-500 mt-1">
            配置飞书和抖音的应用凭证，用于数据同步。凭证保存在服务端，不会泄露。
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 飞书凭证 */}
          <div>
            <h3 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              飞书开放平台
            </h3>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">App ID</label>
                <input
                  type="text"
                  value={config.feishuAppId}
                  onChange={(e) => setConfig({ ...config, feishuAppId: e.target.value })}
                  placeholder="cli_xxxxxxxxxxxx"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">App Secret</label>
                <div className="relative">
                  <input
                    type={showSecrets ? "text" : "password"}
                    value={config.feishuAppSecret}
                    onChange={(e) => setConfig({ ...config, feishuAppSecret: e.target.value })}
                    placeholder="xxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 pr-16"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecrets(!showSecrets)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                  >
                    {showSecrets ? "隐藏" : "显示"}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">重定向 URI</label>
                <input
                  type="text"
                  value={config.feishuRedirectUri}
                  onChange={(e) => setConfig({ ...config, feishuRedirectUri: e.target.value })}
                  placeholder="https://你的域名/api/feishu/callback"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* 抖音凭证 */}
          <div>
            <h3 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-pink-500" />
              抖音开放平台
            </h3>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Client Key</label>
                <input
                  type="text"
                  value={config.douyinClientKey}
                  onChange={(e) => setConfig({ ...config, douyinClientKey: e.target.value })}
                  placeholder="xxxxxxxxxxxxxxxx"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Client Secret</label>
                <div className="relative">
                  <input
                    type={showSecrets ? "text" : "password"}
                    value={config.douyinClientSecret}
                    onChange={(e) => setConfig({ ...config, douyinClientSecret: e.target.value })}
                    placeholder="xxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 pr-16"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecrets(!showSecrets)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                  >
                    {showSecrets ? "隐藏" : "显示"}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">重定向 URI</label>
                <input
                  type="text"
                  value={config.douyinRedirectUri}
                  onChange={(e) => setConfig({ ...config, douyinRedirectUri: e.target.value })}
                  placeholder="https://你的域名/api/douyin/callback"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* 保存按钮 */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={saveConfig}
              disabled={configSaving || configLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {configSaving ? "保存中..." : "保存配置"}
            </button>
            <span className="text-xs text-slate-400">
              配置保存在服务端 /tmp 目录，重启后需重新配置
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 飞书账号连接 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Link2 className="w-4 h-4" />
            飞书账号连接
          </CardTitle>
        </CardHeader>
        <CardContent>
          {connected && user ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-blue-600 font-medium">
                      {user.name.charAt(0)}
                    </span>
                  </div>
                )}
                <div>
                  <p className="font-medium text-slate-900">{user.name}</p>
                  {user.email && (
                    <p className="text-sm text-slate-500">{user.email}</p>
                  )}
                </div>
                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                  已连接
                </Badge>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisconnect}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <Unlink className="w-4 h-4 mr-1" />
                断开连接
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                连接飞书账号后，可以直接同步多维表、知识库和云文档中的数据到运营平台。
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                <p className="font-medium mb-1">前置条件</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>
                    在{" "}
                    <a
                      href="https://open.feishu.cn/app"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline inline-flex items-center gap-1"
                    >
                      飞书开放平台 <ExternalLink className="w-3 h-3" />
                    </a>{" "}
                    创建企业自建应用
                  </li>
                  <li>
                    配置环境变量 <code className="bg-amber-100 px-1 rounded">FEISHU_APP_ID</code> 和{" "}
                    <code className="bg-amber-100 px-1 rounded">FEISHU_APP_SECRET</code>
                  </li>
                  <li>
                    在应用权限中开通：多维表读写、知识库读取、云文档读取
                  </li>
                  <li>
                    在安全设置中添加重定向 URL：
                    <code className="bg-amber-100 px-1 rounded">
                      {typeof window !== "undefined" ? window.location.origin : ""}/api/feishu/callback
                    </code>
                  </li>
                </ul>
              </div>
              <Button onClick={handleConnect} disabled={connecting}>
                {connecting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Link2 className="w-4 h-4 mr-2" />
                )}
                连接飞书账号
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 数据源同步 - 仅在连接后显示 */}
      {connected && (
        <>
          {/* 多维表同步 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Database className="w-4 h-4 text-blue-600" />
                多维表同步
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="输入多维表 App Token（从 URL 中获取，如 bascnXXXXXX）"
                  value={bitableAppToken}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setBitableAppToken(e.target.value)
                  }
                  className="flex-1"
                />
                <Button
                  onClick={loadBitableTables}
                  disabled={bitableLoading || !bitableAppToken.trim()}
                >
                  {bitableLoading ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-1" />
                  )}
                  加载数据表
                </Button>
              </div>

              {bitableTables.length > 0 && (
                <div className="border rounded-lg divide-y">
                  {bitableTables.map((table) => (
                    <div
                      key={table.table_id}
                      className="flex items-center justify-between px-4 py-3"
                    >
                      <div className="flex items-center gap-2">
                        <Table className="w-4 h-4 text-slate-400" />
                        <span className="font-medium text-sm">
                          {table.name}
                        </span>
                        <span className="text-xs text-slate-400">
                          {table.table_id}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => syncBitableRecords(table.table_id)}
                        disabled={syncingBitable}
                      >
                        {syncingBitable ? (
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3 h-3 mr-1" />
                        )}
                        同步记录
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {bitableRecords.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-slate-50 px-4 py-2 text-xs font-medium text-slate-600 border-b">
                    已同步 {bitableRecords.length} 条记录（预览前 5 条）
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-slate-50">
                          {Object.keys(bitableRecords[0] || {})
                            .filter((k) => k !== "record_id")
                            .slice(0, 6)
                            .map((key) => (
                              <th
                                key={key}
                                className="px-3 py-2 text-left text-xs font-medium text-slate-600"
                              >
                                {key}
                              </th>
                            ))}
                        </tr>
                      </thead>
                      <tbody>
                        {bitableRecords.slice(0, 5).map((row, i) => (
                          <tr key={i} className="border-b last:border-0">
                            {Object.entries(row)
                              .filter(([k]) => k !== "record_id")
                              .slice(0, 6)
                              .map(([key, value]) => (
                                <td
                                  key={key}
                                  className="px-3 py-2 text-xs text-slate-700 max-w-[200px] truncate"
                                >
                                  {String(value ?? "")}
                                </td>
                              ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 知识库同步 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BookOpen className="w-4 h-4 text-purple-600" />
                知识库同步
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={loadWikiSpaces}
                disabled={wikiLoading}
                variant="outline"
              >
                {wikiLoading ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-1" />
                )}
                加载知识库空间
              </Button>

              {wikiSpaces.length > 0 && !selectedSpace && (
                <div className="border rounded-lg divide-y">
                  {wikiSpaces.map((space) => (
                    <button
                      key={space.spaceId}
                      onClick={() => loadWikiNodes(space.spaceId)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors text-left"
                    >
                      <div>
                        <p className="font-medium text-sm">{space.name}</p>
                        {space.description && (
                          <p className="text-xs text-slate-500 mt-0.5">
                            {space.description}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </button>
                  ))}
                </div>
              )}

              {selectedSpace && wikiNodes.length > 0 && (
                <div className="border rounded-lg divide-y">
                  <div className="px-4 py-2 bg-slate-50 border-b flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-600">
                      知识库节点
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedSpace("");
                        setWikiNodes([]);
                      }}
                      className="text-xs"
                    >
                      返回空间列表
                    </Button>
                  </div>
                  {wikiNodes.map((node) => (
                    <div
                      key={node.nodeToken}
                      className="flex items-center gap-2 px-4 py-3"
                    >
                      <FileText className="w-4 h-4 text-slate-400" />
                      <span className="text-sm">{node.title}</span>
                      <Badge variant="outline" className="text-xs">
                        {node.objType}
                      </Badge>
                      {node.hasChild && (
                        <Badge className="bg-blue-50 text-blue-600 border-blue-200 text-xs">
                          有子节点
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 云文档同步 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="w-4 h-4 text-emerald-600" />
                云文档同步
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={loadDocs}
                disabled={docsLoading}
                variant="outline"
              >
                {docsLoading ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-1" />
                )}
                加载云文档列表
              </Button>

              {docs.length > 0 && (
                <div className="border rounded-lg divide-y">
                  {docs.map((doc) => (
                    <div
                      key={doc.token}
                      className="flex items-center justify-between px-4 py-3"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-medium">
                          {doc.title}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {doc.type}
                        </Badge>
                      </div>
                      {doc.url && (
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* 产出物台账配置 */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Table className="w-4 h-4 text-amber-600" />
            产出物台账
          </CardTitle>
          <p className="text-xs text-slate-500 mt-1">
            平台生成的脚本、图片、视频等产出物自动同步到飞书多维表，形成完整的台账记录
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 台账配置 */}
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">多维表 App Token</label>
              <input
                type="text"
                value={config.ledgerAppToken}
                onChange={(e) => setConfig({ ...config, ledgerAppToken: e.target.value })}
                placeholder="bascnXXXXXX（从多维表 URL 中获取）"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">数据表 Table ID</label>
              <input
                type="text"
                value={config.ledgerTableId}
                onChange={(e) => setConfig({ ...config, ledgerTableId: e.target.value })}
                placeholder="tblXXXXXX"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="ledgerAutoSync"
                checked={config.ledgerAutoSync}
                onChange={(e) => setConfig({ ...config, ledgerAutoSync: e.target.checked })}
                className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
              />
              <label htmlFor="ledgerAutoSync" className="text-sm text-slate-700">
                自动同步（生成脚本/图片/视频后自动写入台账）
              </label>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={createLedgerTable}
              disabled={creatingLedger || !connected}
              className="px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              {creatingLedger ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Table className="w-4 h-4" />
              )}
              一键创建台账表
            </button>
            <button
              onClick={saveConfig}
              disabled={configSaving}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50 inline-flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              保存台账配置
            </button>
            {ledgerCreated && (
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                已创建
              </Badge>
            )}
          </div>

          {/* 台账字段说明 */}
          <div className="p-4 bg-amber-50 rounded-lg border border-amber-100">
            <h4 className="text-sm font-medium text-amber-900 mb-2">
              台账字段说明
            </h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-amber-800">
              <span>内容类型（脚本/图片/视频）</span>
              <span>标题</span>
              <span>关联选题</span>
              <span>目标平台（抖音/视频号/KILAKILA）</span>
              <span>内容摘要</span>
              <span>资源链接</span>
              <span>预览图</span>
              <span>生成模型</span>
              <span>状态（草稿/待审核/已发布）</span>
              <span>负责人</span>
              <span>发布时间</span>
              <span>播放量 / 点赞数 / 评论数 / 分享数</span>
              <span>备注</span>
              <span>创建时间</span>
            </div>
          </div>

          {!connected && (
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm text-slate-600">
              请先连接飞书账号后再配置台账功能
            </div>
          )}
        </CardContent>
      </Card>

      {/* 抖音集成 */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-xl">🎵</span>
            抖音开放平台
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-pink-50 rounded-lg border border-pink-100">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎵</span>
              <div>
                <p className="font-medium text-slate-900">抖音账号</p>
                <p className="text-xs text-slate-500">
                  连接后可同步视频播放量、点赞、评论等数据
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open("/api/douyin/auth", "_blank")}
            >
              <ExternalLink className="w-4 h-4 mr-1" />
              连接抖音
            </Button>
          </div>

          <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
            <h4 className="text-sm font-medium text-slate-900 mb-2">
              配置说明
            </h4>
            <ol className="text-xs text-slate-600 space-y-1 list-decimal list-inside">
              <li>
                前往{" "}
                <a
                  href="https://developer.open-douyin.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  抖音开放平台
                </a>{" "}
                创建网站应用
              </li>
              <li>
                配置环境变量 <code className="bg-slate-200 px-1 rounded">DOUYIN_CLIENT_KEY</code> 和{" "}
                <code className="bg-slate-200 px-1 rounded">DOUYIN_CLIENT_SECRET</code>
              </li>
              <li>
                配置回调地址{" "}
                <code className="bg-slate-200 px-1 rounded">DOUYIN_REDIRECT_URI</code>
              </li>
              <li>申请权限：用户信息、视频列表、视频数据</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* 大模型 API 配置 */}
      <Card className="border border-slate-200 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Key className="w-5 h-5 text-violet-600" />
            大模型 API 配置
          </CardTitle>
          <p className="text-sm text-slate-500 mt-1">
            配置大模型 API 凭证，用于 AI 分析、脚本生成、数据摘要等功能。支持 OpenAI 兼容接口。
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                API Key <span className="text-red-500">*</span>
              </label>
              <Input
                type="password"
                placeholder="sk-..."
                value={config.llmApiKey}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig({ ...config, llmApiKey: e.target.value })}
              />
              <p className="text-xs text-slate-500">
                大模型服务的 API Key（必填）
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Base URL
              </label>
              <Input
                type="text"
                placeholder="https://api.openai.com/v1"
                value={config.llmBaseUrl}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig({ ...config, llmBaseUrl: e.target.value })}
              />
              <p className="text-xs text-slate-500">
                API 服务地址（留空使用默认地址）
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={saveConfig}
              disabled={configSaving}
              className="px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              保存模型配置
            </button>
            {config.llmApiKey && (
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                已配置
              </Badge>
            )}
          </div>

          <div className="p-4 bg-violet-50 rounded-lg border border-violet-100">
            <h4 className="text-sm font-medium text-violet-900 mb-2">
              配置说明
            </h4>
            <ul className="text-xs text-violet-700 space-y-1 list-disc list-inside">
              <li>支持 OpenAI 兼容接口（OpenAI、Azure、各类国产大模型）</li>
              <li>也可通过环境变量 <code className="bg-violet-200 px-1 rounded">OPENAI_API_KEY</code> 配置</li>
              <li>Base URL 可通过环境变量 <code className="bg-violet-200 px-1 rounded">OPENAI_BASE_URL</code> 配置</li>
              <li>环境变量优先级高于页面配置</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
