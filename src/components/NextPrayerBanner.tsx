'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Prayer = { name: string; time: string };

function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function getBerlinMinutes() {
  const hhmm = new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Berlin' }).slice(11, 16);
  return toMinutes(hhmm);
}

const PRAYER_ICONS: Record<string, string> = {
  Fajr: '🌅', Dhuhr: '☀️', Asr: '🌤️', Maghrib: '🌇', Isha: '🌙',
};

export default function NextPrayerBanner() {
  const [next, setNext] = useState<{ name: string; time: string; minsLeft: number } | null>(null);
  const [prayers, setPrayers] = useState<Prayer[]>([]);

  useEffect(() => {
    supabase
      .from('prayer_times')
      .select('name,time')
      .order('sort_order')
      .then(({ data }) => { if (data) setPrayers(data); });
  }, []);

  useEffect(() => {
    if (!prayers.length) return;
    const compute = () => {
      const nowMin = getBerlinMinutes();
      const upcoming = prayers
        .map(p => ({ ...p, minsLeft: toMinutes(p.time) - nowMin }))
        .filter(p => p.minsLeft > 0)
        .sort((a, b) => a.minsLeft - b.minsLeft);
      if (upcoming.length > 0) {
        setNext(upcoming[0]);
      } else {
        const first = prayers[0];
        setNext({ ...first, minsLeft: 24 * 60 - nowMin + toMinutes(first.time) });
      }
    };
    compute();
    const interval = setInterval(compute, 60_000);
    return () => clearInterval(interval);
  }, [prayers]);

  if (!next) {
    return (
      <div className="h-24 w-full rounded-2xl animate-pulse"
        style={{ background: 'var(--app-surface2)', border: '1px solid var(--app-border)' }} />
    );
  }

  const hours = Math.floor(next.minsLeft / 60);
  const mins = next.minsLeft % 60;
  const countdown = hours > 0 ? `${hours}h ${mins}m` : `${mins} Min`;
  const isClose = next.minsLeft <= 30;
  const icon = PRAYER_ICONS[next.name] || '🕌';

  return (
    <div className="w-full rounded-2xl p-4 relative overflow-hidden"
      style={{ transition: 'background-color 0.3s ease-out, border-color 0.3s ease-out, box-shadow 0.3s ease-out' }}
      style={{
        background: isClose ? 'var(--app-emerald-dim)' : 'var(--app-surface2)',
        border: `1px solid ${isClose ? 'var(--app-emerald)' : 'var(--app-border)'}`,
        boxShadow: isClose ? '0 4px 24px rgba(34,211,138,0.15)' : 'none',
      }}>
      {isClose && (
        <div className="animate-pulse-ring absolute pointer-events-none"
          style={{ top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(34,211,138,0.12)' }} />
      )}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[68px] opacity-[0.07] select-none pointer-events-none leading-none">
        {icon}
      </div>
      <div className="relative z-10">
        <p className="text-[10px] uppercase tracking-widest font-bold mb-2"
          style={{ color: isClose ? 'var(--app-emerald)' : 'var(--app-text2)' }}>
          {isClose ? '🕌 Gleich ist Gebet' : 'Nächstes Gebet'}
        </p>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-3xl font-extrabold leading-none"
              style={{ color: 'var(--app-text)', letterSpacing: '-0.03em' }}>
              {next.name}
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--app-text2)' }}>{next.time} Uhr</p>
          </div>
          <div className="text-right">
            <p className="font-mono-app text-4xl font-bold leading-none tabular-nums"
              style={{ color: isClose ? 'var(--app-emerald)' : 'var(--app-gold)', letterSpacing: '-0.02em' }}>
              {countdown}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
