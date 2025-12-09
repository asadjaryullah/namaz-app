'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Car, User, Settings, Loader2, AlertTriangle } from "lucide-react";
import MapComponent from '@/components/MapComponent'; 
import OneSignal from 'react-onesignal'; 

const ADMIN_EMAIL = "asad.jaryullah@gmail.com"; 

export default function HomePage() {
  const router = useRouter();
  
  const [loading, setLoading] = useState(true); 
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  
  const [activeDriverRide, setActiveDriverRide] = useState<any>(null);
  const [activePassengerRide, setActivePassengerRide] = useState<any>(null);

  useEffect(() => {
    let mounted = true;

    // 1. SICHERHEITS-TIMER: Falls Supabase hängt, brechen wir nach 2 Sek ab
    const safetyTimer = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 2000);

        const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          // 👇 HIER EINFÜGEN: Wir verknüpfen OneSignal mit der Supabase ID
          if (typeof window !== 'undefined') {
            OneSignal.login(session.user.id);
          }
          // -----------------------------------------------------------

          if(mounted) setUser(session.user);

          const today = new Date().toLocaleDateString('en-CA');
          
          const { data: driverRide } = await supabase
            .from('rides')
            .select('*')
            .eq('driver_id', session.user.id)
            .eq('status', 'active')
            .eq('ride_date', today)
            .maybeSingle();
          
          if(mounted && driverRide) setActiveDriverRide(driverRide);

          const { data: myBooking } = await supabase
            .from('bookings')
            .select('ride_id, rides!inner(status, ride_date)')
            .eq('passenger_id', session.user.id)
            .eq('status', 'accepted')
            .eq('rides.status', 'active')
            .eq('rides.ride_date', today)
            .maybeSingle();

          if (mounted && myBooking) {
             setActivePassengerRide(myBooking.ride_id);
          }
        }
      } catch (error) {
        console.error("Fehler:", error);
      } finally {
        if(mounted) setLoading(false);
      }
    };

    checkSession();

    // HIER WAR DER FEHLER: Wir laden NICHT mehr neu, sondern setzen nur den User
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setUser(session?.user ?? null);
        if(!session?.user) {
           setProfile(null);
           setActiveDriverRide(null);
           setActivePassengerRide(null);
        }
      }
    });

    return () => {
      mounted = false;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  // Ladebildschirm
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

  // Nicht eingeloggt
  if (!user) {
    return (
      <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 gap-8">
        <div className="flex flex-col items-center text-center animate-in fade-in zoom-in duration-500">
          <div className="relative w-[280px] h-[180px] mb-4">
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

  // Eingeloggt
  const firstName = profile?.full_name?.split(' ')[0] || user.user_metadata?.full_name?.split(' ')[0] || "Nutzer";
  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  const missingData = !profile?.phone;

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col p-6 gap-6 pb-20">
      
      <div className="mt-4">
        <h1 className="text-3xl font-bold text-slate-900">Salam, {firstName}! 👋</h1>
        <p className="text-slate-500">Wie möchtest du heute zur Moschee?</p>
      </div>

      {/* Ändere -my-2 zu my-6 oder my-8 für mehr Abstand */}
<div className="flex justify-center my-6"> 
  <div className="relative w-24 h-24 drop-shadow-sm hover:scale-105 transition-transform duration-300">
    <Image 
      src="/jubilaeum.png" 
      alt="20 Jahre Jubiläum" 
      fill 
      className="object-contain"
    />
  </div>
</div>

      {missingData && (
        <div 
          onClick={() => router.push('/profile')}
          className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-start gap-3 cursor-pointer hover:bg-red-100 transition-colors"
        >
          <AlertTriangle className="text-red-600 shrink-0" />
          <div>
            <p className="text-sm font-bold text-red-800">Profil unvollständig</p>
            <p className="text-xs text-red-700 mt-1">Bitte trage deine Nummer ein.</p>
          </div>
        </div>
      )}

      {activeDriverRide && (
        <div className="bg-blue-600 rounded-2xl p-4 text-white shadow-lg cursor-pointer flex items-center justify-between hover:bg-blue-700 transition-colors" onClick={() => router.push('/driver/dashboard')}>
          <div><p className="font-bold text-lg">Du bist Fahrer</p><p className="text-blue-100 text-sm">Zur Navigation</p></div>
          <div className="bg-white/20 p-2 rounded-full animate-pulse"><Car /></div>
        </div>
      )}

      {activePassengerRide && (
        <div className="bg-green-600 rounded-2xl p-4 text-white shadow-lg cursor-pointer flex items-center justify-between hover:bg-green-700 transition-colors" onClick={() => router.push(`/passenger/dashboard?rideId=${activePassengerRide}`)}>
          <div><p className="font-bold text-lg">Du fährst mit</p><p className="text-green-100 text-sm">Standort ansehen</p></div>
          <div className="bg-white/20 p-2 rounded-full animate-pulse"><User /></div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        <Card className="p-6 flex items-center gap-5 cursor-pointer hover:border-slate-900 transition-all border-2 border-transparent bg-white rounded-2xl shadow-sm" onClick={() => router.push('/select-prayer?role=driver')}>
          <div className="bg-slate-100 p-4 rounded-full h-16 w-16 flex items-center justify-center"><Car size={32} className="text-slate-900" /></div>
          <div><h2 className="text-xl font-bold text-slate-900">Fahrer</h2><p className="text-sm text-slate-500">Ich biete Plätze an</p></div>
        </Card>

        <Card className="p-6 flex items-center gap-5 cursor-pointer hover:border-blue-600 transition-all border-2 border-transparent bg-white rounded-2xl shadow-sm" onClick={() => router.push('/select-prayer?role=passenger')}>
          <div className="bg-blue-50 p-4 rounded-full h-16 w-16 flex items-center justify-center"><User size={32} className="text-blue-600" /></div>
          <div><h2 className="text-xl font-bold text-slate-900">Mitfahrer</h2><p className="text-sm text-slate-500">Ich suche eine Fahrt</p></div>
        </Card>
      </div>

      <div className="w-full mt-2 h-[200px] rounded-2xl overflow-hidden shadow-xl bg-slate-200 relative">
         <MapComponent />
      </div>

      {isAdmin && (
        <div className="mt-8 pt-8 border-t border-slate-200">
          <Button variant="outline" className="w-full" onClick={() => router.push('/admin')}>
            <Settings size={18} className="mr-2" /> Admin Bereich
          </Button>
        </div>
      )}
    </main>
  );
}