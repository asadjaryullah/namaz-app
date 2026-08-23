import { redirect } from 'next/navigation';

// Termine leben unter /history?tab=events — dort gibt es die volle Liste
// mit Gruppenfarben und den Kalender-Abo-Knoepfen. Diese Route bleibt als
// Weiterleitung bestehen, damit alte Links weiter funktionieren.
export default function EventsPage() {
  redirect('/history?tab=events');
}
