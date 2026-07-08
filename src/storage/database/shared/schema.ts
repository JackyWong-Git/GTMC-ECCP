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
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("topics_status_idx").on(table.status),
    index("topics_assigned_to_idx").on(table.assigned_to),
    index("topics_created_by_idx").on(table.created_by),
    index("topics_priority_idx").on(table.priority),
    index("topics_created_at_idx").on(table.created_at),
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

// 类型导出
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Topic = typeof topics.$inferSelect;
export type InsertTopic = typeof topics.$inferInsert;
export type TaskLog = typeof taskLogs.$inferSelect;
export type InsertTaskLog = typeof taskLogs.$inferInsert;
