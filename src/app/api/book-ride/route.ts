import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendPushToUser } from '@/lib/webpush';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  try {
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const bodyData = await request.json();
    const { ride_id, passenger_id, passenger_name, passenger_phone, pickup_lat, pickup_lon } = bodyData;

    if (passenger_id !== userData.user.id) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    // Buchung speichern
    const { error: dbError } = await supabase.from('bookings').insert({
      ride_id, passenger_id, passenger_name, passenger_phone, pickup_lat, pickup_lon, status: 'accepted'
    });

    if (dbError) throw new Error("DB Fehler: " + dbError.message);

    // Fahrer-ID holen und Push senden
    const { data: ride } = await supabase
      .from('rides')
      .select('driver_id')
      .eq('id', ride_id)
      .single();

    if (ride?.driver_id) {
      await sendPushToUser(ride.driver_id, {
        title: "Neuer Mitfahrer! 🙋‍♂️",
        body: `${passenger_name} hat gebucht.`,
        url: "https://ride2salah.vercel.app/driver/dashboard",
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
