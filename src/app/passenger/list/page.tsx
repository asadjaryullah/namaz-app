'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { User, ChevronLeft, MapPin, Loader2, Users } from "lucide-react";

function PassengerListContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prayerId = searchParams.get('prayer'); 
  const prayerTime = searchParams.get('time'); 

  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingRideId, setBookingRideId] = useState<string | null>(null);

  useEffect(() => {
    const fetchRidesAndBookings = async () => {
      // 1. Datum von Heute
      const today = new Date().toISOString().split('T')[0];

      // 2. CHECK: Habe ich heute schon eine Fahrt? (Doppelbuchungsschutz)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: existingBooking } = await supabase
            .from('bookings')
            .select('ride_id, rides!inner(status, ride_date)')
            .eq('passenger_id', user.id)
            .eq('rides.status', 'active')
            .eq('rides.ride_date', today)
            .eq('rides.prayer_id', prayerId)
            .maybeSingle();

        if (existingBooking) {
            alert("Du hast bereits eine aktive Fahrt für heute!");
            router.push(`/passenger/dashboard?rideId=${existingBooking.ride_id}`);
            return;
        }
      }

      // 3. Fahrten laden (Variable ridesData definieren)
      const { data: ridesData, error: ridesError } = await supabase
        .from('rides')
        .select('*')
        .eq('prayer_id', prayerId)
        .eq('status', 'active')
        .eq('ride_date', today);

      if (ridesError || !ridesData) {
        setLoading(false);
        return; // Abbruch wenn Fehler
      }

      // 4. Buchungen laden (um freie Plätze zu berechnen)
      const rideIds = ridesData.map((r: any) => r.id);
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('ride_id')
        .in('ride_id', rideIds)
        .eq('status', 'accepted');

      // 5. Zusammenrechnen
      const ridesWithCounts = ridesData.map((ride: any) => {
        const takenSeats = bookingsData?.filter((b: any) => b.ride_id === ride.id).length || 0;
        const freeSeats = ride.seats - takenSeats;
        return { ...ride, freeSeats };
      });

      setRides(ridesWithCounts);
      setLoading(false);
    };

    fetchRidesAndBookings();
    
    // Live-Update alle 5 Sek
    const interval = setInterval(fetchRidesAndBookings, 5000);
    return () => clearInterval(interval);

  }, [prayerId, router]); // Router und PrayerId als Dependency

  // --- BUCHUNGS-LOGIK ---
  const handleBookRide = async (rideId: string) => {
    setBookingRideId(rideId); 

    const { data: { user } } = await supabase.auth.getUser();
    
    // Nicht eingeloggt? -> Login
    if (!user) {
      alert("Bitte melde dich kurz an, um mitzufahren!");
      router.push('/login');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!navigator.geolocation) {
      alert("GPS nicht verfügbar.");
      setBookingRideId(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        const { error } = await supabase.from('bookings').insert({
          ride_id: rideId,
          passenger_id: user.id,
          passenger_name: profile?.full_name || "Mitfahrer",
          passenger_phone: profile?.phone || "",
          pickup_lat: lat,
          pickup_lon: lon,
          status: 'accepted' 
        });

        setBookingRideId(null);

        if (error) {
          alert("Fehler: " + error.message);
        } else {
          router.push(`/passenger/dashboard?rideId=${rideId}`);
        }
      },
      (err) => {
        setBookingRideId(null);
        alert("GPS wird benötigt!");
      }
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center">
      
      <div className="w-full max-w-md flex items-center mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <div className="ml-2">
          <h1 className="text-xl font-bold">Verfügbare Fahrer</h1>
          <p className="text-xs text-slate-500">
             Für {prayerId} um {prayerTime} Uhr
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-20"><Loader2 className="animate-spin text-slate-400 h-8 w-8" /></div>
      ) : rides.length === 0 ? (
        <div className="text-center mt-10 p-6 bg-white rounded-xl shadow border">
          <p className="text-lg font-semibold text-slate-700">Keine Fahrer gefunden 😔</p>
          <Button className="mt-4" onClick={() => router.push('/')}>Zurück</Button>
        </div>
      ) : (
        <div className="w-full max-w-md space-y-4">
          {rides.map((ride) => {
            const isFull = ride.freeSeats <= 0;

            return (
              <Card key={ride.id} className={`p-5 border-l-4 shadow-sm transition-all ${isFull ? 'border-l-gray-300 opacity-70' : 'border-l-slate-900'}`}>
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-3">
                    <div className={`p-3 rounded-full ${isFull ? 'bg-gray-100' : 'bg-slate-100'}`}>
                      <User className={`h-6 w-6 ${isFull ? 'text-gray-400' : 'text-slate-700'}`} />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{ride.driver_name}</h3>
                      <div className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                        <MapPin size={12} /> Fährt zur Moschee
                      </div>
                      
                      <div className={`text-xs font-bold mt-2 flex items-center gap-1 ${
                        isFull ? 'text-red-500' : ride.freeSeats === 1 ? 'text-orange-500' : 'text-green-600'
                      }`}>
                        <Users size={12} />
                        {isFull 
                          ? "Auto voll belegt" 
                          : `Noch ${ride.freeSeats} ${ride.freeSeats === 1 ? 'Platz' : 'Plätze'} frei`
                        }
                      </div>

                    </div>
                  </div>
                </div>

                <Button 
                  className={`w-full mt-4 ${isFull ? 'bg-gray-300 text-gray-500 cursor-not-allowed hover:bg-gray-300' : 'bg-slate-900 hover:bg-slate-800'}`}
                  disabled={bookingRideId === ride.id || isFull}
                  onClick={() => handleBookRide(ride.id)}
                >
                  {bookingRideId === ride.id ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : isFull ? "Leider voll" : "Mitfahren & Standort senden"}
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
  return (
    <Suspense fallback={<div>Lade...</div>}>
      <PassengerListContent />
    </Suspense>
  );
}