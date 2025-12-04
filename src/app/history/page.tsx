'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Loader2, ArrowLeft, Car, User, TrendingUp } from "lucide-react";

export default function HistoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  
  // Wir speichern hier mehr Infos: Datum UND Rolle (Fahrer/Mitfahrer)
  const [allRides, setAllRides] = useState<{date: string, role: 'driver' | 'passenger'}[]>([]);
  
  const [viewDate, setViewDate] = useState(new Date());

  useEffect(() => {
    const fetchHistory = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fahrten als FAHRER
      const { data: driverData } = await supabase
        .from('rides')
        .select('ride_date')
        .eq('driver_id', user.id)
        .eq('status', 'completed');

      // Daten aufbereiten
      const driverRides = driverData?.map(r => ({ date: r.ride_date, role: 'driver' as const })) || [];

      // 2. Fahrten als MITFAHRER
      const { data: myBookings } = await supabase
        .from('bookings')
        .select('ride_id')
        .eq('passenger_id', user.id);
      
      let passengerRides: {date: string, role: 'passenger'}[] = [];
      
      if (myBookings && myBookings.length > 0) {
        const rideIds = myBookings.map(b => b.ride_id);
        const { data: completedRides } = await supabase
          .from('rides')
          .select('ride_date')
          .in('id', rideIds)
          .eq('status', 'completed');
        
        if (completedRides) {
          passengerRides = completedRides.map(r => ({ date: r.ride_date, role: 'passenger' as const }));
        }
      }

      // Alles zusammenfügen
      setAllRides([...driverRides, ...passengerRides]);
      setLoading(false);
    };

    fetchHistory();
  }, []);

  // --- KALENDER LOGIK ---

  const nextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  const prevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth(); 
  const monthName = viewDate.toLocaleString('de-DE', { month: 'long' });
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  let startDay = new Date(year, month, 1).getDay();
  startDay = startDay === 0 ? 6 : startDay - 1;

  // --- STATISTIK BERECHNEN (Für den angezeigten Monat) ---
  
  // Filtert alle Fahrten des aktuellen Monats
  const currentMonthRides = allRides.filter(r => {
    // ride_date Format: "YYYY-MM-DD"
    const [rYear, rMonth] = r.date.split('-'); 
    return parseInt(rYear) === year && parseInt(rMonth) === month + 1;
  });

  const totalCount = currentMonthRides.length;
  const driverCount = currentMonthRides.filter(r => r.role === 'driver').length;
  const passengerCount = currentMonthRides.filter(r => r.role === 'passenger').length;

  // Zählt Gebete pro Tag für die Kalender-Ansicht
  const getDailyCount = (day: number) => {
    const dayStr = day.toString().padStart(2, '0');
    // Wir suchen einfach im String nach dem Tag, da wir oben schon gefiltert haben (optional)
    // Oder sicherer:
    const fullDate = `${year}-${(month+1).toString().padStart(2, '0')}-${dayStr}`;
    return allRides.filter(r => r.date === fullDate).length;
  };

  const getStatusColor = (count: number) => {
    if (count === 0) return "bg-slate-50 text-slate-300 border border-slate-100"; 
    if (count >= 5) return "bg-green-600 text-white shadow-md shadow-green-200 border-none scale-110"; 
    if (count >= 3) return "bg-blue-500 text-white border-none";
    return "bg-orange-400 text-white border-none";
  };

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center p-4 pb-20">
      
      {/* Header */}
      <div className="w-full max-w-md flex items-center mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
          <ArrowLeft className="h-6 w-6 text-slate-600" />
        </Button>
        <h1 className="text-xl font-bold ml-2 text-slate-800">Mein Gebets-Log</h1>
      </div>

      {loading ? (
        <div className="py-20"><Loader2 className="animate-spin text-slate-400"/></div>
      ) : (
        <div className="w-full max-w-md space-y-6">
          
          {/* --- NEUE STATISTIK KARTE --- */}
          <div className="grid grid-cols-2 gap-4">
            {/* Große Gesamt-Box */}
            <Card className="col-span-2 p-5 bg-slate-900 text-white shadow-xl rounded-3xl flex justify-between items-center relative overflow-hidden">
              <div className="relative z-10">
                <p className="text-slate-400 text-xs uppercase font-bold tracking-widest mb-1">{monthName}</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black">{totalCount}</span>
                  <span className="text-sm font-medium text-slate-400">Gebete</span>
                </div>
              </div>
              <div className="bg-white/10 p-3 rounded-full relative z-10">
                <TrendingUp size={32} />
              </div>
              {/* Deko Kreis im Hintergrund */}
              <div className="absolute -right-6 -bottom-10 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
            </Card>

            {/* Kleine Detail-Boxen */}
            <Card className="p-4 flex flex-col items-center justify-center gap-2 rounded-2xl border-0 shadow-sm bg-white">
              <div className="bg-slate-100 p-2 rounded-full text-slate-700">
                <Car size={20} />
              </div>
              <div className="text-center">
                <span className="block text-xl font-bold text-slate-900">{driverCount}</span>
                <span className="text-[10px] text-slate-400 uppercase font-bold">Gefahren</span>
              </div>
            </Card>

            <Card className="p-4 flex flex-col items-center justify-center gap-2 rounded-2xl border-0 shadow-sm bg-white">
              <div className="bg-blue-50 p-2 rounded-full text-blue-600">
                <User size={20} />
              </div>
              <div className="text-center">
                <span className="block text-xl font-bold text-slate-900">{passengerCount}</span>
                <span className="text-[10px] text-slate-400 uppercase font-bold">Mitgefahren</span>
              </div>
            </Card>
          </div>
          {/* --------------------------- */}

          {/* Kalender Karte */}
          <Card className="p-6 bg-white shadow-lg rounded-3xl border-0">
            
            <div className="flex justify-between items-center mb-6">
              <Button variant="ghost" size="icon" onClick={prevMonth} className="hover:bg-slate-100 rounded-full">
                <ChevronLeft className="h-6 w-6" />
              </Button>
              
              <div className="text-center">
                <h2 className="text-lg font-bold text-slate-900">{monthName}</h2>
                <p className="text-xs text-slate-400 font-bold uppercase">{year}</p>
              </div>

              <Button variant="ghost" size="icon" onClick={nextMonth} className="hover:bg-slate-100 rounded-full">
                <ChevronRight className="h-6 w-6" />
              </Button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Mo','Di','Mi','Do','Fr','Sa','So'].map(d => (
                <div key={d} className="text-center text-[10px] text-slate-400 font-bold uppercase">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: startDay }).map((_, i) => (
                <div key={`empty-${i}`} className="w-8 h-8"></div>
              ))}

              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const count = getDailyCount(dayNum);

                return (
                  <div key={dayNum} className="flex flex-col items-center">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${getStatusColor(count)}`}>
                      {dayNum}
                    </div>
                    <div className="flex gap-[1px] mt-1 h-1">
                       {count > 0 && <div className="w-1 h-1 rounded-full bg-slate-300"></div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

        </div>
      )}
    </main>
  );
}