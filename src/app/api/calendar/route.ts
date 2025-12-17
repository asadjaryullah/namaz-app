import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const APP_URL = "https://ride2salah.vercel.app";

export async function GET() {
  try {
    // 1. Gebetszeiten holen
    const { data: prayers } = await supabase.from('prayer_times').select('*');
    // 2. Events holen (Nur zukünftige oder aktuelle)
    const { data: events } = await supabase.from('mosque_events').select('*');

    if (!prayers) return new NextResponse('Error', { status: 500 });

    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Ride2Salah//DE',
      'NAME:Ride 2 Salah & Events',
      'X-WR-CALNAME:Bashir Moschee',
      'REFRESH-INTERVAL;VALUE=DURATION:PT1H', 
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH'
    ].join('\r\n');

    // A) GEBETSZEITEN (Nächste 7 Tage)
    const now = new Date();
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

        icsContent += '\r\n' + createEventBlock(
          `prayer-${p.id}-${i}`,
          startDate,
          endDate,
          `${p.name} Namaz 🕌`,
          `Komm zur Moschee! Buchung: ${APP_URL}`
        );
      }
    }

    // B) EVENTS (Echte Termine aus DB)
    if (events) {
      for (const e of events) {
        const start = new Date(e.event_date);
        const end = new Date(start);
        end.setHours(start.getHours() + 1); // Standarddauer 1 Std

        icsContent += '\r\n' + createEventBlock(
          `event-${e.id}`,
          start,
          end,
          `📅 ${e.title}`,
          e.description || "Veranstaltung in der Bashir Moschee"
        );
      }
    }

    icsContent += '\r\nEND:VCALENDAR';

    return new NextResponse(icsContent, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="moschee_kalender.ics"',
      },
    });

  } catch (error) {
    return new NextResponse('Error', { status: 500 });
  }
}

// Helfer zum Erstellen eines Events
function createEventBlock(uid: string, start: Date, end: Date, title: string, desc: string) {
  return [
    'BEGIN:VEVENT',
    `UID:${uid}@ride2salah.app`,
    `DTSTAMP:${formatLocal(new Date())}`,
    `DTSTART:${formatLocal(start)}`,
    `DTEND:${formatLocal(end)}`,
    `SUMMARY:${title}`,
    'LOCATION:Bashir Moschee Bensheim',
    `DESCRIPTION:${desc}`,
    'BEGIN:VALARM',
    'TRIGGER;RELATED=START:-PT20M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Gleich geht es los!',
    'END:VALARM',
    'END:VEVENT'
  ].join('\r\n');
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