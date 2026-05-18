import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendPushToAll } from '@/lib/webpush';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TZ = 'Europe/Berlin';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function todayBerlin() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: TZ });
}

export async function GET(request: Request) {
  const supabase = getSupabase();
  const url = new URL(request.url);
  const prayer_id = url.searchParams.get('prayer_id') || '';
  const prayer_date = url.searchParams.get('prayer_date') || todayBerlin();

  const { count } = await supabase
    .from('prayer_commitments')
    .select('*', { count: 'exact', head: true })
    .eq('prayer_id', prayer_id)
    .eq('prayer_date', prayer_date);

  let committed = false;
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (token) {
    const { data: userData } = await supabase.auth.getUser(token);
    if (userData?.user) {
      const { data: mine } = await supabase
        .from('prayer_commitments')
        .select('id')
        .eq('user_id', userData.user.id)
        .eq('prayer_id', prayer_id)
        .eq('prayer_date', prayer_date)
        .maybeSingle();
      committed = !!mine;
    }
  }

  return NextResponse.json({ committed, count: count ?? 0 });
}

export async function POST(request: Request) {
  const supabase = getSupabase();

  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { prayer_id, prayer_date } = await request.json();
  const date = prayer_date || todayBerlin();

  const { data: existing } = await supabase
    .from('prayer_commitments')
    .select('id')
    .eq('user_id', userData.user.id)
    .eq('prayer_id', prayer_id)
    .eq('prayer_date', date)
    .maybeSingle();

  if (existing) {
    await supabase.from('prayer_commitments')
      .delete()
      .eq('user_id', userData.user.id)
      .eq('prayer_id', prayer_id)
      .eq('prayer_date', date);
  } else {
    await supabase.from('prayer_commitments').insert({
      user_id: userData.user.id,
      prayer_id,
      prayer_date: date,
    });

    // Push to all when someone commits
    const [{ data: profile }, { data: prayer }] = await Promise.all([
      supabase.from('profiles').select('full_name').eq('id', userData.user.id).single(),
      supabase.from('prayer_times').select('name').eq('id', prayer_id).single(),
    ]);
    const firstName = profile?.full_name?.split(' ')[0] || 'Jemand';
    const prayerName = prayer?.name || prayer_id;
    sendPushToAll({
      title: `${firstName} kommt zum ${prayerName} 🕌`,
      body: 'Jetzt auch zusagen!',
      url: 'https://ride2salah.vercel.app',
    }, []).catch(() => {});
  }

  const { count } = await supabase
    .from('prayer_commitments')
    .select('*', { count: 'exact', head: true })
    .eq('prayer_id', prayer_id)
    .eq('prayer_date', date);

  return NextResponse.json({ committed: !existing, count: count ?? 0 });
}
