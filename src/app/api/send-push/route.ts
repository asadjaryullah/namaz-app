import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ONESIGNAL_APP_ID =
  process.env.ONESIGNAL_APP_ID || "595fdd83-68b2-498a-8ca6-66fd1ae7be8e";

const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const ADMIN_EMAIL = "asad.jaryullah@gmail.com";

export async function POST(req: Request) {
  const logs: string[] = [];

  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(
      token
    );

    if (userErr || !userData?.user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const email = (userData.user.email || "").toLowerCase().trim();
    if (email !== ADMIN_EMAIL.toLowerCase().trim()) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    if (!ONESIGNAL_REST_API_KEY) {
      return NextResponse.json(
        { error: "ONESIGNAL_REST_API_KEY fehlt (Vercel/.env.local)" },
        { status: 500 }
      );
    }

    const { title, message } = await req.json();
    if (!title || !message) {
      return NextResponse.json({ error: "Titel und Nachricht fehlen" }, { status: 400 });
    }

    // ✅ Nur aktive Push-Abonnenten
    const payload = {
      app_id: ONESIGNAL_APP_ID,
      headings: { de: title, en: title },
      contents: { de: message, en: message },
      included_segments: ["Subscribed Users"],
      url: "https://ride2salah.vercel.app",
    };

    logs.push("sending to OneSignal…");

    const resp = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Accept: "application/json",
        Authorization: `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const raw = await resp.text();
    logs.push(`OneSignal status=${resp.status}`);

    // ✅ JSON versuchen zu parsen (OneSignal liefert oft JSON)
    let parsed: any = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // ignore
    }

    if (!resp.ok) {
      return NextResponse.json(
        { error: "onesignal_failed", status: resp.status, detail: raw.slice(0, 800), logs },
        { status: 502 }
      );
    }

    // ✅ Auch wenn 200: prüfen, ob OneSignal errors meldet (z.B. keine Subscriber)
    if (parsed?.errors?.length) {
      return NextResponse.json(
        { success: false, warning: "onesignal_returned_errors", errors: parsed.errors, logs },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { success: true, id: parsed?.id ?? null, detail: raw.slice(0, 500), logs },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "server_error", logs }, { status: 500 });
  }
}
