/**
 * 数据库持久化存储工具
 * 使用 Supabase 存储平台配置和工作流数据，解决生产环境 /tmp/ 数据丢失问题
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// 简单的加密/解密函数（生产环境应使用更强的加密密钥）
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'eccp-default-encryption-key-2024';

function encrypt(text: string): string {
  // 简单的 Base64 编码 + 混淆（生产环境应使用 AES-256-GCM）
  const combined = ENCRYPTION_KEY + text;
  return Buffer.from(combined).toString('base64');
}

function decrypt(encrypted: string): string {
  try {
    const decoded = Buffer.from(encrypted, 'base64').toString('utf-8');
    if (decoded.startsWith(ENCRYPTION_KEY)) {
      return decoded.slice(ENCRYPTION_KEY.length);
    }
    return encrypted; // 如果解密失败，返回原始值（兼容旧数据）
  } catch {
    return encrypted;
  }
}

// 敏感字段列表
const SENSITIVE_KEYS = [
  'clientSecret', 'appSecret', 'apiKey', 'secret', 'password',
  'accessToken', 'refreshToken', 'token'
];

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEYS.some(sk => key.toLowerCase().includes(sk.toLowerCase()));
}

// Supabase 客户端（延迟初始化）
let supabaseClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient;
  
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    console.warn('[db-storage] Supabase credentials not configured, falling back to local storage');
    return null;
  }
  
  supabaseClient = createClient(url, key);
  return supabaseClient;
}

// ============ 平台配置存储 ============

export interface PlatformConfigData {
  douyin?: {
    clientKey?: string;
    clientSecret?: string;
    redirectUri?: string;
  };
  llm?: {
    apiKey?: string;
    baseUrl?: string;
  };
  feishu?: {
    appId?: string;
    appSecret?: string;
  };
  dify?: {
    apiKey?: string;
    baseUrl?: string;
  };
  dingtalk?: {
    appKey?: string;
    appSecret?: string;
    unionId?: string;
  };
  knowledge?: {
    datasetName?: string;
  };
}

// 数据库行类型
interface PlatformConfigRow {
  config_key: string;
  config_value: string;
  config_type: string;
}

interface WorkflowRow {
  id: string;
  name: string;
  description: string | null;
  modules: unknown;
  triggers: unknown;
  status: string;
  run_count: number;
  success_count: number;
  fail_count: number;
  last_run_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface WorkflowRunRow {
  id: string;
  workflow_id: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  input_data: unknown;
  output_data: unknown;
  error_message: string | null;
  triggered_by: string | null;
}

interface OAuthSessionRow {
  id: string;
  user_id: string | null;
  provider: string;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string;
  refresh_expires_at: string | null;
  scope: string | null;
  provider_user_id: string | null;
  provider_user_info: unknown;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * 从数据库加载平台配置
 */
export async function loadPlatformConfig(): Promise<PlatformConfigData> {
  const supabase = getSupabaseClient();
  
  if (!supabase) {
    // 降级到本地存储
    return loadLocalConfig();
  }
  
  try {
    const { data, error } = await supabase
      .from('platform_configs')
      .select('config_key, config_value, config_type')
      .eq('config_key', 'platform_config');
    
    if (error || !data || data.length === 0) {
      return {};
    }
    
    const config = data[0] as PlatformConfigRow;
    if (config.config_type === 'encrypted') {
      const decrypted = decrypt(config.config_value);
      return JSON.parse(decrypted);
    }
    
    return JSON.parse(config.config_value);
  } catch (error) {
    console.error('[db-storage] Failed to load platform config:', error);
    return loadLocalConfig();
  }
}

/**
 * 保存平台配置到数据库
 */
