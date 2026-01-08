'use client';

import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function ImpressumPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-slate-50 p-6 flex flex-col items-center">
      
      <div className="w-full max-w-2xl">
        <Button variant="ghost" onClick={() => router.push('/')} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Zurück
        </Button>

        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 prose">
          <h1 className="text-2xl font-bold text-slate-900 mb-6">Impressum</h1>

          <h2 className="text-lg font-semibold mt-4">Angaben gemäß § 5 TMG</h2>
          <p className="text-slate-600 mb-4">
            <strong>Ride 2 Salah</strong><br />
            Ein Projekt der Bashier Moschee Community<br />
            [Ahmadiyya Muslim Gemeinde Bensheim]<br />
            [Zeppelinstraße 33]<br />
            [64625 Bensheim]
          </p>

          <h2 className="text-lg font-semibold mt-4">Kontakt</h2>
          <p className="text-slate-600 mb-4">
            E-Mail: [asad.jaryullah@ahmadiyya.de]<br />
            Telefon: [015904273761]
          </p>

          <h2 className="text-lg font-semibold mt-4">Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h2>
          <p className="text-slate-600 mb-4">
            [Asad Jaryullaj]<br />
            [Zeppelinstraße 33, 64625 Bensheim]
          </p>

          <h2 className="text-lg font-semibold mt-4">Haftungsausschluss</h2>
          <p className="text-slate-600 text-sm">
            Trotz sorgfältiger inhaltlicher Kontrolle übernehmen wir keine Haftung für die Inhalte externer Links. 
            Für den Inhalt der verlinkten Seiten sind ausschließlich deren Betreiber verantwortlich. 
            Die Nutzung der App "Ride 2 Salah" erfolgt auf eigene Verantwortung.
          </p>
        </div>
      </div>
    </main>
  );
}