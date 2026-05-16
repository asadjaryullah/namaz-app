import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// POST /api/push-subscribe  → Subscription speichern
export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: userData, error: userErr } = await getSupabase().auth.getUser(token);
  if (userErr || !userData?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const endpoint = body?.endpoint;
  const p256dh = body?.keys?.p256dh;
  const auth = body?.keys?.auth;

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "endpoint, p256dh und auth erforderlich" }, { status: 400 });
  }

  // Erst löschen falls endpoint schon existiert, dann neu einfügen
  await getSupabase().from("push_subscriptions").delete().eq("endpoint", endpoint);

  const { error } = await getSupabase().from("push_subscriptions").insert({
    user_id: userData.user.id, endpoint, p256dh, auth,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

// DELETE /api/push-subscribe  → Subscription löschen
export async function DELETE(req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: userData, error: userErr } = await getSupabase().auth.getUser(token);
  if (userErr || !userData?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const endpoint = body?.endpoint;

  if (!endpoint) {
    // Alle Subscriptions dieses Users löschen
    await getSupabase()
      .from("push_subscriptions")
      .delete()
      .eq("user_id", userData.user.id);
  } else {
    await getSupabase()
      .from("push_subscriptions")
      .delete()
      .eq("endpoint", endpoint)
      .eq("user_id", userData.user.id);
  }

  return NextResponse.json({ success: true });
}
