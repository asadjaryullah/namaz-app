'use client';

import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function DatenschutzPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-slate-50 p-6 flex flex-col items-center">
      
      <div className="w-full max-w-2xl">
        <Button variant="ghost" onClick={() => router.push('/')} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Zurück zur App
        </Button>

        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 prose prose-slate max-w-none">
          <h1 className="text-2xl font-bold text-slate-900 mb-6">Datenschutzerklärung</h1>

          <p>Stand: {new Date().toLocaleDateString()}</p>

          <h3 className="text-lg font-bold mt-6">1. Worum geht es?</h3>
          <p className="text-slate-600 text-sm">
            Diese App ("Ride 2 Salah") dient dazu, Fahrgemeinschaften zur Bashir Moschee zu organisieren. 
            Wir nehmen den Schutz deiner persönlichen Daten sehr ernst und halten uns an die Regeln der Datenschutzgesetze.
          </p>

          <h3 className="text-lg font-bold mt-6">2. Welche Daten erfassen wir?</h3>
          <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
            <li><strong>Profil-Daten:</strong> Name, E-Mail-Adresse und Telefonnummer. Diese werden benötigt, damit Fahrer und Mitfahrer sich finden und kontaktieren können.</li>
            <li><strong>Standort-Daten (GPS):</strong> Nur wenn du eine Fahrt anbietest oder buchst, wird dein aktueller Standort kurzzeitig gespeichert, um die Route und Abholpunkte auf der Karte anzuzeigen.</li>
            <li><strong>Fahrt-Daten:</strong> Datum, Uhrzeit und Status deiner Fahrten.</li>
          </ul>

          <h3 className="text-lg font-bold mt-6">3. Wer sieht meine Daten?</h3>
          <p className="text-slate-600 text-sm">
            Deine Daten sind nicht öffentlich im Internet sichtbar.
            <br/>
            <strong>Als Fahrer:</strong> Deine Mitfahrer sehen deinen Namen, deine Telefonnummer (für Absprachen) und deine Route.
            <br/>
            <strong>Als Mitfahrer:</strong> Der Fahrer sieht deinen Namen, deine Telefonnummer und deinen Abholort auf der Karte.
          </p>

          <h3 className="text-lg font-bold mt-6">4. Dienste von Drittanbietern</h3>
          <p className="text-slate-600 text-sm">
            Damit die App funktioniert, nutzen wir folgende sichere Dienstleister:
          </p>
          <ul className="list-disc list-inside text-sm text-slate-600 space-y-1 mt-2">
            <li><strong>Vercel:</strong> Zum Hosten der Webseite (Server in der EU/USA).</li>
            <li><strong>Supabase:</strong> Als Datenbank zum Speichern der Benutzerdaten (verschlüsselt).</li>
            <li><strong>Google Maps:</strong> Um die Karten und Routen anzuzeigen. Dabei wird deine IP-Adresse und ggf. dein Standort an Google übertragen.</li>
          </ul>

          <h3 className="text-lg font-bold mt-6">5. Deine Rechte</h3>
          <p className="text-slate-600 text-sm">
            Du hast jederzeit das Recht:
          </p>
          <ul className="list-disc list-inside text-sm text-slate-600 space-y-1 mt-2">
            <li>Auskunft über deine gespeicherten Daten zu erhalten.</li>
            <li>Die Löschung deines Kontos und aller Daten zu verlangen.</li>
            <li>Dich bei uns zu melden, wenn du Fragen hast.</li>
          </ul>

          <h3 className="text-lg font-bold mt-6">6. Kontakt</h3>
          <p className="text-slate-600 text-sm">
            Bei Fragen zum Datenschutz wende dich bitte an:<br/>
            [Dein Name / Vorstand der Moschee]<br/>
            [Email Adresse für Support]
          </p>

        </div>
      </div>
    </main>
  );
}