'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Car, User, Settings, Loader2, MapPin } from "lucide-react";

// 👇 Auch hier zur Sicherheit für den Admin-Button
const ADMIN_EMAIL = "asad.jaryullah@googlemail.com"; 

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  
  // Prüfen, ob eine Fahrt aktiv ist (für den Resume-Button)
  const [activeRide, setActiveRide] = useState<any>(null);

  useEffect(() => {
    const init = async () => {
      // 1. Session prüfen (lokal gespeichert)
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        setUser(user);
        
        // 2. Profil laden (für den Namen)
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        setProfile(profileData);

        // 3. Prüfen: Ist dieser User gerade Fahrer einer aktiven Fahrt?
        const today = new Date().toISOString().split('T')[0];
        const { data: rideData } = await supabase
          .from('rides')
          .select('*')
          .eq('driver_id', user.id)
          .eq('status', 'active')
          .eq('ride_date', today)
          .maybeSingle(); // maybeSingle wirft keinen Fehler wenn leer
        
        if (rideData) setActiveRide(rideData);
      }
      
      setLoading(false);
    };

    init();
  }, []);

  // --- ANSICHT 1: NICHT EINGELOGGT (Landing Page) ---
  if (!loading && !user) {
    return (
      <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 gap-10">
        <div className="flex flex-col items-center text-center animate-in fade-in zoom-in duration-500">
          <div className="relative w-[280px] h-[180px] mb-6">
            <Image src="/way2bashier.png" alt="Logo" fill className="object-contain" priority />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900">Namaz Taxi</h1>
          <p className="text-slate-600 mt-2 max-w-xs">
            Gemeinsam & pünktlich zum Gebet in der Bashir Moschee.
          </p>
        </div>

        <div className="w-full max-w-xs space-y-4">
          <Button 
            size="lg" 
            className="w-full h-14 text-lg bg-slate-900 hover:bg-slate-800 text-white rounded-2xl shadow-xl"
            onClick={() => router.push('/login')}
          >
            Jetzt Anmelden / Registrieren
          </Button>
          <p className="text-xs text-center text-slate-400">Kostenlos & sicher via Email</p>
        </div>
      </main>
    );
  }

  // --- ANSICHT 2: LADEBILDSCHIRM (Kurz) ---
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-slate-400 h-8 w-8"/></div>;
  }

  // --- ANSICHT 3: EINGELOGGT (Das Dashboard) ---
  const firstName = profile?.full_name?.split(' ')[0] || "Nutzer";
  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col p-6 gap-6">
      
      {/* Begrüßung */}
      <div className="mt-4">
        <h1 className="text-3xl font-bold text-slate-900">Salam, {firstName}! 👋</h1>
        <p className="text-slate-500">Wie möchtest du heute zur Moschee?</p>
      </div>

      {/* Falls Fahrer eine aktive Fahrt hat -> Resume Button */}
      {activeRide && (
        <div className="bg-blue-600 rounded-2xl p-4 text-white shadow-lg shadow-blue-200 cursor-pointer flex items-center justify-between"
             onClick={() => router.push('/driver/dashboard')}
        >
          <div>
            <p className="font-bold text-lg">Laufende Fahrt</p>
            <p className="text-blue-100 text-sm">Tippen zum Öffnen</p>
          </div>
          <div className="bg-white/20 p-2 rounded-full animate-pulse">
            <MapPin />
          </div>
        </div>
      )}

      {/* Haupt-Aktionen */}
      <div className="grid grid-cols-1 gap-4">
        
        {/* FAHRER CARD */}
        <Card 
          className="p-6 flex items-center gap-5 cursor-pointer hover:border-slate-900 hover:shadow-md transition-all border-2 border-transparent bg-white rounded-2xl"
          onClick={() => router.push('/select-prayer?role=driver')}
        >
          <div className="bg-slate-100 p-4 rounded-full h-16 w-16 flex items-center justify-center">
            <Car size={32} className="text-slate-900" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Fahrer</h2>
            <p className="text-sm text-slate-500">Ich biete Plätze an</p>
          </div>
        </Card>

        {/* MITFAHRER CARD */}
        <Card 
          className="p-6 flex items-center gap-5 cursor-pointer hover:border-blue-600 hover:shadow-md transition-all border-2 border-transparent bg-white rounded-2xl"
          onClick={() => router.push('/select-prayer?role=passenger')}
        >
          <div className="bg-blue-50 p-4 rounded-full h-16 w-16 flex items-center justify-center">
            <User size={32} className="text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Mitfahrer</h2>
            <p className="text-sm text-slate-500">Ich suche eine Fahrt</p>
          </div>
        </Card>

      </div>

      {/* ADMIN BEREICH (Nur sichtbar für dich) */}
      {isAdmin && (
        <div className="mt-8 pt-8 border-t border-slate-200">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Verwaltung</p>
          <Button 
            variant="outline" 
            className="w-full justify-start gap-3 h-12 text-slate-600 border-slate-300"
            onClick={() => router.push('/select-prayer?role=driver')} // Admin nutzt die gleiche Seite, sieht aber Inputs
          >
            <Settings size={18} />
            Gebetszeiten bearbeiten
          </Button>
        </div>
      )}

    </main>
  );
}