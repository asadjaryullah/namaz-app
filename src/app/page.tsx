// app/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase'; // Sicherstellen, dass der Pfad korrekt ist
import Image from 'next/image'; // Für Bilder

export default function HomePage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Lade...
      </div>
    );
  }

  if (session) {
    // Wenn der Benutzer angemeldet ist, zum Dashboard weiterleiten
    // Oder die Dashboard-Komponente direkt hier rendern, falls du keine separate Route hast
    router.push('/dashboard'); // Beispiel: Weiterleitung zum Dashboard
    return null; // Oder ein Lade-Spinner
  }

  // Pre-Login UI (basierend auf deinem ersten Screenshot)
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50 text-center">
      {/* Logo */}
      <div className="mb-8">
        <Image
          src="/path/to/your/logo.png" // Pfad zu deinem Ride2Salah Logo
          alt="Ride2Salah Bashier Moschee Logo"
          width={180}
          height={180}
          priority
        />
      </div>

      <h1 className="text-3xl font-bold mb-4 text-gray-800">Ride 2 Salah</h1>
      
      <div className="text-xl mb-8">
        <p className="font-arabic text-gray-700">
          حَيَّ عَلَى الصَّلاةِ
        </p>
        <p className="text-sm text-gray-500 mb-4">"KOMMT ZUM GEBET"</p>
        <p className="font-arabic text-gray-700">
          حَيَّ عَلَى الْفَلاحِ
        </p>
        <p className="text-sm text-gray-500">"KOMMT ZUM ERFOLG"</p>
      </div>

      {/* Anmelden Button - Weiterleitung zur Login-Seite */}
      <button
        onClick={() => router.push('/login')} // Oder direkt hier Magic Link auslösen
        className="bg-blue-700 text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:bg-blue-800 transition-colors mb-4 text-lg"
      >
        Anmelden
      </button>
      <p className="text-sm text-gray-600">Einloggen via Email (Magic Link)</p>

      {/* Karte (Platzhalter) */}
      <div className="mt-12 w-full max-w-lg rounded-lg shadow-md overflow-hidden border border-gray-200">
        {/* Hier würde die Google Maps Integration hinkommen */}
        <Image
          src="/path/to/your/map.png" // Platzhalterbild für die Karte, falls du keines hast
          alt="Moschee auf Karte"
          width={600}
          height={300}
          layout="responsive"
        />
      </div>

      {/* Footer */}
      <footer className="mt-12 text-sm text-gray-500">
        <p>&copy; 2025 Ride 2 Salah</p>
        <div className="flex justify-center gap-4 mt-1">
          <a href="/impressum" className="hover:underline">Impressum</a>
          <a href="/datenschutz" className="hover:underline">Datenschutz</a>
        </div>
      </footer>
    </div>
  );
}