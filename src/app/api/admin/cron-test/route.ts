import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "";
const CRON_SECRET = process.env.CRON_SECRET!;

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (!ADMIN_EMAIL) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
  if (userErr || !userData?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const email = (userData.user.email || "").toLowerCase().trim();
  if (email !== ADMIN_EMAIL.toLowerCase().trim()) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (!CRON_SECRET) return NextResponse.json({ error: "CRON_SECRET fehlt" }, { status: 500 });

  const { mode } = await req.json().catch(() => ({ mode: "debug" }));
  const params = mode === "force" ? "force=1" : "debug=1";

  const origin = new URL(req.url).origin;
  const res = await fetch(`${origin}/api/schedule-notifications?secret=${CRON_SECRET}&${params}`);
  const json = await res.json().catch(() => ({}));

  return NextResponse.json(json, { status: res.status });
}
