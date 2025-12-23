import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const APP_ID = process.env.ONESIGNAL_APP_ID || "595fdd83-68b2-498a-8ca6-66fd1ae7be8e";
const OS_KEY = process.env.ONESIGNAL_REST_API_KEY!;
const SECRET = process.env.CRON_SECRET!;

const TZ = "Europe/Berlin";
const LOOKAHEAD_MIN = 5; // Cron läuft alle 5 Minuten → prüfen wir die nächsten 5 Minuten

export async function GET(req: Request) {
  const logs: string[] = [];
  try {
    const url = new URL(req.url);
    if (url.searchParams.get("secret") !== SECRET) {
      return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 });
    }

    // "Berlin now" als String-basiert fürs Vergleichen (HH:MM)
    const now = new Date();
    const nowBerlinStr = now.toLocaleString("sv-SE", { timeZone: TZ }); // "YYYY-MM-DD HH:mm:ss"
    const today = nowBerlinStr.slice(0, 10); // YYYY-MM-DD
    const nowHHMM = nowBerlinStr.slice(11, 16); // HH:MM
    logs.push(`🕒 Berlin: ${nowBerlinStr}`);

    let sent = 0;

    // 1) NAMAZ: 25 min vor Gebetszeit
    sent += await handlePrayerPushes(today, nowHHMM, logs);

    // 2) ZIKR: alle 4 Stunden 08,12,16,20 (nur tagsüber)
    sent += await handleFixed(today, nowHHMM, ["08:00", "12:00", "16:00", "20:00"], "zikr", logs);

    // 3) KHUTBA: 12:30
    sent += await handleFixed(today, nowHHMM, ["12:30"], "khutba", logs);

    return NextResponse.json({ success: true, sent, logs });
  } catch (e: any) {
    logs.push("💥 " + (e?.message || String(e)));
    return NextResponse.json({ success: false, logs }, { status: 500 });
  }
}

async function handlePrayerPushes(today: string, nowHHMM: string, logs: string[]) {
  const { data: prayers, error } = await supabase
    .from("prayer_times")
    .select("name,time")
    .order("sort_order", { ascending: true });

  if (error) throw error;
  if (!prayers?.length) return 0;

  let sent = 0;

  for (const p of prayers) {
    if (!p.time) continue;

    const trigger = minusMinutesHHMM(p.time, 25); // HH:MM
    if (!isWithinNextMinutes(nowHHMM, trigger, LOOKAHEAD_MIN)) continue;

    const key = `prayer:${today}:${p.name}:${trigger}`;
    const ok = await sendOnce(key, async () => {
      return sendOneSignal(
        `Bald ist ${p.name} 🕌`,
        `In 25 Minuten ist Gebet (${p.time}).`,
        logs
      );
    }, logs);

    if (ok) sent++;
  }

  return sent;
}

async function handleFixed(
  today: string,
  nowHHMM: string,
  times: string[],
  type: "zikr" | "khutba",
  logs: string[]
) {
  let sent = 0;

  for (const t of times) {
    if (!isWithinNextMinutes(nowHHMM, t, LOOKAHEAD_MIN)) continue;

    const key = `${type}:${today}:${t}`;
    const ok = await sendOnce(key, async () => {
      if (type === "zikr") {
        return sendOneSignal("Zikr Erinnerung 📿", "Denke an Allah – nimm dir 2 Minuten für Zikr.", logs);
      }
      return sendOneSignal("Khutba Erinnerung 🕌", "Heute 12:30 Khutba – bitte rechtzeitig vorbereiten.", logs);
    }, logs);

    if (ok) sent++;
  }

  return sent;
}

async function sendOnce(key: string, work: () => Promise<boolean>, logs: string[]) {
  const { data: existing } = await supabase.from("push_sent").select("key").eq("key", key).maybeSingle();
  if (existing) {
    logs.push(`↩️ skip already sent: ${key}`);
    return false;
  }

  const ok = await work();
  if (!ok) return false;

  const { error } = await supabase.from("push_sent").insert({ key });
  if (error) logs.push(`⚠️ push_sent insert failed: ${error.message}`);

  logs.push(`✅ sent: ${key}`);
  return true;
}

async function sendOneSignal(title: string, message: string, logs: string[]) {
  const body: any = {
    app_id: APP_ID,
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
      Authorization: `Basic ${OS_KEY}`,
    },
    body: JSON.stringify(body),
  });

  const txt = await resp.text();
  logs.push(`📨 OneSignal ${resp.status} ${resp.ok ? "OK" : "FAIL"} | ${txt.slice(0, 200)}`);
  return resp.ok;
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

function isWithinNextMinutes(nowHHMM: string, targetHHMM: string, windowMin: number) {
  const toMin = (s: string) => {
    const [h, m] = s.split(":").map(Number);
    return h * 60 + m;
  };
  const now = toMin(nowHHMM);
  const target = toMin(targetHHMM);

  // gleiche Tageslogik + Mitternacht wrap
  const diff = (target - now + 24 * 60) % (24 * 60);
  return diff >= 0 && diff < windowMin;
}