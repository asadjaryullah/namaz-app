import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const APP_URL = "https://ride2salah.vercel.app";

export async function GET() {
  try {
    // Nur Gebete laden
    const { data: prayers } = await supabase.from('prayer_times').select('*');
    if (!prayers) return new NextResponse('Error', { status: 500 });

    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Ride2Salah//DE',
      'NAME:Ride 2 Salah Gebetszeiten',
      'X-WR-CALNAME:Gebetszeiten (Ride 2 Salah)',
      'REFRESH-INTERVAL;VALUE=DURATION:PT12H', 
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
        const endDate = new Date(startDate);
        endDate.setMinutes(m + 15);

        const startStr = formatLocal(startDate);
        const endStr = formatLocal(endDate);

        const eventBlock = [
          'BEGIN:VEVENT',
          `UID:prayer-${p.id}-${startStr}@ride2salah.app`,
          `DTSTAMP:${formatLocal(new Date())}`,
          `DTSTART:${startStr}`, 
          `DTEND:${endStr}`,
          `SUMMARY:${p.name} Namaz 🕌`,
          'LOCATION:Bashier Moschee Bensheim',
          `URL:${APP_URL}`,
          `DESCRIPTION:Fahrt buchen: ${APP_URL}`,
          'BEGIN:VALARM',
          'TRIGGER;RELATED=START:-PT15M', 
          'ACTION:DISPLAY',
          'DESCRIPTION:In 15 min ist Namaz!',
          'END:VALARM',
          'END:VEVENT'
        ].join('\r\n');

        icsContent += '\r\n' + eventBlock;
      }
    }

    icsContent += '\r\nEND:VCALENDAR';

    return new NextResponse(icsContent, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="gebete.ics"',
      },
    });

  } catch (error) {
    return new NextResponse('Error', { status: 500 });
  }
}

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