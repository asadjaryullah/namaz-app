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
