'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
// ArrowRight für den Kalender-Button hinzugefügt
import { Car, User, Settings, Loader2, AlertTriangle, MapPin, Calendar, ArrowRight } from "lucide-react";
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
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;

    const safetyTimer = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 2000);

    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          if (typeof window !== 'undefined') {
            try { OneSignal.login(session.user.id); } catch(e) { console.error(e); }
          }

          if(mounted) setUser(session.user);
          
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
            .throwOnError(); 
          
          if(mounted && profileData) setProfile(profileData);

          const today = new Date().toLocaleDateString('en-CA');
          
          // Fahrten laden
          const { data: driverRide } = await supabase.from('rides').select('*').eq('driver_id', session.user.id).eq('status', 'active').eq('ride_date', today).maybeSingle();
          if(mounted && driverRide) setActiveDriverRide(driverRide);

          const { data: myBooking } = await supabase.from('bookings').select('ride_id, rides!inner(status, ride_date)').eq('passenger_id', session.user.id).eq('status', 'accepted').eq('rides.status', 'active').eq('rides.ride_date', today).maybeSingle();
          if (mounted && myBooking) setActivePassengerRide(myBooking.ride_id);

          // Events laden
          const { data: events } = await supabase
            .from('mosque_events')
            .select('*')
            .gte('event_date', new Date().toISOString())
            .order('event_date', { ascending: true })
            .limit(3);
          
          if(mounted && events) setUpcomingEvents(events);
        }
      } catch (error) {
        console.error("Fehler beim Laden:", error);
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
      <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 gap-8 animate-in fade-in duration-500">
        <div className="flex flex-col items-center text-center">
          <div className="relative w-[450px] max-w-[90vw] h-[350px] mb-4">
            <Image src="/icon.png" alt="Logo" fill className="object-contain" priority />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 mb-6">Ride 2 Salah</h1>
          
          <div className="w-full max-w-xs space-y-4 mt-4">
            <Button size="lg" className="w-full h-14 text-lg bg-slate-900 hover:bg-slate-800 text-white rounded-2xl shadow-xl" onClick={() => router.push('/login')}>
              Anmelden
            </Button>
            <p className="text-xs text-center text-slate-400">Einloggen via Code (Sicher)</p>
          </div>
        </div>
      </main>
    );
  }

  const firstName = profile?.full_name?.split(' ')[0] || "Nutzer";
  const isAdmin = user?.email?.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase().trim();
  const isApproved = profile?.is_approved === true;
  const missingData = !profile?.phone || !profile?.gender || !profile?.member_id;

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col p-6 gap-6 pb-20">
      
      <div className="mt-4">
        <h1 className="text-3xl font-bold text-slate-900">Salam, {firstName}! 👋</h1>
        <p className="text-slate-500">Wie möchtest du heute zur Moschee?</p>
      </div>

      <div className="flex justify-center my-6"> 
        <div className="relative w-24 h-24 drop-shadow-sm hover:scale-105 transition-transform duration-300">
          <Image src="/jubilaeum.png" alt="20 Jahre Jubiläum" fill className="object-contain" />
        </div>
      </div>

      {missingData && (
        <div onClick={() => router.push('/profile')} className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-start gap-3 cursor-pointer hover:bg-red-100 transition-colors">
          <AlertTriangle className="text-red-600 shrink-0" />
          <div>
            <p className="text-sm font-bold text-red-800">Profil unvollständig</p>
            <p className="text-xs text-red-700 mt-1">Bitte ID und Handy eintragen.</p>
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

      {/* --- GROSSER KALENDER BUTTON (mit Events drin) --- */}
      <div 
        onClick={() => router.push('/history')}
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
            <br/><span className="text-xs">Tippe hier für Zikr & Logbuch.</span>
          </div>
        )}
      </div>
      {/* ----------------------------------------------- */}

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
        <div className="grid grid-cols-1 gap-4 mt-4">
          <Card className="p-6 flex items-center gap-5 cursor-pointer bg-white rounded-2xl shadow-sm hover:shadow-md" onClick={() => router.push('/select-prayer?role=driver')}>
            <div className="bg-slate-100 p-4 rounded-full h-16 w-16 flex items-center justify-center"><Car size={32} className="text-slate-900" /></div>
            <div><h2 className="text-xl font-bold text-slate-900">Fahrer</h2><p className="text-sm text-slate-500">Ich biete Plätze an</p></div>
          </Card>

          <Card className="p-6 flex items-center gap-5 cursor-pointer bg-white rounded-2xl shadow-sm hover:shadow-md" onClick={() => router.push('/select-prayer?role=passenger')}>
            <div className="bg-blue-50 p-4 rounded-full h-16 w-16 flex items-center justify-center"><User size={32} className="text-blue-600" /></div>
            <div><h2 className="text-xl font-bold text-slate-900">Mitfahrer</h2><p className="text-sm text-slate-500">Ich suche eine Fahrt</p></div>
          </Card>
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