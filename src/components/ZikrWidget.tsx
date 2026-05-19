'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowRight } from "lucide-react";

export default function ZikrWidget({ userId }: { userId: string }) {
  const router = useRouter();
  const [data, setData] = useState({ zikr1: 0, zikr2: 0, zikr3: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchZikr = async () => {
      const today = new Date().toLocaleDateString('en-CA');
      const { data } = await supabase.from('zikr_logs').select('*').eq('user_id', userId).eq('log_date', today).maybeSingle();
      if (data) {
        setData({
          zikr1: Math.min((data.zikr1_count / 200) * 100, 100),
          zikr2: Math.min((data.zikr2_count / 100) * 100, 100),
          zikr3: Math.min((data.zikr3_count / 100) * 100, 100),
        });
      }
      setLoading(false);
    };
    fetchZikr();
  }, [userId]);

  if (loading) {
    return (
      <div className="h-24 w-full rounded-2xl animate-pulse"
        style={{ background: 'var(--app-surface2)', border: '1px solid var(--app-border)' }} />
    );
  }

  return (
    <div
      onClick={() => router.push('/history?tab=zikr')}
      className="w-full rounded-[18px] p-4 cursor-pointer app-card-hover-emerald active:scale-[0.98]"
      style={{
        background: 'var(--app-surface2)',
        border: '1px solid var(--app-border)',
        transition: 'border-color 0.2s ease-out, box-shadow 0.2s ease-out, transform 0.15s ease-out',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.1em]"
          style={{ color: 'var(--app-text2)' }}>
          Täglicher Zikr
        </p>
        <ArrowRight size={14} style={{ color: 'var(--app-text3)' }} />
      </div>
      <div className="flex justify-around items-center">
        <Ring color="var(--app-rose)" percent={data.zikr1} label="Tasbih" />
        <Ring color="var(--app-blue)" percent={data.zikr2} label="Istighfar" />
        <Ring color="var(--app-gold)" percent={data.zikr3} label="Dua" />
      </div>
    </div>
  );
}

function Ring({ color, percent, label }: { color: string; percent: number; label: string }) {
  const r = 20, stroke = 4, nr = r - stroke * 2;
  const circ = nr * 2 * Math.PI;
  const offset = circ - (percent / 100) * circ;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative flex items-center justify-center" style={{ width: r * 2, height: r * 2 }}>
        <svg width={r * 2} height={r * 2} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={r} cy={r} r={nr} fill="transparent"
            stroke="rgba(128,128,128,0.12)" strokeWidth={stroke} />
          <circle cx={r} cy={r} r={nr} fill="transparent"
            stroke={color} strokeWidth={stroke}
            strokeDasharray={`${circ} ${circ}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
        </svg>
        <span className="absolute text-[9px] font-bold" style={{ color: 'var(--app-text2)' }}>
          {Math.round(percent)}%
        </span>
      </div>
      <span className="text-[9px] font-bold uppercase tracking-[0.08em]"
        style={{ color: 'var(--app-text3)' }}>
        {label}
      </span>
    </div>
  );
}