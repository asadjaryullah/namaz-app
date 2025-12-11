import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const ONESIGNAL_APP_ID = "595fdd83-68b2-498a-8ca6-66fd1ae7be8e";
const ONESIGNAL_API_KEY = process.env.ONESIGNAL_REST_API_KEY;

export async function POST(request: Request) {
  try {
    // 1. CHECK: Ist der Key überhaupt da?
    if (!ONESIGNAL_API_KEY) {
      console.error("❌ CRITICAL: ONESIGNAL_REST_API_KEY fehlt in Vercel!");
      return NextResponse.json({ error: 'Server Key fehlt' }, { status: 500 });
    }

    const bodyData = await request.json();
    const { ride_id, passenger_id, passenger_name, passenger_phone, pickup_lat, pickup_lon } = bodyData;

    console.log(`🚀 Start Buchung: ${passenger_name} bucht bei Fahrt ${ride_id}`);

    // --- DB Speichern ---
    const { error: dbError } = await supabase.from('bookings').insert({
      ride_id, passenger_id, passenger_name, passenger_phone, pickup_lat, pickup_lon, status: 'accepted'
    });

    if (dbError) throw new Error("DB Fehler: " + dbError.message);

    // --- Fahrer finden ---
    const { data: ride } = await supabase
      .from('rides')
      .select('driver_id')
      .eq('id', ride_id)
      .single();

    if (ride && ride.driver_id) {
      console.log(`📨 Versuche Push an Fahrer-ID: ${ride.driver_id}`);
      
      const pushBody = {
        app_id: ONESIGNAL_APP_ID,
        headings: { en: "Neuer Mitfahrer! 🙋‍♂️" },
        contents: { en: `${passenger_name} hat gebucht.` },
        // WICHTIG: Wir senden an die External ID (Supabase ID)
        include_aliases: { external_id: [ride.driver_id] }, 
        target_channel: "push",
        url: "https://ride2salah.vercel.app/driver/dashboard"
      };

      // --- DER CALL AN ONESIGNAL ---
      const response = await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${ONESIGNAL_API_KEY}`
        },
        body: JSON.stringify(pushBody)
      });

      const responseData = await response.json();
      
      // 👇 DAS HIER ZEIGT UNS DIE WAHRHEIT IN VERCEL:
      console.log("📬 OneSignal Status:", response.status);
      console.log("📬 OneSignal Antwort:", JSON.stringify(responseData));

      if (responseData.errors) {
        console.error("❌ OneSignal Fehler:", responseData.errors);
      }
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("🔥 Server Crash:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}