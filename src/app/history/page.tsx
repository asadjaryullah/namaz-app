'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Loader2, ArrowLeft, TrendingUp, Car, User, Footprints, Check, RotateCcw } from "lucide-react";

// --- KONFIGURATION MIT FARBEN ---
const ZIKR_LIST = [
  {
    key: 'zikr1_count',
    target: 200,
    theme: { bg: 'bg-rose-50 border-rose-100', text: 'text-rose-900', ring: '#f43f5e', bar: 'bg-rose-500' },
    arabic: "سُبْحَانَ اللّٰهِ وَبِحَمْدِهِ\nسُبْحَانَ اللّٰهِ العَظِيمِ\nاللَّهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ\nوَآلِ مُحَمَّدٍ",
    translation: "Heilig ist Allah und jeder Verehrung würdig. Erhaben ist Allah, der Größte. O Allah, schütte Deine Gnade aus über Muhammad (saw) und seinen Anhängern.",
    title: "Tasbih & Salawat"
  },
  {
    key: 'zikr2_count',
    target: 100,
    theme: { bg: 'bg-sky-50 border-sky-100', text: 'text-sky-900', ring: '#0ea5e9', bar: 'bg-sky-500' },
    arabic: "أَسْتَغْفِرُ اللّٰهَ رَبِّي\nمِنْ كُلِّ ذَنْبٍ وَأَتُوبُ إِلَيْهِ",
    translation: "Ich ersuche Vergebung bei Allah, meinem Herrn, für all meine Sünden und wende mich zu Ihm in Reue.",
    title: "Istighfar"
  },
  {
    key: 'zikr3_count',
    target: 100,
    theme: { bg: 'bg-amber-50 border-amber-100', text: 'text-amber-900', ring: '#f59e0b', bar: 'bg-amber-500' },
    arabic: "رَبِّ كُلُّ شَيْءٍ خَادِمُكَ\nرَبِّ فَاحْفَظْنِي وَانْصُرْنِي وَارْحَمْنِي",
    translation: "O mein Herr, alles ist Dein Diener. O mein Herr, beschütze mich und hilf mir und sei mir gnädig.",
    title: "Dua"
  }
];

export default function HistoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  
  const [allRides, setAllRides] = useState<any[]>([]);
  const [viewDate, setViewDate] = useState(new Date());

  const [zikrData, setZikrData] = useState<any>({ zikr1_count: 0, zikr2_count: 0, zikr3_count: 0 });
  const [todayLogId, setTodayLogId] = useState<string | null>(null);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toLocaleDateString('en-CA');

      // Fahrten laden
      const { data: driverData } = await supabase.from('rides').select('ride_date').eq('driver_id', user.id).eq('status', 'completed');
      const driverRides = driverData?.map(r => ({ date: r.ride_date, role: 'driver' as const })) || [];

      const { data: myBookings } = await supabase.from('bookings').select('ride_id').eq('passenger_id', user.id);
      let passengerRides: any[] = [];
      if (myBookings && myBookings.length > 0) {
        const rideIds = myBookings.map(b => b.ride_id);
        const { data: completedRides } = await supabase.from('rides').select('ride_date').in('id', rideIds).eq('status', 'completed');
        if (completedRides) passengerRides = completedRides.map(r => ({ date: r.ride_date, role: 'passenger' as const }));
      }

      const { data: visitData } = await supabase.from('mosque_visits').select('visit_date').eq('user_id', user.id);
      const walkInRides = visitData?.map(v => ({ date: v.visit_date, role: 'walk-in' as const })) || [];

      setAllRides([...driverRides, ...passengerRides, ...walkInRides]);

      // Zikr laden
      const { data: zikrLog } = await supabase.from('zikr_logs').select('*').eq('user_id', user.id).eq('log_date', today).maybeSingle();
      if (zikrLog) {
        setZikrData(zikrLog);
        setTodayLogId(zikrLog.id);
      } else {
        const { data: newLog } = await supabase.from('zikr_logs').insert({ user_id: user.id, log_date: today }).select().single();
        if (newLog) {
          setTodayLogId(newLog.id);
          setZikrData(newLog);
        }
      }

      setLoading(false);
    };
    fetchHistory();
  }, []);

  const saveToDb = (newData: any) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      if (todayLogId) await supabase.from('zikr_logs').update(newData).eq('id', todayLogId);
    }, 1000);
  };

  const handleZikrClick = (key: string, target: number) => {
    const currentVal = zikrData[key] || 0;
    if (currentVal >= target) return;

    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);

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

  // Kalender Helper
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
        <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
          <ArrowLeft className="h-6 w-6 text-slate-600" />
        </Button>
        <h1 className="text-xl font-bold ml-2 text-slate-800">Logbuch & Zikr</h1>
      </div>

      {loading ? ( <div className="py-20"><Loader2 className="animate-spin text-slate-400"/></div> ) : (
        <div className="w-full max-w-md space-y-8">
          
          {/* --- ZIKR DESIGN --- */}
          <div>
             <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
               📿 Täglicher Zikr
             </h2>
             <div className="space-y-4">
               {ZIKR_LIST.map((item) => {
                 const count = zikrData[item.key] || 0;
                 const progress = Math.min((count / item.target) * 100, 100);
                 const isDone = count >= item.target;

                 return (
                   <Card 
                      key={item.key}
                      onClick={() => !isDone && handleZikrClick(item.key, item.target)}
                      className={`
                        relative overflow-hidden transition-all duration-200 border-0 shadow-md
                        ${isDone 
                          ? 'bg-emerald-500 cursor-default'  
                          : `cursor-pointer active:scale-95 ${item.theme.bg} ${item.theme.text}`}
                      `}
                   >
                     {/* Häkchen Hintergrund */}
                     {isDone && (
                        <div className="absolute right-[-20px] bottom-[-20px] text-white/20 transform rotate-12">
                          <Check size={120} />
                        </div>
                     )}

                     {/* Balken */}
                     {!isDone && (
                        <div 
                          className={`absolute bottom-0 left-0 h-1.5 transition-all duration-300 ${item.theme.bar}`} 
                          style={{ width: `${progress}%` }}
                        ></div>
                     )}

                     {/* Reset Button */}
                     {count > 0 && !isDone && (
                       <div className="absolute top-3 left-3 z-10">
                         <button 
                           onClick={(e) => handleReset(e, item.key)}
                           className="p-1.5 bg-white/60 rounded-full text-slate-400 hover:text-red-500 hover:bg-white transition-all shadow-sm"
                         >
                           <RotateCcw size={14} />
                         </button>
                       </div>
                     )}

                     <div className="p-5 flex items-center justify-between gap-4">
                       
                       <div className="shrink-0 flex flex-col items-center justify-center min-w-[3rem]">
                          <span className={`text-2xl font-black ${isDone ? 'text-white' : ''}`}>
                             {count}
                          </span>
                          <span className={`text-[10px] font-bold uppercase ${isDone ? 'text-emerald-100' : 'opacity-60'}`}>
                             {isDone ? 'FERTIG' : `von ${item.target}`}
                          </span>
                       </div>

                       <div className="flex-1 flex flex-col items-end text-right">
                         <p className={`text-xs font-bold uppercase mb-1 tracking-widest ${isDone ? 'text-emerald-100' : 'opacity-60'}`}>
                            {item.title}
                         </p>
                         <p className={`text-xl font-bold leading-loose font-arabic ${isDone ? 'text-white' : ''}`} 
                            style={{ fontFamily: 'var(--font-amiri)', direction: 'rtl', lineHeight: '1.8' }}>
                           {item.arabic}
                         </p>
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