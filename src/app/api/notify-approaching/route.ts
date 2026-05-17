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

    const { ride_id, passenger_id, driver_name } = await request.json();

    // Verify the caller is the driver of this ride
    const { data: ride } = await supabase
      .from('rides')
      .select('driver_id')
      .eq('id', ride_id)
      .single();

    if (!ride || ride.driver_id !== userData.user.id) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    await sendPushToUser(passenger_id, {
      title: `${driver_name || 'Dein Fahrer'} ist gleich da! 🚗`,
      body: 'Ca. 2 Minuten — bitte rausgehen!',
      url: `/passenger/dashboard?rideId=${ride_id}`,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
