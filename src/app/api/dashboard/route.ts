import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { topics, taskLogs, users } from "@/storage/database/shared/schema";
import { eq, count, sql } from "drizzle-orm";

// Helper to get authenticated user
async function getAuthUser(request: NextRequest) {
  const sessionHeader = request.headers.get("x-session");
  if (!sessionHeader) {
    return null;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data: { user } } = await supabase.auth.getUser(sessionHeader);
  return user;
}

// Helper to get DB client
function getDb() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Supabase configuration not found");
  }

  const { drizzle } = require("drizzle-orm/supabase");
  return drizzle(supabaseUrl, {
    auth: { token: supabaseServiceKey },
    casing: "snake_case",
  });
}

// GET - Dashboard aggregated data
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDb();

    // Get topic counts by status
    const allTopics = await db.select().from(topics);
    
    const statusCounts: Record<string, number> = {
      "待认领": 0,
      "脚本制作": 0,
      "拍摄中": 0,
      "待审核": 0,
      "已发布": 0,
      "已归档": 0,
    };

    allTopics.forEach((topic: { status: string }) => {
      if (statusCounts[topic.status] !== undefined) {
        statusCounts[topic.status]++;
      }
    });

    // Get total counts
    const totalTopics = allTopics.length;
    const completedTopics = allTopics.filter((t: { status: string }) => t.status === "已发布" || t.status === "已归档").length;
    const inProgressTopics = allTopics.filter((t: { status: string }) => 
      t.status === "脚本制作" || t.status === "拍摄中" || t.status === "待审核"
    ).length;
    const pendingTopics = allTopics.filter((t: { status: string }) => t.status === "待认领").length;

    // Get recent activity (last 10 logs)
    const recentLogs = await db
      .select({
        id: taskLogs.id,
        topic_id: taskLogs.topic_id,
        user_id: taskLogs.user_id,
        action: taskLogs.action,
        created_at: taskLogs.created_at,
        topicTitle: topics.title,
      })
      .from(taskLogs)
      .leftJoin(topics, eq(taskLogs.topic_id, topics.id))
      .orderBy(sql`${taskLogs.created_at} DESC`)
      .limit(10);

    // Get team member stats
    const memberStats = await db
      .select({
        user_id: topics.assigned_to,
        topicCount: count(topics.id),
      })
      .from(topics)
      .where(sql`${topics.assigned_to} IS NOT NULL`)
      .groupBy(topics.assigned_to);

    // Get user info for members
    const allUsers = await db.select().from(users);
    const userMap = new Map<string, { id: string; name: string; email: string }>(
      allUsers.map((u: { id: string; name: string; email: string }) => [u.id, u])
    );

    const teamMembers = memberStats.map((stat: { user_id: string | null; topicCount: number }) => {
      const userInfo = stat.user_id ? userMap.get(stat.user_id) : null;
      return {
        userId: stat.user_id,
        name: userInfo?.name || "Unknown",
        email: userInfo?.email || "",
        topicCount: stat.topicCount,
      };
    });

    // Get my tasks (assigned to current user)
    const myTasks = await db
      .select()
      .from(topics)
      .where(eq(topics.assigned_to, user.id))
      .orderBy(topics.created_at);

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalTopics,
          completedTopics,
          inProgressTopics,
          pendingTopics,
        },
        statusCounts,
        recentActivity: recentLogs,
        teamMembers,
        myTasks,
      },
    });
  } catch (error) {
    console.error("[dashboard] Error:", error);
    return NextResponse.json(
      { error: "获取仪表盘数据失败" },
      { status: 500 }
    );
  }
}
