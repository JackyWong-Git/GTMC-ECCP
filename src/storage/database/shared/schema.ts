import { sql } from "drizzle-orm";
import { pgTable, serial, varchar, text, timestamp, boolean, integer, jsonb, index, uuid } from "drizzle-orm/pg-core";

// 系统健康检查表（禁止删除）
export const healthCheck = pgTable("health_check", {
  id: serial().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// 用户表 - 关联 Supabase Auth
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().default(sql`auth.uid()`),
    email: varchar("email", { length: 255 }).notNull().unique(),
    name: varchar("name", { length: 128 }).notNull(),
    avatar_url: text("avatar_url"),
    role: varchar("role", { length: 20 }).notNull().default("member"), // admin, member
    department: varchar("department", { length: 100 }),
    is_active: boolean("is_active").default(true).notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("users_email_idx").on(table.email),
    index("users_role_idx").on(table.role),
  ]
);

// 选题/任务表 - 看板任务管理
export const topics = pgTable(
  "topics",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    title: varchar("title", { length: 500 }).notNull(),
    description: text("description"),
    created_by: uuid("created_by").notNull().references(() => users.id),
    assigned_to: uuid("assigned_to").references(() => users.id),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    // pending(待认领), scripting(脚本制作), filming(拍摄中), reviewing(待审核), published(已发布), archived(已归档)
    priority: varchar("priority", { length: 10 }).notNull().default("medium"),
    // high, medium, low
    deadline: timestamp("deadline", { withTimezone: true }),
    progress: integer("progress").notNull().default(0), // 0-100
    tags: jsonb("tags"), // 标签数组
    attachments: jsonb("attachments"), // 附件列表
    source: varchar("source", { length: 100 }), // 来源（如：抖音、微博、手动创建）
    source_url: text("source_url"), // 来源链接
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("topics_status_idx").on(table.status),
    index("topics_assigned_to_idx").on(table.assigned_to),
    index("topics_created_by_idx").on(table.created_by),
    index("topics_priority_idx").on(table.priority),
    index("topics_created_at_idx").on(table.created_at),
    index("topics_source_idx").on(table.source),
  ]
);

// 操作日志表 - 记录所有操作
export const taskLogs = pgTable(
  "task_logs",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    topic_id: varchar("topic_id", { length: 36 }).notNull().references(() => topics.id, { onDelete: "cascade" }),
    user_id: uuid("user_id").notNull().references(() => users.id),
    action: varchar("action", { length: 50 }).notNull(),
    // created, claimed, status_changed, commented, completed, etc.
    from_status: varchar("from_status", { length: 20 }),
    to_status: varchar("to_status", { length: 20 }),
    comment: text("comment"),
    metadata: jsonb("metadata"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("task_logs_topic_id_idx").on(table.topic_id),
    index("task_logs_user_id_idx").on(table.user_id),
    index("task_logs_created_at_idx").on(table.created_at),
  ]
);

// 平台配置表 - 存储 API 凭证和配置
export const platformConfigs = pgTable(
  "platform_configs",
  {
    id: serial("id").primaryKey(),
    user_id: uuid("user_id").references(() => users.id),
    config_key: varchar("config_key", { length: 100 }).notNull().unique(),
    config_value: text("config_value").notNull(), // 加密存储
    config_type: varchar("config_type", { length: 20 }).notNull().default("string"), // string, json, encrypted
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("platform_configs_key_idx").on(table.config_key),
    index("platform_configs_user_idx").on(table.user_id),
  ]
);

// 工作流表 - 存储工作流定义
export const workflows = pgTable(
  "workflows",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    name: varchar("name", { length: 200 }).notNull(),
    description: text("description"),
    modules: jsonb("modules").notNull(), // 模块定义数组
    triggers: jsonb("triggers"), // 触发器配置
    status: varchar("status", { length: 20 }).notNull().default("active"), // active, paused, archived
    run_count: integer("run_count").notNull().default(0),
    success_count: integer("success_count").notNull().default(0),
    fail_count: integer("fail_count").notNull().default(0),
    last_run_at: timestamp("last_run_at", { withTimezone: true }),
    created_by: uuid("created_by").references(() => users.id),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("workflows_status_idx").on(table.status),
    index("workflows_created_by_idx").on(table.created_by),
  ]
);

// 工作流执行日志表
export const workflowRuns = pgTable(
  "workflow_runs",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    workflow_id: varchar("workflow_id", { length: 36 }).notNull().references(() => workflows.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 20 }).notNull(), // running, success, failed
    started_at: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    completed_at: timestamp("completed_at", { withTimezone: true }),
    duration_ms: integer("duration_ms"),
    input_data: jsonb("input_data"),
    output_data: jsonb("output_data"),
    error_message: text("error_message"),
    triggered_by: uuid("triggered_by").references(() => users.id),
  },
  (table) => [
    index("workflow_runs_workflow_idx").on(table.workflow_id),
    index("workflow_runs_status_idx").on(table.status),
    index("workflow_runs_started_idx").on(table.started_at),
  ]
);

// OAuth Session 表 - 存储第三方登录会话
export const oauthSessions = pgTable(
  "oauth_sessions",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    user_id: uuid("user_id").references(() => users.id),
    provider: varchar("provider", { length: 50 }).notNull(), // douyin, feishu, dingtalk
    access_token: text("access_token").notNull(), // 加密存储
    refresh_token: text("refresh_token"), // 加密存储
    token_expires_at: timestamp("token_expires_at", { withTimezone: true }).notNull(),
    refresh_expires_at: timestamp("refresh_expires_at", { withTimezone: true }),
    scope: text("scope"),
    provider_user_id: varchar("provider_user_id", { length: 255 }),
    provider_user_info: jsonb("provider_user_info"),
    is_active: boolean("is_active").default(true).notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("oauth_sessions_user_idx").on(table.user_id),
    index("oauth_sessions_provider_idx").on(table.provider),
    index("oauth_sessions_active_idx").on(table.is_active),
  ]
);

// 类型导出
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Topic = typeof topics.$inferSelect;
export type InsertTopic = typeof topics.$inferInsert;
export type TaskLog = typeof taskLogs.$inferSelect;
export type InsertTaskLog = typeof taskLogs.$inferInsert;
export type PlatformConfig = typeof platformConfigs.$inferSelect;
export type InsertPlatformConfig = typeof platformConfigs.$inferInsert;
export type Workflow = typeof workflows.$inferSelect;
export type InsertWorkflow = typeof workflows.$inferInsert;
export type WorkflowRun = typeof workflowRuns.$inferSelect;
export type InsertWorkflowRun = typeof workflowRuns.$inferInsert;
export type OAuthSession = typeof oauthSessions.$inferSelect;
export type InsertOAuthSession = typeof oauthSessions.$inferInsert;
