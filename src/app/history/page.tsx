'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Car, User, Calendar, Clock, Trophy } from "lucide-react";

export default function HistoryPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'driver' | 'passenger'>('driver');
  const [driverRides, setDriverRides] = useState<any[]>([]);
  const [passengerRides, setPassengerRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Profildaten für den Namen
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
      if (profile) setUserName(profile.full_name?.split(' ')[0] || "Nutzer");

      // Datumsgrenzen für "Diesen Monat"
      const date = new Date();
      const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).toISOString();
      const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString();

      // 1. STATISTIK ALS FAHRER (Rides + Bookings laden)
      const { data: driveData } = await supabase
        .from('rides')
        .select('*, bookings(passenger_name)') // Wir laden die Namen der Mitfahrer direkt mit
        .eq('driver_id', user.id)
        .eq('status', 'completed') // Nur beendete Fahrten
        .gte('ride_date', firstDay)
        .lte('ride_date', lastDay)
        .order('ride_date', { ascending: false });

      if (driveData) setDriverRides(driveData);

      // 2. STATISTIK ALS MITFAHRER (Bookings + Ride Info laden)
      const { data: rideData } = await supabase
        .from('bookings')
        .select('*, rides(driver_name, prayer_time, ride_date)') // Wir laden Infos über die Fahrt mit
        .eq('passenger_id', user.id)
        .eq('status', 'accepted')
        .gte('created_at', firstDay)
        .lte('created_at', lastDay)
        .order('created_at', { ascending: false });

      if (rideData) setPassengerRides(rideData);
      
      setLoading(false);
    };

    fetchData();
  }, [router]);

  // Den aktuellen Monatsnamen holen (z.B. "Dezember")
  const currentMonthName = new Date().toLocaleString('de-DE', { month: 'long' });

  // Welche Liste zeigen wir an?
  const list = activeTab === 'driver' ? driverRides : passengerRides;
  const count = list.length;

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center p-4">
      
      {/* Header */}
      <div className="w-full max-w-md flex items-center mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-bold ml-2">Deine Statistik</h1>
      </div>

      {/* Große Statistik Karte */}
      <Card className="w-full max-w-md bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 rounded-2xl shadow-xl mb-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-slate-300 text-sm uppercase tracking-wider font-medium mb-1">
              Im {currentMonthName}
            </p>
            <h2 className="text-4xl font-bold">{count} <span className="text-lg font-normal text-slate-300">Fahrten</span></h2>
          </div>
          <div className="bg-white/10 p-3 rounded-full">
            <Trophy className="h-8 w-8 text-yellow-400" />
          </div>
        </div>
        <p className="mt-4 text-sm text-slate-300">
          Maschaallah, {userName}! Weiter so.
        </p>
      </Card>

      {/* Tabs Auswahl */}
      <div className="w-full max-w-md flex bg-white p-1 rounded-xl shadow-sm mb-6 border">
        <button 
          onClick={() => setActiveTab('driver')}
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2
            ${activeTab === 'driver' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          <Car size={16} /> Als Fahrer
        </button>
        <button 
          onClick={() => setActiveTab('passenger')}
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2
            ${activeTab === 'passenger' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          <User size={16} /> Als Mitfahrer
        </button>
      </div>

      {/* Die Liste */}
      <div className="w-full max-w-md space-y-3 pb-10">
        {loading ? (
          <p className="text-center text-slate-400 mt-10">Lade Daten...</p>
        ) : list.length === 0 ? (
          <div className="text-center p-8 bg-white rounded-xl border border-dashed">
            <p className="text-slate-400">Diesen Monat noch keine Fahrten.</p>
          </div>
        ) : (
          list.map((item) => {
            // Daten aufbereiten (da die Struktur je nach Tab etwas anders ist)
            const date = activeTab === 'driver' ? item.ride_date : item.rides?.ride_date;
            const time = activeTab === 'driver' ? item.prayer_time : item.rides?.prayer_time;
            const names = activeTab === 'driver' 
              ? item.bookings.map((b: any) => b.passenger_name).join(', ') // Wen hab ich mitgenommen?
              : item.rides?.driver_name; // Wer hat mich mitgenommen?

            return (
              <Card key={item.id} className="p-4 flex flex-col gap-2 border-l-4 border-l-slate-300 hover:border-l-slate-900 transition-all">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-slate-600 text-sm font-bold">
                    <Calendar size={14} /> 
                    {new Date(date).toLocaleDateString('de-DE')}
                  </div>
                  <div className="flex items-center gap-1 text-slate-500 text-xs bg-slate-100 px-2 py-1 rounded">
                    <Clock size={12} /> {time} Uhr
                  </div>
                </div>
                
                <div>
                  <p className="text-xs text-slate-400 uppercase font-bold mb-1">
                    {activeTab === 'driver' ? 'Mitgenommen:' : 'Gefahren von:'}
                  </p>
                  <p className="text-slate-900 font-medium">
                    {names || "Niemanden"}
                  </p>
                </div>
              </Card>
            );
          })
        )}
      </div>

    </main>
  );
}