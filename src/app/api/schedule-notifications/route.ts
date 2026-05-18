import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendPushToAll } from "@/lib/webpush";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const SECRET = process.env.CRON_SECRET!;
const TZ = "Europe/Berlin";

const LOOKAHEAD_MIN = 8;
const LOOKBACK_MIN = 8;
const PRAYER_OFFSET_MIN = 25;

const ZIKR_TIMES = ["08:00", "12:00", "16:00", "20:00"];
const KHUTBA_TIME = "12:30";

export async function GET(req: Request) {
  const logs: string[] = [];

  try {
    const url = new URL(req.url);

    if (!SECRET || url.searchParams.get("secret") !== SECRET) {
      return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 });
    }

    const debug = url.searchParams.get("debug") === "1";
    const force = url.searchParams.get("force") === "1";
    const simulateAt = url.searchParams.get("at");

    const now = new Date();
    const nowBerlinStr = now.toLocaleString("sv-SE", { timeZone: TZ });
    const today = nowBerlinStr.slice(0, 10);
    let nowHHMM = nowBerlinStr.slice(11, 16);

    if (simulateAt && /^\d{2}:\d{2}$/.test(simulateAt)) {
      nowHHMM = simulateAt;
      logs.push(`🧪 simulate at=${simulateAt}`);
    }

    logs.push(`🕒 Berlin: ${today} ${nowHHMM}`);

    if (force) {
      logs.push("🧪 force=1 → sende Test Push");
      const count = await sendPushToAll(
        { title: "Test Push ✅", body: `Force-Test (${today} ${nowHHMM}).`, url: "https://ride2salah.vercel.app" },
        logs
      );
      return NextResponse.json({ success: true, sent: count, logs });
    }

    let sent = 0;

    const type = url.searchParams.get("type");
    if (type === "evening") {
      sent += await handleEveningReminder(today, logs, debug);
      return NextResponse.json({ success: true, sent, logs });
    }

    sent += await handlePrayerPushes(today, nowHHMM, logs, debug);
    sent += await handleFixed(today, nowHHMM, ZIKR_TIMES, "zikr", logs, debug);

    const weekday = getBerlinWeekday(now, TZ);
    if (weekday === 5) {
      sent += await handleFixed(today, nowHHMM, [KHUTBA_TIME], "khutba", logs, debug);
    }

    return NextResponse.json({ success: true, sent, logs });
  } catch (e: any) {
    logs.push("💥 " + (e?.message || String(e)));
    return NextResponse.json({ success: false, logs }, { status: 500 });
  }
}

async function handlePrayerPushes(today: string, nowHHMM: string, logs: string[], debug: boolean) {
  const { data: prayers, error } = await getSupabase()
    .from("prayer_times")
    .select("name,time,sort_order")
    .order("sort_order", { ascending: true });

  if (error) throw error;
  if (!prayers?.length) { logs.push("⚠️ keine prayer_times"); return 0; }

  let sent = 0;

  for (const p of prayers) {
    if (!p.time) continue;

    const trigger = minusMinutesHHMM(p.time, PRAYER_OFFSET_MIN);
    const inWindow = isWithinWindow(nowHHMM, trigger, LOOKBACK_MIN, LOOKAHEAD_MIN);

    if (debug) logs.push(`🕌 ${p.name}: time=${p.time} trigger=${trigger} inWindow=${inWindow}`);
    if (!inWindow) continue;

    const key = `prayer:${today}:${p.name}:${trigger}`;
    const ok = await sendOnce(
      key,
      () => sendPushToAll(
        { title: `Bald ist ${p.name} 🕌`, body: `In ${PRAYER_OFFSET_MIN} Minuten ist Gebet (${p.time}).`, url: "https://ride2salah.vercel.app" },
        logs
      ),
      logs,
      debug
    );
    if (ok) sent++;
  }

  return sent;
}

async function handleFixed(
  today: string,
  nowHHMM: string,
  times: string[],
  type: "zikr" | "khutba",
  logs: string[],
  debug: boolean
) {
  let sent = 0;

  for (const t of times) {
    const inWindow = isWithinWindow(nowHHMM, t, LOOKBACK_MIN, LOOKAHEAD_MIN);
    if (debug) logs.push(`⏰ ${type}: target=${t} inWindow=${inWindow}`);
    if (!inWindow) continue;

    const key = `${type}:${today}:${t}`;
    const payload =
      type === "zikr"
        ? { title: "Zikr Erinnerung 📿", body: "Denke an Allah – nimm dir 2 Minuten für Zikr.", url: "https://ride2salah.vercel.app" }
        : { title: "Jummah Erinnerung 🕌", body: "Heute 12:30 Jummah – bitte rechtzeitig vorbereiten.", url: "https://ride2salah.vercel.app" };

    const ok = await sendOnce(key, () => sendPushToAll(payload, logs), logs, debug);
    if (ok) sent++;
  }

  return sent;
}

async function sendOnce(
  key: string,
  work: () => Promise<number>,
  logs: string[],
  debug: boolean
) {
  const { data: existing } = await getSupabase()
    .from("push_sent")
    .select("key")
    .eq("key", key)
    .maybeSingle();

  if (existing) {
    if (debug) logs.push(`↩️ skip: ${key}`);
    return false;
  }

  const count = await work();
  if (count === 0 && !debug) {
    logs.push(`⚠️ Kein Subscriber erreichbar: ${key}`);
  }

  await getSupabase().from("push_sent").insert({ key });
  logs.push(`✅ sent (${count} subscriber): ${key}`);
  return true;
}

function minusMinutesHHMM(hhmm: string, minutes: number) {
  const [h, m] = hhmm.split(":").map(Number);
  let total = h * 60 + m - minutes;
  while (total < 0) total += 24 * 60;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function isWithinWindow(nowHHMM: string, targetHHMM: string, backMin: number, aheadMin: number) {
  const toMin = (s: string) => { const [h, m] = s.split(":").map(Number); return h * 60 + m; };
  let diff = toMin(targetHHMM) - toMin(nowHHMM);
  if (diff > 12 * 60) diff -= 24 * 60;
  if (diff < -12 * 60) diff += 24 * 60;
  return diff >= -backMin && diff <= aheadMin;
}

async function handleEveningReminder(today: string, logs: string[], debug: boolean) {
  const { data: fajr } = await getSupabase()
    .from("prayer_times")
    .select("name,time")
    .eq("id", "fajr")
    .single();

  if (!fajr) { logs.push("⚠️ kein Fajr in prayer_times"); return 0; }

  const key = `evening:fajr:${today}`;
  const ok = await sendOnce(
    key,
    () => sendPushToAll(
      {
        title: "Morgen früh ist Fajr 🌙",
        body: `Fajr um ${fajr.time} Uhr — Wer kommt morgen mit zur Moschee?`,
        url: "https://ride2salah.vercel.app",
      },
      logs
    ),
    logs,
    debug
  );
  return ok ? 1 : 0;
}

function getBerlinWeekday(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).formatToParts(date);
  const wd = parts.find((p) => p.type === "weekday")?.value || "Sun";
  return { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[wd] ?? 0;
}
