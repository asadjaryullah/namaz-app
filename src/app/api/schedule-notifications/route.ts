import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const APP_ID = process.env.ONESIGNAL_APP_ID!;
const OS_KEY = process.env.ONESIGNAL_REST_API_KEY!;
const SECRET = process.env.CRON_SECRET!;

const TZ = "Europe/Berlin";
const PLAN_WINDOW_HOURS = 6;

export async function GET(req: Request) {
  const logs: string[] = [];
  try {
    const url = new URL(req.url);
    if (url.searchParams.get("secret") !== SECRET) {
      return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 });
    }

    const nowBerlin = new Date(new Date().toLocaleString("en-US", { timeZone: TZ }));
    const windowEnd = new Date(nowBerlin.getTime() + PLAN_WINDOW_HOURS * 60 * 60 * 1000);

    logs.push(`🕒 now: ${nowBerlin.toLocaleString("de-DE")}`);
    logs.push(`🪟 windowEnd: ${windowEnd.toLocaleString("de-DE")}`);

    let planned = 0;

    // 1) NAMAZ: 25 min vorher (aus prayer_times)
    planned += await planPrayerPushes(nowBerlin, windowEnd, logs);

    // 2) ZIKR: alle 4h 08-20 (08,12,16,20)
    planned += await planFixedTimes("zikr", ["08:00", "12:00", "16:00", "20:00"], nowBerlin, windowEnd, logs);

    // 3) KHUTBA: 12:30
    planned += await planFixedTimes("khutba", ["12:30"], nowBerlin, windowEnd, logs);

    return NextResponse.json({ success: true, planned, logs });
  } catch (e: any) {
    logs.push("💥 " + (e?.message || String(e)));
    return NextResponse.json({ success: false, logs }, { status: 500 });
  }
}

async function planPrayerPushes(nowBerlin: Date, windowEnd: Date, logs: string[]) {
  const { data: prayers, error } = await supabase
    .from("prayer_times")
    .select("name,time")
    .order("sort_order", { ascending: true });

  if (error) throw error;
  if (!prayers?.length) return 0;

  let planned = 0;

  for (const p of prayers) {
    if (!p.time) continue;

    const sendAt = berlinTodayAt(p.time, nowBerlin);
    sendAt.setMinutes(sendAt.getMinutes() - 25);
    sendAt.setSeconds(0); sendAt.setMilliseconds(0);

    if (sendAt <= nowBerlin || sendAt > windowEnd) continue;

    const key = `prayer_${p.name}_${sendAt.toISOString().slice(0,16)}`;
    const ok = await scheduleOnce(key, sendAt, "prayer", async () => {
      return sendOneSignal(
        `Bald ist ${p.name} 🕌`,
        `In 25 Minuten ist Gebet (${p.time}).`,
        sendAt,
        logs
      );
    }, logs);

    if (ok) planned++;
  }

  return planned;
}

async function planFixedTimes(type: "zikr" | "khutba", times: string[], nowBerlin: Date, windowEnd: Date, logs: string[]) {
  let planned = 0;

  for (const t of times) {
    const sendAt = berlinTodayAt(t, nowBerlin);
    sendAt.setSeconds(0); sendAt.setMilliseconds(0);

    // wenn heute vorbei, dann morgen
    if (sendAt <= nowBerlin) sendAt.setDate(sendAt.getDate() + 1);
    if (sendAt > windowEnd) continue;

    const key = `${type}_${sendAt.toISOString().slice(0,16)}`;

    const ok = await scheduleOnce(key, sendAt, type, async () => {
      if (type === "zikr") {
        return sendOneSignal("Zikr Erinnerung 📿", "Denke an Allah – nimm dir 2 Minuten für Zikr.", sendAt, logs);
      }
      return sendOneSignal("Khutba Erinnerung 🕌", "Heute 12:30 Khutba – bitte rechtzeitig vorbereiten.", sendAt, logs);
    }, logs);

    if (ok) planned++;
  }

  return planned;
}

function berlinTodayAt(hhmm: string, baseBerlin: Date) {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(baseBerlin);
  d.setHours(h); d.setMinutes(m);
  d.setSeconds(0); d.setMilliseconds(0);
  return d;
}

async function scheduleOnce(
  job_key: string,
  send_at: Date,
  type: string,
  work: () => Promise<boolean>,
  logs: string[]
) {
  // schon geplant?
  const { data: existing } = await supabase
    .from("scheduled_pushes")
    .select("job_key")
    .eq("job_key", job_key)
    .maybeSingle();

  if (existing) {
    logs.push(`↩️ skip (exists): ${job_key}`);
    return false;
  }

  // reservieren
  const { error: insErr } = await supabase
    .from("scheduled_pushes")
    .insert({ job_key, send_at: send_at.toISOString(), type });

  if (insErr) {
    logs.push(`⚠️ insert failed: ${job_key} | ${insErr.message}`);
    return false;
  }

  // senden/planen bei OneSignal
  const ok = await work();
  logs.push(ok ? `✅ scheduled: ${job_key}` : `❌ onesignal failed: ${job_key}`);
  return ok;
}

async function sendOneSignal(title: string, message: string, sendAt: Date, logs: string[]) {
  const body: any = {
    app_id: APP_ID,
    headings: { en: title },
    contents: { en: message },
    included_segments: ["Subscribed Users"],
    url: "https://ride2salah.vercel.app"
  };

  // OneSignal scheduling
  if (sendAt.getTime() - Date.now() > 60_000) {
    body.send_after = sendAt.toUTCString();
  }

  const resp = await fetch("https://onesignal.com/api/v1/notifications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Accept: "application/json",
      Authorization: `Basic ${OS_KEY}`,
    },
    body: JSON.stringify(body),
  });

  const txt = await resp.text();
  logs.push(`📨 OneSignal ${resp.status} ${resp.ok ? "OK" : "FAIL"} | ${txt.slice(0,200)}`);
  return resp.ok;
}