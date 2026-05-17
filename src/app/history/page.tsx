'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ChevronLeft, ChevronRight, Loader2, ArrowLeft, TrendingUp,
  Car, User, Footprints, Check, RotateCcw, MapPin,
  BookOpen, CalendarDays, BarChart2, Smartphone, Globe
} from "lucide-react";
import { toast } from "sonner";

// --- KONFIGURATION ZIKR ---
const ZIKR_LIST = [
  {
    key: 'zikr1_count',
    target: 200,
    theme: { cardBg: 'rgba(240,98,146,0.07)', cardBorder: 'rgba(240,98,146,0.20)', accent: 'var(--app-rose)' },
    arabic: "سُبْحَانَ اللّٰهِ وَبِحَمْدِهِ\nسُبْحَانَ اللّٰهِ العَظِيمِ\nاللَّهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ\nوَآلِ مُحَمَّدٍ",
    translation: "Heilig ist Allah und jeder Verehrung würdig. Erhaben ist Allah, der Größte. O Allah, schütte Deine Gnade aus über Muhammadsaw und seinen Anhängern.",
    title: "Tasbih & Salawat"
  },
  {
    key: 'zikr2_count',
    target: 100,
    theme: { cardBg: 'var(--app-blue-dim)', cardBorder: 'rgba(91,127,255,0.25)', accent: 'var(--app-blue)' },
    arabic: "أَسْتَغْفِرُ اللّٰهَ رَبِّي\nمِنْ كُلِّ ذَنْبٍ وَأَتُوبُ إِلَيْهِ",
    translation: "Ich ersuche Vergebung bei Allah, meinem Herrn, für all meine Sünden und wende mich zu Ihm in Reue.",
    title: "Istighfar"
  },
  {
    key: 'zikr3_count',
    target: 100,
    theme: { cardBg: 'var(--app-gold-dim)', cardBorder: 'rgba(201,162,60,0.30)', accent: 'var(--app-gold)' },
    arabic: "رَبِّ كُلُّ شَيْءٍ خَادِمُكَ\nرَبِّ فَاحْفَظْنِي وَانْصُرْنِي وَارْحَمْنِي",
    translation: "O mein Herr, alles ist Dein Diener. O mein Herr, beschütze mich und hilf mir und sei mir gnädig.",
    title: "Dua"
  }
];

// ---------------- ORG / COLOR SYSTEM ----------------
type OrgKey = 'ansar' | 'khuddam' | 'atfal' | 'lajna' | 'nasirat' | 'jamaat';

