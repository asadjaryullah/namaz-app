import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// --- Supabase (Service Role nötig, weil Cron/Server) ---
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// --- OneSignal + Cron Secret ---
const APP_ID =
  process.env.ONESIGNAL_APP_ID || "595fdd83-68b2-498a-8ca6-66fd1ae7be8e";
const OS_KEY = process.env.ONESIGNAL_REST_API_KEY!;
const SECRET = process.env.CRON_SECRET!;

// --- Zeit / Fenster ---
const TZ = "Europe/Berlin";

// Cron läuft alle 5 Minuten → wir erlauben etwas Jitter
const LOOKAHEAD_MIN = 8;
const LOOKBACK_MIN = 8;

// Gebets-Reminder: 25 Minuten vorher
const PRAYER_OFFSET_MIN = 25;

// Zikr: 08 / 12 / 16 / 20
const ZIKR_TIMES = ["08:00", "12:00", "16:00", "20:00"];

// Jummah/Khutba: Freitag 12:30
const KHUTBA_TIME = "12:30";

export async function GET(req: Request) {
  const logs: string[] = [];

  try {
    const url = new URL(req.url);

    // 0) Secret-Check
    if (!SECRET || url.searchParams.get("secret") !== SECRET) {
      return NextResponse.json(
        { success: false, error: "unauthorized" },
        { status: 401 }
      );
    }

    const debug = url.searchParams.get("debug") === "1";
    const force = url.searchParams.get("force") === "1";
    const simulateAt = url.searchParams.get("at"); // "HH:MM" optional

    // 1) Berlin Zeit "YYYY-MM-DD HH:mm:ss"
    const now = new Date();
    const nowBerlinStr = now.toLocaleString("sv-SE", { timeZone: TZ });
    const today = nowBerlinStr.slice(0, 10);
    let nowHHMM = nowBerlinStr.slice(11, 16);

    if (simulateAt && /^\d{2}:\d{2}$/.test(simulateAt)) {
      nowHHMM = simulateAt;
      logs.push(`🧪 simulate at=${simulateAt} (Berlin Datum bleibt: ${today})`);
    }

    logs.push(`🕒 Berlin: ${today} ${nowHHMM}`);
    logs.push(`🪟 Window: -${LOOKBACK_MIN}min .. +${LOOKAHEAD_MIN}min`);
    logs.push(`⏱️ Prayer offset: ${PRAYER_OFFSET_MIN}min`);

    // 2) Force Test: sofort pushen (ohne push_sent)
    if (force) {
      logs.push("🧪 force=1 → sende Test Push sofort");
      const ok = await sendOneSignal(
        "Test Push ✅",
        `Force=1 hat ausgelöst (${today} ${nowHHMM}).`,
        logs
      );
      return NextResponse.json({ success: ok, sent: ok ? 1 : 0, logs });
    }

    let sent = 0;

    // 3) Prayer pushes
    sent += await handlePrayerPushes(today, nowHHMM, logs, debug);

    // 4) Zikr pushes
    sent += await handleFixed(
      today,
      nowHHMM,
      ZIKR_TIMES,
      "zikr",
      logs,
      debug
    );

    // 5) Khutba nur Freitag
    const weekday = getBerlinWeekday(now, TZ); // 0=So, 5=Fr
    if (weekday === 5) {
      sent += await handleFixed(
        today,
        nowHHMM,
        [KHUTBA_TIME],
        "khutba",
        logs,
        debug
      );
    } else if (debug) {
      logs.push(`ℹ️ Kein Freitag (weekday=${weekday}) → Khutba wird übersprungen`);
    }

    return NextResponse.json({ success: true, sent, logs });
  } catch (e: any) {
    logs.push("💥 " + (e?.message || String(e)));
    return NextResponse.json({ success: false, logs }, { status: 500 });
  }
}

