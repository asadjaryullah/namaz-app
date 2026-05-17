'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Droplets, BookOpen, Moon, ArrowRight } from "lucide-react";

export default function ArrivalPage() {
  const router = useRouter();

  const [checked, setChecked] = useState({
    wudhu: false,
    dua: false,
    rightFoot: false,
    nawafil: false
  });

  const toggle = (key: keyof typeof checked) => {
    setChecked(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const completedCount = Object.values(checked).filter(Boolean).length;
  const progress = (completedCount / 4) * 100;

  return (
    <main className="min-h-screen flex flex-col items-center p-6 pb-20" style={{ background: 'var(--app-bg)' }}>

      <div className="mt-6 mb-6 p-6 rounded-full shadow-inner animate-in zoom-in duration-500" style={{ background: 'var(--app-emerald-dim)' }}>
        <span className="text-6xl">🕌</span>
      </div>

      <h1 className="text-2xl font-bold text-center mb-2" style={{ color: 'var(--app-text)' }}>
        Willkommen in der Moschee
      </h1>
      <p className="text-center mb-8 max-w-xs" style={{ color: 'var(--app-text2)' }}>
        Möge Allah dein Gebet annehmen.
      </p>

      {/* DUA KARTE */}
      <Card className="w-full max-w-md p-6 border-l-4 shadow-md mb-6" style={{ background: 'var(--app-card)', borderLeftColor: 'var(--app-emerald)' }}>
        <div className="flex items-center gap-2 mb-4 font-semibold" style={{ color: 'var(--app-emerald)' }}>
          <BookOpen size={20} />
          <h2>Bittgebet beim Eintreten</h2>
        </div>

        <div className="text-center mb-6" style={{ direction: 'rtl', fontFamily: 'var(--font-amiri)' }}>
          <p className="text-xl mb-2 leading-normal" style={{ color: 'var(--app-text2)' }}>
            بِسْمِ اللهِ، وَالصَّلَاةُ وَالسَّلَامُ عَلَى رَسُولِ اللهِ
          </p>
          <p className="text-3xl font-bold leading-normal" style={{ color: 'var(--app-text)' }}>
            اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ
          </p>
        </div>

        <p className="text-sm italic mb-3 leading-relaxed text-center" style={{ color: 'var(--app-text3)' }}>
          "Bismillāh, was-salātu was-salāmu ʿalā rasūli Llāh,<br/>
          Allāhumma ftaḥ lī abwāba raḥmatik."
        </p>

        <p className="font-medium text-sm text-center" style={{ color: 'var(--app-text)' }}>
          Im Namen Allahs, und Frieden und Segen seien auf dem Gesandten Allahs.
          O Allah, öffne mir die Tore Deiner Barmherzigkeit.
        </p>
      </Card>

      {/* CHECKLISTE */}
      <div className="w-full max-w-md space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--app-text2)' }}>
          Deine Sunnah Checkliste
        </h3>

        <div className="w-full h-2 rounded-full mb-4 overflow-hidden" style={{ background: 'var(--app-border)' }}>
          <div
            className="h-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%`, background: 'var(--app-emerald)' }}
          ></div>
        </div>

        {([
          { key: 'wudhu', Icon: Droplets, label: 'Wudhu machen', sub: 'Frisch und sauber zum Gebet', iconStyle: { background: 'var(--app-blue-dim)', color: 'var(--app-blue)' } },
          { key: 'rightFoot', Icon: ArrowRight, label: 'Rechter Fuß zuerst', sub: 'Sunnah beim Eintreten', iconStyle: { background: 'rgba(251,146,60,0.12)', color: '#f97316' } },
          { key: 'dua', Icon: BookOpen, label: 'Dua sprechen', sub: 'Bittgebet für Barmherzigkeit', iconStyle: { background: 'rgba(167,139,250,0.15)', color: '#a78bfa' } },
          { key: 'nawafil', Icon: Moon, label: "2 Raka'at Nawafil", sub: "Tahiyat-ul-Masjid beten", iconStyle: { background: 'rgba(99,102,241,0.12)', color: '#6366f1' } },
        ] as const).map(({ key, Icon, label, sub, iconStyle }) => {
          const isChecked = checked[key as keyof typeof checked];
          return (
            <div
              key={key}
              onClick={() => toggle(key as keyof typeof checked)}
              className="flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all"
              style={{
                background: isChecked ? 'var(--app-emerald-dim)' : 'var(--app-card)',
                borderColor: isChecked ? 'var(--app-emerald)' : 'transparent',
              }}
            >
              <div className="p-2 rounded-full" style={isChecked ? { background: 'var(--app-emerald)', color: '#fff' } : iconStyle}>
                <Icon size={24} />
              </div>
              <div className="flex-1">
                <p className={`font-bold ${isChecked ? 'line-through' : ''}`} style={{ color: isChecked ? 'var(--app-emerald)' : 'var(--app-text)' }}>{label}</p>
                <p className="text-xs" style={{ color: 'var(--app-text3)' }}>{sub}</p>
              </div>
              {isChecked && <CheckCircle2 style={{ color: 'var(--app-emerald)' }} />}
            </div>
          );
        })}
      </div>

      <Button
        className="mt-8 w-full max-w-md"
        variant="outline"
        onClick={() => router.push('/')}
      >
        Schließen & Zurück
      </Button>

    </main>
  );
}
