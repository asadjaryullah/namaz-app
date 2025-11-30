'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ChevronLeft, Loader2, Save, LogOut } from "lucide-react";
import { Sunrise, Sun, Sunset, Moon, CloudMoon, Clock } from "lucide-react";
import ProfileBar from '@/components/ProfileBar'; 

// 👇 HIER DEINE EMAIL PRÜFEN
const ADMIN_EMAIL = "asad.jaryullah@googlemail.com"; 

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

// --- AUTO SITZPLAN KOMPONENTE ---
function CarSeatSelector({ 
  availableSeats, 
  onChange 
}: { 
  availableSeats: number, 
  onChange: (n: number) => void 
}) {
  const [seats, setSeats] = useState([true, true, true, true]);

  const toggleSeat = (index: number) => {
    const newSeats = [...seats];
    newSeats[index] = !newSeats[index];
    setSeats(newSeats);
    const count = newSeats.filter(s => s).length;
    onChange(count);
  };

  return (
    <div className="flex flex-col items-center mt-4 mb-6 animate-in fade-in zoom-in duration-300">
      <p className="text-sm font-bold text-slate-500 mb-2 uppercase tracking-wider">
        Wähle freie Plätze ({availableSeats})
      </p>
      
      <div className="bg-slate-800 p-4 rounded-[2.5rem] shadow-2xl border-4 border-slate-700 w-48 relative">
        <div className="h-10 bg-gradient-to-b from-blue-200 to-blue-400 rounded-t-xl opacity-50 mb-4 border-b-4 border-slate-900 mx-2"></div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-4 px-2">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-lg bg-slate-600 border-2 border-slate-500 flex items-center justify-center shadow-inner">
               <span className="text-xl">👮‍♂️</span>
            </div>
            <span className="text-[10px] text-slate-400 font-bold mt-1">DU</span>
          </div>

          <button onClick={() => toggleSeat(0)} className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center transition-all shadow-md active:scale-95 ${seats[0] ? 'bg-green-500 border-green-400 text-white' : 'bg-red-500 border-red-400 text-white opacity-90'}`}>
            {seats[0] ? '✔' : '❌'}
          </button>

          <button onClick={() => toggleSeat(1)} className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center transition-all shadow-md active:scale-95 ${seats[1] ? 'bg-green-500 border-green-400 text-white' : 'bg-red-500 border-red-400 text-white opacity-90'}`}>
             {seats[1] ? '✔' : '❌'}
          </button>

          <button onClick={() => toggleSeat(2)} className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center transition-all shadow-md active:scale-95 ${seats[2] ? 'bg-green-500 border-green-400 text-white' : 'bg-red-500 border-red-400 text-white opacity-90'}`}>
             {seats[2] ? '✔' : '❌'}
          </button>
          
          <div className="col-span-2 flex justify-center -mt-2">
             <button onClick={() => toggleSeat(3)} className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center transition-all shadow-md active:scale-95 ${seats[3] ? 'bg-green-500 border-green-400 text-white' : 'bg-red-500 border-red-400 text-white opacity-90'}`}>
                 {seats[3] ? '✔' : '❌'}
              </button>
          </div>
        </div>
      </div>
      <p className="text-xs text-slate-400 mt-2">Tippe auf einen Sitz, um ihn zu blockieren.</p>
    </div>
  );
}

type Prayer = {
  id: string;
  name: string;
  time: string;
  sort_order: number;
};

function SelectPrayerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = searchParams.get('role') || 'passenger'; 

  const [prayers, setPrayers] = useState<Prayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  // Neuer State für Sitze (Standard 4)
  const [seats, setSeats] = useState(4);

  const [isAdmin, setIsAdmin] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creatingRide, setCreatingRide] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        setIsAdmin(true);
      }
      const { data } = await supabase
        .from('prayer_times')
        .select('*')
        .order('sort_order', { ascending: true });
      
      if (data) setPrayers(data);
      setLoading(false);
    };
    init();
  }, []);

  const handleTimeChange = (id: string, newTime: string) => {
    setPrayers(prayers.map(p => p.id === id ? { ...p, time: newTime } : p));
  };

  const handleSaveTimes = async () => {
    setSaving(true);
    const { error } = await supabase.from('prayer_times').upsert(prayers);
    setSaving(false);
    if (error) alert("Fehler: " + error.message);
    else alert("Zeiten erfolgreich für alle aktualisiert!");
  };

  const handleNext = async () => {
    const selectedPrayer = prayers.find(p => p.id === selectedId);
    if (!selectedPrayer) return;

    if (role === 'driver') {
      setCreatingRide(true);

      if (!navigator.geolocation) {
        alert("GPS fehlt."); setCreatingRide(false); return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;

          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          const today = new Date().toISOString().split('T')[0];

          const { error } = await supabase.from('rides').insert({
            driver_id: user.id,
            driver_name: profile?.full_name || "Unbekannt",
            driver_phone: profile?.phone || "",
            prayer_id: selectedPrayer.id,
            prayer_time: selectedPrayer.time,
            seats: seats,
            start_lat: lat,
            start_lon: lon,
            ride_date: today
          });

          setCreatingRide(false);

          if (error) {
            alert("Fehler: " + error.message);
          } else {
            router.push('/driver/dashboard'); 
          }
        },
        (error) => {
          setCreatingRide(false);
          alert("Bitte GPS erlauben.");
          console.error(error);
        }
      );

    } else {
      router.push(`/passenger/list?prayer=${selectedPrayer.id}&time=${selectedPrayer.time}`);
    }
  };

  return (
    <div className="w-full max-w-md flex flex-col items-center">
      
      <div className="w-full flex items-center justify-between mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <div className="text-center">
          <h1 className="text-xl font-bold">Wann ist das Gebet?</h1>
          {isAdmin && <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded font-bold">ADMIN MODUS</span>}
          {!isAdmin && <p className="text-xs text-slate-500 uppercase font-bold mt-1">{role === 'driver' ? 'Fahrt anbieten' : 'Fahrt suchen'}</p>}
        </div>
        <div className="w-9"></div> 
      </div>

      {loading ? (
        <div className="py-20 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-slate-400"/></div>
      ) : (
        <div className="w-full space-y-3 mb-24">
          {prayers.map((prayer) => {
            const Icon = getIcon(prayer.id);
            const isSelected = selectedId === prayer.id;

            return (
              <Card 
                key={prayer.id}
                onClick={() => setSelectedId(prayer.id)}
                className={`
                  p-3 flex items-center gap-3 transition-all border-2 cursor-pointer
                  ${isSelected ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900' : 'border-transparent hover:border-slate-200'}
                `}
              >
                <div className={`p-2 rounded-full ${isSelected ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  <Icon size={20} />
                </div>

                <div className="flex-1">
                  <h3 className="font-bold text-slate-900">{prayer.name}</h3>
                </div>

                {isAdmin ? (
                   <div onClick={(e) => e.stopPropagation()}>
                     <Input type="time" value={prayer.time} onChange={(e) => handleTimeChange(prayer.id, e.target.value)} className="w-24 text-center font-mono border-red-300 focus:border-red-600 bg-white" />
                   </div>
                ) : (
                   <div className="text-xl font-mono font-bold text-slate-700">
                     {prayer.time}
                   </div>
                )}
              </Card>
            );
          })}

          {role === 'driver' && selectedId && (
            <CarSeatSelector availableSeats={seats} onChange={setSeats} />
          )}

          {isAdmin && (
            <Button className="w-full bg-red-600 hover:bg-red-700 text-white mt-4" onClick={handleSaveTimes} disabled={saving}>
              {saving ? <Loader2 className="animate-spin mr-2"/> : <Save className="mr-2 h-4 w-4"/>}
              Zeiten für alle speichern
            </Button>
          )}
        </div>
      )}

      {!loading && (
          <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t flex justify-center z-10">
            <Button 
              className="w-full max-w-md h-12 text-lg rounded-xl bg-slate-900 text-white hover:bg-slate-800 shadow-lg" 
              disabled={!selectedId || creatingRide}
              onClick={handleNext}
            >
              {creatingRide ? (
                 <><Loader2 className="animate-spin mr-2"/> Starten...</> 
              ) : (
                 role === 'driver' ? `Fahrt mit ${seats} Plätzen starten ➜` : 'Fahrer suchen ➜'
              )}
            </Button>
          </div>
      )}
    </div>
  );
}

export default function SelectPrayerPage() {
  return (
    <main className="min-h-screen bg-slate-50 flex flex-col">
      <ProfileBar />
      <div className="p-6 flex flex-col items-center">
        <Suspense fallback={<div>Lade...</div>}>
          <SelectPrayerContent />
        </Suspense>
      </div>
    </main>
  );
}