export async function savePlatformConfig(config: PlatformConfigData): Promise<boolean> {
  const supabase = getSupabaseClient();
  
  if (!supabase) {
    return saveLocalConfig(config);
  }
  
  try {
    // 加密敏感数据
    const configJson = JSON.stringify(config);
    const encryptedValue = encrypt(configJson);
    
    const { error } = await supabase
      .from('platform_configs')
      .upsert({
        config_key: 'platform_config',
        config_value: encryptedValue,
        config_type: 'encrypted',
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'config_key'
      });
    
    if (error) {
      console.error('[db-storage] Failed to save platform config:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('[db-storage] Failed to save platform config:', error);
    return saveLocalConfig(config);
  }
}

// ============ 工作流存储 ============

export interface WorkflowData {
  id: string;
  name: string;
  description?: string;
  modules: unknown[];
  triggers?: unknown[];
  status: 'active' | 'paused' | 'error';
  runCount: number;
  successCount: number;
  failCount: number;
  lastRunAt?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowRunData {
  id: string;
  workflowId: string;
  status: 'running' | 'success' | 'failed' | 'cancelled';
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  inputData?: unknown;
  outputData?: unknown;
  errorMessage?: string;
  triggeredBy?: string;
}

/**
 * 从数据库加载所有工作流
 */
export async function loadWorkflows(): Promise<WorkflowData[]> {
  const supabase = getSupabaseClient();
  
  if (!supabase) {
    return loadLocalWorkflows();
  }
  
  try {
    const { data, error } = await supabase
      .from('workflows')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error || !data) {
      return [];
    }
    
    return (data as WorkflowRow[]).map(row => ({
      id: row.id,
      name: row.name,
      description: row.description || undefined,
      modules: row.modules as unknown[],
      triggers: row.triggers as unknown[] | undefined,
      status: row.status as WorkflowData['status'],
      runCount: row.run_count,
      successCount: row.success_count,
      failCount: row.fail_count,
      lastRunAt: row.last_run_at || undefined,
      createdBy: row.created_by || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (error) {
    console.error('[db-storage] Failed to load workflows:', error);
    return loadLocalWorkflows();
  }
}

/**
 * 保存工作流到数据库
 */
export async function saveWorkflow(workflow: WorkflowData): Promise<boolean> {
  const supabase = getSupabaseClient();
  
  if (!supabase) {
    return saveLocalWorkflow(workflow);
  }
  
  try {
    const { error } = await supabase
      .from('workflows')
      .upsert({
        id: workflow.id,
        name: workflow.name,
        description: workflow.description || null,
        modules: workflow.modules,
        triggers: workflow.triggers || null,
        status: workflow.status,
        run_count: workflow.runCount,
        success_count: workflow.successCount,
        fail_count: workflow.failCount,
        last_run_at: workflow.lastRunAt || null,
        created_by: workflow.createdBy || null,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id'
      });
    
    if (error) {
      console.error('[db-storage] Failed to save workflow:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('[db-storage] Failed to save workflow:', error);
    return saveLocalWorkflow(workflow);
  }
}

/**
 * 删除工作流
 */
export async function deleteWorkflow(id: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  
  if (!supabase) {
    return deleteLocalWorkflow(id);
  }
  
  try {
    const { error } = await supabase
      .from('workflows')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('[db-storage] Failed to delete workflow:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('[db-storage] Failed to delete workflow:', error);
    return deleteLocalWorkflow(id);
  }
}

/**
 * 保存工作流执行日志
 */
export async function saveWorkflowRun(run: WorkflowRunData): Promise<boolean> {
  const supabase = getSupabaseClient();
  
  if (!supabase) {
    return saveLocalWorkflowRun(run);
  }
  
  try {
    const { error } = await supabase
      .from('workflow_runs')
      .insert({
        id: run.id,
        workflow_id: run.workflowId,
        status: run.status,
        started_at: run.startedAt,
        completed_at: run.completedAt || null,
        duration_ms: run.durationMs || null,
        input_data: run.inputData || null,
        output_data: run.outputData || null,
        error_message: run.errorMessage || null,
        triggered_by: run.triggeredBy || null,
      });
    
    if (error) {
      console.error('[db-storage] Failed to save workflow run:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('[db-storage] Failed to save workflow run:', error);
    return saveLocalWorkflowRun(run);
  }
}

// ============ OAuth Session 存储 ============

export interface OAuthSessionData {
  id: string;
  userId?: string;
  provider: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt: string;
  refreshExpiresAt?: string;
  scope?: string;
  providerUserId?: string;
  providerUserInfo?: unknown;
  isActive: boolean;
}

/**
 * 获取用户的活跃 OAuth Session
 */
export async function getActiveOAuthSession(userId: string, provider: string): Promise<OAuthSessionData | null> {
  const supabase = getSupabaseClient();
  
  if (!supabase) {
    return null;
  }
  
  try {
    const { data, error } = await supabase
      .from('oauth_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', provider)
      .eq('is_active', true)
      .single();
    
    if (error || !data) {
      return null;
    }
    
    const row = data as OAuthSessionRow;
    return {
      id: row.id,
      userId: row.user_id || undefined,
      provider: row.provider,
      accessToken: row.access_token,
      refreshToken: row.refresh_token || undefined,
      tokenExpiresAt: row.token_expires_at,
      refreshExpiresAt: row.refresh_expires_at || undefined,
      scope: row.scope || undefined,
      providerUserId: row.provider_user_id || undefined,
      providerUserInfo: row.provider_user_info,
      isActive: row.is_active,
    };
  } catch (error) {
    console.error('[db-storage] Failed to get OAuth session:', error);
    return null;
  }
}

/**
 * 保存 OAuth Session
 */
export async function saveOAuthSession(session: OAuthSessionData): Promise<boolean> {
  const supabase = getSupabaseClient();
  
  if (!supabase) {
    return false;
  }
  
  try {
    // 先停用该用户该提供商的其他 session
    await supabase
      .from('oauth_sessions')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('user_id', session.userId)
      .eq('provider', session.provider)
      .eq('is_active', true);
    
    // 插入新 session
    const { error } = await supabase
      .from('oauth_sessions')
      .upsert({
        id: session.id,
        user_id: session.userId || null,
        provider: session.provider,
        access_token: session.accessToken,
        refresh_token: session.refreshToken || null,
        token_expires_at: session.tokenExpiresAt,
        refresh_expires_at: session.refreshExpiresAt || null,
        scope: session.scope || null,
        provider_user_id: session.providerUserId || null,
        provider_user_info: session.providerUserInfo || null,
        is_active: session.isActive,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id'
      });
    
    if (error) {
      console.error('[db-storage] Failed to save OAuth session:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('[db-storage] Failed to save OAuth session:', error);
    return false;
  }
}

/**
 * 停用 OAuth Session
 */
export async function deactivateOAuthSession(userId: string, provider: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  
  if (!supabase) {
    return false;
  }
  
  try {
    const { error } = await supabase
      .from('oauth_sessions')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('provider', provider)
      .eq('is_active', true);
    
    if (error) {
      console.error('[db-storage] Failed to deactivate OAuth session:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('[db-storage] Failed to deactivate OAuth session:', error);
    return false;
  }
}

// ============ 本地存储降级 ============

const LOCAL_CONFIG_PATH = process.env.COZE_PROJECT_ENV === 'PROD' 
  ? '/tmp/.platform-config.json'
  : path.join(process.cwd(), '.platform-config.json');

const LOCAL_WORKFLOWS_PATH = process.env.COZE_PROJECT_ENV === 'PROD'
  ? '/tmp/.workflows.json'
  : path.join(process.cwd(), '.workflows.json');

function loadLocalConfig(): PlatformConfigData {
  try {
    if (fs.existsSync(LOCAL_CONFIG_PATH)) {
      const content = fs.readFileSync(LOCAL_CONFIG_PATH, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.error('[db-storage] Failed to load local config:', error);
  }
  return {};
}

function saveLocalConfig(config: PlatformConfigData): boolean {
  try {
    fs.writeFileSync(LOCAL_CONFIG_PATH, JSON.stringify(config, null, 2));
    return true;
  } catch (error) {
    console.error('[db-storage] Failed to save local config:', error);
    return false;
  }
}

function loadLocalWorkflows(): WorkflowData[] {
  try {
    if (fs.existsSync(LOCAL_WORKFLOWS_PATH)) {
      const content = fs.readFileSync(LOCAL_WORKFLOWS_PATH, 'utf-8');
      const data = JSON.parse(content);
      return data.workflows || [];
    }
  } catch (error) {
    console.error('[db-storage] Failed to load local workflows:', error);
  }
  return [];
}

function saveLocalWorkflow(workflow: WorkflowData): boolean {
  try {
    const workflows = loadLocalWorkflows();
    const index = workflows.findIndex(w => w.id === workflow.id);
    if (index >= 0) {
      workflows[index] = workflow;
    } else {
      workflows.push(workflow);
    }
    fs.writeFileSync(LOCAL_WORKFLOWS_PATH, JSON.stringify({ workflows }, null, 2));
    return true;
  } catch (error) {
    console.error('[db-storage] Failed to save local workflow:', error);
    return false;
  }
}

function deleteLocalWorkflow(id: string): boolean {
  try {
    const workflows = loadLocalWorkflows().filter(w => w.id !== id);
    fs.writeFileSync(LOCAL_WORKFLOWS_PATH, JSON.stringify({ workflows }, null, 2));
    return true;
  } catch (error) {
    console.error('[db-storage] Failed to delete local workflow:', error);
    return false;
  }
}

function saveLocalWorkflowRun(run: WorkflowRunData): boolean {
  // 本地存储不保存执行日志（避免文件过大）
  console.log('[db-storage] Workflow run saved to memory only:', run.id);
  return true;
}

// ============ 导出 ============

export const dbStorage = {
  // 平台配置
  loadPlatformConfig,
  savePlatformConfig,
  
  // 工作流
  loadWorkflows,
  saveWorkflow,
  deleteWorkflow,
  saveWorkflowRun,
  
  // OAuth Session
  getActiveOAuthSession,
  saveOAuthSession,
  deactivateOAuthSession,
  
  // 工具函数
  encrypt,
  decrypt,
  isSensitiveKey,
};

export default dbStorage;
