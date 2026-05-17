import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendPushToGender } from "@/lib/webpush";

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

    // Include the main admin (identified by ADMIN_EMAIL) regardless of gender filter
    const adminEmail = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "").toLowerCase().trim();
    let adminUserIds: string[] = [];
    if (adminEmail) {
      const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
      const adminUser = users?.find((u) => u.email?.toLowerCase() === adminEmail);
      if (adminUser) adminUserIds.push(adminUser.id);
    }

    await sendPushToGender(
      gender,
      {
        title: `🚗 Fahrt zum ${prayerLabel}-Gebet`,
        body: `${name} bietet eine Fahrt an — ${seatText}. Jetzt buchen!`,
        url: "/",
      },
      adminUserIds
    );

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "server_error" }, { status: 500 });
  }
}
