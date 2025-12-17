import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase initialisieren
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Konstanten
const ONESIGNAL_APP_ID = "595fdd83-68b2-498a-8ca6-66fd1ae7be8e"; // App ID (Öffentlich ok)
const ONESIGNAL_API_KEY = process.env.ONESIGNAL_REST_API_KEY;   // API Key (Geheim aus Env)

export async function GET() {
  try {
    console.log("🕒 Starte Tagesplanung (Deutsche Zeit)...");

    // 1. SICHERHEITS-CHECK
    if (!ONESIGNAL_API_KEY) {
      console.error("❌ FEHLER: ONESIGNAL_REST_API_KEY fehlt in den Environment Variables.");
      return NextResponse.json({ error: 'Server Konfiguration fehlt (API Key)' }, { status: 500 });
    }

    // 2. Zeit in Berlin ermitteln
    const nowString = new Date().toLocaleString("en-US", {timeZone: "Europe/Berlin"});
    const nowBerlin = new Date(nowString);

    // 3. Gebetszeiten laden
    const { data: prayers } = await supabase.from('prayer_times').select('*');
    if (!prayers) return NextResponse.json({ error: 'Keine Gebetszeiten gefunden' });

    let count = 0;

    // --- A) FREITAGS-CHECK (Jumu'ah) ---
    // 0=Sonntag, ... 5=Freitag
    if (nowBerlin.getDay() === 5) {
      const jummahTime = new Date(nowBerlin);
      jummahTime.setHours(12, 30, 0, 0); // 12:30 Uhr

      if (jummahTime > nowBerlin) {
        await sendOneSignalPush(
          "Jumu'ah Mubarak! 🕌", 
          "Vergiss nicht, rechtzeitig zum Freitagsgebet zu kommen.",
          jummahTime
        );
        count++;
      }
    }

    // --- B) TÄGLICHE GEBETE (25 Min vorher) ---
    for (const p of prayers) {
      if (!p.time) continue;

      const [h, m] = p.time.split(':').map(Number);
      
      const scheduleTime = new Date(nowBerlin);
      scheduleTime.setHours(h);
      scheduleTime.setMinutes(m - 25); // 25 Min vorher
      scheduleTime.setSeconds(0);

      // Nur planen, wenn Zeit in der Zukunft liegt
      if (scheduleTime > nowBerlin) {
        await sendOneSignalPush(
          `Bald ist ${p.name} (${p.time}) 🕌`,
          "Buche jetzt deine Fahrt zur Moschee!",
          scheduleTime
        );
        count++;
      }
    }

    // --- C) ZIKR ERINNERUNG (12, 16, 20 Uhr) ---
    const zikrHours = [12, 16, 20];
    
    for (const h of zikrHours) {
        const zikrTime = new Date(nowBerlin);
        zikrTime.setHours(h, 0, 0, 0);

        if (zikrTime > nowBerlin) {
             await sendOneSignalPush(
                "📿 Zikr Erinnerung", 
                "Vergiss nicht, deine täglichen Gebete zu vervollständigen.",
                zikrTime
             );
             count++;
        }
    }
    
    return NextResponse.json({ success: true, message: `${count} Nachrichten geplant.` });

  } catch (error: any) {
    console.error("Cronjob Fehler:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// --- HILFSFUNKTION ---
async function sendOneSignalPush(title: string, message: string, sendAt: Date) {
  
  const body = {
    app_id: ONESIGNAL_APP_ID,
    headings: { en: title },
    contents: { en: message },
    included_segments: ["All"], 
    // OneSignal braucht UTC (toISOString wandelt Berlin-Zeit-Objekt in UTC um)
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