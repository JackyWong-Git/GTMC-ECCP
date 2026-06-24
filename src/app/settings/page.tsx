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

export default function SettingsPage() {
  const [connected, setConnected] = useState(false);
  const [user, setUser] = useState<FeishuUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

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

  // 消息
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

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
    </div>
  );
}
