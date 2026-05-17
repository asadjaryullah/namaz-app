'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { ChevronLeft, Calendar, MapPin, Loader2 } from "lucide-react";

export default function EventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      const { data } = await supabase
        .from('mosque_events')
        .select('*')
        .gte('event_date', new Date().toISOString())
        .order('event_date', { ascending: true });

      if (data) setEvents(data);
      setLoading(false);
    };
    fetchEvents();
  }, []);

  const formatDateRange = (startStr: string, endStr?: string) => {
    const start = new Date(startStr);
    const sDate = start.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
    const sTime = start.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

    if (endStr) {
      const end = new Date(endStr);
      if (start.toDateString() === end.toDateString()) {
        return `${sDate}, ${sTime} - ${end.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`;
      }
      const eDate = end.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
      return `${sDate} - ${eDate}`;
    }

    return `${sDate}, ${sTime} Uhr`;
  };

  const openCalendar = () => {
    const host = window.location.host;
    const isAndroid = /Android/i.test(navigator.userAgent);
    const httpsUrl = `https://${host}/api/calendar-events`;
    const url = isAndroid
      ? `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(httpsUrl)}`
      : `webcal://${host}/api/calendar-events`;
    window.open(url, '_blank');
  };

  return (
    <main className="min-h-screen flex flex-col items-center p-4 pb-28" style={{ background: 'var(--app-bg)' }}>

      <div className="w-full max-w-md flex items-center mb-6 mt-2">
        <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
          <ChevronLeft className="h-6 w-6" style={{ color: 'var(--app-text2)' }} />
        </Button>
        <h1 className="text-xl font-bold ml-2" style={{ color: 'var(--app-text)' }}>Veranstaltungen</h1>
      </div>

      {loading ? (
        <Loader2 className="animate-spin mt-10" style={{ color: 'var(--app-text3)' }} />
      ) : events.length === 0 ? (
        <div className="text-center mt-10" style={{ color: 'var(--app-text3)' }}>Keine anstehenden Termine.</div>
      ) : (
        <div className="w-full max-w-md space-y-4">
          {events.map((e) => {
            const start = new Date(e.event_date);
            return (
              <div key={e.id} className="overflow-hidden flex flex-col rounded-xl shadow-sm" style={{ border: '1px solid var(--app-border)', background: 'var(--app-card)' }}>
                <div className="p-4 flex gap-4 items-center" style={{ background: 'rgba(251,146,60,0.10)', borderBottom: '1px solid rgba(251,146,60,0.2)' }}>
                  <div className="text-orange-600 rounded-xl p-2 text-center min-w-[3.5rem] shadow-sm" style={{ background: 'var(--app-surface2)', border: '1px solid rgba(251,146,60,0.2)' }}>
                    <span className="block text-xs font-bold uppercase">{start.toLocaleDateString('de-DE', { month: 'short' })}</span>
                    <span className="block text-xl font-black leading-none">{start.getDate()}</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold leading-tight" style={{ color: 'var(--app-text)' }}>{e.title}</h3>
                    <p className="text-xs font-bold mt-1 uppercase tracking-wide text-orange-500">
                      {formatDateRange(e.event_date, e.event_end_date)}
                    </p>
                  </div>
                </div>

                <div className="p-4">
                  <p className="text-sm mb-3" style={{ color: 'var(--app-text2)' }}>{e.description || "Gemeinschaftliche Veranstaltung."}</p>
                  <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--app-text3)' }}>
                    <MapPin size={12} /> Bashier Moschee Bensheim
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-10 mb-6">
        <Button
          variant="ghost"
          size="sm"
          className="text-xs"
          style={{ color: 'var(--app-text3)' }}
          onClick={openCalendar}
        >
          <Calendar className="mr-2 h-3 w-3" />
          Diesen Kalender abonnieren
        </Button>
      </div>

    </main>
  );
}
