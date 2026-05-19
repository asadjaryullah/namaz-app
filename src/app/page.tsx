'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader2, AlertTriangle, Car, User, ArrowRight, Calendar, Settings, Bell, GraduationCap } from "lucide-react";
import MapComponent from '@/components/MapComponent';
import ZikrWidget from '@/components/ZikrWidget';
import NextPrayerBanner from '@/components/NextPrayerBanner';

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "";

export default function HomePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [notifPerm, setNotifPerm] = useState<string>('granted'); // default: nicht anzeigen
  const [profile, setProfile] = useState<any>(null);
  const [onboardingSlide, setOnboardingSlide] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const [activeDriverRide, setActiveDriverRide] = useState<any>(null);
  const [activePassengerRide, setActivePassengerRide] = useState<any>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [quickLinks, setQuickLinks] = useState<any[]>([]);
  const [nextPrayer, setNextPrayer] = useState<{ id: string; name: string; time: string } | null>(null);
  const [commitmentCount, setCommitmentCount] = useState(0);
  const [isCommitted, setIsCommitted] = useState(false);
  const [togglingCommit, setTogglingCommit] = useState(false);
  const [popCommit, setPopCommit] = useState(false);

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

        if (mounted) setUser(session.user);

        const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' });

        const [
          { data: profileData },
          { data: driverRide },
          { data: myBooking },
          { data: events },
          { data: linksData },
          { data: prayerTimesData },
        ] = await Promise.all([
          supabase.from('profiles').select('id,full_name,is_approved,phone,gender,member_id').eq('id', session.user.id).maybeSingle(),
          supabase.from('rides').select('id, prayer_id, prayer_time').eq('driver_id', session.user.id).eq('status', 'active').eq('ride_date', today).maybeSingle(),
          supabase.from('bookings').select('ride_id, rides!inner(id, status, ride_date, prayer_id, prayer_time)').eq('passenger_id', session.user.id).eq('status', 'accepted').eq('rides.status', 'active').eq('rides.ride_date', today).maybeSingle(),
          supabase.from('mosque_events').select('id,title,event_date').gte('event_date', new Date().toISOString()).order('event_date', { ascending: true }).limit(3),
          supabase.from('quick_links').select('id,title,url,emoji,sort_order').eq('is_active', true).order('sort_order', { ascending: true }),
          supabase.from('prayer_times').select('id,name,time,sort_order').order('sort_order', { ascending: true }),
        ]);

        if (mounted && profileData) setProfile(profileData);
        if (mounted && driverRide) setActiveDriverRide(driverRide);
        if (mounted && myBooking) setActivePassengerRide({ rideId: myBooking.ride_id, ...((myBooking as any).rides || {}) });
        if (mounted && events) setUpcomingEvents(events);
        if (mounted && linksData) setQuickLinks(linksData);

        if (mounted && prayerTimesData?.length) {
          const nowHHMM = new Date().toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit', hour12: false });
          const next = prayerTimesData.find(p => p.time > nowHHMM) || prayerTimesData[0];
          setNextPrayer(next);
          try {
            const [{ count }, { data: mine }] = await Promise.all([
              supabase.from('prayer_commitments').select('*', { count: 'exact', head: true }).eq('prayer_id', next.id).eq('prayer_date', today),
              supabase.from('prayer_commitments').select('id').eq('user_id', session.user.id).eq('prayer_id', next.id).eq('prayer_date', today).maybeSingle(),
            ]);
            if (mounted) { setCommitmentCount(count ?? 0); setIsCommitted(!!mine); }
          } catch (_) {}
        }

        // Onboarding: show once for new users
        if (mounted && !localStorage.getItem('onboarding_v1')) {
          setShowOnboarding(true);
        }

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

  const handleToggleCommitment = async () => {
    if (!nextPrayer || !user || togglingCommit) return;
    setTogglingCommit(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/commit-attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({ prayer_id: nextPrayer.id }),
      });
      if (res.ok) {
        const data = await res.json();
        setIsCommitted(data.committed);
        setCommitmentCount(data.count);
        setPopCommit(true);
        setTimeout(() => setPopCommit(false), 350);
      }
    } catch (_) {}
    setTogglingCommit(false);
  };

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
        <p className="text-[11px] font-bold uppercase tracking-[0.15em]"
          style={{ color: 'var(--app-gold)' }}>
          Salam, {firstName}
        </p>
        <button
          onClick={() => router.push('/profile')}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg active:scale-[0.93] transition-transform"
          style={{ background: 'linear-gradient(135deg, var(--app-gold-dim), var(--app-card))', border: '1px solid var(--app-gold)' }}
        >
          {emoji}
        </button>
      </div>

      {/* ── Arabic ── */}
      <div className="stagger-2 w-full rounded-3xl relative overflow-hidden"
        style={{ background: 'var(--app-surface2)', border: '1px solid var(--app-border)' }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at top, var(--app-gold-dim), transparent 60%)' }} />
        <div className="relative z-10 py-4 px-6 flex flex-col items-center gap-1">
          <p className="text-2xl text-center whitespace-nowrap"
            style={{ fontFamily: 'var(--font-amiri)', color: 'var(--app-gold)', direction: 'rtl', textShadow: '0 0 20px var(--app-gold-glow)' }}>
            حَيَّ عَلَىٰ ٱلصَّلَاةِ · حَيَّ عَلَىٰ ٱلْفَلَاحِ
          </p>
          <p className="text-[10px] uppercase tracking-[0.18em] text-center"
            style={{ color: 'var(--app-text2)' }}>
            „Kommt zum Gebet · Kommt zum Erfolg"
          </p>
        </div>
      </div>

      {/* ── Jubiläum ── */}
      <div className="stagger-2 flex flex-col items-center py-2">
        <div className="relative w-36 h-36"
          style={{ filter: 'drop-shadow(0 0 18px var(--app-gold-glow))' }}>
          <Image src="/jubilaeum.png" alt="100 Jahre Jubiläum" fill className="object-contain" />
        </div>
      </div>

      {/* ── Nächstes Gebet ── */}
      <div className="stagger-2"><NextPrayerBanner /></div>

      {/* ── Commitment Card ── */}
      {nextPrayer && isApproved && (
        <div className="stagger-2 rounded-2xl p-4 flex items-center justify-between gap-3"
          style={{ background: 'var(--app-surface2)', border: '1px solid var(--app-border)' }}>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--app-text3)' }}>
              Zum Gebet
            </p>
            <p className="text-base font-extrabold leading-tight" style={{ color: 'var(--app-text)' }}>
              {nextPrayer.name} · {nextPrayer.time}
            </p>
            {commitmentCount > 0 ? (
              <p className="text-xs mt-0.5 font-semibold" style={{ color: 'var(--app-emerald)' }}>
                ✓ {commitmentCount} {commitmentCount === 1 ? 'Person kommt' : 'Personen kommen'}
              </p>
            ) : (
              <p className="text-xs mt-0.5" style={{ color: 'var(--app-text3)' }}>Noch niemand zugesagt</p>
            )}
          </div>
          <button
            onClick={handleToggleCommitment}
            disabled={togglingCommit}
            className={`shrink-0 px-4 py-2 rounded-xl text-sm font-bold transition-colors active:scale-[0.95] ${popCommit ? 'animate-pop' : ''}`}
            style={{
              background: isCommitted ? 'var(--app-emerald)' : 'transparent',
              color: isCommitted ? '#fff' : 'var(--app-emerald)',
              border: '2px solid var(--app-emerald)',
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
              minWidth: 100,
            }}
          >
            {togglingCommit ? '...' : isCommitted ? 'Ich komme ✓' : 'Ich komme'}
          </button>
        </div>
      )}

      {/* ── Benachrichtigungen aktivieren ── */}
      {notifPerm !== 'granted' && (
        <div className="stagger-2 rounded-xl p-4 flex items-center justify-between gap-3 cursor-pointer"
          style={{ background: 'var(--app-gold-dim)', border: '1px solid var(--app-gold)' }}
          onClick={async () => {
            if (!('Notification' in window)) return;
            if (notifPerm === 'denied') { router.push('/profile'); return; }
            const result = await Notification.requestPermission();
            setNotifPerm(result);
            if (result === 'granted' && 'serviceWorker' in navigator && 'PushManager' in window) {
              try {
                const reg = await navigator.serviceWorker.register('/sw.js');
                await navigator.serviceWorker.ready;
                const sub = await reg.pushManager.subscribe({
                  userVisibleOnly: true,
                  applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
                });
                const { data: sessionData } = await supabase.auth.getSession();
                const token = sessionData?.session?.access_token;
                if (token) {
                  await fetch('/api/push-subscribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify(sub.toJSON()),
                  });
                }
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
          className="stagger-3 rounded-2xl cursor-pointer active:scale-[0.98] transition-transform overflow-hidden"
          style={{ background: 'var(--app-gold-dim)', border: '2px solid var(--app-gold)', boxShadow: '0 0 32px var(--app-gold-glow)' }}>
          <div className="px-4 pt-3 pb-1 flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: 'var(--app-gold)' }}></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ background: 'var(--app-gold)' }}></span>
            </span>
            <p className="text-[10px] font-black uppercase tracking-[0.15em]" style={{ color: 'var(--app-gold)' }}>Aktive Fahrt · Live</p>
          </div>
          <div className="px-4 pb-4 flex items-center justify-between">
            <div>
              <p className="font-extrabold text-xl leading-tight" style={{ color: 'var(--app-gold)' }}>Du bist Fahrer</p>
              {activeDriverRide.prayer_time && (
                <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--app-text2)' }}>
                  🕐 Gebet um {activeDriverRide.prayer_time} Uhr
                </p>
              )}
              <p className="text-xs mt-1 font-semibold" style={{ color: 'var(--app-text2)' }}>Tippe für Navigation & Mitfahrer-Übersicht →</p>
            </div>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'var(--app-gold-dim)', border: '1px solid var(--app-gold)' }}>
              <Car size={24} style={{ color: 'var(--app-gold)' }} />
            </div>
          </div>
        </div>
      )}

      {activePassengerRide && (
        <div onClick={() => router.push(`/passenger/dashboard?rideId=${activePassengerRide.rideId}`)}
          className="stagger-3 rounded-2xl cursor-pointer active:scale-[0.98] transition-transform overflow-hidden"
          style={{ background: 'var(--app-emerald-dim)', border: '2px solid var(--app-emerald)', boxShadow: '0 0 32px rgba(34,211,138,0.2)' }}>
          <div className="px-4 pt-3 pb-1 flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: 'var(--app-emerald)' }}></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ background: 'var(--app-emerald)' }}></span>
            </span>
            <p className="text-[10px] font-black uppercase tracking-[0.15em]" style={{ color: 'var(--app-emerald)' }}>Aktive Fahrt · Live</p>
          </div>
          <div className="px-4 pb-4 flex items-center justify-between">
            <div>
              <p className="font-extrabold text-xl leading-tight" style={{ color: 'var(--app-emerald)' }}>Du fährst mit</p>
              {activePassengerRide.prayer_time && (
                <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--app-text2)' }}>
                  🕐 Gebet um {activePassengerRide.prayer_time} Uhr
                </p>
              )}
              <p className="text-xs mt-1 font-semibold" style={{ color: 'var(--app-text2)' }}>Tippe für Fahrer-Standort & Details →</p>
            </div>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'var(--app-emerald-dim)', border: '1px solid var(--app-emerald)' }}>
              <User size={24} style={{ color: 'var(--app-emerald)' }} />
            </div>
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

      {/* ── Featured 2-col grid ── */}
      <div className="stagger-5 grid grid-cols-2 gap-3">
        {/* This Week With Huzoor */}
        <a
          href="https://www.youtube.com/results?search_query=this+week+with+huzoor"
          target="_blank"
          rel="noopener noreferrer"
          className="app-card p-4 flex flex-col items-start gap-3 active:opacity-60 transition-opacity"
          style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', textDecoration: 'none' }}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#FF0000' }}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="white"><path d="M8 5v14l11-7z"/></svg>
          </div>
          <div>
            <p className="font-extrabold text-[13px] leading-snug" style={{ color: 'var(--app-text)' }}>This Week With Huzoor</p>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--app-text3)' }}>YouTube · MTA</p>
          </div>
        </a>

        {/* Namaz Lernen */}
        <div
          onClick={() => router.push('/learn')}
          className="app-card p-4 flex flex-col items-start gap-3 cursor-pointer active:opacity-80 transition-opacity"
          style={{ background: 'var(--app-gold-dim)', border: '1px solid var(--app-gold)', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(201,162,60,0.2)', border: '1px solid var(--app-gold)' }}>
            <GraduationCap size={22} style={{ color: 'var(--app-gold)' }} />
          </div>
          <div>
            <p className="font-extrabold text-[13px] leading-snug" style={{ color: 'var(--app-gold)' }}>Namaz Lernen</p>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--app-text2)' }}>Thana & Al-Fatiha</p>
          </div>
        </div>
      </div>

      {/* ── Dynamic Quick Links ── */}
      {quickLinks.length > 0 && (
        <div className="stagger-5 space-y-2">
          {quickLinks.map((link) => {
            const isYoutube = /youtube\.com|youtu\.be/i.test(link.url);
            return (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="app-card flex items-center gap-4 p-4 active:opacity-60 transition-opacity"
                style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', textDecoration: 'none' }}
              >
                {isYoutube ? (
                  <span className="shrink-0 flex items-center justify-center rounded-xl" style={{ width: 44, height: 36, background: '#FF0000' }}>
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="white"><path d="M8 5v14l11-7z"/></svg>
                  </span>
                ) : (
                  <span className="text-3xl shrink-0">{link.emoji || '🔗'}</span>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm" style={{ color: 'var(--app-text)' }}>{link.title}</p>
                  <p className="text-[11px] truncate mt-0.5" style={{ color: 'var(--app-text3)' }}>{link.url}</p>
                </div>
                <ArrowRight size={16} style={{ color: 'var(--app-text3)', flexShrink: 0 }} />
              </a>
            );
          })}
        </div>
      )}

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

      {/* ── Onboarding Overlay ── */}
      {showOnboarding && (() => {
        const slides = [
          {
            icon: '🕌',
            title: 'Willkommen bei Ride 2 Salah',
            text: 'Die App der Bashier Moschee für Gemeinschaftsfahrten zum Gebet.',
          },
          {
            icon: '🚗',
            title: 'Als Fahrer',
            text: 'Biete freie Plätze an. Mitbrüder oder -schwestern sehen dich und können mitfahren — du siehst ihren Standort auf der Karte.',
          },
          {
            icon: '🙋',
            title: 'Als Mitfahrer',
            text: 'Finde eine Fahrt und buche sie mit einem Tipp. Dein Standort wird geteilt damit der Fahrer dich abholen kann.',
          },
        ];
        const slide = slides[onboardingSlide];
        const isLast = onboardingSlide === slides.length - 1;
        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6"
            style={{ background: 'rgba(0,0,0,0.80)' }}>
            <div className="w-full max-w-xs rounded-3xl p-7 flex flex-col items-center text-center gap-5 animate-in zoom-in fade-in duration-300"
              style={{ background: 'var(--app-surface2)', border: '1px solid var(--app-border)' }}>
              <div className="text-5xl">{slide.icon}</div>
              <div>
                <h2 className="text-xl font-extrabold" style={{ color: 'var(--app-text)' }}>{slide.title}</h2>
                <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--app-text2)' }}>{slide.text}</p>
              </div>
              {/* Dots */}
              <div className="flex gap-2">
                {slides.map((_, i) => (
                  <div key={i} className="rounded-full transition-all"
                    style={{ width: i === onboardingSlide ? 20 : 8, height: 8, background: i === onboardingSlide ? 'var(--app-gold)' : 'var(--app-border)' }} />
                ))}
              </div>
              <button
                onClick={() => {
                  if (isLast) {
                    localStorage.setItem('onboarding_v1', '1');
                    setShowOnboarding(false);
                  } else {
                    setOnboardingSlide(s => s + 1);
                  }
                }}
                className="w-full rounded-2xl py-3.5 text-base font-extrabold active:opacity-70 transition-opacity"
                style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', background: 'var(--app-gold)', color: '#fff' }}
              >
                {isLast ? 'Los geht\'s →' : 'Weiter →'}
              </button>
              {!isLast && (
                <button
                  onClick={() => { localStorage.setItem('onboarding_v1', '1'); setShowOnboarding(false); }}
                  className="text-xs active:opacity-60"
                  style={{ color: 'var(--app-text3)', touchAction: 'manipulation' }}
                >
                  Überspringen
                </button>
              )}
            </div>
          </div>
        );
      })()}
    </main>
  );
}
