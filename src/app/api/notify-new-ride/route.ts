import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendPushToGender, sendPushToUser } from "@/lib/webpush";
import { isMainAdmin, hasAdminConfigured } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PRAYER_LABEL: Record<string, string> = {
  fajr: "Fajr", dhuhr: "Dhuhr", asr: "Asr", maghrib: "Maghrib", isha: "Isha", jummah: "Jumu'ah",
};

export async function POST(req: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { prayer_id, driver_name, seats, driver_gender } = await req.json().catch(() => ({}));
    const gender = driver_gender || "male";
    const prayerLabel = PRAYER_LABEL[prayer_id] || prayer_id || "Gebet";
    const name = (driver_name || "Ein Fahrer").trim();
    const seatText = seats && seats > 1 ? `${seats} freie Plätze` : "1 freier Platz";

    const logs: string[] = [];

    /* Den Hauptadmin zusätzlich benachrichtigen, unabhängig vom Geschlecht.
       Eigener try/catch: Schlägt der Admin-Lookup fehl, warf das Destructuring
       von `data` bisher einen TypeError. Der landete im äußeren catch und die
       Route gab 500 zurück — ohne dass je ein Push verschickt wurde, obwohl
       der Admin-Teil nur Beiwerk ist. */
    const adminUserIds: string[] = [];
    if (hasAdminConfigured()) {
      try {
        const { data, error: listErr } = await supabase.auth.admin.listUsers({ perPage: 1000 });
        if (listErr) {
          logs.push(`⚠️ Admin-Lookup: ${listErr.message}`);
        } else {
          const adminUser = data?.users?.find((u) => isMainAdmin(u.email));
          if (adminUser) adminUserIds.push(adminUser.id);
        }
      } catch (e: any) {
        logs.push(`⚠️ Admin-Lookup fehlgeschlagen: ${e?.message || "unbekannt"}`);
      }
    }

    // Der Fahrer selbst braucht kein "fahr mit" für die eigene Fahrt
    const sentToGroup = await sendPushToGender(
      gender,
      {
        title: `🚗 ${name} fährt zum ${prayerLabel}`,
        body: `${seatText} — jetzt mitfahren!`,
        url: `/passenger/list?prayer=${prayer_id}`,
      },
      adminUserIds,
      logs,
      [userData.user.id]
    );

    // Notify waiting passengers personally
    const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' });
    const { data: waitingReqs } = await supabase.from('ride_requests')
      .select('user_id').eq('prayer_id', prayer_id).eq('request_date', todayStr).eq('status', 'waiting');
    let sentToWaiting = 0;
    if (waitingReqs && waitingReqs.length > 0) {
      for (const waitingReq of waitingReqs) {
        if (waitingReq.user_id === userData.user.id) continue;
        sentToWaiting += await sendPushToUser(waitingReq.user_id, {
          title: `🚗 Alhamdulillah! Fahrt zum ${prayerLabel}!`,
          body: `${name} fährt — jetzt Platz sichern!`,
          url: `/passenger/list?prayer=${prayer_id}`,
        }, logs);
      }
    }

    // Zahlen zurückgeben, damit der Aufrufer merkt wenn niemand erreicht wurde
    return NextResponse.json({
      success: true,
      sent: sentToGroup + sentToWaiting,
      sentToGroup,
      sentToWaiting,
      logs,
    });
  } catch (e: any) {
    console.error("notify-new-ride:", e?.message);
    return NextResponse.json({ error: e?.message || "server_error" }, { status: 500 });
  }
}
