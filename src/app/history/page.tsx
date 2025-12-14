'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
// 👇 Icons erweitert (Check, RotateCcw für Zikr)
import { ChevronLeft, ChevronRight, Loader2, ArrowLeft, TrendingUp, Car, User, Footprints, Check, RotateCcw } from "lucide-react";

// --- KONFIGURATION DER ZIKRS ---
const ZIKR_LIST = [
  {
    key: 'zikr1_count',
    target: 200,
    arabic: "سُبْحَانَ اللّٰهِ وَبِحَمْدِهِ سُبْحَانَ اللّٰهِ العَظِيمِ\nاللَّهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ وَآلِ مُحَمَّدٍ",
    title: "Tasbih & Salawat"
  },
  {
    key: 'zikr2_count',
    target: 100,
    arabic: "أَسْتَغْفِرُ اللّٰهَ رَبِّي مِنْ كُلِّ ذَنْبٍ وَأَتُوبُ إِلَيْهِ",
    title: "Istighfar"
  },
  {
    key: 'zikr3_count',
    target: 100,
    arabic: "رَبِّ كُلُّ شَيْءٍ خَادِمُكَ رَبِّ فَاحْفَظْنِي وَانْصُرْنِي وَارْحَمْنِي",
    title: "Dua"
  }
];

