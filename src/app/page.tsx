'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Car, User, Settings, Loader2, MapPin } from "lucide-react";
import MapComponent from '@/components/MapComponent'; 

// 👇 HIER DEINE EMAIL
const ADMIN_EMAIL = "asad.jaryullah@googlemail.com"; 

export default function HomePage() {
  const router = useRouter();
  
  const [loading, setLoading] = useState(true); 
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  
  // Zwei Zustände für aktive Fahrten
  const [activeDriverRide, setActiveDriverRide] = useState<any>(null);
  const [activePassengerRide, setActivePassengerRide] = useState<any>(null);

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          if(mounted) setUser(session.user);
          
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          if(mounted) setProfile(profileData);

          if (!profileData || !profileData.phone) {
             router.push('/profile'); // Leitet zur Profilseite, wenn Daten fehlen
             return; 
          }

          const today = new Date().toISOString().split('T')[0];
          
          // 1. CHECK: Bin ich FAHRER einer aktiven Fahrt?
          const { data: driverRide } = await supabase
            .from('rides')
            .select('*')
            .eq('driver_id', session.user.id)
            .eq('status', 'active')
            .eq('ride_date', today)
            .maybeSingle();
          
          if(mounted && driverRide) setActiveDriverRide(driverRide);

          // 2. CHECK: Bin ich MITFAHRER einer aktiven Fahrt?
          // Wir suchen in 'bookings', ob es eine Buchung gibt, die zu einer aktiven Fahrt gehört
          const { data: myBooking } = await supabase
            .from('bookings')
            .select('ride_id, rides ( status, ride_date )') // Join mit rides Tabelle
            .eq('passenger_id', session.user.id)
            .eq('status', 'accepted') // Nur akzeptierte Buchungen
            .maybeSingle();

          // Prüfen ob die verknüpfte Fahrt aktiv und von heute ist
          // @ts-ignore (TypeScript meckert manchmal bei Joins, ist aber okay hier)
          if (myBooking && myBooking.rides && myBooking.rides.status === 'active' && myBooking.rides.ride_date === today) {
             setActivePassengerRide(myBooking.ride_id);
          }
        }
      } catch (error) {
        console.error("Session check failed", error);
      } finally {
        if(mounted) setLoading(false);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        setUser(null);
        setProfile(null);
        setActiveDriverRide(null);
        setActivePassengerRide(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <div className="relative w-24 h-24 animate-pulse">
           <Image src="/icon.png" alt="Logo" fill className="object-contain" />
        </div>
        <Loader2 className="animate-spin text-slate-400 h-6 w-6"/>
      </div>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 gap-8">
        <div className="flex flex-col items-center text-center animate-in fade-in zoom-in duration-500">
          <div className="relative w-[450px] max-w-[90vw] h-[350px] mb-4">
            <Image src="/icon.png" alt="Logo" fill className="object-contain" priority />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 mb-6">Ride 2 Salah</h1>
          <div className="space-y-6 mt-2">
            <div className="flex flex-col items-center gap-2">
              <p className="text-4xl text-slate-800 leading-relaxed" style={{ fontFamily: 'var(--font-amiri)' }}>
                حَيَّ عَلَىٰ ٱلصَّلَاةِ
              </p>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">"Kommt zum Gebet"</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <p className="text-4xl text-slate-800 leading-relaxed" style={{ fontFamily: 'var(--font-amiri)' }}>
                حَيَّ عَلَىٰ ٱلْفَلَاحِ
              </p>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">"Kommt zum Erfolg"</p>
            </div>
          </div>
        </div>
        <div className="w-full max-w-xs space-y-4 mt-4">
          <Button size="lg" className="w-full h-14 text-lg bg-slate-900 hover:bg-slate-800 text-white rounded-2xl shadow-xl transition-transform active:scale-95" onClick={() => router.push('/login')}>
            Anmelden
          </Button>
          <p className="text-xs text-center text-slate-400">Einloggen via Email (Magic Link)</p>
        </div>
        <div className="w-full max-w-md mt-4 pointer-events-none"> 
           <div className="h-[180px] w-full rounded-2xl overflow-hidden border-4 border-white shadow-xl bg-slate-200">
             <MapComponent />
           </div>
        </div>
      </main>
    );
  }

  const firstName = profile?.full_name?.split(' ')[0] || user.user_metadata?.full_name?.split(' ')[0] || "Nutzer";
  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col p-6 gap-6 pb-20">
      
      <div className="mt-4">
        <h1 className="text-3xl font-bold text-slate-900">Salam, {firstName}! 👋</h1>
        <p className="text-slate-500">Wie möchtest du heute zur Moschee?</p>
      </div>

      {/* --- BUTTON FÜR FAHRER (BLAU) --- */}
      {activeDriverRide && (
        <div className="bg-blue-600 rounded-2xl p-4 text-white shadow-lg cursor-pointer flex items-center justify-between hover:bg-blue-700 transition-colors animate-in slide-in-from-top-2"
             onClick={() => router.push('/driver/dashboard')}
        >
          <div>
            <p className="font-bold text-lg">Du bist Fahrer</p>
            <p className="text-blue-100 text-sm">Zur Navigation / Mitfahrer sehen</p>
          </div>
          <div className="bg-white/20 p-2 rounded-full animate-pulse"><Car /></div>
        </div>
      )}

      {/* --- BUTTON FÜR MITFAHRER (GRÜN) --- */}
      {activePassengerRide && (
        <div className="bg-green-600 rounded-2xl p-4 text-white shadow-lg cursor-pointer flex items-center justify-between hover:bg-green-700 transition-colors animate-in slide-in-from-top-2"
             onClick={() => router.push(`/passenger/dashboard?rideId=${activePassengerRide}`)}
        >
          <div>
            <p className="font-bold text-lg">Du fährst mit</p>
            <p className="text-green-100 text-sm">Standort & Details ansehen</p>
          </div>
          <div className="bg-white/20 p-2 rounded-full animate-pulse"><User /></div>
        </div>
      )}

     {/* ... (Die blauen/grünen Banner für aktive Fahrten bleiben oben) ... */}

      {/* HAUPT-AUSWAHL (IMMER SICHTBAR, damit man weitere Gebete buchen kann) */}
      <div className="grid grid-cols-1 gap-4">
        <Card 
          className="p-6 flex items-center gap-5 cursor-pointer hover:border-slate-900 transition-all border-2 border-transparent bg-white rounded-2xl shadow-sm hover:shadow-md"
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

        <Card 
          className="p-6 flex items-center gap-5 cursor-pointer hover:border-blue-600 transition-all border-2 border-transparent bg-white rounded-2xl shadow-sm hover:shadow-md"
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
      
      <div className="w-full mt-2">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Ziel</p>
        <div className="h-[200px] w-full rounded-2xl overflow-hidden border-4 border-white shadow-xl bg-slate-200 relative">
          <MapComponent />
          <div className="absolute bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm p-2 text-center text-xs font-bold text-green-800 border-t">
            📍 Bashir Moschee, Bensheim
          </div>
        </div>
      </div>

      {isAdmin && (
        <div className="mt-8 pt-8 border-t border-slate-200">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Admin</p>
          <Button variant="outline" className="w-full justify-start gap-3 h-12 text-slate-600" onClick={() => router.push('/admin')}>
            <Settings size={18} /> Gebetszeiten bearbeiten
          </Button>
        </div>
      )}
    </main>
  );
}