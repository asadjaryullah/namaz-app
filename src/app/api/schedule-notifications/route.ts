import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const ONESIGNAL_APP_ID = "595fdd83-68b2-498a-8ca6-66fd1ae7be8e";
// 👇 Stelle sicher, dass hier dein langer Key steht (oder via process.env)
const ONESIGNAL_API_KEY = process.env.ONESIGNAL_REST_API_KEY; 

export async function GET() {
  const logs: string[] = []; // Wir sammeln Logs für die Ausgabe
  
  try {
    logs.push("🚀 Start: API aufgerufen.");

    // 1. Key Check
    if (!ONESIGNAL_API_KEY) {
      throw new Error("API Key fehlt! Bitte in Vercel prüfen.");
    }
    logs.push("✅ API Key gefunden.");

    // 2. Zeit Check
    const nowBerlin = new Date(new Date().toLocaleString("en-US", {timeZone: "Europe/Berlin"}));
    logs.push(`🕒 Server Zeit (Berlin): ${nowBerlin.toLocaleString()}`);

    // 3. Gebete holen
    const { data: prayers, error } = await supabase.from('prayer_times').select('*');
    if (error) throw error;
    if (!prayers || prayers.length === 0) throw new Error("Keine Gebetszeiten in DB.");
    
    logs.push(`✅ ${prayers.length} Gebete gefunden.`);

    let plannedCount = 0;

    // 4. Test-Schleife
    for (const p of prayers) {
      if (!p.time) continue;

      const [h, m] = p.time.split(':').map(Number);
      
      // Zielzeit erstellen
      const scheduleTime = new Date(nowBerlin);
      scheduleTime.setHours(h);
      scheduleTime.setMinutes(m - 25);
      scheduleTime.setSeconds(0);

      const timeDiff = (scheduleTime.getTime() - nowBerlin.getTime()) / 1000 / 60; // Differenz in Minuten

      if (scheduleTime > nowBerlin) {
        logs.push(`📅 Plane ${p.name} für ${scheduleTime.toLocaleTimeString()} (in ${Math.round(timeDiff)} Min)`);
        
        await sendOneSignalPush(
          `Bald ist ${p.name} 🕌`,
          `In 25 Minuten ist Gebet (${p.time}).`,
          scheduleTime
        );
        plannedCount++;
      } else {
        logs.push(`⚠️ Überspringe ${p.name}: Zeit ${scheduleTime.toLocaleTimeString()} ist schon vorbei.`);
      }
    }

    // 5. DIAGNOSE-NACHRICHT (SOFORT SENDEN)
    // Damit du siehst, dass der Cronjob überhaupt läuft
    await sendOneSignalPush(
      "System-Check 🛠️",
      `Der Wecker lief um ${nowBerlin.toLocaleTimeString()}. ${plannedCount} Gebete geplant.`,
      new Date() // Sofort
    );

    return NextResponse.json({ 
      success: true, 
      planned: plannedCount,
      logs: logs 
    });

  } catch (error: any) {
    console.error("CRASH:", error);
    return NextResponse.json({ error: error.message, logs }, { status: 500 });
  }
}

async function sendOneSignalPush(title: string, message: string, sendAt: Date) {
  const now = new Date();
  // Wenn Zeit > 1 Minute in Zukunft -> Planen, sonst Sofort
  const isFuture = sendAt.getTime() - now.getTime() > 60000;

  const body: any = {
    app_id: ONESIGNAL_APP_ID,
    headings: { en: title },
    contents: { en: message },
    included_segments: ["All"], 
    url: "https://ride2salah.vercel.app"
  };

  if (isFuture) {
    body.send_after = sendAt.toISOString();
  }

  await fetch('https://onesignal.com/api/v1/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${ONESIGNAL_API_KEY}`
    },
    body: JSON.stringify(body)
  });
}