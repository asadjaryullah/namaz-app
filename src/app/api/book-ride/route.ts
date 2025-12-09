import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const ONESIGNAL_APP_ID = "595fdd83-68b2-498a-8ca6-66fd1ae7be8e"; // Deine ID
const ONESIGNAL_API_KEY = process.env.ONESIGNAL_REST_API_KEY;

export async function POST(request: Request) {
  try {
    const { ride_id, passenger_id, passenger_name, passenger_phone, pickup_lat, pickup_lon } = await request.json();

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

    if (dbError) throw new Error(dbError.message);

    // 2. Fahrer-ID herausfinden (wem gehört die Fahrt?)
    const { data: ride } = await supabase
      .from('rides')
      .select('driver_id')
      .eq('id', ride_id)
      .single();

    if (ride && ride.driver_id) {
      // 3. ECHTE Push-Nachricht an den Fahrer senden (Targeting via User ID)
      await sendPushToDriver(ride.driver_id, passenger_name);
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function sendPushToDriver(driverId: string, passengerName: string) {
  if (!ONESIGNAL_API_KEY) return;

  const body = {
    app_id: ONESIGNAL_APP_ID,
    headings: { en: "Neuer Mitfahrer! 🙋‍♂️" },
    contents: { en: `${passengerName} hat gerade gebucht und wartet.` },
    include_aliases: { external_id: [driverId] }, // <--- Das ist der Trick! Sendet nur an diesen User.
    target_channel: "push",
    url: "https://ride2salah.vercel.app/driver/dashboard" // Klick öffnet Dashboard
  };

  await fetch('https://onesignal.com/api/v1/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${ONESIGNAL_API_KEY}`
    },
    body: JSON.stringify(body)
  });
}