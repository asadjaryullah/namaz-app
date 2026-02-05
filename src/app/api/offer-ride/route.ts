import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Server-only Supabase (Service Role!)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const APP_ID =
  process.env.ONESIGNAL_APP_ID || "595fdd83-68b2-498a-8ca6-66fd1ae7be8e";
const OS_KEY = process.env.ONESIGNAL_REST_API_KEY!;

// Optionaler Schutz (kannst du setzen, musst du nicht)
// Wenn gesetzt, muss der Client secret mitsenden.
const OFFER_RIDE_SECRET = process.env.OFFER_RIDE_SECRET || "";

// prayer_id -> schöner Name
const PRAYER_LABEL: Record<string, string> = {
  fajr: "Fajr",
  dhuhr: "Dhuhr",
  asr: "Asr",
  maghrib: "Maghrib",
  isha: "Isha",
  jummah: "Jummah",
};

type OfferRideBody = {
  secret?: string;

  driver_id: string;
  driver_phone?: string | null;

  prayer_id: string; // z.B. "fajr"
  ride_date: string; // ISO string

  // optional je nach deinem Schema
  seats_available?: number | null;

  // falls du Start/Ort Felder hast:
  pickup_location?: string | null;
  destination?: string | null;
};

export async function POST(req: Request) {
  const logs: string[] = [];

  try {
    const body = (await req.json().catch(() => ({}))) as OfferRideBody;

    // Optionaler Secret Check (nur wenn OFFER_RIDE_SECRET gesetzt ist)
    if (OFFER_RIDE_SECRET) {
      if (!body.secret || body.secret !== OFFER_RIDE_SECRET) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
      }
    }

    const { driver_id, prayer_id, ride_date } = body;

    if (!driver_id || !prayer_id || !ride_date) {
      return NextResponse.json(
        { error: "driver_id, prayer_id, ride_date erforderlich" },
        { status: 400 }
      );
    }

    // 1) Ride speichern
    // ⚠️ Passe die Felder unten an DEIN rides-Schema an.
    // Ich sehe bei dir: driver_phone, prayer_id existiert.
    const insertPayload: any = {
      driver_id,
      driver_phone: body.driver_phone ?? null,
      prayer_id,
      ride_date: new Date(ride_date).toISOString(),
      seats_available:
        typeof body.seats_available === "number" ? body.seats_available : null,

      // optional, nur wenn deine Tabelle diese Spalten hat:
      pickup_location: body.pickup_location ?? null,
      destination: body.destination ?? null,
      status: "open",
    };

    // Falls deine rides Tabelle manche Spalten NICHT hat,
    // wirft Supabase einen Fehler. Dann entferne die Zeilen.
    const { data: newRide, error: rideErr } = await supabaseAdmin
      .from("rides")
      .insert(insertPayload)
      .select("*")
      .single();

    if (rideErr) {
      return NextResponse.json(
        { error: "ride_insert_failed", detail: rideErr.message, logs },
        { status: 500 }
      );
    }

    // 2) Fahrername holen
    const { data: profile, error: profErr } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("id", driver_id)
      .maybeSingle();

    if (profErr) logs.push("profile fetch error: " + profErr.message);

    const driverName = (profile?.full_name || "").trim() || "Ein Fahrer";
    const prayerLabel = PRAYER_LABEL[prayer_id] || prayer_id;

    // 3) Push an alle
    const title = `Neue Fahrt für ${prayerLabel} 🚗🕌`;
    const message = `${driverName} bietet eine Fahrt zum ${prayerLabel}-Gebet an. Jetzt Platz sichern!`;

    const pushOk = await sendOneSignal(title, message, newRide?.id, logs);

    return NextResponse.json({
      success: true,
      ride_id: newRide.id,
      push_sent: pushOk,
      logs,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "server_error" },
      { status: 500 }
    );
  }
}

async function sendOneSignal(
  title: string,
  message: string,
  rideId: string,
  logs: string[]
) {
  if (!OS_KEY) {
    logs.push("ONESIGNAL_REST_API_KEY fehlt");
    return false;
  }

  const payload: any = {
    app_id: APP_ID,
    headings: { de: title, en: title },
    contents: { de: message, en: message },

    // ✅ nur aktive Abonnenten
    included_segments: ["Subscribed Users"],

    // Link in die App (optional)
    url: rideId
      ? `https://ride2salah.vercel.app/rides/${rideId}`
      : "https://ride2salah.vercel.app",
  };

  const resp = await fetch("https://onesignal.com/api/v1/notifications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Accept: "application/json",
      Authorization: `Basic ${OS_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  const raw = await resp.text();
  logs.push(`OneSignal status=${resp.status} body=${raw.slice(0, 200)}`);

  // OneSignal kann 200 liefern aber errors enthalten
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.errors?.length) {
      logs.push("OneSignal errors: " + JSON.stringify(parsed.errors));
      return false;
    }
  } catch {
    // ignore
  }

  return resp.ok;
}
