import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    // 1. Gebetszeiten aus DB holen
    const { data: prayers } = await supabase.from('prayer_times').select('*');
    if (!prayers) return new NextResponse('Error', { status: 500 });

    // 2. ICS Header
    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Ride2Salah//DE',
      'NAME:Ride 2 Salah Gebetszeiten',
      'X-WR-CALNAME:Ride 2 Salah Gebetszeiten',
      'REFRESH-INTERVAL;VALUE=DURATION:PT12H', 
      'X-PUBLISHED-TTL:PT12H',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH'
    ].join('\r\n');

    const now = new Date();
    
    // Für die nächsten 7 Tage
    for (let i = 0; i < 7; i++) {
      const day = new Date(now);
      day.setDate(day.getDate() + i); 

      for (const p of prayers) {
        if (!p.time) continue;

        const [h, m] = p.time.split(':').map(Number);
        
        const startDate = new Date(day);
        startDate.setHours(h, m, 0, 0);

        // Dauer: 15 Min
        const endDate = new Date(startDate);
        endDate.setMinutes(m + 15);

        const startStr = formatLocal(startDate);
        const endStr = formatLocal(endDate);

        const eventBlock = [
          'BEGIN:VEVENT',
          `UID:${p.id}-${startStr}@ride2salah.app`,
          `DTSTAMP:${formatLocal(new Date())}`,
          `DTSTART:${startStr}`, 
          `DTEND:${endStr}`,
          `SUMMARY:${p.name} Namaz`,
          'LOCATION:Bashir Moschee Bensheim',
          'DESCRIPTION:Fahrt buchen auf Ride 2 Salah.',
          
          // --- HIER IST DIE ERINNERUNG ---
          'BEGIN:VALARM',
          'TRIGGER:-PT20M',        // 20 Minuten vorher
          'DESCRIPTION:Noch 20 min bis zum Namaz! Komm doch zur Moschee.', // <--- DEIN TEXT
          'ACTION:DISPLAY',
          'END:VALARM',
          // -----------------------------

          'END:VEVENT'
        ].join('\r\n');

        icsContent += '\r\n' + eventBlock;
      }
    }

    icsContent += '\r\nEND:VCALENDAR';

    return new NextResponse(icsContent, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="gebetszeiten.ics"',
      },
    });

  } catch (error) {
    console.error(error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// Helfer
function formatLocal(date: Date) {
  const pad = (n: number) => n < 10 ? '0' + n : n.toString();
  return date.getFullYear() +
    pad(date.getMonth() + 1) +
    pad(date.getDate()) +
    'T' +
    pad(date.getHours()) +
    pad(date.getMinutes()) +
    pad(date.getSeconds());
}