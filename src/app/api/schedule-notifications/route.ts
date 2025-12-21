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

// Zikr fix (alle 4h 08–20)
const ZIKR_TIMES = ["08:00", "12:00", "16:00", "20:00"];
const KHUTBA_TIMES = ["12:30"];

export async function GET(req: Request) {
  const logs: string[] = [];
  try {
    const url = new URL(req.url);
    if (url.searchParams.get("secret") !== SECRET) {
      return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 });
    }

    if (!APP_ID || !OS_KEY) {
      return NextResponse.json({ success: false, error: "missing env (ONESIGNAL_APP_ID/ONESIGNAL_REST_API_KEY)" }, { status: 500 });
    }

    const nowBerlin = new Date(new Date().toLocaleString("en-US", { timeZone: TZ }));
    const windowEnd = new Date(nowBerlin.getTime() + PLAN_WINDOW_HOURS * 60 * 60 * 1000);

    logs.push(`🕒 now: ${nowBerlin.toLocaleString("de-DE")}`);
    logs.push(`🪟 windowEnd: ${windowEnd.toLocaleString("de-DE")}`);

    let planned = 0;

    planned += await planPrayerPushes(nowBerlin, windowEnd, logs);
    planned += await planFixedTimes("zikr", ZIKR_TIMES, nowBerlin, windowEnd, logs);
    planned += await planFixedTimes("khutba", KHUTBA_TIMES, nowBerlin, windowEnd, logs);

    return NextResponse.json({ success: true, planned, logs });
  } catch (e: any) {
    logs.push("💥 " + (e?.message || String(e)));
    return NextResponse.json({ success: false, logs }, { status: 500 });
  }
}

async function planPrayerPushes(nowBerlin: Date, windowEnd: Date, logs: string[]) {
  logs.push("🔎 check prayer: 25 min before");

  const { data: prayers, error } = await supabase
    .from("prayer_times")
    .select("name,time,sort_order")
    .order("sort_order", { ascending: true });

  if (error) throw error;
  if (!prayers?.length) {
    logs.push("⚠️ no prayer_times found");
    return 0;
  }

  let planned = 0;

  for (const p of prayers) {
    if (!p.time) continue;

    const sendAt = berlinTodayAt(p.time, nowBerlin);
    sendAt.setMinutes(sendAt.getMinutes() - 25);
    sendAt.setSeconds(0); sendAt.setMilliseconds(0);

    // wenn heute vorbei -> nicht planen (Cron läuft eh regelmäßig)
    if (sendAt <= nowBerlin || sendAt > windowEnd) continue;

    const key = `prayer_${p.name}_${sendAt.toISOString().slice(0, 16)}`;

    const ok = await scheduleOnce(
      key,
      sendAt,
      "prayer",
      () => sendOneSignal(`Bald ist ${p.name} 🕌`, `In 25 Minuten ist Gebet (${p.time}).`, sendAt, logs),
      logs
    );

    if (ok) planned++;
  }

  logs.push(`✅ prayer planned: ${planned}`);
  return planned;
}

async function planFixedTimes(
  type: "zikr" | "khutba",
  times: string[],
  nowBerlin: Date,
  windowEnd: Date,
  logs: string[]
) {
  logs.push(`🔎 check ${type}: ${times.join(", ")} | window ${nowBerlin.toLocaleTimeString("de-DE")} - ${windowEnd.toLocaleTimeString("de-DE")}`);

  let planned = 0;

  for (const t of times) {
    const sendAt = berlinTodayAt(t, nowBerlin);
    sendAt.setSeconds(0); sendAt.setMilliseconds(0);

    // wenn heute vorbei -> morgen
    if (sendAt <= nowBerlin) sendAt.setDate(sendAt.getDate() + 1);

    if (sendAt > windowEnd) {
      logs.push(`⏭️ ${type} ${t} -> ${sendAt.toLocaleString("de-DE")} (out of window)`);
      continue;
    }

    const key = `${type}_${sendAt.toISOString().slice(0, 16)}`;

    const ok = await scheduleOnce(
      key,
      sendAt,
      type,
      () => {
        if (type === "zikr") {
          return sendOneSignal("Zikr Erinnerung 📿", "Denke an Allah – nimm dir 2 Minuten für Zikr.", sendAt, logs);
        }
        return sendOneSignal("Khutba Erinnerung 🕌", "Heute 12:30 Khutba – bitte rechtzeitig vorbereiten.", sendAt, logs);
      },
      logs
    );

    if (ok) planned++;
  }

  logs.push(`✅ ${type} planned: ${planned}`);
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
  const { data: existing } = await supabase
    .from("scheduled_pushes")
    .select("job_key")
    .eq("job_key", job_key)
    .maybeSingle();

  if (existing) {
    logs.push(`↩️ skip (exists): ${job_key}`);
    return false;
  }

  const { error: insErr } = await supabase
    .from("scheduled_pushes")
    .insert({ job_key, send_at: send_at.toISOString(), type });

  if (insErr) {
    logs.push(`⚠️ insert failed: ${job_key} | ${insErr.message}`);
    return false;
  }

  const ok = await work();

  // ✅ rollback, wenn OneSignal nicht klappt
  if (!ok) {
    await supabase.from("scheduled_pushes").delete().eq("job_key", job_key);
    logs.push(`🧹 rollback: ${job_key}`);
    return false;
  }

  logs.push(`✅ scheduled: ${job_key}`);
  return true;
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
  logs.push(`📨 OneSignal ${resp.status} ${resp.ok ? "OK" : "FAIL"} | ${txt.slice(0, 180)}`);
  return resp.ok;
}