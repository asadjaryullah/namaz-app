'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Home, Car, CalendarDays, UserRound, Navigation } from 'lucide-react';

const HIDDEN_PATHS = [
  '/login',
  '/complete-profile',
  '/driver/dashboard',
  '/passenger/dashboard',
  '/select-prayer',
  '/passenger/list',
  '/offline',
];

const TABS = [
  {
    id: 'home',
    label: 'Start',
    icon: Home,
    href: '/',
    exact: true,
    activePaths: ['/'],
  },
  {
    id: 'fahrt',
    label: 'Fahrt',
    icon: Car,
    href: null,
    exact: false,
    activePaths: ['/select-prayer', '/passenger/list', '/arrival'],
  },
  {
    id: 'termine',
    label: 'Termine',
    icon: CalendarDays,
    href: '/history',
    exact: false,
    activePaths: ['/history', '/events'],
  },
  {
    id: 'profil',
    label: 'Profil',
    icon: UserRound,
    href: '/profile',
    exact: false,
    activePaths: ['/profile', '/admin'],
  },
] as const;

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [showFahrtSheet, setShowFahrtSheet] = useState(false);

  if (HIDDEN_PATHS.some(p => pathname.startsWith(p))) return null;

  const isActive = (tab: (typeof TABS)[number]) => {
    if (tab.exact) return pathname === tab.activePaths[0];
    return (tab.activePaths as readonly string[]).some(p => pathname.startsWith(p));
  };

  const handleTabPress = (tab: (typeof TABS)[number]) => {
    if (tab.id === 'fahrt') {
      setShowFahrtSheet(true);
    } else if (tab.href) {
      router.push(tab.href);
    }
  };

  return (
    <>
      {/* ── Bottom Navigation Bar ─────────────────────────────────────────── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex items-stretch"
        style={{
          background: 'color-mix(in srgb, var(--app-surface1) 94%, transparent)',
          borderTop: '1px solid var(--app-border)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {TABS.map((tab) => {
          const active = isActive(tab);
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => handleTabPress(tab)}
              className="flex-1 flex flex-col items-center justify-center gap-1.5 py-3 transition-all duration-150 active:scale-95"
              aria-label={tab.label}
            >
              {/* Icon with active pill */}
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

              {/* Label */}
              <span
                className="text-[9px] font-bold uppercase tracking-widest leading-none transition-colors duration-150"
                style={{ color: active ? 'var(--app-gold)' : 'var(--app-text3)' }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
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
                  className="rounded-2xl p-5 text-left transition-all active:scale-95 hover:brightness-105"
                  style={{
                    background: 'var(--app-gold-dim)',
                    border: '1px solid var(--app-gold)',
                  }}
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
                  className="rounded-2xl p-5 text-left transition-all active:scale-95 hover:brightness-105"
                  style={{
                    background: 'var(--app-blue-dim)',
                    border: '1px solid var(--app-blue)',
                  }}
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
                className="w-full py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]"
                style={{
                  background: 'var(--app-surface1)',
                  border: '1px solid var(--app-border)',
                  color: 'var(--app-text3)',
                }}
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
