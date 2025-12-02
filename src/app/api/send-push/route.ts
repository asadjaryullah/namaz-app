import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

webpush.setVapidDetails(
  'mailto:deine@email.com', // Hier deine Admin-Email rein
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(request: Request) {
  const { userId, title, body, url } = await request.json();

  // 1. Suche das Abo des Users
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId);

  if (!subs || subs.length === 0) {
    return NextResponse.json({ message: 'Kein Abo gefunden' }, { status: 404 });
  }

  // 2. An alle Geräte des Users senden
  const notifications = subs.map(sub => {
    const pushConfig = {
      endpoint: sub.endpoint,
      keys: { auth: sub.auth, p256dh: sub.p256dh }
    };
    return webpush.sendNotification(pushConfig, JSON.stringify({ title, body, url }));
  });

  await Promise.all(notifications);

  return NextResponse.json({ success: true });
}