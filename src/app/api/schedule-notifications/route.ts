import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase initialisieren
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// HIER DEINE ONESIGNAL DATEN:
const ONESIGNAL_APP_ID = "595fdd83-68b2-498a-8ca6-66fd1ae7be8e"; // Deine ID
const ONESIGNAL_API_KEY = process.env.ONESIGNAL_REST_API_KEY;

export async function GET() {
  try {
    console.log("Starte Tagesplanung...");

    // 1. Gebetszeiten holen
    const { data: prayers } = await supabase.from('prayer_times').select('*');
    if (!prayers) return NextResponse.json({ error: 'Keine Gebetszeiten gefunden' });

    const now = new Date();
    
    // --- NEU: FREITAGS-CHECK (Jumu'ah) ---
    // 0=Sonntag, 1=Montag, ..., 5=Freitag
    if (now.getDay() === 5) {
      console.log("Es ist Freitag! Plane Jumu'ah...");
      
      const jummahTime = new Date();
      jummahTime.setHours(12); // 12:30 Uhr Erinnerung
      jummahTime.setMinutes(30);
      jummahTime.setSeconds(0);

      // Nur senden, wenn 12:30 heute noch nicht vorbei ist
      if (jummahTime > now) {
        await sendOneSignalPush(
          "Jumu'ah Mubarak! 🕌", 
          "Vergiss nicht, rechtzeitig zum Freitagsgebet zu kommen.",
          jummahTime
        );
      }
    }
    // -------------------------------------

    // 2. Tägliche Gebete planen (wie vorher)
    for (const p of prayers) {
      if (!p.time) continue;

      const [h, m] = p.time.split(':').map(Number);
      
      const scheduleTime = new Date();
      scheduleTime.setHours(h);
      scheduleTime.setMinutes(m - 25); // 25 Min vorher
      scheduleTime.setSeconds(0);

      if (scheduleTime < now) continue;

      await sendOneSignalPush(
        `Bald ist ${p.name} (${p.time}) 🕌`,
        "Buche jetzt deine Fahrt zur Moschee!",
        scheduleTime
      );
    }

    return NextResponse.json({ success: true, message: "Benachrichtigungen geplant!" });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Hilfsfunktion zum Senden
async function sendOneSignalPush(title: string, message: string, sendAt: Date) {
  const body = {
    app_id: ONESIGNAL_APP_ID,
    headings: { en: title },
    contents: { en: message },
    included_segments: ["All"],
    send_after: sendAt.toISOString(), // OneSignal plant das ein
    url: "https://ride2salah.vercel.app" // Klick öffnet die App
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