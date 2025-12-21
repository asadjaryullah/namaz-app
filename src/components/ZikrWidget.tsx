'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";

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

  // Wir nutzen einen Query-Parameter (?tab=zikr), damit die History-Seite den richtigen Tab öffnet
  const handleClick = () => router.push('/history?tab=zikr');

  if (loading) return <div className="h-24 w-full bg-slate-100 rounded-2xl animate-pulse mb-4"></div>;

  return (
    <div 
      onClick={handleClick}
      className="w-full bg-white rounded-2xl p-4 shadow-sm border border-slate-100 cursor-pointer hover:border-emerald-300 hover:shadow-md transition-all mb-4 group"
    >
      <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest group-hover:text-emerald-600 transition-colors">Täglicher Zikr</p>
          <ArrowRight size={16} className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
      </div>

      <div className="flex justify-around items-center">
        <Ring color="#f43f5e" percent={data.zikr1} label="Tasbih" />
        <Ring color="#0ea5e9" percent={data.zikr2} label="Istighfar" />
        <Ring color="#f59e0b" percent={data.zikr3} label="Dua" />
      </div>
    </div>
  );
}

function Ring({ color, percent, label }: { color: string, percent: number, label: string }) {
    const radius = 18;
    const stroke = 4;
    const normalizedRadius = radius - stroke * 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = circumference - (percent / 100) * circumference;
  
    return (
      <div className="flex flex-col items-center gap-1">
        <div className="relative w-12 h-12 flex items-center justify-center">
            <svg height={radius * 2} width={radius * 2} className="rotate-[-90deg]">
                <circle stroke="#f1f5f9" strokeWidth={stroke} r={normalizedRadius} cx={radius} cy={radius} fill="transparent" />
                <circle
                stroke={color}
                fill="transparent"
                strokeWidth={stroke}
                strokeDasharray={circumference + ' ' + circumference}
                style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.5s ease-in-out' }}
                strokeLinecap="round"
                r={normalizedRadius}
                cx={radius}
                cy={radius}
                />
            </svg>
            <span className="absolute text-[10px] font-bold text-slate-600">{Math.round(percent)}%</span>
        </div>
        <span className="text-[9px] font-bold text-slate-400 uppercase">{label}</span>
      </div>
    );
}