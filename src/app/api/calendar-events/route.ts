import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    const { data: events } = await supabase
      .from('mosque_events')
      .select('*')
      .gte('event_date', new Date().toISOString());

    if (!events) return new NextResponse('Error', { status: 500 });

    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Ride2Salah//DE',
      'NAME:Bashier Moschee Events',
      'X-WR-CALNAME:Moschee Veranstaltungen',
      'REFRESH-INTERVAL;VALUE=DURATION:PT4H',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH'
    ].join('\r\n');

    for (const e of events) {
      const start = new Date(e.event_date);
      
      // HIER DIE ÄNDERUNG: Enddatum nutzen!
      let end;
      if (e.event_end_date) {
        end = new Date(e.event_end_date);
      } else {
        end = new Date(start);
        end.setHours(start.getHours() + 2); // Fallback: 2 Std
      }

      const startStr = formatLocal(start);
      const endStr = formatLocal(end);

      const eventBlock = [
        'BEGIN:VEVENT',
        `UID:event-${e.id}@ride2salah.app`,
        `DTSTAMP:${formatLocal(new Date())}`,
        `DTSTART:${startStr}`, 
        `DTEND:${endStr}`,
        `SUMMARY:📅 ${e.title}`,
        'LOCATION:Bashier Moschee Bensheim',
        `DESCRIPTION:Veranstaltung der Gemeinde.`,
        'BEGIN:VALARM',
        'TRIGGER;RELATED=START:-P1D',
        'ACTION:DISPLAY',
        'DESCRIPTION:Morgen ist Veranstaltung!',
        'END:VALARM',
        'END:VEVENT'
      ].join('\r\n');

      icsContent += '\r\n' + eventBlock;
    }

    icsContent += '\r\nEND:VCALENDAR';

    return new NextResponse(icsContent, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="events.ics"',
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