import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { BERLIN_TZ, addDaysBerlin, formatIcsUtc, formatIcsDateBerlin } from '@/lib/date';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ORG_LABEL: Record<string, string> = {
  jamaat: 'Jamaat', ansar: 'Ansar', khuddam: 'Khuddam',
  atfal: 'Atfal', lajna: 'Lajna', nasirat: 'Nasirat',
};

/* Pflichtmaskierung nach RFC 5545: Backslash, Semikolon, Komma und
   Zeilenumbrueche muessen escaped werden. Ein Termin wie "Ijtema, Khuddam"
   zerlegt sonst die Kalenderdatei, weil das Komma als Trenner gilt. */
function esc(v: unknown): string {
  return String(v ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

export async function GET() {
  /* Service-Schlüssel, nicht der anonyme: Die RLS-Regel auf mosque_events
     erlaubt Lesen nur "TO authenticated". Ein Kalender-Abo bringt aber keine
     Anmeldung mit — mit dem anonymen Schlüssel liefert die Abfrage null Zeilen
     und der Kalender bleibt still leer. Die Route läuft nur serverseitig,
     der Schlüssel erreicht den Browser nie. */
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { data: events, error } = await supabase
      .from('mosque_events')
      .select('*')
      .gte('event_date', new Date().toISOString());

    if (error) {
      console.error('calendar-events: mosque_events', error.message);
      return new NextResponse('Error', { status: 500 });
    }
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
      let eventBlock: string;

      if (e.is_all_day) {
        /* Berliner Kalendertag, nicht der Server-lokale (UTC) - sonst kann
           ein Termin ab Mitternacht auf den Vortag rutschen. */
        const dateStr = formatIcsDateBerlin(start);
        const endBase = e.event_end_date ? new Date(e.event_end_date) : start;
        const endYmd = endBase.toLocaleDateString('sv-SE', { timeZone: BERLIN_TZ });
        const endStr = addDaysBerlin(endYmd, 1).replace(/-/g, '');
        eventBlock = [
          'BEGIN:VEVENT',
          `UID:event-${e.id}@ride2salah.app`,
          `DTSTAMP:${formatIcsUtc(new Date())}`,
          `DTSTART;VALUE=DATE:${dateStr}`,
          `DTEND;VALUE=DATE:${endStr}`,
          `SUMMARY:📅 ${esc(e.title)}`,
          `LOCATION:${esc(e.location || 'Bashier Moschee Bensheim')}`,
          `DESCRIPTION:${esc(ORG_LABEL[e.org] ? ORG_LABEL[e.org] + ' — Veranstaltung der Gemeinde.' : 'Veranstaltung der Gemeinde.')}`,
          'BEGIN:VALARM',
          'TRIGGER;RELATED=START:-P1D',
          'ACTION:DISPLAY',
          'DESCRIPTION:Morgen ist Veranstaltung!',
          'END:VALARM',
          'END:VEVENT'
        ].join('\r\n');
      } else {
        // event_date/event_end_date sind bereits echte UTC-Zeitpunkte (so
        // legt das Admin-Formular sie an) - hier nur noch korrekt formatieren.
        const end = e.event_end_date
          ? new Date(e.event_end_date)
          : new Date(start.getTime() + 2 * 60 * 60_000);
        eventBlock = [
          'BEGIN:VEVENT',
          `UID:event-${e.id}@ride2salah.app`,
          `DTSTAMP:${formatIcsUtc(new Date())}`,
          `DTSTART:${formatIcsUtc(start)}`,
          `DTEND:${formatIcsUtc(end)}`,
          `SUMMARY:📅 ${esc(e.title)}`,
          `LOCATION:${esc(e.location || 'Bashier Moschee Bensheim')}`,
          `DESCRIPTION:${esc(ORG_LABEL[e.org] ? ORG_LABEL[e.org] + ' — Veranstaltung der Gemeinde.' : 'Veranstaltung der Gemeinde.')}`,
          'BEGIN:VALARM',
          'TRIGGER;RELATED=START:-P1D',
          'ACTION:DISPLAY',
          'DESCRIPTION:Morgen ist Veranstaltung!',
          'END:VALARM',
          'END:VEVENT'
        ].join('\r\n');
      }

      icsContent += '\r\n' + eventBlock;
    }

    icsContent += '\r\nEND:VCALENDAR';

    return new NextResponse(icsContent, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });

  } catch (error) {
    return new NextResponse('Error', { status: 500 });
  }
}
