'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader2 } from "lucide-react";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    // Diese Funktion verarbeitet den Link aus der Email
    const handleAuthCallback = async () => {
      // Supabase prüft automatisch die URL auf den Login-Code
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Login Fehler:', error);
        router.push('/login?error=true');
      } else if (session) {
        // Erfolgreich! Wir sind drin.
        // Jetzt leiten wir zum Dashboard weiter.
        router.push('/'); 
      } else {
        // Manchmal dauert es kurz, wir warten auf das Event
        supabase.auth.onAuthStateChange((event, session) => {
          if (event === 'SIGNED_IN' && session) {
            router.push('/');
          }
        });
      }
    };

    handleAuthCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
      <Loader2 className="h-10 w-10 animate-spin text-slate-900" />
      <h2 className="text-xl font-bold text-slate-700">Du wirst angemeldet...</h2>
      <p className="text-slate-500">Bitte einen Moment warten.</p>
    </div>
  );
}