import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase Setup
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// OneSignal Setup
const ONESIGNAL_APP_ID = "595fdd83-68b2-498a-8ca6-66fd1ae7be8e";

// 👇 HIER DEINEN LANGEN SCHLÜSSEL (os_v2...) REINKOPIEREN:
const ONESIGNAL_API_KEY = "os_v2_app_lfp53a3iwjeyvdfgm36rvz56r35eoozxpvkexhfqpe3fzhuhrhvmhuvwtfr762obkxyfmkdda43palybfmvnlbyildzfnwm7xw3tewq"; 

export async function POST(request: Request) {
  try {
    // Daten vom Frontend empfangen
    const bodyData = await request.json();
    const { ride_id, passenger_id, passenger_name, passenger_phone, pickup_lat, pickup_lon } = bodyData;

    console.log("Start Buchung für:", passenger_name);

    // 1. Buchung in Supabase speichern
    const { error: dbError } = await supabase.from('bookings').insert({
      ride_id,
      passenger_id,
      passenger_name,
      passenger_phone,
      pickup_lat,
      pickup_lon,
      status: 'accepted'
    });

    if (dbError) {
      console.error("DB Fehler:", dbError);
      throw new Error("Datenbank Fehler: " + dbError.message);
    }

    // 2. Fahrer-ID herausfinden (wem gehört die Fahrt?)
    const { data: ride } = await supabase
      .from('rides')
      .select('driver_id')
      .eq('id', ride_id)
      .single();

    // 3. Push-Nachricht an den Fahrer senden
    if (ride && ride.driver_id) {
      console.log("Sende Push an Fahrer-ID:", ride.driver_id);
      
      const pushBody = {
        app_id: ONESIGNAL_APP_ID,
        headings: { en: "Neuer Mitfahrer! 🙋‍♂️" },
        contents: { en: `${passenger_name} hat gerade gebucht und wartet.` },
        include_aliases: { external_id: [ride.driver_id] }, // Sendet gezielt an den Fahrer
        target_channel: "push",
        url: "https://ride2salah.vercel.app/driver/dashboard"
      };

      const response = await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${ONESIGNAL_API_KEY}`
        },
        body: JSON.stringify(pushBody)
      });

      const responseData = await response.json();
      console.log("OneSignal Antwort:", responseData);
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}