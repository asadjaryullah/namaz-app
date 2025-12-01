'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader2 } from "lucide-react";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleAuthCallback = async () => {
      // 1. Prüfen: Gibt es schon eine Session?
      const { data: { session }, error } = await supabase.auth.getSession();

      if (session) {
        // Ja -> Sofort weiter
        router.push('/');
        return;
      }

      if (error) {
        console.error('Auth error:', error);
        router.push('/login'); // Zurück bei Fehler
        return;
      }

      // 2. Listener: Falls der Login noch im Gange ist
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
          router.push('/');
        }
      });

      // 3. FALLBACK (Der "Schubser"): 
      // Wenn nach 2 Sekunden nichts passiert ist, probieren wir es einfach auf der Startseite.
      // Oft ist das Cookie schon da, aber der Event-Listener hat es verpasst.
      setTimeout(() => {
        router.push('/');
      }, 2000);

      return () => {
        subscription.unsubscribe();
      };
    };

    handleAuthCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
      <Loader2 className="h-10 w-10 animate-spin text-slate-900" />
      <h2 className="text-xl font-bold text-slate-700">Anmeldung wird verarbeitet...</h2>
      <p className="text-slate-500 text-sm">Du wirst gleich weitergeleitet.</p>
    </div>
  );
}