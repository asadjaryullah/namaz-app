'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { User, ChevronLeft, MapPin, Loader2, Users, Plus, Minus } from "lucide-react";

function PassengerListContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prayerId = searchParams.get('prayer'); 
  const prayerTime = searchParams.get('time'); 

  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingRideId, setBookingRideId] = useState<string | null>(null);
  
  // Wie viele Sitze will ich buchen? (State)
  const [seatsRequest, setSeatsRequest] = useState(1);

  const fetchRidesAndBookings = async () => {
    const today = new Date().toLocaleDateString('en-CA');

    const { data: ridesData } = await supabase
      .from('rides')
      .select('*')
      .eq('prayer_id', prayerId)
      .eq('status', 'active')
      .eq('ride_date', today);

    if (!ridesData) { setLoading(false); return; }

    const rideIds = ridesData.map(r => r.id);
    const { data: bookingsData } = await supabase
      .from('bookings')
      .select('ride_id, seats_booked') // Wichtig: seats_booked mitladen
      .in('ride_id', rideIds)
      .eq('status', 'accepted');

    const ridesWithCounts = ridesData.map(ride => {
      // Summe aller gebuchten Sitze berechnen
      const takenSeats = bookingsData
        ?.filter(b => b.ride_id === ride.id)
        .reduce((sum, b) => sum + (b.seats_booked || 1), 0) || 0;
      
      const freeSeats = ride.seats - takenSeats;
      return { ...ride, freeSeats };
    });

    setRides(ridesWithCounts);
    setLoading(false);
  };

  useEffect(() => {
    fetchRidesAndBookings();
    const interval = setInterval(fetchRidesAndBookings, 5000);
    return () => clearInterval(interval);
  }, [prayerId]);

  const handleBookRide = async (rideId: string) => {
    setBookingRideId(rideId); 

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { alert("Bitte anmelden!"); router.push('/login'); return; }

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();

    if (!navigator.geolocation) { alert("GPS fehlt."); setBookingRideId(null); return; }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { error } = await supabase.from('bookings').insert({
          ride_id: rideId,
          passenger_id: user.id,
          passenger_name: profile?.full_name || "Mitfahrer",
          passenger_phone: profile?.phone || "",
          pickup_lat: position.coords.latitude,
          pickup_lon: position.coords.longitude,
          status: 'accepted',
          seats_booked: seatsRequest // <--- HIER SPEICHERN WIR DIE ANZAHL
        });

        if (error) alert("Fehler: " + error.message);
        else router.push(`/passenger/dashboard?rideId=${rideId}`);
      },
      () => { setBookingRideId(null); alert("GPS benötigt."); }
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center">
      <div className="w-full max-w-md flex items-center mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()}><ChevronLeft /></Button>
        <div className="ml-2">
          <h1 className="text-xl font-bold">Verfügbare Fahrer</h1>
          <p className="text-xs text-slate-500">Für {prayerId} um {prayerTime} Uhr</p>
        </div>
      </div>

      {loading ? <Loader2 className="animate-spin text-slate-400" /> : rides.length === 0 ? <p className="mt-10 text-slate-500">Keine Fahrer gefunden.</p> : (
        <div className="w-full max-w-md space-y-4">
          {rides.map((ride) => {
            const isFull = ride.freeSeats < seatsRequest; // Prüfen ob genug Platz für Wunsch ist

            return (
              <Card key={ride.id} className="p-5 border-l-4 border-l-slate-900 shadow-sm">
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-3">
                    <div className="bg-slate-100 p-3 rounded-full"><User className="h-6 w-6 text-slate-700"/></div>
                    <div>
                      <h3 className="font-bold text-lg">{ride.driver_name}</h3>
                      <div className="text-sm text-green-600 flex items-center gap-1 mt-1"><MapPin size={12}/> Zur Moschee</div>
                      <span className={`text-xs font-bold mt-1 block ${ride.freeSeats === 0 ? 'text-red-500' : 'text-slate-500'}`}>
                        Noch {ride.freeSeats} Plätze frei
                      </span>
                    </div>
                  </div>
                </div>

                {/* SITZPLATZ WAHL */}
                <div className="mt-4 flex items-center justify-between bg-slate-50 p-2 rounded-lg">
                  <span className="text-sm font-medium text-slate-600 pl-2">Ich brauche:</span>
                  <div className="flex items-center gap-3">
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setSeatsRequest(Math.max(1, seatsRequest - 1))}><Minus size={14}/></Button>
                    <span className="font-bold w-4 text-center">{seatsRequest}</span>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setSeatsRequest(Math.min(ride.freeSeats, seatsRequest + 1))} disabled={seatsRequest >= ride.freeSeats}><Plus size={14}/></Button>
                  </div>
                </div>

                <Button 
                  className="w-full mt-3 bg-slate-900 hover:bg-slate-800"
                  disabled={bookingRideId === ride.id || isFull}
                  onClick={() => handleBookRide(ride.id)}
                >
                  {bookingRideId === ride.id ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : isFull ? "Nicht genug Platz" : `Für ${seatsRequest} Person(en) buchen`}
                </Button>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function PassengerListPage() {
  return <Suspense fallback={<div>Lade...</div>}><PassengerListContent /></Suspense>;
}