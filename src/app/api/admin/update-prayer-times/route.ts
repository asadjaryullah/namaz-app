import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendPushToAll } from '@/lib/webpush';
import { isMainAdmin } from "@/lib/admin";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type PrayerRow = { id: string; name: string; time: string; sort_order: number };

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

  // Hauptadmin oder Teiladmin mit Gebetszeiten-Recht
  const isAdminEmail = isMainAdmin(userData.user.email);
  const { data: profile } = await supabase
    .from('profiles')
    .select('can_edit_times')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (!isAdminEmail && !profile?.can_edit_times) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { prayers, notify } = (await request.json()) as {
    prayers: PrayerRow[];
    notify?: boolean;
  };
  if (!Array.isArray(prayers) || prayers.length === 0) {
    return NextResponse.json({ error: 'prayers erforderlich' }, { status: 400 });
  }

  // Alte Zeiten laden, damit wir nur bei echten Änderungen benachrichtigen
  const { data: current } = await supabase
    .from('prayer_times')
    .select('id,name,time,sort_order');
  const before = new Map((current ?? []).map((p) => [p.id, p as PrayerRow]));

  const changes = prayers
    .filter((p) => {
      const old = before.get(p.id);
      return old && old.time !== p.time;
    })
    .map((p) => {
      const old = before.get(p.id)!;
      return { name: p.name || old.name, from: old.time, to: p.time };
    });

  const { error } = await supabase.from('prayer_times').upsert(prayers);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let pushed = 0;
  if (notify && changes.length > 0) {
    const parts = changes.map((c) => `${c.name} ${c.from} → ${c.to}`);
    const shown = parts.slice(0, 3).join(' · ');
    const body = parts.length > 3 ? `${shown} · +${parts.length - 3} weitere` : shown;

    pushed = await sendPushToAll({
      title: changes.length === 1 ? '🕌 Neue Gebetszeit' : '🕌 Neue Gebetszeiten',
      body,
      url: '/',
    });
  }

  return NextResponse.json({ success: true, changed: changes.length, pushed });
}
