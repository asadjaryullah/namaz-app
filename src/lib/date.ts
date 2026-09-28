/**
 * Heutiges Datum als YYYY-MM-DD in Berliner Zeit.
 *
 * Wichtig: NICHT toISOString() verwenden — das liefert UTC. Zwischen
 * Mitternacht und 01:00 bzw. 02:00 Berliner Zeit ist in UTC noch der Vortag,
 * dadurch findet eine Abfrage die Fahrten des laufenden Tages nicht mehr.
 * Genau daran ist das Fahrer-Dashboard nachts gescheitert.
 *
 * Auch nicht toLocaleDateString('en-CA') ohne Zeitzone: das folgt der
 * Geräteeinstellung. Wer auf Reisen ist oder eine falsch gestellte Uhr hat,
 * sieht sonst den falschen Tag.
 */
export const BERLIN_TZ = 'Europe/Berlin';

export function todayBerlin(): string {
  // 'sv-SE' formatiert als YYYY-MM-DD — genau das Format der DB-Spalten
  return new Date().toLocaleDateString('sv-SE', { timeZone: BERLIN_TZ });
}

/**
 * Berliner Kalendertag + Wanduhrzeit ("13:15") in den tatsaechlichen
 * UTC-Zeitpunkt umrechnen — mit Sommer-/Winterzeit, ohne Zeitzonen-Datenbank.
 *
 * Trick: Erst so tun, als waere die Wanduhrzeit schon UTC. Dann nachsehen,
 * welche Berliner Uhrzeit dieser Versuch tatsaechlich ergibt, und um genau
 * die Differenz korrigieren. Funktioniert zuverlaessig, weil sich der
 * Berlin-Offset innerhalb eines Tages nur in der einen Umstellungsstunde
 * selbst aendert - fuer Gebetszeiten und Termine ohne Bedeutung.
 *
 * Das ist die Wurzel des "2 Stunden zu spaet"-Fehlers im Kalender-Abo:
 * Die Routen lasen bisher .getHours() eines Date-Objekts aus - das liefert
 * die Uhrzeit in der Zeitzone des SERVERS (auf Vercel: UTC), nicht Berlins.
 * Die erzeugte ICS-Datei nannte dazu auch keine Zeitzone, also riet jede
 * Kalender-App selbst - Google Calendar rät dabei bekanntermassen "UTC".
 */
export function berlinWallTimeToUtc(dateStr: string, hhmm: string): Date {
  const [hh, mm] = hhmm.split(':').map(Number);
  const pad = (n: number) => String(n).padStart(2, '0');

  const guess = new Date(`${dateStr}T${pad(hh)}:${pad(mm)}:00.000Z`);
  const observed = guess.toLocaleString('sv-SE', { timeZone: BERLIN_TZ }); // "YYYY-MM-DD HH:MM:SS"
  const [oDate, oTime] = observed.split(' ');
  const [oh, om] = oTime.split(':').map(Number);

  let observedMinutes = oh * 60 + om;
  if (oDate !== dateStr) {
    // Tagesgrenze ueberschritten (z.B. Isha kurz vor Mitternacht) - Differenz einrechnen
    const dayDiff = (Date.parse(oDate + 'T00:00:00Z') - Date.parse(dateStr + 'T00:00:00Z')) / 86_400_000;
    observedMinutes += dayDiff * 24 * 60;
  }

  const intendedMinutes = hh * 60 + mm;
  const correctionMs = (intendedMinutes - observedMinutes) * 60_000;
  return new Date(guess.getTime() + correctionMs);
}

/** N Tage zu einem Berliner YYYY-MM-DD addieren, ohne die Kalendertag-Grenze
 * durch die Zeitzonen-Umrechnung zu verlieren - an UTC-Mittag verankert,
 * der bei Berlins Offset (+1/+2h) nie auf den Nachbartag faellt. */
export function addDaysBerlin(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** RFC-5545-UTC-Zeitstempel (YYYYMMDDTHHMMSSZ) - mit "Z" verstehen alle
 * Kalender-Apps dieselbe Zeit gleich, unabhaengig von Sommer-/Winterzeit
 * oder davon, wie eine einzelne App fehlende Zeitzonen-Angaben rät. */
export function formatIcsUtc(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    date.getUTCFullYear() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    'T' +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    'Z'
  );
}

/** Berliner Kalendertag (YYYYMMDD) eines Zeitpunkts - fuer ganztägige
 * ICS-Termine (DTSTART;VALUE=DATE). Server-lokales getDate() koennte nahe
 * Mitternacht auf den falschen Tag zeigen. */
export function formatIcsDateBerlin(date: Date): string {
  return date.toLocaleDateString('sv-SE', { timeZone: BERLIN_TZ }).replace(/-/g, '');
}
