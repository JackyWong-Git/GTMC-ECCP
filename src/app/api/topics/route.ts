import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { topics, taskLogs } from "@/storage/database/shared/schema";
import { eq } from "drizzle-orm";

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

  // Convert Supabase URL to postgres connection string
  const dbUrl = supabaseUrl.replace("https://", "postgres://").replace(".supabase.co", ".supabase.co:5432");
  const connectionString = `${dbUrl}?user=postgres&password=${supabaseServiceKey}`;
  
  const client = postgres(connectionString);
  return drizzle(client);
}

// GET - List all topics
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDb();
    const allTopics = await db.select().from(topics).orderBy(topics.created_at);

    return NextResponse.json({ success: true, data: allTopics });
  } catch (error) {
    console.error("[topics] GET error:", error);
    return NextResponse.json({ error: "Failed to fetch topics" }, { status: 500 });
  }
}

// POST - Create a new topic
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, priority, deadline, source, sourceUrl } = body;

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const db = getDb();
    const now = new Date();

    const [newTopic] = await db.insert(topics).values({
      title,
      description: description || "",
      created_by: user.id,
      assigned_to: null,
      status: "待认领",
      priority: priority || "中",
      deadline: deadline ? new Date(deadline) : null,
      progress: 0,
      source: source || "手动创建",
      source_url: sourceUrl || null,
      created_at: now,
      updated_at: now,
    }).returning();

    // Log the action
    await db.insert(taskLogs).values({
      topic_id: newTopic.id,
      user_id: user.id,
      action: "发布选题",
      created_at: now,
    });

    return NextResponse.json({ success: true, data: newTopic });
  } catch (error) {
    console.error("[topics] POST error:", error);
    return NextResponse.json({ error: "Failed to create topic" }, { status: 500 });
  }
}

// PATCH - Update topic (claim, status change, etc.)
export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, status, progress, assigned_to } = body;

    if (!id) {
      return NextResponse.json({ error: "Topic ID is required" }, { status: 400 });
    }

    const db = getDb();
    const now = new Date();

    const updateData: Record<string, unknown> = { updated_at: now };
    
    if (status !== undefined) {
      updateData.status = status;
    }
    if (progress !== undefined) {
      updateData.progress = progress;
    }
    if (assigned_to !== undefined) {
      updateData.assigned_to = assigned_to;
    }

    const [updatedTopic] = await db
      .update(topics)
      .set(updateData)
      .where(eq(topics.id, id))
      .returning();

    // Log the action
    let action = "更新选题";
    if (assigned_to === user.id && status === "脚本制作") {
      action = "认领选题";
    } else if (status === "待审核") {
      action = "提交审核";
    } else if (status === "已发布") {
      action = "发布完成";
    }

    await db.insert(taskLogs).values({
      topic_id: id,
      user_id: user.id,
      action,
      created_at: now,
    });

    return NextResponse.json({ success: true, data: updatedTopic });
  } catch (error) {
    console.error("[topics] PATCH error:", error);
    return NextResponse.json({ error: "Failed to update topic" }, { status: 500 });
  }
}

// DELETE - Delete a topic
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Topic ID is required" }, { status: 400 });
    }

    const db = getDb();
    await db.delete(topics).where(eq(topics.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[topics] DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete topic" }, { status: 500 });
  }
}
