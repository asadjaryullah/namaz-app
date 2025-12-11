import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase initialisieren
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Konstanten
const ONESIGNAL_APP_ID = "595fdd83-68b2-498a-8ca6-66fd1ae7be8e";
const ONESIGNAL_API_KEY = process.env.ONESIGNAL_REST_API_KEY;

export async function GET() {
  try {
    console.log("Starte Tagesplanung...");

    if (!ONESIGNAL_API_KEY) {
      return NextResponse.json({ error: 'Server Konfiguration fehlt (API Key)' }, { status: 500 });
    }

    // 1. Aktuelle Zeit in DEUTSCHLAND ermitteln (Wichtig für Vercel Server!)
    // Wir holen die Zeit als String für Berlin und machen daraus ein Date-Objekt
    const nowString = new Date().toLocaleString("en-US", {timeZone: "Europe/Berlin"});
    const nowBerlin = new Date(nowString);

    // 2. Gebetszeiten holen
    const { data: prayers } = await supabase.from('prayer_times').select('*');
    if (!prayers) return NextResponse.json({ error: 'Keine Gebetszeiten gefunden' });

    // --- FREITAGS-CHECK (Jumu'ah) ---
    // 5 = Freitag
    if (nowBerlin.getDay() === 5) {
      console.log("Es ist Freitag! Prüfe Jumu'ah...");
      
      const jummahTime = new Date(nowBerlin);
      jummahTime.setHours(12);
      jummahTime.setMinutes(30);
      jummahTime.setSeconds(0);

      // Nur senden, wenn 12:30 heute noch in der Zukunft liegt
      if (jummahTime > nowBerlin) {
        await sendOneSignalPush(
          "Jumu'ah Mubarak! 🕌", 
          "Vergiss nicht, rechtzeitig zum Freitagsgebet zu kommen.",
          jummahTime
        );
      }
    }
    // --------------------------------

    // 3. Tägliche Gebete planen
    for (const p of prayers) {
      if (!p.time) continue;

      const [h, m] = p.time.split(':').map(Number);
      
      // Wir erstellen ein Datum basierend auf der Berlin-Zeit von "Heute"
      const scheduleTime = new Date(nowBerlin);
      scheduleTime.setHours(h);
      scheduleTime.setMinutes(m - 25); // 25 Min vorher
      scheduleTime.setSeconds(0);

      // Liegt der Zeitpunkt in der Zukunft?
      if (scheduleTime > nowBerlin) {
        await sendOneSignalPush(
          `Bald ist ${p.name} (${p.time}) 🕌`,
          "Buche jetzt deine Fahrt zur Moschee!",
          scheduleTime
        );
      }
    }

    return NextResponse.json({ success: true, message: "Benachrichtigungen erfolgreich geplant!" });

  } catch (error: any) {
    console.error("Cronjob Fehler:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// --- HILFSFUNKTION ZUM SENDEN ---
async function sendOneSignalPush(title: string, message: string, sendAt: Date) {
  console.log(`Plane Nachricht: "${title}" für ${sendAt.toLocaleTimeString()}`);

  const body = {
    app_id: ONESIGNAL_APP_ID,
    headings: { en: title },
    contents: { en: message },
    included_segments: ["All"], // Sendet an alle
    // WICHTIG: OneSignal braucht UTC Zeit im ISO Format. 
    // Da unser 'sendAt' Objekt korrekt erstellt wurde, wandelt .toISOString() es passend um.
    send_after: sendAt.toISOString(), 
    url: "https://ride2salah.vercel.app"
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