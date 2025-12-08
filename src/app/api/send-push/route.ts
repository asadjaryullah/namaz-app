import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  // 1. Erst prüfen, ob die Keys da sind. Wenn nicht, Fehler abfangen (verhindert Build-Crash)
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    console.error("VAPID Keys fehlen!");
    return NextResponse.json({ message: 'Server Konfiguration fehlt' }, { status: 500 });
  }

  try {
    // 2. Jetzt erst konfigurieren
    webpush.setVapidDetails(
      'mailto:asad.jaryullah@gmail.com', // Deine Email
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );

    const { userId, title, body, url } = await request.json();

    // 3. Suche das Abo des Users
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId);

    if (!subs || subs.length === 0) {
      return NextResponse.json({ message: 'Kein Abo gefunden' }, { status: 404 });
    }

    // 4. An alle Geräte senden
    const notifications = subs.map(sub => {
      const pushConfig = {
        endpoint: sub.endpoint,
        keys: { auth: sub.auth, p256dh: sub.p256dh }
      };
      return webpush.sendNotification(pushConfig, JSON.stringify({ title, body, url }));
    });

    await Promise.all(notifications);

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Push Error:", error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}