'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Car, User, Settings, Loader2, AlertTriangle, MapPin, BookOpen } from "lucide-react";
import MapComponent from '@/components/MapComponent'; 
import OneSignal from 'react-onesignal'; 

const ADMIN_EMAIL = "asad.jaryullah@googlemail.com"; 

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

    // 1. SICHERHEITS-TIMER
    const safetyTimer = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 3000);

    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          // OneSignal Login
          if (typeof window !== 'undefined') {
            try { OneSignal.login(session.user.id); } catch(e) {}
          }

          if(mounted) setUser(session.user);
          
          // Profil laden
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();
          
          if(mounted && profileData) setProfile(profileData);

          const today = new Date().toLocaleDateString('en-CA');
          
          // 1. FAHRER CHECK
          const { data: driverRide } = await supabase
            .from('rides')
            .select('*')
            .eq('driver_id', session.user.id)
            .eq('status', 'active')
            .eq('ride_date', today)
            .maybeSingle();
          
          if(mounted && driverRide) setActiveDriverRide(driverRide);

          // 2. MITFAHRER CHECK
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

          // 3. EVENTS LADEN
          const { data: events } = await supabase
            .from('mosque_events')
            .select('*')
            .gte('event_date', new Date().toISOString())
            .order('event_date', { ascending: true })
            .limit(3);
          
          if(mounted && events) setUpcomingEvents(events);
        }
      } catch (error) {
        console.error("Session check failed", error);
      } finally {
        if(mounted) setLoading(false);
      }
    };

    checkSession();

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

  // --- NICHT EINGELOGGT ---
  if (!user) {
    return (
      <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 gap-8 animate-in fade-in zoom-in duration-500">
        <div className="flex flex-col items-center text-center">
          <div className="relative w-[280px] h-[180px] mb-4">
            <Image src="/icon.png" alt="Logo" fill className="object-contain" priority />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 mb-6">Ride 2 Salah</h1>
          <div className="space-y-6 mt-2">
            <div className="flex flex-col items-center gap-2">
              <p className="text-4xl text-slate-800 leading-relaxed" style={{ fontFamily: 'var(--font-amiri)' }}>حَيَّ عَلَىٰ ٱلصَّلَاةِ</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">"Kommt zum Gebet"</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <p className="text-4xl text-slate-800 leading-relaxed" style={{ fontFamily: 'var(--font-amiri)' }}>حَيَّ عَلَىٰ ٱلْفَلَاحِ</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">"Kommt zum Erfolg"</p>
            </div>
          </div>
        </div>
        <div className="w-full max-w-xs space-y-4 mt-4 text-center">
          <Button size="lg" className="w-full h-14 text-lg bg-slate-900 hover:bg-slate-800 text-white rounded-2xl shadow-xl transition-transform active:scale-95" onClick={() => router.push('/login')}>
            Anmelden
          </Button>
          <p className="text-xs text-slate-400">Einloggen via Code (Magic Link)</p>
        </div>
      </main>
    );
  }

  // --- EINGELOGGT ---
  const firstName = profile?.full_name?.split(' ')[0] || user.user_metadata?.full_name?.split(' ')[0] || "Nutzer";
  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  const isApproved = profile?.is_approved === true;
  const missingData = !profile?.phone || !profile?.gender || !profile?.member_id;

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col p-6 gap-6 pb-20">
      
      <div className="mt-4">
        <h1 className="text-3xl font-bold text-slate-900">Salam, {firstName}! 👋</h1>
        <p className="text-slate-500">Wie möchtest du heute zur Moschee?</p>
      </div>

      <div className="flex justify-center my-4"> 
        <div className="relative w-20 h-20 drop-shadow-sm">
          <Image src="/jubilaeum.png" alt="20 Jahre Jubiläum" fill className="object-contain" />
        </div>
      </div>

      {/* WARNUNG: DATEN FEHLEN */}
      {missingData && (
        <div onClick={() => router.push('/profile')} className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-start gap-3 cursor-pointer hover:bg-red-100 transition-colors">
          <AlertTriangle className="text-red-600 shrink-0" />
          <div>
            <p className="text-sm font-bold text-red-800">Profil unvollständig</p>
            <p className="text-xs text-red-700 mt-1">Bitte ID und Handy eintragen.</p>
          </div>
        </div>
      )}

      {/* WARNUNG: FREIGABE */}
      {!isApproved && !missingData && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-xl">
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 text-yellow-600 animate-spin" />
            <h3 className="font-bold text-yellow-800">Warte auf Freigabe</h3>
          </div>
          <p className="text-sm text-yellow-700 mt-1">Ein Admin prüft deine ID.</p>
        </div>
      )}

      {/* AKTIVE FAHRTEN */}
      {activeDriverRide && (
        <div className="bg-blue-600 rounded-2xl p-4 text-white shadow-lg cursor-pointer flex items-center justify-between" onClick={() => router.push('/driver/dashboard')}>
          <div><p className="font-bold text-lg">Du bist Fahrer</p><p className="text-blue-100 text-sm">Zur Navigation</p></div>
          <div className="bg-white/20 p-2 rounded-full animate-pulse"><Car /></div>
        </div>
      )}

      {activePassengerRide && (
        <div className="bg-green-600 rounded-2xl p-4 text-white shadow-lg cursor-pointer flex items-center justify-between" onClick={() => router.push(`/passenger/dashboard?rideId=${activePassengerRide}`)}>
          <div><p className="font-bold text-lg">Du fährst mit</p><p className="text-green-100 text-sm">Standort ansehen</p></div>
          <div className="bg-white/20 p-2 rounded-full animate-pulse"><User /></div>
        </div>
      )}

      {/* EVENTS VORSCHAU */}
      {upcomingEvents.length > 0 && (
        <div className="w-full">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Nächste Termine</p>
          <div className="space-y-3">
            {upcomingEvents.map(e => (
              <div key={e.id} className="bg-white p-3 rounded-2xl border border-slate-100 flex items-center gap-3 shadow-sm">
                <div className="bg-orange-50 p-2 rounded-xl text-orange-600 text-center min-w-[3.5rem]">
                  <span className="block text-[10px] font-bold uppercase">{new Date(e.event_date).toLocaleDateString('de-DE', {weekday: 'short'})}</span>
                  <span className="block text-lg font-bold leading-none">{new Date(e.event_date).getDate()}</span>
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-sm">{e.title}</p>
                  <p className="text-[10px] text-slate-500 uppercase">{new Date(e.event_date).toLocaleTimeString('de-DE', {hour:'2-digit', minute:'2-digit'})} Uhr</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* HAUPT-AUSWAHL */}
      {(isApproved || isAdmin) && (
        <div className="grid grid-cols-1 gap-4">
          <Card className="p-6 flex items-center gap-5 cursor-pointer hover:border-slate-900 transition-all border-2 border-transparent bg-white rounded-2xl shadow-sm" onClick={() => router.push('/select-prayer?role=driver')}>
            <div className="bg-slate-100 p-4 rounded-full"><Car size={32} className="text-slate-900" /></div>
            <div><h2 className="text-xl font-bold text-slate-900">Fahrer</h2><p className="text-sm text-slate-500">Ich biete Plätze an</p></div>
          </Card>

          <Card className="p-6 flex items-center gap-5 cursor-pointer hover:border-blue-600 transition-all border-2 border-transparent bg-white rounded-2xl shadow-sm" onClick={() => router.push('/select-prayer?role=passenger')}>
            <div className="bg-blue-50 p-4 rounded-full"><User size={32} className="text-blue-600" /></div>
            <div><h2 className="text-xl font-bold text-slate-900">Mitfahrer</h2><p className="text-sm text-slate-500">Ich suche eine Fahrt</p></div>
          </Card>
        </div>
      )}

      {/* LOGBUCH BUTTON */}
      <div className="flex justify-center">
        <Button variant="ghost" className="w-full h-12 text-slate-500" onClick={() => router.push('/history')}>
          <BookOpen className="mr-2 h-5 w-5" /> Zum Zikr & Logbuch
        </Button>
      </div>

      {/* MAP / ZIEL */}
      <div className="w-full">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Ziel</p>
        <div className="h-[180px] w-full rounded-2xl overflow-hidden border-4 border-white shadow-xl bg-slate-200 relative">
          <MapComponent />
          <div className="absolute bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm p-2 text-center text-[10px] font-bold text-green-800 border-t">📍 Bashir Moschee, Bensheim</div>
        </div>
      </div>

      {/* ADMIN BEREICH */}
      {isAdmin && (
        <div className="mt-4 pt-4 border-t border-slate-200">
          <Button variant="outline" className="w-full justify-start gap-3 h-12 text-slate-600" onClick={() => router.push('/admin')}>
            <Settings size={18} /> Gebetszeiten & Termine
          </Button>
        </div>
      )}
    </main>
  );
}