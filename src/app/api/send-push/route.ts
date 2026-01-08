import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ONESIGNAL_APP_ID =
  process.env.ONESIGNAL_APP_ID || "595fdd83-68b2-498a-8ca6-66fd1ae7be8e";

const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;
const ADMIN_PUSH_SECRET = process.env.ADMIN_PUSH_SECRET;

export async function POST(req: Request) {
  const logs: string[] = [];

  try {
    const url = new URL(req.url);
    const secret = url.searchParams.get("secret");

    if (!ADMIN_PUSH_SECRET || secret !== ADMIN_PUSH_SECRET) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
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

    // ✅ Segment, das bei dir nachweislich funktioniert
    const payload = {
      app_id: ONESIGNAL_APP_ID,
      headings: { de: title, en: title },
      contents: { de: message, en: message },
      included_segments: ["All"],
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