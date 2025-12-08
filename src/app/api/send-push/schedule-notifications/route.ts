import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase initialisieren (Server-Side)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const ONESIGNAL_APP_ID = "595fdd83-68b2-498a-8ca6-66fd1ae7be8e"; // <--- NOCHMAL HIER REIN
const ONESIGNAL_API_KEY = process.env.ONESIGNAL_REST_API_KEY;

export async function GET() {
  try {
    console.log("Starte Tagesplanung...");

    // 1. Gebetszeiten holen
    const { data: prayers } = await supabase.from('prayer_times').select('*');
    if (!prayers) return NextResponse.json({ error: 'Keine Gebetszeiten gefunden' });

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0]; // "2023-12-01"

    // 2. Für jedes Gebet eine Nachricht planen
    for (const p of prayers) {
      if (!p.time) continue;

      // Zeit berechnen: Gebet 13:30 -> Nachricht um 13:05
      const [h, m] = p.time.split(':').map(Number);
      
      // Wir erstellen ein Datum-Objekt für HEUTE zu dieser Zeit
      const scheduleTime = new Date();
      scheduleTime.setHours(h);
      scheduleTime.setMinutes(m - 25); // 25 Min vorher
      scheduleTime.setSeconds(0);

      // Falls die Zeit heute schon vorbei ist -> überspringen
      if (scheduleTime < now) continue;

      // Nachricht an OneSignal senden
      const body = {
        app_id: ONESIGNAL_APP_ID,
        contents: { en: `In 25 Minuten ist ${p.name} (${p.time}). Buche jetzt deine Fahrt! 🚕` },
        headings: { en: "Gebets-Erinnerung 🕌" },
        included_segments: ["All"], // An alle User
        send_after: scheduleTime.toISOString() // Hier passiert die Magie: OneSignal wartet bis dahin!
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

    return NextResponse.json({ success: true, message: "Benachrichtigungen geplant!" });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}