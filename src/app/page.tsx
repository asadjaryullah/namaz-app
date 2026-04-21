'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Car, User, Settings, Loader2, AlertTriangle, MapPin, Calendar, ArrowRight } from "lucide-react";
import MapComponent from '@/components/MapComponent';
import OneSignal from 'react-onesignal';
import ZikrWidget from '@/components/ZikrWidget';
import NextPrayerBanner from '@/components/NextPrayerBanner';
import { waitForOneSignalReady } from '@/lib/onesignal';

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "";

export default function HomePage() {
  const router = useRouter();
  
  const [loading, setLoading] = useState(true); 
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  
  const [activeDriverRide, setActiveDriverRide] = useState<any>(null);
  const [activePassengerRide, setActivePassengerRide] = useState<any>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;

    // Sicherheits-Timer: Beendet das Laden nach 2 Sekunden, falls DB hängt
    const safetyTimer = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 2000);

    const initApp = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          if(mounted) {
            setUser(null);
            setLoading(false);
          }
          return;
        }

        // OneSignal im Hintergrund – blockiert Ladescreen nicht mehr
        if (typeof window !== 'undefined') {
            waitForOneSignalReady(4000).then(() => {
              try { OneSignal.login(session.user.id); } catch(e) {}
            }).catch(() => {});
        }

        if(mounted) setUser(session.user);

        // Berlin-Datum konsistent mit dem Backend
        const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' });

        // Alle Queries parallel
        const [
          { data: profileData, error: profileErr },
          { data: driverRide },
          { data: myBooking },
          { data: events, error: eventsErr },
        ] = await Promise.all([
          supabase.from('profiles').select('id,full_name,is_approved,phone,gender,member_id').eq('id', session.user.id).maybeSingle(),
          supabase.from('rides').select('id').eq('driver_id', session.user.id).eq('status', 'active').eq('ride_date', today).maybeSingle(),
          supabase.from('bookings').select('ride_id, rides!inner(status, ride_date)').eq('passenger_id', session.user.id).eq('status', 'accepted').eq('rides.status', 'active').eq('rides.ride_date', today).maybeSingle(),
          supabase.from('mosque_events').select('id,title,event_date').gte('event_date', new Date().toISOString()).order('event_date', { ascending: true }).limit(3),
        ]);

        if (profileErr) console.error("Profil Fehler:", profileErr.message);
        if (eventsErr) console.error("Events Fehler:", eventsErr.message);

        if (mounted && profileData) setProfile(profileData);
        if (mounted && driverRide) setActiveDriverRide(driverRide);
        if (mounted && myBooking) setActivePassengerRide(myBooking.ride_id);
        if (mounted && events) setUpcomingEvents(events);

      } catch (error) {
        console.error("Start Fehler:", error);
      } finally {
        clearTimeout(safetyTimer);
        if(mounted) setLoading(false);
      }
    };

    initApp();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
         setUser(null);
         setProfile(null);
         setActiveDriverRide(null);
         setActivePassengerRide(null);
      } else if (event === 'SIGNED_IN' && session) {
         setUser(session.user);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, [router]);

  // --- LADEBILDSCHIRM ---
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

  // --- ANSICHT: NICHT EINGELOGGT ---
  if (!user) {
    return (
      <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 animate-in fade-in duration-700 relative overflow-hidden">
        {/* Atmosphärischer Hintergrund-Glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-950/60 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-slate-900/80 rounded-full blur-3xl" />
        </div>

        <div className="flex flex-col items-center text-center relative z-10 w-full max-w-xs">
          {/* Logo */}
          <div className="relative w-[260px] h-[200px] mb-2 opacity-95">
            <Image src="/icon.png" alt="Logo" fill className="object-contain" priority />
          </div>

          <h1 className="text-2xl font-extrabold text-white tracking-tight">Ride 2 Salah</h1>
          <p className="text-slate-600 text-[10px] uppercase tracking-[0.2em] mt-1 mb-10">Bashier Moschee · Bensheim</p>

          {/* Arabischer Text */}
          <div className="space-y-7 mb-12 w-full">
            <div className="flex flex-col items-center gap-2">
              <p className="text-5xl text-amber-200/80 leading-relaxed" style={{ fontFamily: 'var(--font-amiri)' }}>
                حَيَّ عَلَىٰ ٱلصَّلَاةِ
              </p>
              <p className="text-[9px] text-slate-600 uppercase tracking-[0.25em]">"Kommt zum Gebet"</p>
            </div>
            <div className="h-px w-16 bg-slate-800 mx-auto" />
            <div className="flex flex-col items-center gap-2">
              <p className="text-5xl text-amber-200/80 leading-relaxed" style={{ fontFamily: 'var(--font-amiri)' }}>
                حَيَّ عَلَىٰ ٱلْفَلَاحِ
              </p>
              <p className="text-[9px] text-slate-600 uppercase tracking-[0.25em]">"Kommt zum Erfolg"</p>
            </div>
          </div>

          <div className="w-full space-y-3">
            <Button
              size="lg"
              className="w-full h-14 text-base font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl shadow-2xl shadow-emerald-950 transition-all active:scale-95"
              onClick={() => router.push('/login')}
            >
              Anmelden
            </Button>
            <p className="text-xs text-center text-slate-700">Einloggen via Code — kein Passwort nötig</p>
          </div>
        </div>
      </main>
    );
  }

  // --- ANSICHT: EINGELOGGT ---
  const firstName = profile?.full_name?.split(' ')[0] || "Nutzer";
  const isAdmin = user?.email?.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase().trim();
  const isApproved = profile?.is_approved === true;
  const missingData = !profile?.phone || !profile?.gender || !profile?.member_id;

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col p-6 gap-5 pb-20">

      {/* Nächstes Gebet Banner */}
      <NextPrayerBanner />

      <div className="mt-1">
        <h1 className="text-2xl font-bold text-slate-900">Salam, {firstName}! 👋🏼</h1>
        <p className="text-slate-400 text-sm">Wie möchtest du heute zur Moschee?</p>
      </div>

      <div className="flex justify-center">
        <div className="relative w-16 h-16 drop-shadow-sm hover:scale-105 transition-transform duration-300 opacity-70">
          <Image src="/jubilaeum.png" alt="Jubiläum" fill className="object-contain" />
        </div>
      </div>

      {missingData && (
        <div onClick={() => router.push('/profile')} className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-start gap-3 cursor-pointer hover:bg-red-100 transition-colors">
          <AlertTriangle className="text-red-600 shrink-0" />
          <div>
            <p className="text-sm font-bold text-red-800">Profil unvollständig</p>
            <p className="text-xs text-red-700 mt-1">Bitte Daten vervollständigen.</p>
          </div>
        </div>
      )}

      {!isApproved && !missingData && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-xl mb-4">
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 text-yellow-600 animate-spin" />
            <h3 className="font-bold text-yellow-800">Warte auf Freigabe</h3>
          </div>
          <p className="text-sm text-yellow-700 mt-1">Ein Admin prüft deine ID.</p>
        </div>
      )}

      {/* ZIKR WIDGET */}
      <ZikrWidget userId={user.id} />

      {/* EVENTS KARTE */}
      <div 
        onClick={() => router.push('/history?tab=events')}
        className="w-full bg-white rounded-2xl shadow-sm border border-slate-100 p-4 cursor-pointer hover:border-blue-300 hover:shadow-md transition-all group"
      >
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Calendar size={14} /> Kalender & Termine
          </p>
          <ArrowRight size={16} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
        </div>

        {upcomingEvents.length > 0 ? (
          <div className="space-y-2">
            {upcomingEvents.map(e => (
              <div key={e.id} className="flex items-center gap-3 bg-slate-50 p-2 rounded-lg group-hover:bg-blue-50/50 transition-colors">
                 <div className="bg-white p-1.5 rounded-md text-orange-600 font-bold text-center shadow-sm min-w-[2.5rem]">
                    <span className="block text-[9px] uppercase">{new Date(e.event_date).toLocaleDateString('de-DE', {weekday: 'short'})}</span>
                    <span className="block text-sm leading-none">{new Date(e.event_date).getDate()}</span>
                 </div>
                 <div className="overflow-hidden">
                    <p className="font-bold text-slate-800 text-sm truncate">{e.title}</p>
                    <p className="text-[10px] text-slate-500">{new Date(e.event_date).toLocaleTimeString('de-DE', {hour:'2-digit', minute:'2-digit'})} Uhr</p>
                 </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-slate-400 text-sm italic">
            Keine anstehenden Termine.
          </div>
        )}
      </div>

      {activeDriverRide && (
        <div className="bg-blue-600 rounded-2xl p-4 text-white shadow-lg cursor-pointer flex items-center justify-between hover:bg-blue-700 transition-colors mt-4" onClick={() => router.push('/driver/dashboard')}>
          <div><p className="font-bold text-lg">Du bist Fahrer</p><p className="text-blue-100 text-sm">Zur Navigation</p></div>
          <div className="bg-white/20 p-2 rounded-full animate-pulse"><Car /></div>
        </div>
      )}

      {activePassengerRide && (
        <div className="bg-green-600 rounded-2xl p-4 text-white shadow-lg cursor-pointer flex items-center justify-between hover:bg-green-700 transition-colors mt-4" onClick={() => router.push(`/passenger/dashboard?rideId=${activePassengerRide}`)}>
          <div><p className="font-bold text-lg">Du fährst mit</p><p className="text-green-100 text-sm">Standort ansehen</p></div>
          <div className="bg-white/20 p-2 rounded-full animate-pulse"><User /></div>
        </div>
      )}

      {(isApproved || isAdmin) && (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => router.push('/select-prayer?role=driver')}
            className="bg-slate-900 rounded-2xl p-5 text-white text-left hover:bg-slate-800 transition-all active:scale-95 shadow-lg group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full -translate-y-8 translate-x-8" />
            <Car size={26} className="mb-4 text-slate-400 group-hover:text-slate-200 transition-colors" />
            <p className="font-black text-lg leading-none">Fahrer</p>
            <p className="text-slate-500 text-xs mt-1.5">Plätze anbieten</p>
          </button>
          <button
            onClick={() => router.push('/select-prayer?role=passenger')}
            className="bg-emerald-700 rounded-2xl p-5 text-white text-left hover:bg-emerald-600 transition-all active:scale-95 shadow-lg shadow-emerald-900/30 group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-8 translate-x-8" />
            <User size={26} className="mb-4 text-emerald-300 group-hover:text-white transition-colors" />
            <p className="font-black text-lg leading-none">Mitfahrer</p>
            <p className="text-emerald-300/80 text-xs mt-1.5">Fahrt suchen</p>
          </button>
        </div>
      )}

      <div className="w-full mt-6 h-[200px] rounded-2xl overflow-hidden shadow-xl bg-slate-200 relative">
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
