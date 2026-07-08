import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
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

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.email?.split("@")[0],
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
