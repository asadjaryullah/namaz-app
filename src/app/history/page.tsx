'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ChevronLeft, ChevronRight, Loader2, ArrowLeft, TrendingUp,
  Car, User, Footprints, Check, RotateCcw, Calendar, MapPin
} from "lucide-react";

// --- KONFIGURATION ZIKR ---
const ZIKR_LIST = [
  {
    key: 'zikr1_count',
    target: 200,
    theme: { bg: 'bg-rose-50 border-rose-100', text: 'text-rose-900', ring: '#f43f5e', bar: 'bg-rose-500', iconBg: 'bg-rose-100' },
    arabic: "سُبْحَانَ اللّٰهِ وَبِحَمْدِهِ\nسُبْحَانَ اللّٰهِ العَظِيمِ\nاللَّهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ\nوَآلِ مُحَمَّدٍ",
    translation: "Heilig ist Allah und jeder Verehrung würdig. Erhaben ist Allah, der Größte. O Allah, schütte Deine Gnade aus über Muhammad (saw) und seinen Anhängern.",
    title: "Tasbih & Salawat"
  },
  {
    key: 'zikr2_count',
    target: 100,
    theme: { bg: 'bg-sky-50 border-sky-100', text: 'text-sky-900', ring: '#0ea5e9', bar: 'bg-sky-500', iconBg: 'bg-sky-100' },
    arabic: "أَسْتَغْفِرُ اللّٰهَ رَبِّي\nمِنْ كُلِّ ذَنْبٍ وَأَتُوبُ إِلَيْهِ",
    translation: "Ich ersuche Vergebung bei Allah, meinem Herrn, für all meine Sünden und wende mich zu Ihm in Reue.",
    title: "Istighfar"
  },
  {
    key: 'zikr3_count',
    target: 100,
    theme: { bg: 'bg-amber-50 border-amber-100', text: 'text-amber-900', ring: '#f59e0b', bar: 'bg-amber-500', iconBg: 'bg-amber-100' },
    arabic: "رَبِّ كُلُّ شَيْءٍ خَادِمُكَ\nرَبِّ فَاحْفَظْنِي وَانْصُرْنِي وَارْحَمْنِي",
    translation: "O mein Herr, alles ist Dein Diener. O mein Herr, beschütze mich und hilf mir und sei mir gnädig.",
    title: "Dua"
  }
];

function HistoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);

  const initialTab = (searchParams.get('tab') as 'zikr' | 'events' | 'calendar') || 'zikr';
  const [activeTab, setActiveTab] = useState<'zikr' | 'events' | 'calendar'>(initialTab);

  const [allRides, setAllRides] = useState<any[]>([]);
  const [viewDate, setViewDate] = useState(new Date());
  const [zikrData, setZikrData] = useState<any>({ zikr1_count: 0, zikr2_count: 0, zikr3_count: 0 });
  const [todayLogId, setTodayLogId] = useState<string | null>(null);
  const [events, setEvents] = useState<any[]>([]);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toLocaleDateString('en-CA');

      // FAHRTEN
      const { data: driverData } = await supabase.from('rides').select('ride_date').eq('driver_id', user.id).eq('status', 'completed');
      const driverRides = driverData?.map(r => ({ date: r.ride_date, role: 'driver' as const })) || [];

      const { data: myBookings } = await supabase.from('bookings').select('ride_id').eq('passenger_id', user.id);
      let passengerRides: any[] = [];
      if (myBookings?.length) {
        const rideIds = myBookings.map(b => b.ride_id);
        const { data: completedRides } = await supabase.from('rides').select('ride_date').in('id', rideIds).eq('status', 'completed');
        passengerRides = completedRides?.map(r => ({ date: r.ride_date, role: 'passenger' as const })) || [];
      }

      const { data: visitData } = await supabase.from('mosque_visits').select('visit_date').eq('user_id', user.id);
      const walkInRides = visitData?.map(v => ({ date: v.visit_date, role: 'walk-in' as const })) || [];
      setAllRides([...driverRides, ...passengerRides, ...walkInRides]);

      // ZIKR
      const { data: zikrLog } = await supabase.from('zikr_logs').select('*').eq('user_id', user.id).eq('log_date', today).maybeSingle();
      if (zikrLog) {
        setZikrData(zikrLog);
        setTodayLogId(zikrLog.id);
      } else {
        const { data: newLog } = await supabase.from('zikr_logs').insert({ user_id: user.id, log_date: today }).select().single();
        if (newLog) { setTodayLogId(newLog.id); setZikrData(newLog); }
      }

      // EVENTS (Future) ✅ mit explizitem select
      const { data: eventsData } = await supabase
        .from('mosque_events')
        .select('id,title,event_date,event_end_date,location,description')
        .gte('event_date', new Date().toISOString())
        .order('event_date', { ascending: true });

      if (eventsData) setEvents(eventsData);

      setLoading(false);
    };

    fetchHistory();
  }, []);

  // ✅ Endzeit robust: nur Range wenn Ende wirklich später ist
  const formatTimeRange = (startStr: string, endStr?: string | null) => {
    const start = new Date(startStr);
    const startFmt = start.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

    if (!endStr) return `${startFmt} Uhr`;

    const end = new Date(endStr);
    const diffMs = end.getTime() - start.getTime();
    if (diffMs <= 60_000) return `${startFmt} Uhr`; // gleich/zu kurz -> keine Range

    const endFmt = end.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    return `${startFmt} - ${endFmt} Uhr`;
  };

  const saveToDb = (newData: any) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      if (todayLogId) await supabase.from('zikr_logs').update(newData).eq('id', todayLogId);
    }, 800);
  };

  const handleZikrClick = (key: string, target: number) => {
    const currentVal = zikrData[key] || 0;
    if (currentVal >= target) return;
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(15);
    const newData = { ...zikrData, [key]: currentVal + 1 };
    setZikrData(newData);
    saveToDb(newData);
  };

  const handleReset = (e: React.MouseEvent, key: string) => {
    e.stopPropagation();
    if (!confirm("Zähler zurücksetzen?")) return;
    const newData = { ...zikrData, [key]: 0 };
    setZikrData(newData);
    saveToDb(newData);
  };

  const openCalendar = (apiUrl: string) => {
    const host = window.location.host;
    window.location.href = `webcal://${host}${apiUrl}`;
  };

  const nextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  const prevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthName = viewDate.toLocaleString('de-DE', { month: 'long' });
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let startDay = new Date(year, month, 1).getDay();
  startDay = startDay === 0 ? 6 : startDay - 1;

  // Statistik helper
  const currentMonthRides = allRides.filter(r => {
    const [y, m] = r.date.split('-');
    return parseInt(y) === year && parseInt(m) === month + 1;
  });

  const totalCount = currentMonthRides.length;
  const driverCount = currentMonthRides.filter(r => r.role === 'driver').length;
  const passengerCount = currentMonthRides.filter(r => r.role === 'passenger').length;
  const walkInCount = currentMonthRides.filter(r => r.role === 'walk-in').length;

  const getDailyCount = (day: number) => {
    const dayStr = day.toString().padStart(2, '0');
    const fullDate = `${year}-${(month + 1).toString().padStart(2, '0')}-${dayStr}`;
    return allRides.filter(r => r.date === fullDate).length;
  };

  const getRingStyle = (count: number) => {
    const p = Math.min(count * 20, 100);
    let c = '#cbd5e1';
    if (count >= 5) c = '#16a34a';
    else if (count >= 3) c = '#3b82f6';
    else if (count > 0) c = '#f97316';
    return { background: `conic-gradient(${c} ${p}%, #f1f5f9 0)` };
  };

  // ✅ Events pro Tag + Overlap
  const getEventsForDay = (day: number) => {
    const dayStr = day.toString().padStart(2, '0');
    const dateKey = `${year}-${(month + 1).toString().padStart(2, '0')}-${dayStr}`;
    return events
      .filter(e => e.event_date.startsWith(dateKey))
      .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());
  };

  const hasOverlap = (dayEvents: any[]) => {
    if (dayEvents.length < 2) return false;
    let prevEnd = new Date(dayEvents[0].event_end_date || dayEvents[0].event_date).getTime();
    for (let i = 1; i < dayEvents.length; i++) {
      const start = new Date(dayEvents[i].event_date).getTime();
      const end = new Date(dayEvents[i].event_end_date || dayEvents[i].event_date).getTime();
      if (start < prevEnd) return true;
      prevEnd = Math.max(prevEnd, end);
    }
    return false;
  };

  const monthEvents = events.filter(e =>
    new Date(e.event_date).getMonth() === month &&
    new Date(e.event_date).getFullYear() === year
  );

  return (
    <div className="w-full max-w-md space-y-6">
      {/* TABS */}
      <div className="flex p-1 bg-slate-200 rounded-xl mb-4 overflow-x-auto">
        <button onClick={() => setActiveTab('zikr')} className={`flex-1 py-2 px-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'zikr' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>📿 Zikr</button>
        <button onClick={() => setActiveTab('events')} className={`flex-1 py-2 px-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'events' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>📅 Termine</button>
        <button onClick={() => setActiveTab('calendar')} className={`flex-1 py-2 px-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'calendar' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>📊 Statistik</button>
      </div>

      {loading ? (
        <div className="py-10"><Loader2 className="animate-spin text-slate-400 mx-auto" /></div>
      ) : (
        <>
          {/* 1) ZIKR */}
          {activeTab === 'zikr' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
              {ZIKR_LIST.map((item) => {
                const count = zikrData[item.key] || 0;
                const isDone = count >= item.target;
                const progress = Math.min((count / item.target) * 100, 100);

                return (
                  <Card
                    key={item.key}
                    onClick={() => !isDone && handleZikrClick(item.key, item.target)}
                    className={`relative overflow-hidden transition-all duration-200 border-0 shadow-md ${isDone ? 'bg-emerald-500 cursor-default' : `cursor-pointer active:scale-95 ${item.theme.bg} ${item.theme.text}`}`}
                  >
                    {isDone && <div className="absolute right-[-20px] bottom-[-20px] text-white/20 transform rotate-12"><Check size={120} /></div>}
                    {!isDone && <div className={`absolute bottom-0 left-0 h-1.5 transition-all duration-300 ${item.theme.bar}`} style={{ width: `${progress}%` }} />}
                    {count > 0 && !isDone && (
                      <div className="absolute top-3 left-3 z-10">
                        <button onClick={(e) => handleReset(e, item.key)} className="p-1.5 bg-white/60 rounded-full text-slate-400 hover:text-red-500 hover:bg-white transition-all shadow-sm">
                          <RotateCcw size={14} />
                        </button>
                      </div>
                    )}
                    <div className="p-5 flex items-start justify-between gap-4">
                      <div className="shrink-0 flex flex-col items-center justify-center min-w-[3.5rem] pt-2">
                        <span className={`text-3xl font-black ${isDone ? 'text-white' : item.theme.text}`}>{count}</span>
                        <span className={`text-[9px] font-bold uppercase ${isDone ? 'text-emerald-100' : 'opacity-60'}`}>{isDone ? 'FERTIG' : `von ${item.target}`}</span>
                      </div>
                      <div className="flex-1 flex flex-col items-end text-right">
                        <p className={`text-xs font-bold uppercase mb-2 tracking-widest ${isDone ? 'text-emerald-100' : 'opacity-60'}`}>{item.title}</p>
                        <p className={`text-xl font-bold leading-loose ${isDone ? 'text-white' : 'text-slate-800'}`} style={{ fontFamily: 'var(--font-amiri)', direction: 'rtl', lineHeight: '1.8' }}>
                          {item.arabic}
                        </p>
                        <p className={`text-xs mt-3 italic leading-relaxed text-right w-full ${isDone ? 'text-emerald-100' : 'text-slate-500'}`}>{item.translation}</p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* 2) TERMINE */}
          {activeTab === 'events' && (
            <div className="space-y-4 animate-in fade-in duration-300">
              {/* Kalender Grid */}
              <Card className="p-6 bg-white shadow-lg rounded-3xl border-0">
                <div className="flex justify-between items-center mb-6">
                  <Button variant="ghost" size="icon" onClick={prevMonth} className="hover:bg-slate-100 rounded-full"><ChevronLeft className="h-6 w-6" /></Button>
                  <div className="text-center"><h2 className="text-lg font-bold text-slate-900">{monthName}</h2><p className="text-xs text-slate-400 font-bold uppercase">{year}</p></div>
                  <Button variant="ghost" size="icon" onClick={nextMonth} className="hover:bg-slate-100 rounded-full"><ChevronRight className="h-6 w-6" /></Button>
                </div>

                <div className="grid grid-cols-7 gap-y-4 gap-x-2">
                  {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(d => (
                    <div key={d} className="text-center text-[10px] text-slate-400 font-bold uppercase">{d}</div>
                  ))}
                  {Array.from({ length: startDay }).map((_, i) => (<div key={`empty-${i}`} />))}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const dayNum = i + 1;
                    const dayEvents = getEventsForDay(dayNum);
                    const hasEvent = dayEvents.length > 0;
                    const overlap = hasOverlap(dayEvents);

                    return (
                      <div key={dayNum} className="flex flex-col items-center justify-center relative">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all
                            ${!hasEvent
                              ? 'bg-slate-50 text-slate-400'
                              : overlap
                                ? 'bg-red-100 text-red-700 font-bold border-2 border-red-200'
                                : 'bg-orange-100 text-orange-700 font-bold border-2 border-orange-200'
                            }`}
                        >
                          {dayNum}
                        </div>
                        {hasEvent && (
                          <div className={`w-1.5 h-1.5 rounded-full absolute -bottom-1 ${overlap ? 'bg-red-500' : 'bg-orange-500'}`} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Liste */}
              <div className="space-y-3 pt-2">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Termine im {monthName}</h3>

                {monthEvents.length === 0 ? (
                  <p className="text-sm text-slate-400 italic">Keine Termine in diesem Monat.</p>
                ) : (
                  monthEvents.map(e => (
                    <div key={e.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex gap-4">
                      <div className="bg-orange-50 p-3 rounded-xl text-center min-w-[4rem]">
                        <span className="block text-xs font-bold text-orange-600 uppercase">{new Date(e.event_date).toLocaleDateString('de-DE', { month: 'short' })}</span>
                        <span className="block text-2xl font-black text-slate-800">{new Date(e.event_date).getDate()}</span>
                      </div>

                      <div className="flex-1">
                        <h3 className="font-bold text-slate-900">{e.title}</h3>
                        <p className="text-xs text-slate-500 mt-1 uppercase font-bold tracking-wider">{formatTimeRange(e.event_date, e.event_end_date)}</p>

                        <div className="flex items-center gap-1 mt-2 text-xs text-slate-400">
                          <MapPin size={12} /> {e.location || "Moschee"}
                        </div>

                        {e.description && <p className="text-sm text-slate-600 mt-2 border-t pt-2">{e.description}</p>}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <Button
                variant="outline"
                className="w-full text-orange-600 border-orange-200 bg-orange-50 hover:bg-orange-100 mt-4"
                onClick={() => openCalendar('/api/calendar-events')}
              >
                <Calendar className="mr-2 h-4 w-4" /> Kalender abonnieren
              </Button>
            </div>
          )}

          {/* 3) STATISTIK */}
          {activeTab === 'calendar' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <Card className="col-span-2 p-5 bg-slate-900 text-white shadow-xl rounded-3xl flex justify-between items-center relative overflow-hidden">
                <div className="relative z-10">
                  <p className="text-slate-400 text-xs uppercase font-bold tracking-widest mb-1">{monthName}</p>
                  <div className="flex items-baseline gap-2"><span className="text-5xl font-black">{totalCount}</span><span className="text-sm font-medium text-slate-400">Gebete</span></div>
                </div>
                <div className="bg-white/10 p-3 rounded-full relative z-10"><TrendingUp size={32} /></div>
              </Card>

              <div className="grid grid-cols-3 gap-2">
                <Card className="p-2 flex flex-col items-center justify-center gap-1 rounded-2xl border-0 shadow-sm bg-white"><div className="bg-slate-100 p-1.5 rounded-full text-slate-700"><Car size={16} /></div><span className="block text-lg font-bold text-slate-900">{driverCount}</span><span className="text-[9px] text-slate-400 uppercase font-bold">Fahrer</span></Card>
                <Card className="p-2 flex flex-col items-center justify-center gap-1 rounded-2xl border-0 shadow-sm bg-white"><div className="bg-blue-50 p-1.5 rounded-full text-blue-600"><User size={16} /></div><span className="block text-lg font-bold text-slate-900">{passengerCount}</span><span className="text-[9px] text-slate-400 uppercase font-bold">Mitfahrer</span></Card>
                <Card className="p-2 flex flex-col items-center justify-center gap-1 rounded-2xl border-0 shadow-sm bg-white"><div className="bg-green-50 p-1.5 rounded-full text-green-600"><Footprints size={16} /></div><span className="block text-lg font-bold text-slate-900">{walkInCount}</span><span className="text-[9px] text-slate-400 uppercase font-bold">Besucher</span></Card>
              </div>

              <Card className="p-6 bg-white shadow-lg rounded-3xl border-0">
                <div className="flex justify-between items-center mb-6">
                  <Button variant="ghost" size="icon" onClick={prevMonth} className="hover:bg-slate-100 rounded-full"><ChevronLeft className="h-6 w-6" /></Button>
                  <div className="text-center"><h2 className="text-lg font-bold text-slate-900">{monthName}</h2><p className="text-xs text-slate-400 font-bold uppercase">{year}</p></div>
                  <Button variant="ghost" size="icon" onClick={nextMonth} className="hover:bg-slate-100 rounded-full"><ChevronRight className="h-6 w-6" /></Button>
                </div>

                <div className="grid grid-cols-7 gap-y-4 gap-x-2">
                  {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(d => (<div key={d} className="text-center text-[10px] text-slate-400 font-bold uppercase">{d}</div>))}
                  {Array.from({ length: startDay }).map((_, i) => (<div key={`empty-${i}`} />))}
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
        </>
      )}
    </div>
  );
}

export default function HistoryPage() {
  const router = useRouter();
  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center p-4 pb-20">
      <div className="w-full max-w-md flex items-center mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
          <ArrowLeft className="h-6 w-6 text-slate-600" />
        </Button>
        <h1 className="text-xl font-bold ml-2 text-slate-800">Logbuch & Zikr</h1>
      </div>

      <Suspense fallback={<div className="py-20 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div>}>
        <HistoryContent />
      </Suspense>
    </main>
  );
}