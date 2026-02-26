'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ChevronLeft, ChevronRight, Loader2, ArrowLeft, TrendingUp,
  Car, User, Footprints, Check, RotateCcw, MapPin
} from "lucide-react";

// --- KONFIGURATION ZIKR ---
const ZIKR_LIST = [
  {
    key: 'zikr1_count',
    target: 200,
    theme: { bg: 'bg-rose-50 border-rose-100', text: 'text-rose-900', bar: 'bg-rose-500' },
    arabic: "سُبْحَانَ اللّٰهِ وَبِحَمْدِهِ\nسُبْحَانَ اللّٰهِ العَظِيمِ\nاللَّهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ\nوَآلِ مُحَمَّدٍ",
    translation: "Heilig ist Allah und jeder Verehrung würdig. Erhaben ist Allah, der Größte. O Allah, schütte Deine Gnade aus über Muhammadsaw und seinen Anhängern.",
    title: "Tasbih & Salawat"
  },
  {
    key: 'zikr2_count',
    target: 100,
    theme: { bg: 'bg-sky-50 border-sky-100', text: 'text-sky-900', bar: 'bg-sky-500' },
    arabic: "أَسْتَغْفِرُ اللّٰهَ رَبِّي\nمِنْ كُلِّ ذَنْبٍ وَأَتُوبُ إِلَيْهِ",
    translation: "Ich ersuche Vergebung bei Allah, meinem Herrn, für all meine Sünden und wende mich zu Ihm in Reue.",
    title: "Istighfar"
  },
  {
    key: 'zikr3_count',
    target: 100,
    theme: { bg: 'bg-amber-50 border-amber-100', text: 'text-amber-900', bar: 'bg-amber-500' },
    arabic: "رَبِّ كُلُّ شَيْءٍ خَادِمُكَ\nرَبِّ فَاحْفَظْنِي وَانْصُرْنِي وَارْحَمْنِي",
    translation: "O mein Herr, alles ist Dein Diener. O mein Herr, beschütze mich und hilf mir und sei mir gnädig.",
    title: "Dua"
  }
];

// ---------------- ORG / COLOR SYSTEM ----------------
type OrgKey = 'ansar' | 'khuddam' | 'atfal' | 'lajna' | 'nasirat' | 'jamaat';

const ORG_META: Record<OrgKey, {
  label: string;

  // kalender tag (bubble)
  dayBg: string;
  dayText: string;
  dayBorder: string;

  // punkt unter tag
  dot: string;

  // liste box links (monat/tag)
  boxBg: string;
  boxMonthText: string;

  // badge rechts
  badgeBg: string;
  badgeText: string;
}> = {
  ansar: {
    label: 'Ansar',
    dayBg: 'bg-amber-100',
    dayText: 'text-amber-800',
    dayBorder: 'border-amber-200',
    dot: 'bg-amber-700',
    boxBg: 'bg-amber-50',
    boxMonthText: 'text-amber-700',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-900',
  },
  khuddam: {
    label: 'Khuddam',
    dayBg: 'bg-blue-100',
    dayText: 'text-blue-800',
    dayBorder: 'border-blue-200',
    dot: 'bg-blue-600',
    boxBg: 'bg-blue-50',
    boxMonthText: 'text-blue-700',
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-900',
  },
  atfal: {
    label: 'Atfal',
    dayBg: 'bg-green-100',
    dayText: 'text-green-800',
    dayBorder: 'border-green-200',
    dot: 'bg-green-600',
    boxBg: 'bg-green-50',
    boxMonthText: 'text-green-700',
    badgeBg: 'bg-green-100',
    badgeText: 'text-green-900',
  },
  lajna: {
    label: 'Lajna',
    dayBg: 'bg-red-100',
    dayText: 'text-red-800',
    dayBorder: 'border-red-200',
    dot: 'bg-red-600',
    boxBg: 'bg-red-50',
    boxMonthText: 'text-red-700',
    badgeBg: 'bg-red-100',
    badgeText: 'text-red-900',
  },
  nasirat: {
    label: 'Nasirat',
    dayBg: 'bg-pink-100',
    dayText: 'text-pink-800',
    dayBorder: 'border-pink-200',
    dot: 'bg-pink-600',
    boxBg: 'bg-pink-50',
    boxMonthText: 'text-pink-700',
    badgeBg: 'bg-pink-100',
    badgeText: 'text-pink-900',
  },
  jamaat: {
    label: 'Jamaat',
    dayBg: 'bg-orange-100',
    dayText: 'text-orange-800',
    dayBorder: 'border-orange-200',
    dot: 'bg-orange-600',
    boxBg: 'bg-orange-50',
    boxMonthText: 'text-orange-700',
    badgeBg: 'bg-orange-100',
    badgeText: 'text-orange-900',
  },
};

