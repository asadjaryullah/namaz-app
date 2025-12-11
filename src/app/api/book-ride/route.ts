import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase Setup
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 1. App ID (Darf im Code stehen)
const ONESIGNAL_APP_ID = "595fdd83-68b2-498a-8ca6-66fd1ae7be8e";

// 2. Secret Key (Wird sicher aus dem Tresor geholt)
const ONESIGNAL_API_KEY = process.env.ONESIGNAL_REST_API_KEY;

export async function POST(request: Request) {
  try {
    // Sicherheits-Check: Ist der Key da?
    if (!ONESIGNAL_API_KEY) {
      console.error("CRITICAL: ONESIGNAL_REST_API_KEY fehlt in den Environment Variables!");
      return NextResponse.json({ error: 'Server Konfiguration fehlt' }, { status: 500 });
    }

    const bodyData = await request.json();
    const { ride_id, passenger_id, passenger_name, passenger_phone, pickup_lat, pickup_lon } = bodyData;

    console.log("Start Buchung für:", passenger_name);

    // A) Buchung in Supabase speichern
    const { error: dbError } = await supabase.from('bookings').insert({
      ride_id,
      passenger_id,
      passenger_name,
      passenger_phone,
      pickup_lat,
      pickup_lon,
      status: 'accepted'
    });

    if (dbError) throw new Error("DB Fehler: " + dbError.message);

    // B) Fahrer finden
    const { data: ride } = await supabase
      .from('rides')
      .select('driver_id')
      .eq('id', ride_id)
      .single();

    // C) Push-Nachricht senden
    if (ride && ride.driver_id) {
      console.log("Sende Push an Fahrer:", ride.driver_id);
      
      const pushBody = {
        app_id: ONESIGNAL_APP_ID,
        headings: { en: "Neuer Mitfahrer! 🙋‍♂️" },
        contents: { en: `${passenger_name} hat gerade gebucht.` },
        include_aliases: { external_id: [ride.driver_id] }, // Ziel: Fahrer ID
        target_channel: "push",
        url: "https://ride2salah.vercel.app/driver/dashboard"
      };

      const response = await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${ONESIGNAL_API_KEY}` // Hier wird der Key benutzt
        },
        body: JSON.stringify(pushBody)
      });

      const responseData = await response.json();
      console.log("OneSignal Status:", response.status, responseData);
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}