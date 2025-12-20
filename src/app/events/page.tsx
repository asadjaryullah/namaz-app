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
        .gte('event_date', new Date().toISOString()) // Nur Zukunft
        .order('event_date', { ascending: true });
      
      if (data) setEvents(data);
      setLoading(false);
    };
    fetchEvents();
  }, []);

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
            const date = new Date(e.event_date);
            return (
              <Card key={e.id} className="p-0 overflow-hidden flex flex-col shadow-sm border border-slate-200">
                {/* Datums-Header */}
                <div className="bg-slate-100 p-3 flex items-center gap-3 border-b border-slate-200">
                  <div className="bg-white p-2 rounded-lg text-center min-w-[3.5rem] shadow-sm">
                     <span className="block text-xs font-bold text-slate-400 uppercase">{date.toLocaleDateString('de-DE', { month: 'short' })}</span>
                     <span className="block text-xl font-black text-slate-800 leading-none">{date.getDate()}</span>
                  </div>
                  <div>
                    <p className="font-bold text-slate-700">{date.toLocaleDateString('de-DE', { weekday: 'long' })}</p>
                    <p className="text-xs text-slate-500">{date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr</p>
                  </div>
                </div>
                
                {/* Inhalt */}
                <div className="p-4">
                   <h3 className="text-lg font-bold text-slate-900 mb-1">{e.title}</h3>
                   <p className="text-sm text-slate-600 mb-3">{e.description || "Keine Beschreibung verfügbar."}</p>
                   
                   <div className="flex items-center gap-1 text-xs text-slate-400">
                     <MapPin size={12} /> Bashir Moschee Bensheim
                   </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </main>
  );
}