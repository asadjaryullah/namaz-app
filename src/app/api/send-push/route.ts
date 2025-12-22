import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ONESIGNAL_APP_ID =
  process.env.ONESIGNAL_APP_ID || "595fdd83-68b2-498a-8ca6-66fd1ae7be8e";

const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;
const ADMIN_PUSH_SECRET = process.env.ADMIN_PUSH_SECRET;

export async function POST(req: Request) {
  try {
    // ✅ Auth per Secret (Query)
    const url = new URL(req.url);
    const secret = url.searchParams.get("secret");

    if (!ADMIN_PUSH_SECRET || secret !== ADMIN_PUSH_SECRET) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    if (!ONESIGNAL_APP_ID) {
      return NextResponse.json({ error: "ONESIGNAL_APP_ID fehlt" }, { status: 500 });
    }
    if (!ONESIGNAL_REST_API_KEY) {
      return NextResponse.json(
        { error: "ONESIGNAL_REST_API_KEY fehlt (Vercel/.env.local)" },
        { status: 500 }
      );
    }

    // ✅ Body aus Request lesen
    const { title, message } = await req.json();
    if (!title || !message) {
      return NextResponse.json({ error: "Titel und Nachricht fehlen" }, { status: 400 });
    }

    // ✅ OneSignal Payload
    const body = {
      app_id: ONESIGNAL_APP_ID,
      headings: { de: title, en: title },
      contents: { de: message, en: message },
      included_segments: ["Subscribed Users"],
      url: "https://ride2salah.vercel.app",
    };

    const resp = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Accept: "application/json",
        Authorization: `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    const text = await resp.text();

    if (!resp.ok) {
      return NextResponse.json(
        { error: "onesignal_failed", status: resp.status, detail: text.slice(0, 800) },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, detail: text.slice(0, 300) });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "server_error" }, { status: 500 });
  }
}