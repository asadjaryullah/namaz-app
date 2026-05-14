import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendPushToAll } from "@/lib/webpush";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PRAYER_LABEL: Record<string, string> = {
  fajr: "Fajr", dhuhr: "Dhuhr", asr: "Asr", maghrib: "Maghrib", isha: "Isha", jummah: "Jummah",
};

type OfferRideBody = {
  driver_id: string;
  driver_phone?: string | null;
  prayer_id: string;
  ride_date: string;
  seats_available?: number | null;
  pickup_location?: string | null;
  destination?: string | null;
};

export async function POST(req: Request) {
  const logs: string[] = [];

  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const body = (await req.json().catch(() => ({}))) as OfferRideBody;
    const { driver_id, prayer_id, ride_date } = body;

    if (driver_id !== userData.user.id) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    if (!driver_id || !prayer_id || !ride_date) {
      return NextResponse.json({ error: "driver_id, prayer_id, ride_date erforderlich" }, { status: 400 });
    }

    // Ride speichern
    const { data: newRide, error: rideErr } = await supabaseAdmin
      .from("rides")
      .insert({
        driver_id,
        driver_phone: body.driver_phone ?? null,
        prayer_id,
        ride_date: new Date(ride_date).toISOString(),
        seats_available: typeof body.seats_available === "number" ? body.seats_available : null,
        pickup_location: body.pickup_location ?? null,
        destination: body.destination ?? null,
        status: "open",
      })
      .select("*")
      .single();

    if (rideErr) {
      return NextResponse.json({ error: "ride_insert_failed", detail: rideErr.message }, { status: 500 });
    }

    // Fahrername holen
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("id", driver_id)
      .maybeSingle();

    const driverName = (profile?.full_name || "").trim() || "Ein Fahrer";
    const prayerLabel = PRAYER_LABEL[prayer_id] || prayer_id;

    // Push an alle Subscriber
    const pushCount = await sendPushToAll({
      title: `Neue Fahrt für ${prayerLabel} 🚗🕌`,
      body: `${driverName} bietet eine Fahrt zum ${prayerLabel}-Gebet an. Jetzt Platz sichern!`,
      url: `https://ride2salah.vercel.app/rides/${newRide?.id}`,
    }, logs);

    return NextResponse.json({ success: true, ride_id: newRide.id, push_sent: pushCount, logs });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "server_error" }, { status: 500 });
  }
}