export default function HistoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  
  // Statistik Daten
  const [allRides, setAllRides] = useState<{date: string, role: 'driver' | 'passenger' | 'walk-in'}[]>([]);
  const [viewDate, setViewDate] = useState(new Date());

  // Zikr Daten (State)
  const [zikrData, setZikrData] = useState<any>({ zikr1_count: 0, zikr2_count: 0, zikr3_count: 0 });
  const [todayLogId, setTodayLogId] = useState<string | null>(null);

  // Timer fürs Speichern (damit wir die DB nicht überlasten)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toLocaleDateString('en-CA');

      // --- TEIL 1: FAHRTEN LADEN (Dein bestehender Code) ---
      const { data: driverData } = await supabase
        .from('rides')
        .select('ride_date')
        .eq('driver_id', user.id)
        .eq('status', 'completed');
      const driverRides = driverData?.map(r => ({ date: r.ride_date, role: 'driver' as const })) || [];

      const { data: myBookings } = await supabase.from('bookings').select('ride_id').eq('passenger_id', user.id);
      let passengerRides: any[] = [];
      if (myBookings && myBookings.length > 0) {
        const rideIds = myBookings.map(b => b.ride_id);
        const { data: completedRides } = await supabase
          .from('rides')
          .select('ride_date')
          .in('id', rideIds)
          .eq('status', 'completed');
        if (completedRides) passengerRides = completedRides.map(r => ({ date: r.ride_date, role: 'passenger' as const }));
      }

      const { data: visitData } = await supabase
        .from('mosque_visits')
        .select('visit_date')
        .eq('user_id', user.id);
      
      const walkInRides = visitData?.map(v => ({ date: v.visit_date, role: 'walk-in' as const })) || [];

      setAllRides([...driverRides, ...passengerRides, ...walkInRides]);

      // --- TEIL 2: ZIKR LADEN (Neu) ---
      const { data: zikrLog } = await supabase
        .from('zikr_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('log_date', today)
        .maybeSingle();

      if (zikrLog) {
        setZikrData(zikrLog);
        setTodayLogId(zikrLog.id);
      } else {
        // Wenn es heute noch keinen Eintrag gibt -> Erstellen
        const { data: newLog } = await supabase
          .from('zikr_logs')
          .insert({ user_id: user.id, log_date: today })
          .select()
          .single();
        if (newLog) {
          setTodayLogId(newLog.id);
          setZikrData(newLog);
        }
      }

      setLoading(false);
    };

    fetchHistory();
  }, []);

  // --- ZIKR FUNKTIONEN ---
  const saveToDb = (newData: any) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      if (todayLogId) {
        await supabase.from('zikr_logs').update(newData).eq('id', todayLogId);
      }
    }, 1000); // Speichert 1 Sekunde nach dem letzten Klick
  };

  const handleZikrClick = (key: string, target: number) => {
    const currentVal = zikrData[key] || 0;
    if (currentVal >= target) return;

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(50); // Kleines Feedback am Handy
    }

    const newVal = currentVal + 1;
    const newData = { ...zikrData, [key]: newVal };
    setZikrData(newData);
    saveToDb(newData);
  };

  const handleReset = (e: React.MouseEvent, key: string) => {
    e.stopPropagation();
    if(!confirm("Zähler zurücksetzen?")) return;

    const newData = { ...zikrData, [key]: 0 };
    setZikrData(newData);
    saveToDb(newData);
  };

  // --- KALENDER HELPER (Dein Code) ---
  const nextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  const prevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth(); 
  const monthName = viewDate.toLocaleString('de-DE', { month: 'long' });
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let startDay = new Date(year, month, 1).getDay();
  startDay = startDay === 0 ? 6 : startDay - 1;

  const currentMonthRides = allRides.filter(r => {
    const [rYear, rMonth] = r.date.split('-'); 
    return parseInt(rYear) === year && parseInt(rMonth) === month + 1;
  });

  const totalCount = currentMonthRides.length;
  const driverCount = currentMonthRides.filter(r => r.role === 'driver').length;
  const passengerCount = currentMonthRides.filter(r => r.role === 'passenger').length;
  const walkInCount = currentMonthRides.filter(r => r.role === 'walk-in').length;

  const getDailyCount = (day: number) => {
    const dayStr = day.toString().padStart(2, '0');
    const fullDate = `${year}-${(month+1).toString().padStart(2, '0')}-${dayStr}`;
    return allRides.filter(r => r.date === fullDate).length;
  };

  const getRingStyle = (count: number) => {
    const percentage = Math.min(count * 20, 100); 
    let color = '#cbd5e1'; 
    if (count >= 5) color = '#16a34a'; 
    else if (count >= 3) color = '#3b82f6'; 
    else if (count > 0) color = '#f97316'; 
    return { background: `conic-gradient(${color} ${percentage}%, #f1f5f9 0)` };
  };

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center p-4 pb-20">
      <div className="w-full max-w-md flex items-center mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.push('/')}><ArrowLeft className="h-6 w-6 text-slate-600" /></Button>
        <h1 className="text-xl font-bold ml-2 text-slate-800">Mein Gebets-Log</h1>
      </div>

      {loading ? ( <div className="py-20"><Loader2 className="animate-spin text-slate-400"/></div> ) : (
        <div className="w-full max-w-md space-y-8">
          
          {/* --- NEU: ZIKR ZÄHLER --- */}
          <div>
             <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
               📿 Täglicher Zikr
             </h2>
             <div className="space-y-4">
               {ZIKR_LIST.map((item) => {
                 const count = zikrData[item.key] || 0;
                 const progress = (count / item.target) * 100;
                 const isDone = count >= item.target;

                 return (
                   <Card 
                      key={item.key}
                      onClick={() => handleZikrClick(item.key, item.target)}
                      className={`
                        relative overflow-hidden cursor-pointer transition-all active:scale-95 border-2
                        ${isDone ? 'border-green-500 bg-green-50' : 'border-slate-200 bg-white hover:border-slate-300'}
                      `}
                   >
                     <div 
                        className="absolute bottom-0 left-0 h-1 bg-green-500 transition-all duration-300" 
                        style={{ width: `${progress}%` }}
                     ></div>

                     {count > 0 && !isDone && (
                       <div className="absolute top-2 right-2 z-10">
                         <button 
                           onClick={(e) => handleReset(e, item.key)}
                           className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                           title="Zurücksetzen"
                         >
                           <RotateCcw size={14} />
                         </button>
                       </div>
                     )}

                     <div className="p-4 flex items-center justify-between gap-4">
                       <div className="flex-1">
                         <p className="text-xs font-bold text-slate-400 uppercase mb-1">{item.title}</p>
                         <p className="text-xl font-bold text-slate-900 font-arabic leading-relaxed" style={{ fontFamily: 'var(--font-amiri)' }}>
                           {item.arabic}
                         </p>
                       </div>

                       <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
                          {isDone ? (
                            <div className="bg-green-500 text-white rounded-full p-2 shadow-lg animate-in zoom-in">
                              <Check size={24} />
                            </div>
                          ) : (
                            <div className="w-full h-full rounded-full flex items-center justify-center bg-slate-100 text-slate-700 font-bold border-4 border-slate-200"
                                 style={{ background: `conic-gradient(#16a34a ${progress}%, #e2e8f0 0)` }}
                            >
                               <div className="w-11 h-11 bg-white rounded-full flex items-center justify-center text-xs">
                                 {count}
                               </div>
                            </div>
                          )}
                       </div>
                     </div>
                   </Card>
                 )
               })}
             </div>
          </div>
          {/* ------------------------- */}
          
          <Card className="col-span-2 p-5 bg-slate-900 text-white shadow-xl rounded-3xl flex justify-between items-center relative overflow-hidden">
            <div className="relative z-10">
              <p className="text-slate-400 text-xs uppercase font-bold tracking-widest mb-1">{monthName}</p>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-black">{totalCount}</span>
                <span className="text-sm font-medium text-slate-400">Gebete</span>
              </div>
            </div>
            <div className="bg-white/10 p-3 rounded-full relative z-10"><TrendingUp size={32} /></div>
          </Card>

          <div className="grid grid-cols-3 gap-2">
            <Card className="p-2 flex flex-col items-center justify-center gap-1 rounded-2xl border-0 shadow-sm bg-white">
              <div className="bg-slate-100 p-1.5 rounded-full text-slate-700"><Car size={16} /></div>
              <span className="block text-lg font-bold text-slate-900">{driverCount}</span>
              <span className="text-[9px] text-slate-400 uppercase font-bold">Fahrer</span>
            </Card>
            <Card className="p-2 flex flex-col items-center justify-center gap-1 rounded-2xl border-0 shadow-sm bg-white">
              <div className="bg-blue-50 p-1.5 rounded-full text-blue-600"><User size={16} /></div>
              <span className="block text-lg font-bold text-slate-900">{passengerCount}</span>
              <span className="text-[9px] text-slate-400 uppercase font-bold">Mitfahrer</span>
            </Card>
            <Card className="p-2 flex flex-col items-center justify-center gap-1 rounded-2xl border-0 shadow-sm bg-white">
              <div className="bg-green-50 p-1.5 rounded-full text-green-600"><Footprints size={16} /></div>
              <span className="block text-lg font-bold text-slate-900">{walkInCount}</span>
              <span className="text-[9px] text-slate-400 uppercase font-bold">Besucher</span>
            </Card>
          </div>

          <Card className="p-6 bg-white shadow-lg rounded-3xl border-0">
            <div className="flex justify-between items-center mb-6">
              <Button variant="ghost" size="icon" onClick={prevMonth} className="hover:bg-slate-100 rounded-full"><ChevronLeft className="h-6 w-6" /></Button>
              <div className="text-center"><h2 className="text-lg font-bold text-slate-900">{monthName}</h2><p className="text-xs text-slate-400 font-bold uppercase">{year}</p></div>
              <Button variant="ghost" size="icon" onClick={nextMonth} className="hover:bg-slate-100 rounded-full"><ChevronRight className="h-6 w-6" /></Button>
            </div>
            <div className="grid grid-cols-7 gap-y-4 gap-x-2">
              {['Mo','Di','Mi','Do','Fr','Sa','So'].map(d => (<div key={d} className="text-center text-[10px] text-slate-400 font-bold uppercase">{d}</div>))}
              {Array.from({ length: startDay }).map((_, i) => (<div key={`empty-${i}`}></div>))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const count = getDailyCount(dayNum);
                return (
                  <div key={dayNum} className="flex flex-col items-center justify-center relative">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center transition-all" style={getRingStyle(count)}>
                      <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-xs font-bold text-slate-700 shadow-sm">{dayNum}</div>
                    </div>
                    {count > 0 && <span className="text-[9px] text-slate-400 font-medium absolute -bottom-4">{count}/5</span>}
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