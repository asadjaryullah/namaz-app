'use client';

import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function ImpressumPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-slate-50 p-6 flex flex-col items-center">
      
      <div className="w-full max-w-2xl mb-6">
        <Button variant="ghost" onClick={() => router.push('/')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Zurück zur App
        </Button>
      </div>

      <div className="w-full max-w-2xl bg-white p-8 rounded-2xl shadow-sm border border-slate-100 prose prose-slate">
        <h1 className="text-2xl font-bold mb-4">Impressum</h1>
        
        <h2 className="text-lg font-semibold mt-4">Angaben gemäß § 5 TMG</h2>
        <p>
          <strong>Namaz Taxi</strong><br />
          Betrieben von:<br />
          Max Mustermann (Dein Name)<br />
          Musterstraße 1 (Deine Adresse)<br />
          12345 Musterstadt
        </p>

        <h2 className="text-lg font-semibold mt-4">Kontakt</h2>
        <p>
          Telefon: +49 1590 4273761<br />
          E-Mail: asad.jaryullah@gmail.com
        </p>

        <h2 className="text-lg font-semibold mt-4">Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h2>
        <p>
          Asad Jaryullah<br />
          Zeppelinstraße 33<br />
          64625 Bensheim
        </p>

        <h2 className="text-lg font-semibold mt-4">Haftungsausschluss</h2>
        <p className="text-sm text-slate-500">
          Die Inhalte unserer Seiten wurden mit größter Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte können wir jedoch keine Gewähr übernehmen.
        </p>
      </div>
    </main>
  );
}