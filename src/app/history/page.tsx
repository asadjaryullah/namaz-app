'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Loader2, ArrowLeft, TrendingUp } from "lucide-react";

export default function HistoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [allRides, setAllRides] = useState<{date: string, role: 'driver' | 'passenger'}[]>([]);
  const [viewDate, setViewDate] = useState(new Date());

  useEffect(() => {
    const fetchHistory = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: driverData } = await supabase
        .from('rides')
        .select('ride_date')
        .eq('driver_id', user.id)
        .eq('status', 'completed');

      const driverRides = driverData?.map(r => ({ date: r.ride_date, role: 'driver' as const })) || [];

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

      setAllRides([...driverRides, ...passengerRides]);
      setLoading(false);
    };

    fetchHistory();
  }, []);

  const nextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  const prevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth(); 
  const monthName = viewDate.toLocaleString('de-DE', { month: 'long' });
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  let startDay = new Date(year, month, 1).getDay();
  startDay = startDay === 0 ? 6 : startDay - 1;

  // Statistik für den aktuellen Monat
  const currentMonthRides = allRides.filter(r => {
    const [rYear, rMonth] = r.date.split('-'); 
    return parseInt(rYear) === year && parseInt(rMonth) === month + 1;
  });
  const totalCount = currentMonthRides.length;

  const getDailyCount = (day: number) => {
    const dayStr = day.toString().padStart(2, '0');
    const fullDate = `${year}-${(month+1).toString().padStart(2, '0')}-${dayStr}`;
    return allRides.filter(r => r.date === fullDate).length;
  };

  // --- NEUE FUNKTION: Generiert den Kreis-Style ---
  const getRingStyle = (count: number) => {
    // Max 5 Gebete = 100%
    // count 1 = 20%, count 2 = 40% usw.
    const percentage = Math.min(count * 20, 100); 
    
    let color = '#cbd5e1'; // Grau (leer)
    if (count >= 5) color = '#16a34a'; // Grün (Voll)
    else if (count >= 3) color = '#3b82f6'; // Blau (Gut)
    else if (count > 0) color = '#f97316'; // Orange (Start)

    return {
      background: `conic-gradient(${color} ${percentage}%, #f1f5f9 0)`
    };
  };

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center p-4 pb-20">
      
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
          
          {/* Gesamt-Box */}
          <Card className="p-5 bg-slate-900 text-white shadow-xl rounded-3xl flex justify-between items-center relative overflow-hidden">
            <div className="relative z-10">
              <p className="text-slate-400 text-xs uppercase font-bold tracking-widest mb-1">{monthName}</p>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-black">{totalCount}</span>
                <span className="text-sm font-medium text-slate-400">Gebete gesamt</span>
              </div>
            </div>
            <div className="bg-white/10 p-3 rounded-full relative z-10">
              <TrendingUp size={32} />
            </div>
          </Card>

          {/* Kalender */}
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

            <div className="grid grid-cols-7 gap-y-4 gap-x-2">
              {['Mo','Di','Mi','Do','Fr','Sa','So'].map(d => (
                <div key={d} className="text-center text-[10px] text-slate-400 font-bold uppercase">{d}</div>
              ))}

              {Array.from({ length: startDay }).map((_, i) => (
                <div key={`empty-${i}`}></div>
              ))}

              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const count = getDailyCount(dayNum);

                return (
                  <div key={dayNum} className="flex flex-col items-center justify-center relative">
                    
                    {/* DER RING (Kreisdiagramm) */}
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center transition-all"
                      style={getRingStyle(count)} // Hier passiert die Magie
                    >
                      {/* Der innere weiße Kreis */}
                      <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-xs font-bold text-slate-700 shadow-sm">
                        {dayNum}
                      </div>
                    </div>

                    {/* Anzeige "3/5" unter dem Tag (nur wenn > 0) */}
                    {count > 0 && (
                      <span className="text-[9px] text-slate-400 font-medium absolute -bottom-4">
                        {count}/5
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          <div className="text-center text-xs text-slate-400">
            Jeder geschlossene Ring ist ein voller Erfolg (5 Gebete).
          </div>

        </div>
      )}
    </main>
  );
}