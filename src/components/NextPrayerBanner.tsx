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

export default function NextPrayerBanner() {
  const [next, setNext] = useState<{ name: string; time: string; minsLeft: number } | null>(null);
  const [prayers, setPrayers] = useState<Prayer[]>([]);

  useEffect(() => {
    supabase
      .from('prayer_times')
      .select('name,time')
      .order('sort_order')
      .then(({ data }) => {
        if (data) setPrayers(data);
      });
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
        // Letztes Gebet vorbei → nächstes ist Fajr morgen
        const first = prayers[0];
        const minsLeft = 24 * 60 - nowMin + toMinutes(first.time);
        setNext({ ...first, minsLeft });
      }
    };

    compute();
    const interval = setInterval(compute, 60_000);
    return () => clearInterval(interval);
  }, [prayers]);

  if (!next) return <div className="h-24 w-full bg-slate-800/50 rounded-2xl animate-pulse" />;

  const hours = Math.floor(next.minsLeft / 60);
  const mins = next.minsLeft % 60;
  const countdown = hours > 0 ? `${hours}h ${mins}m` : `${mins} Min`;
  const isClose = next.minsLeft <= 30;

  return (
    <div className={`w-full rounded-2xl p-4 relative overflow-hidden transition-all duration-500 ${
      isClose
        ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200'
        : 'bg-white border border-slate-100 shadow-sm'
    }`}>
      {/* Dekoratives Element */}
      <div className={`absolute right-4 top-1/2 -translate-y-1/2 w-16 h-16 rounded-full opacity-10 ${isClose ? 'bg-emerald-500' : 'bg-slate-300'}`} />
      {isClose && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 w-16 h-16 rounded-full border-2 border-emerald-400 animate-pulse-ring" />
      )}

      <div className="relative z-10">
        <p className={`text-[10px] uppercase tracking-widest font-bold mb-2 ${isClose ? 'text-emerald-600' : 'text-slate-400'}`}>
          {isClose ? '🕌 Gleich ist Gebet' : 'Nächstes Gebet'}
        </p>
        <div className="flex items-end justify-between">
          <div>
            <p className={`text-3xl font-black leading-none ${isClose ? 'text-emerald-800' : 'text-slate-900'}`}>
              {next.name}
            </p>
            <p className={`text-sm mt-1 ${isClose ? 'text-emerald-500' : 'text-slate-400'}`}>{next.time} Uhr</p>
          </div>
          <div className="text-right">
            <p className={`text-4xl font-black leading-none tabular-nums ${isClose ? 'text-emerald-700' : 'text-slate-700'}`}>
              {countdown}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
