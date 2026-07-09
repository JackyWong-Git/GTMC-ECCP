import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { users, topics, taskLogs } from "@/storage/database/shared/schema";
import { eq, desc, sql, count } from "drizzle-orm";

async function getAuthUser(request: NextRequest) {
  const sessionHeader = request.headers.get("x-session");
  if (!sessionHeader) return null;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return null;

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data: { user } } = await supabase.auth.getUser(sessionHeader);
  return user;
}

function getDb() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Supabase configuration not found");
  }
  const dbUrl = supabaseUrl.replace("https://", "postgres://").replace(".supabase.co", ".supabase.co:5432");
  const connectionString = `${dbUrl}?user=postgres&password=${supabaseServiceKey}`;
  const client = postgres(connectionString);
  return drizzle(client);
}

// GET - List team members and recent activities
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDb();

    // Fetch all active team members
    const members = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        department: users.department,
        avatar_url: users.avatar_url,
        created_at: users.created_at,
      })
      .from(users)
      .where(eq(users.is_active, true))
      .orderBy(users.name);

    // For each member, count their topics (assigned_to) and completed topics
    const membersWithStats = await Promise.all(
      members.map(async (member) => {
        const [totalResult] = await db
          .select({ count: count() })
          .from(topics)
          .where(eq(topics.assigned_to, member.id));

        const [completedResult] = await db
          .select({ count: count() })
          .from(topics)
          .where(sql`${topics.assigned_to} = ${member.id} AND ${topics.status} IN ('已发布', '已归档')`);

        return {
          ...member,
          tasks: totalResult?.count || 0,
          completedTasks: completedResult?.count || 0,
        };
      })
    );

    // Fetch recent activities (last 20 task logs)
    const recentLogs = await db
      .select({
        id: taskLogs.id,
        user_id: taskLogs.user_id,
        action: taskLogs.action,
        topic_id: taskLogs.topic_id,
        from_status: taskLogs.from_status,
        to_status: taskLogs.to_status,
        created_at: taskLogs.created_at,
      })
      .from(taskLogs)
      .orderBy(desc(taskLogs.created_at))
      .limit(20);

    // Enrich logs with user names and topic titles
    const enrichedLogs = await Promise.all(
      recentLogs.map(async (log) => {
        const [logUser] = await db.select({ name: users.name }).from(users).where(eq(users.id, log.user_id)).limit(1);
        
        let topicTitle = "";
        try {
          const [topic] = await db.select({ title: topics.title }).from(topics).where(eq(topics.id, log.topic_id)).limit(1);
          topicTitle = topic?.title || "";
        } catch {
          // Topic may have been deleted
        }

        return {
          ...log,
          user_name: logUser?.name || "未知用户",
          topic_title: topicTitle,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        members: membersWithStats,
        activities: enrichedLogs,
      },
    });
  } catch (error) {
    console.error("[team] GET error:", error);
    return NextResponse.json({ error: "Failed to fetch team data" }, { status: 500 });
  }
}
