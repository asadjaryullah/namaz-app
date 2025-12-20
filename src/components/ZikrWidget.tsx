'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Card } from "@/components/ui/card";
import { ArrowRight, CheckCircle2 } from "lucide-react";

export default function ZikrWidget({ userId }: { userId: string }) {
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchZikr = async () => {
      const today = new Date().toLocaleDateString('en-CA');
      const { data } = await supabase
        .from('zikr_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('log_date', today)
        .maybeSingle();

      if (data) {
        // Gesamtfortschritt berechnen (400 ist das Ziel: 200 + 100 + 100)
        const total = (data.zikr1_count || 0) + (data.zikr2_count || 0) + (data.zikr3_count || 0);
        const percent = Math.min(Math.round((total / 400) * 100), 100);
        setProgress(percent);
      }
      setLoading(false);
    };
    fetchZikr();
  }, [userId]);

  if (loading) return <div className="h-20 w-full bg-slate-100 rounded-2xl animate-pulse"></div>;

  return (
    <div 
      onClick={() => router.push('/history')}
      className="w-full bg-gradient-to-r from-emerald-900 to-emerald-800 rounded-2xl p-4 text-white shadow-lg cursor-pointer hover:scale-[1.02] transition-transform relative overflow-hidden"
    >
      {/* Hintergrund Deko */}
      <div className="absolute right-0 top-0 opacity-10">
        <svg width="100" height="100" viewBox="0 0 100 100">
           <circle cx="50" cy="50" r="40" stroke="white" strokeWidth="10" fill="none" />
        </svg>
      </div>

      <div className="flex items-center justify-between relative z-10">
        <div>
          <p className="text-xs font-bold text-emerald-200 uppercase tracking-widest mb-1">
            Täglicher Zikr
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black">{progress}%</span>
            <span className="text-sm text-emerald-100">geschafft</span>
          </div>
        </div>

        {/* Kreis Diagramm Miniatur */}
        <div className="relative w-12 h-12 flex items-center justify-center">
          <svg className="w-full h-full rotate-[-90deg]" viewBox="0 0 36 36">
            <path
              className="text-emerald-700"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="text-white drop-shadow-md"
              strokeDasharray={`${progress}, 100`}
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </svg>
          {progress === 100 && <CheckCircle2 size={16} className="absolute text-white" />}
        </div>
      </div>
      
      <div className="mt-2 flex items-center gap-1 text-[10px] text-emerald-200 font-medium">
        <span>Hier tippen zum Fortfahren</span>
        <ArrowRight size={10} />
      </div>
    </div>
  );
}