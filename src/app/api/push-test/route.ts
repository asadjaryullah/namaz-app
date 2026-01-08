import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const APP_ID = process.env.ONESIGNAL_APP_ID!;
const OS_KEY = process.env.ONESIGNAL_REST_API_KEY!;
const SECRET = process.env.CRON_SECRET!;

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("secret") !== SECRET) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const resp = await fetch("https://onesignal.com/api/v1/notifications", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Basic ${OS_KEY}` },
    body: JSON.stringify({
      app_id: APP_ID,
      headings: { en: "Test ✅" },
      contents: { en: "Wenn du das bekommst, ist OneSignal + Key korrekt." },
      included_segments: ["Subscribed Users"],
    }),
  });

  const text = await resp.text();
  return NextResponse.json({ ok: resp.ok, status: resp.status, text: text.slice(0, 300) });
}