function normalizeOrg(v: any): OrgKey {
  const s = String(v ?? 'jamaat').toLowerCase().trim();
  if (s === 'ansar') return 'ansar';
  if (s === 'khuddam') return 'khuddam';
  if (s === 'atfal') return 'atfal';
  if (s === 'lajna') return 'lajna';
  if (s === 'nasirat') return 'nasirat';
  return 'jamaat';
}

// Wenn mehrere Events am Tag → wir zeigen mehrere dots (bis 3)
function getTopOrgDots(dayEvents: any[]) {
  const uniqueOrgs: OrgKey[] = [];
  for (const e of dayEvents) {
    const o = normalizeOrg(e.org);
    if (!uniqueOrgs.includes(o)) uniqueOrgs.push(o);
    if (uniqueOrgs.length >= 3) break;
  }
  return uniqueOrgs;
}

function HistoryContent() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as 'zikr' | 'events' | 'calendar') || 'zikr';

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'zikr' | 'events' | 'calendar'>(initialTab);

  const [allRides, setAllRides] = useState<any[]>([]);
  const [viewDate, setViewDate] = useState(new Date());
  const [zikrData, setZikrData] = useState<any>({ zikr1_count: 0, zikr2_count: 0, zikr3_count: 0 });
  const [todayLogId, setTodayLogId] = useState<string | null>(null);
  const [events, setEvents] = useState<any[]>([]);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ---------- DATE HELPERS (für mehrtägige Events) ----------
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const parseEventEnd = (e: any) => new Date(e.event_end_date || e.event_date);

  const eventCoversDay = (e: any, day: Date) => {
    const s = startOfDay(new Date(e.event_date)).getTime();
    const en = startOfDay(parseEventEnd(e)).getTime();
    const d = startOfDay(day).getTime();
    return d >= s && d <= en;
  };

  const getDayInterval = (e: any, day: Date) => {
    const s = new Date(e.event_date).getTime();
    const en = parseEventEnd(e).getTime();
    const ds = startOfDay(day).getTime();
    const de = endOfDay(day).getTime();
    return { start: Math.max(s, ds), end: Math.min(en, de) };
  };

  const hasOverlap = (dayEvents: any[], day: Date) => {
    if (dayEvents.length < 2) return false;
    const intervals = dayEvents
      .map(e => getDayInterval(e, day))
      .sort((a, b) => a.start - b.start);

    let prevEnd = intervals[0].end;
    for (let i = 1; i < intervals.length; i++) {
      if (intervals[i].start < prevEnd) return true;
      prevEnd = Math.max(prevEnd, intervals[i].end);
    }
    return false;
  };

  const formatTimeRange = (startStr: string, endStr?: string | null) => {
    const start = new Date(startStr);
    const startFmt = start.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

    if (!endStr) return `${startFmt} Uhr`;
    const end = new Date(endStr);
    const diffMs = end.getTime() - start.getTime();
    if (diffMs <= 60_000) return `${startFmt} Uhr`;

    const endFmt = end.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    return `${startFmt} - ${endFmt} Uhr`;
  };

  const formatEventMeta = (e: any) => {
    const s = new Date(e.event_date);
    const en = parseEventEnd(e);
    if (isSameDay(s, en)) return formatTimeRange(e.event_date, e.event_end_date);

    const sFmt = s.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
    const eFmt = en.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
    return `${sFmt} - ${eFmt}`;
  };

  const formatDayBox = (e: any) => {
    const s = new Date(e.event_date);
    const en = parseEventEnd(e);
    const monthLabel = s.toLocaleDateString('de-DE', { month: 'short' }).toUpperCase();
    if (isSameDay(s, en)) return { monthLabel, dayLabel: String(s.getDate()) };
    return { monthLabel, dayLabel: `${s.getDate()}–${en.getDate()}` };
  };

  // ---------- FETCH ----------
  useEffect(() => {
    const fetchHistory = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toLocaleDateString('en-CA');

      // Fahrten
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

      // Zikr
      const { data: zikrLog } = await supabase.from('zikr_logs').select('*').eq('user_id', user.id).eq('log_date', today).maybeSingle();
      if (zikrLog) {
        setZikrData(zikrLog);
        setTodayLogId(zikrLog.id);
      } else {
        const { data: newLog } = await supabase.from('zikr_logs').insert({ user_id: user.id, log_date: today }).select().single();
        if (newLog) { setTodayLogId(newLog.id); setZikrData(newLog); }
      }

      // ✅ Events (Future) – org mitziehen!
      const { data: eventsData } = await supabase
        .from('mosque_events')
        .select('id,title,event_date,event_end_date,location,description,org')
        .gte('event_date', new Date().toISOString())
        .order('event_date', { ascending: true });

      if (eventsData) setEvents(eventsData);

      setLoading(false);
    };

    fetchHistory();
  }, []);

  // ---------- ZIKR SAVE ----------
  const saveToDb = (newData: any) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      if (todayLogId) await supabase.from('zikr_logs').update(newData).eq('id', todayLogId);
    }, 800);
  };

  const handleZikrClick = (key: string, target: number) => {
    const v = zikrData[key] || 0;
    if (v >= target) return;
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(15);
    const newData = { ...zikrData, [key]: v + 1 };
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

  const openCalendarApple = (apiUrl: string) => {
    const host = window.location.host;
    window.location.href = `webcal://${host}${apiUrl}`;
  };

  const openCalendarGoogle = (apiUrl: string) => {
    const fullUrl = `https://ride2salah.vercel.app${apiUrl}`;
    window.open(
      `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(fullUrl)}`,
      '_blank'
    );
  };

  const nextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  const prevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthName = viewDate.toLocaleString('de-DE', { month: 'long' });
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let startDay = new Date(year, month, 1).getDay();
  startDay = startDay === 0 ? 6 : startDay - 1;

  // Statistik
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

  const getEventsForDay = (dayNum: number) => {
    const day = new Date(year, month, dayNum);
    return events
      .filter(e => eventCoversDay(e, day))
      .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());
  };

  const monthEvents = events.filter(e => {
    const s = new Date(e.event_date);
    const en = parseEventEnd(e);
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month, daysInMonth, 23, 59, 59, 999);
    return en >= monthStart && s <= monthEnd;
  });

  return (
    <div className="w-full max-w-md space-y-6">
      {/* TABS */}
      <div className="flex gap-1 mb-4">
        {([['zikr','📿','Zikr'], ['events','📅','Termine'], ['calendar','📊','Statistik']] as const).map(([tab, icon, label]) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 px-2 text-sm font-bold rounded-2xl transition-all flex flex-col items-center gap-0.5
              ${activeTab === tab
                ? 'bg-slate-900 text-white shadow-lg'
                : 'bg-white text-slate-500 hover:text-slate-800 border border-slate-200'}`}
          >
            <span className="text-base">{icon}</span>
            <span className="text-[10px] uppercase tracking-wide">{label}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-10"><Loader2 className="animate-spin text-slate-400 mx-auto" /></div>
      ) : (
        <>
          {/* ZIKR */}
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

          {/* TERMINE */}
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
                    const day = new Date(year, month, dayNum);
                    const dayEvents = getEventsForDay(dayNum);
                    const hasEvent = dayEvents.length > 0;
                    const overlap = hasOverlap(dayEvents, day);

                    // ✅ wenn es events gibt: nimm org des ersten events als "main" farbe
                    const mainOrg: OrgKey = hasEvent ? normalizeOrg(dayEvents[0].org) : 'jamaat';
                    const meta = ORG_META[mainOrg];

                    // ✅ mehrere orgs -> mehrere dots
                    const dots = getTopOrgDots(dayEvents);

                    const todayD = new Date();
                    const isToday = year === todayD.getFullYear() && month === todayD.getMonth() && dayNum === todayD.getDate();

                    return (
                      <div key={dayNum} className="flex flex-col items-center justify-center relative">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all border
                            ${isToday ? 'ring-2 ring-slate-900 ring-offset-1' : ''}
                            ${!hasEvent
                              ? 'bg-slate-50 text-slate-400 border-slate-100'
                              : overlap
                                ? 'bg-slate-900 text-white border-slate-800 font-bold'
                                : `${meta.dayBg} ${meta.dayText} ${meta.dayBorder} font-bold`
                            }`}
                        >
                          {dayNum}
                        </div>

                        {hasEvent && (
                          <div className="absolute -bottom-1 flex items-center gap-1">
                            {dots.map((o) => (
                              <div key={o} className={`w-1.5 h-1.5 rounded-full ${ORG_META[o].dot}`} />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 flex flex-wrap gap-2 text-[11px]">
                  {(['ansar','khuddam','atfal','lajna','nasirat','jamaat'] as OrgKey[]).map((k) => (
                    <div key={k} className="flex items-center gap-2 px-2 py-1 rounded-full bg-slate-50 border border-slate-200">
                      <span className={`w-2 h-2 rounded-full ${ORG_META[k].dot}`} />
                      <span className="text-slate-600 font-bold">{ORG_META[k].label}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-slate-50 border border-slate-200">
                    <span className="w-2 h-2 rounded-full bg-slate-900" />
                    <span className="text-slate-600 font-bold">Overlap</span>
                  </div>
                </div>
              </Card>

              {/* Liste */}
              <div className="space-y-3 pt-2">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Termine im {monthName}</h3>

                {monthEvents.length === 0 ? (
                  <p className="text-sm text-slate-400 italic">Keine Termine in diesem Monat.</p>
                ) : (
                  monthEvents.map(e => {
                    const org = normalizeOrg(e.org);
                    const meta = ORG_META[org];
                    const box = formatDayBox(e);

                    return (
                      <div key={e.id} className="bg-white rounded-2xl shadow-sm overflow-hidden flex border border-slate-100">
                        <div className={`w-1.5 shrink-0 ${meta.dot}`} />
                        <div className="p-4 flex gap-3 flex-1">
                          <div className={`${meta.boxBg} px-3 py-2 rounded-xl text-center min-w-[3.5rem] flex flex-col items-center justify-center`}>
                            <span className={`text-[10px] font-bold uppercase ${meta.boxMonthText}`}>{box.monthLabel}</span>
                            <span className="text-xl font-black text-slate-800 leading-tight">{box.dayLabel}</span>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="font-bold text-slate-900 leading-snug">{e.title}</h3>
                              <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${meta.badgeBg} ${meta.badgeText}`}>
                                {meta.label}
                              </span>
                            </div>

                            <p className="text-xs text-slate-500 mt-1 font-semibold">
                              {formatEventMeta(e)}
                            </p>

                            <div className="flex items-center gap-1 mt-1.5 text-xs text-slate-400">
                              <MapPin size={11} className="shrink-0" />
                              <span className="truncate">{e.location || "Moschee"}</span>
                            </div>

                            {e.description && <p className="text-sm text-slate-600 mt-2 leading-relaxed">{e.description}</p>}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="mt-4 space-y-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Kalender abonnieren</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    className="text-slate-700 border-slate-200 bg-white hover:bg-slate-50 flex items-center gap-2 text-xs"
                    onClick={() => openCalendarApple('/api/calendar-events')}
                  >
                    <span className="text-base">🍎</span> Apple
                  </Button>
                  <Button
                    variant="outline"
                    className="text-slate-700 border-slate-200 bg-white hover:bg-slate-50 flex items-center gap-2 text-xs"
                    onClick={() => openCalendarGoogle('/api/calendar-events')}
                  >
                    <span className="text-base">📅</span> Google
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* STATISTIK (unverändert) */}
          {activeTab === 'calendar' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <Card className="col-span-2 p-5 bg-slate-900 text-white shadow-xl rounded-3xl flex justify-between items-center relative overflow-hidden">
                <div className="relative z-10">
                  <p className="text-slate-400 text-xs uppercase font-bold tracking-widest mb-1">{monthName}</p>
                  <div className="flex items-baseline gap-2"><span className="text-5xl font-black">{totalCount}</span><span className="text-sm font-medium text-slate-400">Gebete</span></div>
                </div>
                <div className="bg-white/10 p-3 rounded-full relative z-10"><TrendingUp size={32} /></div>
              </Card>

              <div className="grid grid-cols-3 gap-3">
                <Card className="p-4 flex flex-col items-center justify-center gap-2 rounded-2xl border-0 shadow-sm bg-white">
                  <div className="bg-slate-100 p-2 rounded-full text-slate-700"><Car size={18} /></div>
                  <span className="text-2xl font-black text-slate-900">{driverCount}</span>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wide">Fahrer</span>
                </Card>
                <Card className="p-4 flex flex-col items-center justify-center gap-2 rounded-2xl border-0 shadow-sm bg-white">
                  <div className="bg-blue-50 p-2 rounded-full text-blue-600"><User size={18} /></div>
                  <span className="text-2xl font-black text-slate-900">{passengerCount}</span>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wide">Mitfahrer</span>
                </Card>
                <Card className="p-4 flex flex-col items-center justify-center gap-2 rounded-2xl border-0 shadow-sm bg-white">
                  <div className="bg-green-50 p-2 rounded-full text-green-600"><Footprints size={18} /></div>
                  <span className="text-2xl font-black text-slate-900">{walkInCount}</span>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wide">Besucher</span>
                </Card>
              </div>

              <Card className="p-6 bg-white shadow-lg rounded-3xl border-0">
                <div className="flex justify-between items-center mb-6">
                  <Button variant="ghost" size="icon" onClick={prevMonth} className="hover:bg-slate-100 rounded-full"><ChevronLeft className="h-6 w-6" /></Button>
                  <div className="text-center"><h2 className="text-lg font-bold text-slate-900">{monthName}</h2><p className="text-xs text-slate-400 font-bold uppercase">{year}</p></div>
                  <Button variant="ghost" size="icon" onClick={nextMonth} className="hover:bg-slate-100 rounded-full"><ChevronRight className="h-6 w-6" /></Button>
                </div>

                <div className="grid grid-cols-7 gap-y-5 gap-x-1">
                  {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(d => (<div key={d} className="text-center text-[10px] text-slate-400 font-bold uppercase">{d}</div>))}
                  {Array.from({ length: startDay }).map((_, i) => (<div key={`empty-${i}`} />))}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const dayNum = i + 1;
                    const count = getDailyCount(dayNum);
                    const todayD = new Date();
                    const isToday = year === todayD.getFullYear() && month === todayD.getMonth() && dayNum === todayD.getDate();
                    return (
                      <div key={dayNum} className="flex flex-col items-center gap-0.5">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${isToday ? 'ring-2 ring-slate-900 ring-offset-1' : ''}`} style={getRingStyle(count)}>
                          <div className={`w-7 h-7 bg-white rounded-full flex items-center justify-center text-xs font-bold shadow-sm ${isToday ? 'text-slate-900' : 'text-slate-700'}`}>{dayNum}</div>
                        </div>
                        <span className="text-[8px] text-slate-400 font-medium h-2.5 leading-none">{count > 0 ? `${count}×` : ''}</span>
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

// --- HAUPT EXPORT ---
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