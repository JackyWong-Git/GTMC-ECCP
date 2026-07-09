import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { users } from "@/storage/database/shared/schema";
import { eq } from "drizzle-orm";

function getDb() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }

  const dbUrl = supabaseUrl.replace("https://", "postgres://").replace(".supabase.co", ".supabase.co:5432");
  const connectionString = `${dbUrl}?user=postgres&password=${supabaseServiceKey}`;
  const client = postgres(connectionString);
  return drizzle(client);
}

async function handleSession(request: NextRequest) {
  try {
    const sessionHeader = request.headers.get("x-session");
    
    if (!sessionHeader) {
      return NextResponse.json(
        { error: "Missing session token" },
        { status: 401 }
      );
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: "Supabase configuration not found" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    const { data: { user }, error } = await supabase.auth.getUser(sessionHeader);

    if (error || !user) {
      return NextResponse.json(
        { error: "Invalid session token" },
        { status: 401 }
      );
    }

    // Look up user profile in DB for role/department
    let role = "member";
    let department = "";
    let name = user.user_metadata?.full_name || user.email?.split("@")[0] || "";

    try {
      const db = getDb();
      if (db) {
        const [dbUser] = await db.select().from(users).where(eq(users.email, user.email || "")).limit(1);
        if (dbUser) {
          role = dbUser.role;
          department = dbUser.department || "";
          name = dbUser.name || name;
        }
      }
    } catch {
      // DB lookup failed, use defaults
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name,
        role,
        department,
      },
    });
  } catch (error) {
    console.error("[auth/session] Error:", error);
    return NextResponse.json(
      { error: "Session verification failed" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return handleSession(request);
}

export async function GET(request: NextRequest) {
  return handleSession(request);
}
