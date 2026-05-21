import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: Request) {
  const supabase = getSupabase();

  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { prayer_id, maybe_date } = await request.json();
  if (!prayer_id || !maybe_date) return NextResponse.json({ error: 'missing_fields' }, { status: 400 });

  const { data: existing } = await supabase
    .from('driver_maybe')
    .select('id')
    .eq('driver_id', userData.user.id)
    .eq('prayer_id', prayer_id)
    .eq('maybe_date', maybe_date)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('driver_maybe')
      .delete()
      .eq('driver_id', userData.user.id)
      .eq('prayer_id', prayer_id)
      .eq('maybe_date', maybe_date);
  } else {
    await supabase.from('driver_maybe').insert({
      driver_id: userData.user.id,
      prayer_id,
      maybe_date,
    });
  }

  const { count } = await supabase
    .from('driver_maybe')
    .select('*', { count: 'exact', head: true })
    .eq('prayer_id', prayer_id)
    .eq('maybe_date', maybe_date);

  return NextResponse.json({ maybe: !existing, count: count ?? 0 });
}