const ORG_META: Record<OrgKey, {
  label: string;
  color: string;
  dimColor: string;
}> = {
  ansar:   { label: 'Ansar',   color: '#f97316', dimColor: 'rgba(251,146,60,0.13)' },
  khuddam: { label: 'Khuddam', color: 'var(--app-blue)', dimColor: 'var(--app-blue-dim)' },
  atfal:   { label: 'Atfal',   color: 'var(--app-emerald)', dimColor: 'var(--app-emerald-dim)' },
  lajna:   { label: 'Lajna',   color: 'var(--app-rose)', dimColor: 'rgba(240,98,146,0.12)' },
  nasirat: { label: 'Nasirat', color: '#ec4899', dimColor: 'rgba(236,72,153,0.12)' },
  jamaat:  { label: 'Jamaat',  color: '#a78bfa', dimColor: 'rgba(167,139,250,0.12)' },
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
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  useEffect(() => {
    const fetchHistory = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toLocaleDateString('en-CA');

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

      const { data: zikrLog } = await supabase.from('zikr_logs').select('*').eq('user_id', user.id).eq('log_date', today).maybeSingle();
      if (zikrLog) {
        setZikrData(zikrLog);
        setTodayLogId(zikrLog.id);
      } else {
        const { data: newLog } = await supabase.from('zikr_logs').insert({ user_id: user.id, log_date: today }).select().single();
        if (newLog) { setTodayLogId(newLog.id); setZikrData(newLog); }
      }

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
    toast("Zähler zurücksetzen?", {
      action: {
        label: "Zurücksetzen",
        onClick: () => {
          const newData = { ...zikrData, [key]: 0 };
          setZikrData(newData);
          saveToDb(newData);
        },
      },
      cancel: { label: "Abbrechen", onClick: () => {} },
    });
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
    let c = 'var(--app-border)';
    if (count >= 5) c = 'var(--app-emerald)';
    else if (count >= 3) c = 'var(--app-blue)';
    else if (count > 0) c = 'var(--app-gold)';
    return { background: `conic-gradient(${c} ${p}%, var(--app-surface2) 0)` };
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
        {([
          { id: 'zikr', Icon: BookOpen, label: 'Zikr' },
          { id: 'events', Icon: CalendarDays, label: 'Termine' },
          { id: 'calendar', Icon: BarChart2, label: 'Statistik' },
        ] as const).map(({ id, Icon, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className="flex-1 py-2.5 px-2 text-sm font-bold rounded-2xl transition-all flex flex-col items-center gap-1"
            style={activeTab === id
              ? { background: 'var(--app-text)', color: 'var(--app-bg)' }
              : { background: 'var(--app-surface2)', color: 'var(--app-text2)', border: '1px solid var(--app-border)' }
            }
          >
            <Icon size={17} />
            <span className="text-[10px] uppercase tracking-wide">{label}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-10"><Loader2 className="animate-spin mx-auto" style={{ color: 'var(--app-text3)' }} /></div>
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
                    className="relative overflow-hidden transition-opacity duration-150 shadow-md active:opacity-60"
                    style={{
                      background: isDone ? 'var(--app-emerald)' : item.theme.cardBg,
                      border: `1px solid ${isDone ? 'var(--app-emerald)' : item.theme.cardBorder}`,
                      cursor: isDone ? 'default' : 'pointer',
                    }}
                  >
                    {isDone && <div className="absolute right-[-20px] bottom-[-20px] transform rotate-12" style={{ color: 'rgba(255,255,255,0.2)' }}><Check size={120} /></div>}
                    {!isDone && <div className="absolute bottom-0 left-0 h-1.5 transition-all duration-300" style={{ width: `${progress}%`, background: item.theme.accent }} />}
                    {count > 0 && !isDone && (
                      <div className="absolute top-3 left-3 z-10">
                        <button onClick={(e) => handleReset(e, item.key)} className="p-1.5 rounded-full transition-all shadow-sm" style={{ background: 'var(--app-surface2)', color: 'var(--app-text3)' }}>
                          <RotateCcw size={14} />
                        </button>
                      </div>
                    )}
                    <div className="p-5 flex items-start justify-between gap-4">
                      <div className="shrink-0 flex flex-col items-center justify-center min-w-[3.5rem] pt-2">
                        <span className="text-3xl font-black" style={{ color: isDone ? '#fff' : item.theme.accent }}>{count}</span>
                        <span className="text-[9px] font-bold uppercase" style={{ color: isDone ? 'rgba(255,255,255,0.7)' : 'var(--app-text3)' }}>{isDone ? 'FERTIG' : `von ${item.target}`}</span>
                      </div>
                      <div className="flex-1 flex flex-col items-end text-right">
                        <p className="text-xs font-bold uppercase mb-2 tracking-widest" style={{ color: isDone ? 'rgba(255,255,255,0.7)' : 'var(--app-text3)' }}>{item.title}</p>
                        <p className="text-xl font-bold leading-loose" style={{ fontFamily: 'var(--font-amiri)', direction: 'rtl', lineHeight: '1.8', color: isDone ? '#fff' : 'var(--app-text)' }}>
                          {item.arabic}
                        </p>
                        <p className="text-xs mt-3 italic leading-relaxed text-right w-full" style={{ color: isDone ? 'rgba(255,255,255,0.7)' : 'var(--app-text2)' }}>{item.translation}</p>
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
              <div className="p-6 shadow-lg rounded-3xl" style={{ background: 'var(--app-card)', border: '1px solid var(--app-border)' }}>
                <div className="flex justify-between items-center mb-6">
                  <Button variant="ghost" size="icon" onClick={prevMonth} className="rounded-full"><ChevronLeft className="h-6 w-6" /></Button>
                  <div className="text-center">
                    <h2 className="text-lg font-bold" style={{ color: 'var(--app-text)' }}>{monthName}</h2>
                    <p className="text-xs font-bold uppercase" style={{ color: 'var(--app-text3)' }}>{year}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={nextMonth} className="rounded-full"><ChevronRight className="h-6 w-6" /></Button>
                </div>

                <div className="grid grid-cols-7 gap-y-4 gap-x-2">
                  {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(d => (
                    <div key={d} className="text-center text-[10px] font-bold uppercase" style={{ color: 'var(--app-text3)' }}>{d}</div>
                  ))}
                  {Array.from({ length: startDay }).map((_, i) => (<div key={`empty-${i}`} />))}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const dayNum = i + 1;
                    const day = new Date(year, month, dayNum);
                    const dayEvents = getEventsForDay(dayNum);
                    const hasEvent = dayEvents.length > 0;
                    const overlap = hasOverlap(dayEvents, day);

                    const mainOrg: OrgKey = hasEvent ? normalizeOrg(dayEvents[0].org) : 'jamaat';
                    const meta = ORG_META[mainOrg];
                    const dots = getTopOrgDots(dayEvents);

                    const todayD = new Date();
                    const isToday = year === todayD.getFullYear() && month === todayD.getMonth() && dayNum === todayD.getDate();

                    return (
                      <div key={dayNum} className="flex flex-col items-center justify-center relative">
                        <button
                          onClick={() => hasEvent && setSelectedDay(dayNum)}
                          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all border font-bold ${isToday ? 'ring-2 ring-offset-1' : ''} ${hasEvent ? 'active:opacity-60' : ''}`}
                          style={{
                            touchAction: 'manipulation',
                            WebkitTapHighlightColor: 'transparent',
                            cursor: hasEvent ? 'pointer' : 'default',
                            ...(!hasEvent
                              ? { background: 'var(--app-surface2)', color: 'var(--app-text3)', borderColor: 'var(--app-border)', fontWeight: 'normal', ...(isToday ? { outline: '2px solid var(--app-text)', outlineOffset: '2px' } : {}) }
                              : overlap
                                ? { background: 'var(--app-text)', color: 'var(--app-bg)', borderColor: 'var(--app-text)', ...(isToday ? { outline: '2px solid var(--app-text)', outlineOffset: '2px' } : {}) }
                                : { background: meta.dimColor, color: meta.color, borderColor: meta.color, ...(isToday ? { outline: '2px solid var(--app-text)', outlineOffset: '2px' } : {}) }
                            )
                          }}
                        >
                          {dayNum}
                        </button>

                        {hasEvent && (
                          <div className="absolute -bottom-1 flex items-center gap-1">
                            {dots.map((o) => (
                              <div key={o} className="w-1.5 h-1.5 rounded-full" style={{ background: ORG_META[o].color }} />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 flex flex-wrap gap-2 text-[11px]">
                  {(['ansar', 'khuddam', 'atfal', 'lajna', 'nasirat', 'jamaat'] as OrgKey[]).map((k) => (
                    <div key={k} className="flex items-center gap-2 px-2 py-1 rounded-full" style={{ background: 'var(--app-surface2)', border: '1px solid var(--app-border)' }}>
                      <span className="w-2 h-2 rounded-full" style={{ background: ORG_META[k].color }} />
                      <span className="font-bold" style={{ color: 'var(--app-text2)' }}>{ORG_META[k].label}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 px-2 py-1 rounded-full" style={{ background: 'var(--app-surface2)', border: '1px solid var(--app-border)' }}>
                    <span className="w-2 h-2 rounded-full" style={{ background: 'var(--app-text)' }} />
                    <span className="font-bold" style={{ color: 'var(--app-text2)' }}>Overlap</span>
                  </div>
                </div>
              </div>

              {/* Liste */}
              <div className="space-y-3 pt-2">
                <h3 className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--app-text2)' }}>Termine im {monthName}</h3>

                {monthEvents.length === 0 ? (
                  <p className="text-sm italic" style={{ color: 'var(--app-text3)' }}>Keine Termine in diesem Monat.</p>
                ) : (
                  monthEvents.map(e => {
                    const org = normalizeOrg(e.org);
                    const meta = ORG_META[org];
                    const box = formatDayBox(e);

                    return (
                      <div key={e.id} className="rounded-2xl shadow-sm overflow-hidden flex" style={{ background: 'var(--app-card)', border: '1px solid var(--app-border)' }}>
                        <div className="w-1.5 shrink-0" style={{ background: meta.color }} />
                        <div className="p-4 flex gap-3 flex-1">
                          <div className="px-3 py-2 rounded-xl text-center min-w-[3.5rem] flex flex-col items-center justify-center" style={{ background: meta.dimColor }}>
                            <span className="text-[10px] font-bold uppercase" style={{ color: meta.color }}>{box.monthLabel}</span>
                            <span className="text-xl font-black leading-tight" style={{ color: 'var(--app-text)' }}>{box.dayLabel}</span>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="font-bold leading-snug" style={{ color: 'var(--app-text)' }}>{e.title}</h3>
                              <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-black uppercase" style={{ background: meta.dimColor, color: meta.color }}>
                                {meta.label}
                              </span>
                            </div>

                            <p className="text-xs mt-1 font-semibold" style={{ color: 'var(--app-text2)' }}>
                              {formatEventMeta(e)}
                            </p>

                            <div className="flex items-center gap-1 mt-1.5 text-xs" style={{ color: 'var(--app-text3)' }}>
                              <MapPin size={11} className="shrink-0" />
                              <span className="truncate">{e.location || "Moschee"}</span>
                            </div>

                            {e.description && <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--app-text2)' }}>{e.description}</p>}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="mt-4 space-y-2">
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--app-text3)' }}>Kalender abonnieren</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    className="flex items-center gap-2 text-xs"
                    style={{ background: 'var(--app-card)', borderColor: 'var(--app-border)', color: 'var(--app-text2)' }}
                    onClick={() => openCalendarApple('/api/calendar-events')}
                  >
                    <Smartphone size={15} /> Apple
                  </Button>
                  <Button
                    variant="outline"
                    className="flex items-center gap-2 text-xs"
                    style={{ background: 'var(--app-card)', borderColor: 'var(--app-border)', color: 'var(--app-text2)' }}
                    onClick={() => openCalendarGoogle('/api/calendar-events')}
                  >
                    <Globe size={15} /> Google
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* STATISTIK */}
          {activeTab === 'calendar' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <Card className="col-span-2 p-5 shadow-xl rounded-3xl flex justify-between items-center relative overflow-hidden" style={{ background: 'var(--app-card)', border: '1px solid var(--app-border)' }}>
                <div className="relative z-10">
                  <p className="text-xs uppercase font-bold tracking-widest mb-1" style={{ color: 'var(--app-text2)' }}>{monthName}</p>
                  <div className="flex items-baseline gap-2"><span className="text-5xl font-black" style={{ color: 'var(--app-text)' }}>{totalCount}</span><span className="text-sm font-medium" style={{ color: 'var(--app-text2)' }}>Gebete</span></div>
                </div>
                <div className="p-3 rounded-full relative z-10" style={{ background: 'var(--app-gold-dim)', color: 'var(--app-gold)' }}><TrendingUp size={32} /></div>
              </Card>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-4 flex flex-col items-center justify-center gap-2 rounded-2xl shadow-sm" style={{ background: 'var(--app-card)', border: '1px solid var(--app-border)' }}>
                  <div className="p-2 rounded-full" style={{ background: 'var(--app-gold-dim)', color: 'var(--app-gold)' }}><Car size={18} /></div>
                  <span className="text-2xl font-black" style={{ color: 'var(--app-text)' }}>{driverCount}</span>
                  <span className="text-[10px] uppercase font-bold tracking-wide" style={{ color: 'var(--app-text3)' }}>Fahrer</span>
                </div>
                <div className="p-4 flex flex-col items-center justify-center gap-2 rounded-2xl shadow-sm" style={{ background: 'var(--app-card)', border: '1px solid var(--app-border)' }}>
                  <div className="p-2 rounded-full" style={{ background: 'var(--app-blue-dim)', color: 'var(--app-blue)' }}><User size={18} /></div>
                  <span className="text-2xl font-black" style={{ color: 'var(--app-text)' }}>{passengerCount}</span>
                  <span className="text-[10px] uppercase font-bold tracking-wide" style={{ color: 'var(--app-text3)' }}>Mitfahrer</span>
                </div>
                <div className="p-4 flex flex-col items-center justify-center gap-2 rounded-2xl shadow-sm" style={{ background: 'var(--app-card)', border: '1px solid var(--app-border)' }}>
                  <div className="p-2 rounded-full" style={{ background: 'var(--app-emerald-dim)', color: 'var(--app-emerald)' }}><Footprints size={18} /></div>
                  <span className="text-2xl font-black" style={{ color: 'var(--app-text)' }}>{walkInCount}</span>
                  <span className="text-[10px] uppercase font-bold tracking-wide" style={{ color: 'var(--app-text3)' }}>Besucher</span>
                </div>
              </div>

              <div className="p-6 shadow-lg rounded-3xl" style={{ background: 'var(--app-card)', border: '1px solid var(--app-border)' }}>
                <div className="flex justify-between items-center mb-6">
                  <Button variant="ghost" size="icon" onClick={prevMonth} className="rounded-full"><ChevronLeft className="h-6 w-6" /></Button>
                  <div className="text-center">
                    <h2 className="text-lg font-bold" style={{ color: 'var(--app-text)' }}>{monthName}</h2>
                    <p className="text-xs font-bold uppercase" style={{ color: 'var(--app-text3)' }}>{year}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={nextMonth} className="rounded-full"><ChevronRight className="h-6 w-6" /></Button>
                </div>

                <div className="grid grid-cols-7 gap-y-5 gap-x-1">
                  {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(d => (
                    <div key={d} className="text-center text-[10px] font-bold uppercase" style={{ color: 'var(--app-text3)' }}>{d}</div>
                  ))}
                  {Array.from({ length: startDay }).map((_, i) => (<div key={`empty-${i}`} />))}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const dayNum = i + 1;
                    const count = getDailyCount(dayNum);
                    const todayD = new Date();
                    const isToday = year === todayD.getFullYear() && month === todayD.getMonth() && dayNum === todayD.getDate();
                    return (
                      <div key={dayNum} className="flex flex-col items-center gap-0.5">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${isToday ? 'ring-2 ring-offset-1' : ''}`}
                          style={{ ...getRingStyle(count), ...(isToday ? { outline: '2px solid var(--app-text)', outlineOffset: '1px' } : {}) }}
                        >
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shadow-sm" style={{ background: 'var(--app-card)', color: 'var(--app-text)' }}>{dayNum}</div>
                        </div>
                        <span className="text-[8px] font-medium h-2.5 leading-none" style={{ color: 'var(--app-text3)' }}>{count > 0 ? `${count}×` : ''}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Day event popup */}
      {selectedDay !== null && (() => {
        const dayEvents = getEventsForDay(selectedDay);
        const dateLabel = new Date(year, month, selectedDay).toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long' });
        return (
          <div
            className="fixed inset-0 z-[60] flex items-end"
            style={{ background: 'rgba(0,0,0,0.55)' }}
            onClick={() => setSelectedDay(null)}
          >
            <div
              className="w-full max-h-[75vh] overflow-y-auto rounded-t-3xl animate-in slide-in-from-bottom-4 duration-300"
              style={{ background: 'var(--app-surface2)', border: '1px solid var(--app-border)', paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-center pt-4 pb-3">
                <div className="w-10 h-1 rounded-full" style={{ background: 'var(--app-border)' }} />
              </div>
              <div className="px-6 pb-4">
                <h3 className="text-base font-extrabold mb-1" style={{ color: 'var(--app-text)' }}>{dateLabel}</h3>
                <p className="text-xs mb-4 font-bold uppercase tracking-wide" style={{ color: 'var(--app-text3)' }}>
                  {dayEvents.length} {dayEvents.length === 1 ? 'Termin' : 'Termine'}
                </p>
                <div className="space-y-3">
                  {dayEvents.map((e) => {
                    const org = normalizeOrg(e.org);
                    const meta = ORG_META[org];
                    return (
                      <div key={e.id} className="rounded-2xl overflow-hidden flex" style={{ background: 'var(--app-card)', border: '1px solid var(--app-border)' }}>
                        <div className="w-1.5 shrink-0" style={{ background: meta.color }} />
                        <div className="p-3 flex-1">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="font-bold text-sm leading-snug" style={{ color: 'var(--app-text)' }}>{e.title}</p>
                            <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-black uppercase" style={{ background: meta.dimColor, color: meta.color }}>{meta.label}</span>
                          </div>
                          <p className="text-xs font-semibold" style={{ color: 'var(--app-text2)' }}>{formatEventMeta(e)}</p>
                          {e.description && <p className="text-xs mt-1.5 leading-relaxed" style={{ color: 'var(--app-text2)' }}>{e.description}</p>}
                          {e.location && (
                            <div className="flex items-center gap-1 mt-1.5 text-xs" style={{ color: 'var(--app-text3)' }}>
                              <MapPin size={10} className="shrink-0" />
                              <span className="truncate">{e.location}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

export default function HistoryPage() {
  const router = useRouter();
  return (
    <main className="min-h-screen flex flex-col items-center p-4 pb-20" style={{ background: 'var(--app-bg)' }}>
      <div className="w-full max-w-md flex items-center mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
          <ArrowLeft className="h-6 w-6" style={{ color: 'var(--app-text2)' }} />
        </Button>
        <h1 className="text-xl font-bold ml-2" style={{ color: 'var(--app-text)' }}>Logbuch & Zikr</h1>
      </div>

      <Suspense fallback={<div className="py-20 flex justify-center"><Loader2 className="animate-spin" style={{ color: 'var(--app-text3)' }} /></div>}>
        <HistoryContent />
      </Suspense>
    </main>
  );
}
