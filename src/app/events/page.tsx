'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

  // Helfer für Datumsanzeige (z.B. "22. Dez - 26. Dez")
  const formatDateRange = (startStr: string, endStr?: string) => {
    const start = new Date(startStr);
    const sDate = start.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
    const sTime = start.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

    if (endStr) {
      const end = new Date(endStr);
      // Wenn gleicher Tag
      if (start.toDateString() === end.toDateString()) {
         return `${sDate}, ${sTime} - ${end.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`;
      }
      // Wenn verschiedene Tage
      const eDate = end.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
      return `${sDate} - ${eDate}`;
    }

    return `${sDate}, ${sTime} Uhr`;
  };

  const openCalendar = () => {
    const host = window.location.host;
    const url = `webcal://${host}/api/calendar-events`;
    window.location.href = url;
  };

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center p-4">
      
      <div className="w-full max-w-md flex items-center mb-6 mt-2">
        <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
          <ChevronLeft className="h-6 w-6 text-slate-600" />
        </Button>
        <h1 className="text-xl font-bold ml-2 text-slate-800">Veranstaltungen</h1>
      </div>

      {loading ? (
        <Loader2 className="animate-spin text-slate-400 mt-10" />
      ) : events.length === 0 ? (
        <div className="text-center text-slate-400 mt-10">Keine anstehenden Termine.</div>
      ) : (
        <div className="w-full max-w-md space-y-4">
          {events.map((e) => {
            const start = new Date(e.event_date);
            return (
              <Card key={e.id} className="p-0 overflow-hidden flex flex-col shadow-sm border border-slate-200">
                <div className="bg-orange-50 p-4 border-b border-orange-100 flex gap-4 items-center">
                  <div className="bg-white text-orange-600 rounded-xl p-2 text-center min-w-[3.5rem] shadow-sm border border-orange-100">
                     <span className="block text-xs font-bold uppercase">{start.toLocaleDateString('de-DE', { month: 'short' })}</span>
                     <span className="block text-xl font-black leading-none">{start.getDate()}</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 leading-tight">{e.title}</h3>
                    <p className="text-xs font-bold text-orange-600 mt-1 uppercase tracking-wide">
                      {formatDateRange(e.event_date, e.event_end_date)}
                    </p>
                  </div>
                </div>
                
                <div className="p-4">
                   <p className="text-sm text-slate-600 mb-3">{e.description || "Gemeinschaftliche Veranstaltung."}</p>
                   <div className="flex items-center gap-1 text-xs text-slate-400">
                     <MapPin size={12} /> Bashir Moschee Bensheim
                   </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* BUTTON GANZ UNTEN & KLEIN */}
      <div className="mt-10 mb-6">
        <Button 
          variant="ghost" 
          size="sm"
          className="text-slate-400 hover:text-slate-600 text-xs"
          onClick={openCalendar}
        >
          <Calendar className="mr-2 h-3 w-3" />
          Diesen Kalender abonnieren
        </Button>
      </div>

    </main>
  );
}