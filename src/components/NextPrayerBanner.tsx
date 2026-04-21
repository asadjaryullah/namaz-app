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
    <div className={`w-full rounded-2xl p-4 text-white relative overflow-hidden ${isClose ? 'bg-gradient-to-r from-emerald-800 to-emerald-700' : 'bg-gradient-to-r from-slate-900 to-slate-800'}`}>
      {/* Subtiles Muster */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-12 translate-x-12" />
        <div className="absolute bottom-0 left-0 w-20 h-20 bg-white rounded-full translate-y-8 -translate-x-8" />
      </div>

      <div className="relative z-10">
        <p className={`text-[10px] uppercase tracking-widest font-bold mb-2 ${isClose ? 'text-emerald-300' : 'text-slate-400'}`}>
          {isClose ? '🕌 Gleich ist Gebet' : 'Nächstes Gebet'}
        </p>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-3xl font-black leading-none">{next.name}</p>
            <p className={`text-sm mt-1 ${isClose ? 'text-emerald-300' : 'text-slate-400'}`}>{next.time} Uhr</p>
          </div>
          <div className="text-right">
            <p className={`text-4xl font-black leading-none tabular-nums ${isClose ? 'text-emerald-200' : 'text-white'}`}>
              {countdown}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
