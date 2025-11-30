'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeft, Clock, Loader2, Calendar } from "lucide-react";

// Hilfsfunktion für Icons (da wir Icons nicht in der DB speichern, ordnen wir sie hier zu)
import { Sunrise, Sun, Sunset, Moon, CloudMoon } from "lucide-react";
const getIcon = (id: string) => {
  switch(id) {
    case 'fajr': return Sunrise;
    case 'dhuhr': return Sun;
    case 'asr': return CloudMoon;
    case 'maghrib': return Sunset;
    case 'isha': return Moon;
    default: return Clock;
  }
};

type Prayer = {
  id: string;
  name: string;
  time: string;
};

function SelectPrayerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = searchParams.get('role') || 'passenger'; 

  const [prayers, setPrayers] = useState<Prayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // DATEN LADEN
  useEffect(() => {
    const fetchPrayers = async () => {
      const { data } = await supabase
        .from('prayer_times')
        .select('*')
        .order('sort_order', { ascending: true });
      
      if (data) setPrayers(data);
      setLoading(false);
    };
    fetchPrayers();
  }, []);

  const handleNext = () => {
    const selectedPrayer = prayers.find(p => p.id === selectedId);
    if (!selectedPrayer) return;

    // Logik für den nächsten Schritt (Fahrt erstellen oder suchen)
    if (role === 'driver') {
        // HIER WÜRDE MAN ZUR SEITE "FAHRT ERSTELLEN" WEITERLEITEN
        alert(`Fahrt wird erstellt für ${selectedPrayer.name} um ${selectedPrayer.time} Uhr.`);
    } else {
        // HIER WÜRDE MAN ZUR SEITE "FAHRER SUCHEN" WEITERLEITEN
        alert(`Suche Fahrer für ${selectedPrayer.name} um ${selectedPrayer.time} Uhr.`);
    }
  };

  return (
    <div className="w-full max-w-md flex flex-col items-center">
      
      {/* Header */}
      <div className="w-full flex items-center mb-6 relative">
        <Button variant="ghost" size="icon" className="absolute left-0" onClick={() => router.back()}>
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <div className="w-full text-center">
          <h1 className="text-xl font-bold">Wann ist das Gebet?</h1>
          <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mt-1">
            {role === 'driver' ? 'Fahrt anbieten' : 'Fahrt suchen'}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center text-slate-400">
            <Loader2 className="h-10 w-10 animate-spin mb-4"/>
            <p>Lade aktuelle Zeiten...</p>
        </div>
      ) : (
        <div className="w-full space-y-3 mb-24">
          {prayers.map((prayer) => {
            const Icon = getIcon(prayer.id);
            const isSelected = selectedId === prayer.id;

            return (
              <Card 
                key={prayer.id}
                className={`
                  p-4 flex items-center gap-4 transition-all border-2 cursor-pointer
                  ${isSelected 
                    ? 'border-slate-900 bg-slate-50 shadow-md ring-1 ring-slate-900' 
                    : 'border-transparent hover:border-slate-200 hover:bg-white'}
                `}
                onClick={() => setSelectedId(prayer.id)}
              >
                <div className={`p-3 rounded-full ${isSelected ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  <Icon size={24} />
                </div>

                <div className="flex-1">
                  <h3 className={`font-bold text-lg ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>
                    {prayer.name}
                  </h3>
                  <p className="text-slate-500 text-xs flex items-center gap-1">
                     <Calendar size={12}/> Heute
                  </p>
                </div>

                <div className={`text-xl font-mono font-bold ${isSelected ? 'text-slate-900' : 'text-slate-600'}`}>
                  {prayer.time}
                </div>

                <div className={`h-5 w-5 rounded-full border flex items-center justify-center ml-2 ${isSelected ? 'border-slate-900' : 'border-slate-300'}`}>
                  {isSelected && <div className="h-2.5 w-2.5 bg-slate-900 rounded-full" />}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Button */}
      {!loading && (
          <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t flex justify-center z-10">
            <Button 
              className="w-full max-w-md h-12 text-lg rounded-xl bg-slate-900 text-white hover:bg-slate-800 shadow-lg" 
              disabled={!selectedId}
              onClick={handleNext}
            >
              {role === 'driver' ? 'Weiter zur Fahrt-Erstellung ➜' : 'Fahrer suchen ➜'}
            </Button>
          </div>
      )}
    </div>
  );
}

export default function SelectPrayerPage() {
  return (
    <main className="min-h-screen bg-slate-50 p-6 flex flex-col items-center">
      <Suspense fallback={<div>Lade...</div>}>
        <SelectPrayerContent />
      </Suspense>
    </main>
  );
}