async function handlePrayerPushes(
  today: string,
  nowHHMM: string,
  logs: string[],
  debug: boolean
) {
  const { data: prayers, error } = await supabase
    .from("prayer_times")
    .select("name,time,sort_order")
    .order("sort_order", { ascending: true });

  if (error) throw error;

  if (!prayers?.length) {
    logs.push("⚠️ keine prayer_times gefunden");
    return 0;
  }

  let sent = 0;

  for (const p of prayers) {
    if (!p.time) {
      if (debug) logs.push(`⏭️ ${p.name}: keine time`);
      continue;
    }

    const trigger = minusMinutesHHMM(p.time, PRAYER_OFFSET_MIN); // HH:MM
    const inWindow = isWithinWindow(nowHHMM, trigger, LOOKBACK_MIN, LOOKAHEAD_MIN);

    if (debug) {
      logs.push(
        `🕌 ${p.name}: time=${p.time} trigger=${trigger} | now=${nowHHMM} | inWindow=${inWindow}`
      );
    }

    if (!inWindow) continue;

    const key = `prayer:${today}:${p.name}:${trigger}`;

    const ok = await sendOnce(
      key,
      async () =>
        sendOneSignal(
          `Bald ist ${p.name} 🕌`,
          `In ${PRAYER_OFFSET_MIN} Minuten ist Gebet (${p.time}).`,
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

    if (debug) {
      logs.push(`⏰ ${type}: target=${t} now=${nowHHMM} | inWindow=${inWindow}`);
    }

    if (!inWindow) continue;

    const key = `${type}:${today}:${t}`;

    const ok = await sendOnce(
      key,
      async () => {
        if (type === "zikr") {
          return sendOneSignal(
            "Zikr Erinnerung 📿",
            "Denke an Allah – nimm dir 2 Minuten für Zikr.",
            logs
          );
        }
        return sendOneSignal(
          "Jummah Erinnerung 🕌",
          "Heute 12:30 Jummah – bitte rechtzeitig vorbereiten.",
          logs
        );
      },
      logs,
      debug
    );

    if (ok) sent++;
  }

  return sent;
}

async function sendOnce(
  key: string,
  work: () => Promise<boolean>,
  logs: string[],
  debug: boolean
) {
  // schon gesendet?
  const { data: existing, error: selErr } = await supabase
    .from("push_sent")
    .select("key")
    .eq("key", key)
    .maybeSingle();

  if (selErr) logs.push(`⚠️ push_sent select error: ${selErr.message}`);

  if (existing) {
    if (debug) logs.push(`↩️ skip already sent: ${key}`);
    return false;
  }

  const ok = await work();
  if (!ok) {
    logs.push(`❌ send failed: ${key}`);
    return false;
  }

  const { error: insErr } = await supabase.from("push_sent").insert({ key });
  if (insErr) logs.push(`⚠️ push_sent insert failed: ${insErr.message}`);

  logs.push(`✅ sent: ${key}`);
  return true;
}

async function sendOneSignal(title: string, message: string, logs: string[]) {
  if (!OS_KEY) {
    logs.push("❌ ONESIGNAL_REST_API_KEY fehlt");
    return false;
  }

  const body = {
    app_id: APP_ID,
    headings: { de: title, en: title },
    contents: { de: message, en: message },
    included_segments: ["Subscribed Users"], // ✅ korrekt
    url: "https://ride2salah.vercel.app",
  };

  const resp = await fetch("https://onesignal.com/api/v1/notifications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Accept: "application/json",
      Authorization: `Basic ${OS_KEY}`,
    },
    body: JSON.stringify(body),
  });

  const text = await resp.text();

  // OneSignal liefert manchmal 200, aber mit errors[] → das ist KEIN Erfolg
  let parsed: any = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    // ignore
  }

  const hasErrors =
    parsed && (Array.isArray(parsed.errors) && parsed.errors.length > 0);

  const ok = resp.ok && !hasErrors;

  logs.push(
    `📨 OneSignal ${resp.status} ${ok ? "OK" : "FAIL"} | ${text.slice(0, 220)}`
  );

  return ok;
}

// -------- helpers --------

function minusMinutesHHMM(hhmm: string, minutes: number) {
  const [h, m] = hhmm.split(":").map(Number);
  let total = h * 60 + m - minutes;
  while (total < 0) total += 24 * 60;
  const hh = String(Math.floor(total / 60) % 24).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

// Fensterprüfung: Lookback + Lookahead (robust gegen Cron-Jitter, inkl. Mitternacht)
function isWithinWindow(
  nowHHMM: string,
  targetHHMM: string,
  backMin: number,
  aheadMin: number
) {
  const toMin = (s: string) => {
    const [h, m] = s.split(":").map(Number);
    return h * 60 + m;
  };

  const now = toMin(nowHHMM);
  const target = toMin(targetHHMM);

  // diff in Minuten im Bereich [-720..+720] mit Mitternacht-Handling
  let diff = target - now;
  if (diff > 12 * 60) diff -= 24 * 60;
  if (diff < -12 * 60) diff += 24 * 60;

  return diff >= -backMin && diff <= aheadMin;
}

// 0=Sonntag .. 6=Samstag (Berlin)
function getBerlinWeekday(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).formatToParts(date);

  const wd = parts.find((p) => p.type === "weekday")?.value || "Sun";
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[wd] ?? 0;
}