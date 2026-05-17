'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Home, Car, CalendarDays, UserRound, Navigation, BookOpen } from 'lucide-react';

const HIDDEN_PATHS = [
  '/login',
  '/complete-profile',
  '/driver/dashboard',
  '/passenger/dashboard',
  '/select-prayer',
  '/passenger/list',
  '/offline',
];

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [showFahrtSheet, setShowFahrtSheet] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('');

  // Read query params without useSearchParams to avoid Suspense requirement
  useEffect(() => {
    if (pathname === '/') {
      setActiveTab('home');
    } else if (pathname.startsWith('/history')) {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      setActiveTab(tab === 'events' ? 'termine' : 'zikr');
    } else if (pathname.startsWith('/events')) {
      setActiveTab('termine');
    } else if (pathname.startsWith('/profile') || pathname.startsWith('/admin')) {
      setActiveTab('profil');
    } else if (
      pathname.startsWith('/select-prayer') ||
      pathname.startsWith('/passenger/list') ||
      pathname.startsWith('/arrival')
    ) {
      setActiveTab('fahrt');
    } else {
      setActiveTab('');
    }
  }, [pathname]);

  if (HIDDEN_PATHS.some(p => pathname.startsWith(p))) return null;

  const handleTabPress = (id: string, href: string | null) => {
    if (id === 'fahrt') {
      setShowFahrtSheet(true);
    } else if (href) {
      router.push(href);
    }
  };

  const leftTabs = [
    { id: 'zikr', label: 'Zikr', icon: BookOpen, href: '/history?tab=zikr' },
    { id: 'termine', label: 'Termine', icon: CalendarDays, href: '/history?tab=events' },
  ];
  const rightTabs = [
    { id: 'fahrt', label: 'Fahrt', icon: Car, href: null },
    { id: 'profil', label: 'Profil', icon: UserRound, href: '/profile' },
  ];

  const renderTab = (tab: { id: string; label: string; icon: React.ElementType; href: string | null }) => {
    const active = activeTab === tab.id;
    const Icon = tab.icon;
    return (
      <button
        key={tab.id}
        onClick={() => handleTabPress(tab.id, tab.href)}
        className="flex-1 flex flex-col items-center justify-center gap-1.5 py-3 transition-opacity duration-100 active:opacity-60"
        style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
        aria-label={tab.label}
      >
        <span
          className="flex items-center justify-center rounded-xl transition-all duration-200"
          style={{
            width: 44,
            height: 30,
            background: active ? 'var(--app-gold-dim)' : 'transparent',
          }}
        >
          <Icon
            size={20}
            strokeWidth={active ? 2.4 : 1.7}
            style={{ color: active ? 'var(--app-gold)' : 'var(--app-text3)' }}
          />
        </span>
        <span
          className="text-[9px] font-bold uppercase tracking-widest leading-none transition-colors duration-150"
          style={{ color: active ? 'var(--app-gold)' : 'var(--app-text3)' }}
        >
          {tab.label}
        </span>
      </button>
    );
  };

  return (
    <>
      {/* ── Bottom Navigation Bar ─────────────────────────────────────────── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex items-stretch select-none"
        style={{
          background: 'color-mix(in srgb, var(--app-surface1) 94%, transparent)',
          borderTop: '1px solid var(--app-border)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          overflow: 'visible',
        }}
      >
        {/* Left tabs */}
        {leftTabs.map(renderTab)}

        {/* Center Start button */}
        <div className="flex-1 flex flex-col items-center justify-center py-3">
          <button
            onClick={() => router.push('/')}
            aria-label="Start"
            className="flex items-center justify-center transition-opacity duration-100 active:opacity-60"
            style={{
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: activeTab === 'home' ? 'var(--app-gold)' : 'var(--app-gold-dim)',
              border: '2px solid var(--app-gold)',
              boxShadow: activeTab === 'home'
                ? '0 4px 20px rgba(201,162,60,0.5)'
                : '0 2px 12px rgba(201,162,60,0.25)',
              marginTop: -18,
            }}
          >
            <Home
              size={22}
              strokeWidth={2.2}
              style={{ color: activeTab === 'home' ? '#fff' : 'var(--app-gold)' }}
            />
          </button>
          <span
            className="text-[9px] font-bold uppercase tracking-widest leading-none mt-1.5 transition-colors duration-150"
            style={{ color: activeTab === 'home' ? 'var(--app-gold)' : 'var(--app-text3)' }}
          >
            Start
          </span>
        </div>

        {/* Right tabs */}
        {rightTabs.map(renderTab)}
      </nav>

      {/* ── Fahrt Bottom Sheet ────────────────────────────────────────────── */}
      {showFahrtSheet && (
        <div
          className="fixed inset-0 z-[60] flex items-end"
          style={{ background: 'rgba(0,0,0,0.55)' }}
          onClick={() => setShowFahrtSheet(false)}
        >
          <div
            className="w-full rounded-t-3xl animate-in slide-in-from-bottom-4 duration-300"
            style={{
              background: 'var(--app-surface2)',
              border: '1px solid var(--app-border)',
              paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-4 pb-5">
              <div className="w-10 h-1 rounded-full" style={{ background: 'var(--app-border)' }} />
            </div>

            <div className="px-6 pb-2">
              <h3
                className="text-base font-extrabold text-center mb-1"
                style={{ color: 'var(--app-text)', letterSpacing: '-0.01em' }}
              >
                Wie fährst du heute?
              </h3>
              <p className="text-xs text-center mb-5" style={{ color: 'var(--app-text3)' }}>
                Wähle deine Rolle für diese Fahrt
              </p>

              <div className="grid grid-cols-2 gap-3 mb-4">
                {/* Fahrer */}
                <button
                  onClick={() => {
                    setShowFahrtSheet(false);
                    router.push('/select-prayer?role=driver');
                  }}
                  className="rounded-2xl p-5 text-left transition-opacity active:opacity-60"
                  style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', background: 'var(--app-gold-dim)', border: '1px solid var(--app-gold)' }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                    style={{ background: 'rgba(201,162,60,0.2)', border: '1px solid var(--app-gold)' }}
                  >
                    <Car size={20} style={{ color: 'var(--app-gold)' }} />
                  </div>
                  <p className="font-extrabold text-[15px]" style={{ color: 'var(--app-gold)' }}>
                    Fahrer
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--app-text2)' }}>
                    Plätze anbieten
                  </p>
                </button>

                {/* Mitfahrer */}
                <button
                  onClick={() => {
                    setShowFahrtSheet(false);
                    router.push('/select-prayer?role=passenger');
                  }}
                  className="rounded-2xl p-5 text-left transition-opacity active:opacity-60"
                  style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', background: 'var(--app-blue-dim)', border: '1px solid var(--app-blue)' }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                    style={{ background: 'rgba(91,127,255,0.15)', border: '1px solid var(--app-blue)' }}
                  >
                    <Navigation size={20} style={{ color: 'var(--app-blue)' }} />
                  </div>
                  <p className="font-extrabold text-[15px]" style={{ color: 'var(--app-blue)' }}>
                    Mitfahrer
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--app-text2)' }}>
                    Fahrt finden
                  </p>
                </button>
              </div>

              <button
                onClick={() => setShowFahrtSheet(false)}
                className="w-full py-3 rounded-xl text-sm font-semibold transition-opacity active:opacity-60"
                style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', background: 'var(--app-surface1)', border: '1px solid var(--app-border)', color: 'var(--app-text3)' }}
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
