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
    <main className="min-h-screen bg-slate-50 flex flex-col items-center p-6 pb-20">
      
      <div className="mt-6 mb-6 bg-green-100 p-6 rounded-full shadow-inner animate-in zoom-in duration-500">
        <span className="text-6xl">🕌</span>
      </div>

      <h1 className="text-2xl font-bold text-slate-900 text-center mb-2">
        Willkommen in der Moschee
      </h1>
      <p className="text-slate-500 text-center mb-8 max-w-xs">
        Möge Allah dein Gebet annehmen.
      </p>

      {/* DUA KARTE - AKTUALISIERT */}
      <Card className="w-full max-w-md p-6 bg-white border-l-4 border-l-green-600 shadow-md mb-6">
        <div className="flex items-center gap-2 mb-4 text-green-700 font-semibold">
          <BookOpen size={20} />
          <h2>Bittgebet beim Eintreten</h2>
        </div>
        
        {/* Das neue arabische Gebet */}
        <p className="text-right text-xl font-serif leading-loose mb-6 dir-rtl text-slate-800" style={{ direction: 'rtl', lineHeight: '2.2' }}>
          بِسْمِ اللهِ، وَالصَّلَاةُ وَالسَّلَامُ عَلَى رَسُولِ اللهِ،<br/>
          اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ
        </p>
        
        {/* Lautschrift */}
        <p className="text-sm text-slate-500 italic mb-3 leading-relaxed">
          "Bismillāh, was-salātu was-salāmu ʿalā rasūli Llāh,<br/>
          Allāhumma ftaḥ lī abwāba raḥmatik."
        </p>
        
        {/* Deutsche Übersetzung */}
        <p className="text-slate-900 font-medium text-sm">
          Im Namen Allahs, und Frieden und Segen seien auf dem Gesandten Allahs.
          O Allah, öffne mir die Tore Deiner Barmherzigkeit.
        </p>
      </Card>

      {/* CHECKLISTE */}
      <div className="w-full max-w-md space-y-4">
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
          Deine Sunnah Checkliste
        </h3>

        <div className="w-full bg-slate-200 h-2 rounded-full mb-4 overflow-hidden">
          <div 
            className="bg-green-600 h-full transition-all duration-500 ease-out" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>

        <div 
          onClick={() => toggle('wudhu')}
          className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${checked.wudhu ? 'bg-green-50 border-green-500' : 'bg-white border-transparent shadow-sm'}`}
        >
          <div className={`p-2 rounded-full ${checked.wudhu ? 'bg-green-500 text-white' : 'bg-blue-100 text-blue-500'}`}>
            <Droplets size={24} />
          </div>
          <div className="flex-1">
            <p className={`font-bold ${checked.wudhu ? 'text-green-900 line-through' : 'text-slate-900'}`}>Wudhu machen</p>
            <p className="text-xs text-slate-500">Frisch und sauber zum Gebet</p>
          </div>
          {checked.wudhu && <CheckCircle2 className="text-green-600" />}
        </div>

        <div 
          onClick={() => toggle('rightFoot')}
          className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${checked.rightFoot ? 'bg-green-50 border-green-500' : 'bg-white border-transparent shadow-sm'}`}
        >
          <div className={`p-2 rounded-full ${checked.rightFoot ? 'bg-green-500 text-white' : 'bg-orange-100 text-orange-500'}`}>
            <ArrowRight size={24} />
          </div>
          <div className="flex-1">
            <p className={`font-bold ${checked.rightFoot ? 'text-green-900 line-through' : 'text-slate-900'}`}>Rechter Fuß zuerst</p>
            <p className="text-xs text-slate-500">Sunnah beim Eintreten</p>
          </div>
          {checked.rightFoot && <CheckCircle2 className="text-green-600" />}
        </div>

        <div 
          onClick={() => toggle('dua')}
          className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${checked.dua ? 'bg-green-50 border-green-500' : 'bg-white border-transparent shadow-sm'}`}
        >
          <div className={`p-2 rounded-full ${checked.dua ? 'bg-green-500 text-white' : 'bg-purple-100 text-purple-500'}`}>
            <BookOpen size={24} />
          </div>
          <div className="flex-1">
            <p className={`font-bold ${checked.dua ? 'text-green-900 line-through' : 'text-slate-900'}`}>Dua sprechen</p>
            <p className="text-xs text-slate-500">Bittgebet für Barmherzigkeit</p>
          </div>
          {checked.dua && <CheckCircle2 className="text-green-600" />}
        </div>

        <div 
          onClick={() => toggle('nawafil')}
          className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${checked.nawafil ? 'bg-green-50 border-green-500' : 'bg-white border-transparent shadow-sm'}`}
        >
          <div className={`p-2 rounded-full ${checked.nawafil ? 'bg-green-500 text-white' : 'bg-indigo-100 text-indigo-500'}`}>
            <Moon size={24} />
          </div>
          <div className="flex-1">
            <p className={`font-bold ${checked.nawafil ? 'text-green-900 line-through' : 'text-slate-900'}`}>2 Raka'at Nawafil</p>
            <p className="text-xs text-slate-500">Tahiyat-ul-Masjid beten</p>
          </div>
          {checked.nawafil && <CheckCircle2 className="text-green-600" />}
        </div>

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