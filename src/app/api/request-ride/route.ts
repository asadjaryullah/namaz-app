import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendPushToAll } from '@/lib/webpush';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PRAYER_LABEL: Record<string, string> = {
  fajr: 'Fajr', dhuhr: 'Dhuhr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Isha', jummah: "Jumu'ah",
};

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function getAuth(request: Request) {
  const authHeader = request.headers.get('authorization') || '';
  return authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
}

export async function GET(request: Request) {
  const supabase = getSupabase();
  const url = new URL(request.url);
  const prayer_id = url.searchParams.get('prayer_id') || '';
  const date = url.searchParams.get('date') || new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' });

  const { count } = await supabase
    .from('ride_requests')
    .select('*', { count: 'exact', head: true })
    .eq('prayer_id', prayer_id)
    .eq('request_date', date)
    .eq('status', 'waiting');

  let myRequestId: string | null = null;
  const token = getAuth(request);
  if (token) {
    const { data: userData } = await supabase.auth.getUser(token);
    if (userData?.user) {
      const { data: mine } = await supabase
        .from('ride_requests')
        .select('id')
        .eq('user_id', userData.user.id)
        .eq('prayer_id', prayer_id)
        .eq('request_date', date)
        .eq('status', 'waiting')
        .maybeSingle();
      myRequestId = mine?.id ?? null;
    }
  }

  return NextResponse.json({ count: count ?? 0, myRequestId });
}

export async function POST(request: Request) {
  const supabase = getSupabase();

  const token = getAuth(request);
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { prayer_id, request_date } = await request.json();
  if (!prayer_id || !request_date) return NextResponse.json({ error: 'missing_fields' }, { status: 400 });

  const { data: upserted, error: upsertErr } = await supabase
    .from('ride_requests')
    .upsert(
      { user_id: userData.user.id, prayer_id, request_date, status: 'waiting' },
      { onConflict: 'user_id,prayer_id,request_date' }
    )
    .select('id')
    .single();

  if (upsertErr) return NextResponse.json({ error: upsertErr.message }, { status: 500 });

  const { count } = await supabase
    .from('ride_requests')
    .select('*', { count: 'exact', head: true })
    .eq('prayer_id', prayer_id)
    .eq('request_date', request_date)
    .eq('status', 'waiting');

  const n = count ?? 1;
  const prayerLabel = PRAYER_LABEL[prayer_id] || prayer_id;
  const brotherText = n === 1 ? 'Bruder wartet' : 'Brüder warten';

  sendPushToAll(
    {
      title: `🤲 ${n} ${brotherText} auf Fahrt zum ${prayerLabel}`,
      body: 'Kannst du fahren? Jetzt Fahrt anbieten!',
      url: '/select-prayer?role=driver',
    },
    []
  ).catch(() => {});

  return NextResponse.json({ id: upserted.id, count: n });
}

export async function DELETE(request: Request) {
  const supabase = getSupabase();

  const token = getAuth(request);
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { prayer_id, request_date } = await request.json();
  if (!prayer_id || !request_date) return NextResponse.json({ error: 'missing_fields' }, { status: 400 });

  await supabase
    .from('ride_requests')
    .update({ status: 'expired' })
    .eq('user_id', userData.user.id)
    .eq('prayer_id', prayer_id)
    .eq('request_date', request_date)
    .eq('status', 'waiting');

  return NextResponse.json({ success: true });
}
