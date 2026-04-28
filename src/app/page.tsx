'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader2, AlertTriangle, Car, User, ArrowRight, Calendar, Settings, Bell } from "lucide-react";
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
  const [notifPerm, setNotifPerm] = useState<string>('granted'); // default: nicht anzeigen
  const [profile, setProfile] = useState<any>(null);

  const [activeDriverRide, setActiveDriverRide] = useState<any>(null);
  const [activePassengerRide, setActivePassengerRide] = useState<any>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;

    const safetyTimer = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 2000);

    const initApp = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user) {
          if (mounted) { setUser(null); setLoading(false); }
          return;
        }

        if (typeof window !== 'undefined') {
          waitForOneSignalReady(4000).then(() => {
            try { OneSignal.login(session.user.id); } catch(e) {}
          }).catch(() => {});
        }

        if (mounted) setUser(session.user);

        const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' });

        const [
          { data: profileData },
          { data: driverRide },
          { data: myBooking },
          { data: events },
        ] = await Promise.all([
          supabase.from('profiles').select('id,full_name,is_approved,phone,gender,member_id').eq('id', session.user.id).maybeSingle(),
          supabase.from('rides').select('id').eq('driver_id', session.user.id).eq('status', 'active').eq('ride_date', today).maybeSingle(),
          supabase.from('bookings').select('ride_id, rides!inner(status, ride_date)').eq('passenger_id', session.user.id).eq('status', 'accepted').eq('rides.status', 'active').eq('rides.ride_date', today).maybeSingle(),
          supabase.from('mosque_events').select('id,title,event_date').gte('event_date', new Date().toISOString()).order('event_date', { ascending: true }).limit(3),
        ]);

        if (mounted && profileData) setProfile(profileData);
        if (mounted && driverRide) setActiveDriverRide(driverRide);
        if (mounted && myBooking) setActivePassengerRide(myBooking.ride_id);
        if (mounted && events) setUpcomingEvents(events);

        // Notification permission check
        if (mounted && typeof window !== 'undefined' && 'Notification' in window) {
          setNotifPerm(Notification.permission);
        }

      } catch (error) {
        console.error("Start Fehler:", error);
      } finally {
        clearTimeout(safetyTimer);
        if (mounted) setLoading(false);
      }
    };

    initApp();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null); setProfile(null);
        setActiveDriverRide(null); setActivePassengerRide(null);
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

  /* ── LADESCREEN ── */
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: 'var(--app-bg)' }}>
        <div className="relative w-20 h-20 animate-float">
          <Image src="/icon.png" alt="Logo" fill className="object-contain"
            style={{ filter: 'drop-shadow(0 0 20px var(--app-gold-glow))' }} />
        </div>
        <Loader2 className="animate-spin h-5 w-5" style={{ color: 'var(--app-gold)' }} />
      </div>
    );
  }

  /* ══════════════════════════════════════
     NICHT EINGELOGGT — Landing Page
  ══════════════════════════════════════ */
  if (!user) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden"
        style={{ background: 'var(--app-bg)' }}>

        {/* Glow orbs */}
        <div style={{
          position: 'absolute', top: -80, left: '50%', transform: 'translateX(-50%)',
          width: 320, height: 320, borderRadius: '50%',
          background: 'radial-gradient(circle, var(--app-gold-glow) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: 60, left: -40,
          width: 200, height: 200, borderRadius: '50%',
          background: 'radial-gradient(circle, var(--app-emerald-dim) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div className="flex flex-col items-center text-center relative z-10 w-full max-w-xs">

          {/* Mosque label */}
          <div className="stagger-1 mb-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.25em]" style={{ color: 'var(--app-gold)' }}>
              Bashier Moschee · Bensheim
            </p>
          </div>

          {/* Logo floating */}
          <div className="stagger-2 animate-float relative w-36 h-36 mb-2">
            <Image src="/icon.png" alt="Logo" fill className="object-contain"
              style={{ filter: 'drop-shadow(0 0 28px var(--app-gold-glow))' }} priority />
          </div>

          {/* Brand name */}
          <div className="stagger-3 text-center mb-8">
            <h1 className="text-3xl font-extrabold" style={{ color: 'var(--app-text)', letterSpacing: '-0.03em' }}>
              Ride 2 Salah
            </h1>
            <p className="text-xs mt-1" style={{ color: 'var(--app-text2)' }}>Gemeinsam zur Moschee</p>
          </div>

          {/* Arabic calligraphy */}
          <div className="stagger-4 w-full mb-8 rounded-3xl relative overflow-hidden"
            style={{ background: 'var(--app-surface2)', border: '1px solid var(--app-border)' }}>
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: 'radial-gradient(ellipse at top, var(--app-gold-dim), transparent 60%)' }} />
            <div className="relative z-10 py-7 px-6">
              <p className="font-arabic text-5xl text-center leading-loose"
                style={{ color: 'var(--app-gold)', direction: 'rtl', textShadow: '0 0 30px var(--app-gold-glow)' }}>
                حَيَّ عَلَىٰ ٱلصَّلَاةِ
              </p>
              <p className="text-center text-[9px] uppercase tracking-[0.22em] mt-1"
                style={{ color: 'var(--app-text2)' }}>
                „Kommt zum Gebet"
              </p>
              <div className="mx-auto my-4 h-px w-8"
                style={{ background: 'linear-gradient(90deg, transparent, var(--app-gold), transparent)' }} />
              <p className="font-arabic text-5xl text-center leading-loose"
                style={{ color: 'var(--app-gold)', direction: 'rtl', textShadow: '0 0 30px var(--app-gold-glow)' }}>
                حَيَّ عَلَىٰ ٱلْفَلَاحِ
              </p>
              <p className="text-center text-[9px] uppercase tracking-[0.22em] mt-1"
                style={{ color: 'var(--app-text2)' }}>
                „Kommt zum Erfolg"
              </p>
            </div>
          </div>

          {/* CTA */}
          <div className="stagger-5 w-full space-y-3">
            <button
              onClick={() => router.push('/login')}
              className="btn-gold w-full text-[15px]"
            >
              Anmelden
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6"/>
              </svg>
            </button>
            <p className="text-xs text-center" style={{ color: 'var(--app-text3)' }}>
              Zugang via Code — kein Passwort nötig
            </p>
          </div>
        </div>
      </main>
    );
  }

  /* ══════════════════════════════════════
     EINGELOGGT — Home
  ══════════════════════════════════════ */
  const firstName = profile?.full_name?.split(' ')[0] || "Nutzer";
  const isAdmin = user?.email?.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase().trim();
  const isApproved = profile?.is_approved === true;
  const missingData = !profile?.phone || !profile?.gender || !profile?.member_id;
  const emoji = profile?.gender === 'female' ? '🧕🏻' : '🧔🏻‍♂️';

  return (
    <main className="min-h-screen flex flex-col p-5 gap-5 pb-20 relative z-10"
      style={{ background: 'var(--app-bg)' }}>

      {/* ── Header ── */}
      <div className="stagger-1 flex items-center justify-between pt-1">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.15em]"
            style={{ color: 'var(--app-gold)' }}>
            Salam, {firstName}
          </p>
          <h1 className="text-2xl font-extrabold mt-0.5"
            style={{ color: 'var(--app-text)', letterSpacing: '-0.02em' }}>
            Wie fährst du heute?
          </h1>
        </div>
        <button
          onClick={() => router.push('/profile')}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg hover:scale-110 transition-transform"
          style={{ background: 'linear-gradient(135deg, var(--app-gold-dim), var(--app-card))', border: '1px solid var(--app-gold)' }}
        >
          {emoji}
        </button>
      </div>

      {/* ── Nächstes Gebet ── */}
      <div className="stagger-2"><NextPrayerBanner /></div>

      {/* ── Benachrichtigungen aktivieren ── */}
      {notifPerm !== 'granted' && (
        <div className="stagger-2 rounded-xl p-4 flex items-center justify-between gap-3 cursor-pointer"
          style={{ background: 'var(--app-gold-dim)', border: '1px solid var(--app-gold)' }}
          onClick={async () => {
            if (!('Notification' in window)) return;
            if (notifPerm === 'denied') { router.push('/profile'); return; }
            const result = await Notification.requestPermission();
            setNotifPerm(result);
            if (result === 'granted') {
              try {
                const anyOS = OneSignal as any;
                if (anyOS?.User?.PushSubscription?.optIn) await anyOS.User.PushSubscription.optIn();
              } catch (_) {}
            }
          }}>
          <div className="flex items-center gap-3">
            <Bell size={18} style={{ color: 'var(--app-gold)' }} />
            <div>
              <p className="text-sm font-bold" style={{ color: 'var(--app-gold)' }}>
                {notifPerm === 'denied' ? 'Benachrichtigungen blockiert' : 'Gebets-Erinnerungen aktivieren'}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--app-text2)' }}>
                {notifPerm === 'denied' ? 'Tippe um es in den Einstellungen zu entsperren' : '25 Min. vor jedem Gebet erinnert werden'}
              </p>
            </div>
          </div>
          <ArrowRight size={16} style={{ color: 'var(--app-gold)', flexShrink: 0 }} />
        </div>
      )}

      {/* ── Warnungen ── */}
      {missingData && (
        <div onClick={() => router.push('/profile')}
          className="stagger-2 rounded-xl p-4 flex items-start gap-3 cursor-pointer"
          style={{ background: 'rgba(240,98,146,0.1)', border: '1px solid rgba(240,98,146,0.3)' }}>
          <AlertTriangle className="shrink-0 mt-0.5" style={{ color: 'var(--app-rose)' }} size={18} />
          <div>
            <p className="text-sm font-bold" style={{ color: 'var(--app-rose)' }}>Profil unvollständig</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--app-text2)' }}>Bitte Daten vervollständigen.</p>
          </div>
        </div>
      )}

      {!isApproved && !missingData && (
        <div className="stagger-2 rounded-xl p-4 flex items-center gap-3"
          style={{ background: 'rgba(201,162,60,0.1)', border: '1px solid rgba(201,162,60,0.3)' }}>
          <Loader2 className="h-5 w-5 animate-spin shrink-0" style={{ color: 'var(--app-gold)' }} />
          <div>
            <p className="font-bold text-sm" style={{ color: 'var(--app-gold)' }}>Warte auf Freigabe</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--app-text2)' }}>Ein Admin prüft deine ID.</p>
          </div>
        </div>
      )}

      {/* ── Zikr Widget ── */}
      <div className="stagger-3"><ZikrWidget userId={user.id} /></div>

      {/* ── Aktive Fahrten ── */}
      {activeDriverRide && (
        <div onClick={() => router.push('/driver/dashboard')}
          className="stagger-3 rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:scale-[1.01] transition-transform"
          style={{ background: 'var(--app-gold-dim)', border: '1px solid var(--app-gold)', boxShadow: '0 4px 24px var(--app-gold-glow)' }}>
          <div>
            <p className="font-bold text-base" style={{ color: 'var(--app-gold)' }}>Du bist Fahrer</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--app-text2)' }}>Zur Navigation</p>
          </div>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center animate-pulse"
            style={{ background: 'var(--app-gold-dim)', border: '1px solid var(--app-gold)' }}>
            <Car size={20} style={{ color: 'var(--app-gold)' }} />
          </div>
        </div>
      )}

      {activePassengerRide && (
        <div onClick={() => router.push(`/passenger/dashboard?rideId=${activePassengerRide}`)}
          className="stagger-3 rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:scale-[1.01] transition-transform"
          style={{ background: 'var(--app-emerald-dim)', border: '1px solid var(--app-emerald)', boxShadow: '0 4px 24px rgba(34,211,138,0.15)' }}>
          <div>
            <p className="font-bold text-base" style={{ color: 'var(--app-emerald)' }}>Du fährst mit</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--app-text2)' }}>Standort ansehen</p>
          </div>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center animate-pulse"
            style={{ background: 'var(--app-emerald-dim)', border: '1px solid var(--app-emerald)' }}>
            <User size={20} style={{ color: 'var(--app-emerald)' }} />
          </div>
        </div>
      )}

      {/* ── Fahrer / Mitfahrer Raster ── */}
      {(isApproved || isAdmin) && (
        <div className="stagger-4 grid grid-cols-2 gap-3">
          <button onClick={() => router.push('/select-prayer?role=driver')}
            className="app-card app-card-hover text-left p-[18px] cursor-pointer">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
              style={{ background: 'var(--app-gold-dim)', border: '1px solid var(--app-gold)' }}>
              <Car size={20} style={{ color: 'var(--app-gold)' }} />
            </div>
            <p className="text-[15px] font-extrabold" style={{ color: 'var(--app-text)' }}>Fahrer</p>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--app-text2)' }}>Plätze anbieten</p>
          </button>

          <button onClick={() => router.push('/select-prayer?role=passenger')}
            className="app-card app-card-hover-blue text-left p-[18px] cursor-pointer">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
              style={{ background: 'var(--app-blue-dim)', border: '1px solid var(--app-blue)' }}>
              <User size={20} style={{ color: 'var(--app-blue)' }} />
            </div>
            <p className="text-[15px] font-extrabold" style={{ color: 'var(--app-text)' }}>Mitfahrer</p>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--app-text2)' }}>Fahrt suchen</p>
          </button>
        </div>
      )}

      {/* ── Events Karte ── */}
      <div onClick={() => router.push('/history?tab=events')}
        className="stagger-5 app-card app-card-hover-blue p-4 cursor-pointer">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] flex items-center gap-1.5"
            style={{ color: 'var(--app-text2)' }}>
            <Calendar size={12} style={{ color: 'var(--app-text3)' }} /> Termine
          </p>
          <ArrowRight size={14} style={{ color: 'var(--app-text3)' }} />
        </div>
        {upcomingEvents.length > 0 ? (
          <div className="space-y-2.5">
            {upcomingEvents.map(e => {
              const d = new Date(e.event_date);
              return (
                <div key={e.id} className="flex items-center gap-3">
                  <div className="rounded-xl px-2 py-1.5 text-center min-w-[40px]"
                    style={{ background: 'var(--app-card)', border: '1px solid var(--app-border)' }}>
                    <p className="text-[9px] font-bold uppercase" style={{ color: 'var(--app-gold)' }}>
                      {d.toLocaleDateString('de-DE', { weekday: 'short' })}
                    </p>
                    <p className="text-base font-extrabold leading-tight" style={{ color: 'var(--app-text)' }}>
                      {d.getDate()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: 'var(--app-text)' }}>{e.title}</p>
                    <p className="text-[11px]" style={{ color: 'var(--app-text2)' }}>
                      {d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-center py-3 italic" style={{ color: 'var(--app-text3)' }}>
            Keine anstehenden Termine.
          </p>
        )}
      </div>

      {/* ── Karte ── */}
      <div className="stagger-6 h-[200px] rounded-2xl overflow-hidden"
        style={{ border: '1px solid var(--app-border)', boxShadow: '0 4px 24px rgba(0,0,0,0.15)' }}>
        <MapComponent />
      </div>

      {/* ── Admin ── */}
      {isAdmin && (
        <div className="pt-4" style={{ borderTop: '1px solid var(--app-border)' }}>
          <button onClick={() => router.push('/admin')}
            className="w-full flex items-center justify-center gap-2 rounded-xl py-3 font-semibold text-sm hover:opacity-80 transition-opacity"
            style={{ background: 'var(--app-surface2)', border: '1px solid var(--app-border)', color: 'var(--app-text2)' }}>
            <Settings size={16} /> Admin Bereich
          </button>
        </div>
      )}
    </main>
  );
}
