import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase initialisieren
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Konstanten
const ONESIGNAL_APP_ID = "595fdd83-68b2-498a-8ca6-66fd1ae7be8e";

// 👇 HIER DEINEN LANGEN SCHLÜSSEL (os_v2...) REINKOPIEREN:
const ONESIGNAL_API_KEY = process.env.ONESIGNAL_REST_API_KEY; 

export async function GET() {
  try {
    console.log("🕒 Starte Tagesplanung...");

    if (!ONESIGNAL_API_KEY || ONESIGNAL_API_KEY.includes("HIER_DEN_LANGEN")) {
      return NextResponse.json({ error: 'API Key fehlt oder ist falsch' }, { status: 500 });
    }

    // 1. Zeit in Berlin ermitteln
    const nowString = new Date().toLocaleString("en-US", {timeZone: "Europe/Berlin"});
    const nowBerlin = new Date(nowString);

    // 2. Gebetszeiten holen
    const { data: prayers } = await supabase.from('prayer_times').select('*');
    if (!prayers) return NextResponse.json({ error: 'Keine Gebetszeiten gefunden' });

    let count = 0;

    // --- FREITAGS-CHECK ---
    if (nowBerlin.getDay() === 5) {
      const jummahTime = new Date(nowBerlin);
      jummahTime.setHours(12, 30, 0, 0); 

      if (jummahTime > nowBerlin) {
        await sendOneSignalPush("Jumu'ah Mubarak! 🕌", "Komm rechtzeitig zum Freitagsgebet.", jummahTime);
        count++;
      }
    }

    // --- TÄGLICHE GEBETE (25 Min vorher) ---
    for (const p of prayers) {
      if (!p.time) continue;

      const [h, m] = p.time.split(':').map(Number);
      
      const scheduleTime = new Date(nowBerlin);
      scheduleTime.setHours(h);
      scheduleTime.setMinutes(m - 25); 
      scheduleTime.setSeconds(0);

      if (scheduleTime > nowBerlin) {
        await sendOneSignalPush(
          `Bald ist ${p.name} (${p.time}) 🕌`,
          "Buche jetzt deine Fahrt zur Moschee!",
          scheduleTime
        );
        count++;
      }
    }

    // --- ZIKR ERINNERUNG ---
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

    // 👇 SOFORT-TEST (Damit du siehst, ob es klappt)
    await sendOneSignalPush(
      "Test vom Server 🚀",
      "Wenn du das liest, steht die Verbindung!",
      new Date() // "Jetzt" senden
    );

    return NextResponse.json({ success: true, message: `${count} Nachrichten geplant + 1 Test gesendet.` });

  } catch (error: any) {
    console.error("Cronjob Fehler:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// --- HILFSFUNKTION (Verbessert für Sofort-Versand) ---
async function sendOneSignalPush(title: string, message: string, sendAt: Date) {
  
  const now = new Date();
  // Prüfen: Ist der Termin in der Zukunft (mehr als 1 Minute)?
  // Wenn ja -> Planen. Wenn nein -> Sofort senden.
  const isFuture = sendAt.getTime() - now.getTime() > 60000;

  const body: any = {
    app_id: ONESIGNAL_APP_ID,
    headings: { en: title },
    contents: { en: message },
    included_segments: ["All"], 
    url: "https://ride2salah.vercel.app"
  };

  // Nur wenn es Zukunft ist, fügen wir "send_after" hinzu
  if (isFuture) {
    body.send_after = sendAt.toISOString();
    console.log(`Plane Nachricht für: ${sendAt.toISOString()}`);
  } else {
    console.log("Sende Nachricht SOFORT.");
  }

  const response = await fetch('https://onesignal.com/api/v1/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${ONESIGNAL_API_KEY}`
    },
    body: JSON.stringify(body)
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    console.error("OneSignal Error:", errorData);
  }
}