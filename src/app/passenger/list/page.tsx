'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { User, ChevronLeft, MapPin, Loader2, Users, CheckCircle2, MessageCircle, Phone } from "lucide-react";
import { toast } from "sonner";

type BookingSuccess = { driverName: string; driverPhone: string; rideId: string };

function PassengerListContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prayerId = searchParams.get('prayer');
  const prayerTime = searchParams.get('time');

  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingRideId, setBookingRideId] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState<BookingSuccess | null>(null);

  useEffect(() => {
    const fetchRidesAndBookings = async () => {
      const today = new Date().toLocaleDateString('en-CA');
      const { data: { user } } = await supabase.auth.getUser();

      let myGender = 'male';

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('gender')
          .eq('id', user.id)
          .single();

        if (profile) myGender = profile.gender;

        const { data: existingBooking } = await supabase
          .from('bookings')
          .select('ride_id, rides!inner(status, ride_date)')
          .eq('passenger_id', user.id)
          .eq('rides.status', 'active')
          .eq('rides.ride_date', today)
          .eq('rides.prayer_id', prayerId)
          .maybeSingle();

        if (existingBooking) {
          toast.info("Du hast bereits eine aktive Fahrt für dieses Gebet.");
          router.push(`/passenger/dashboard?rideId=${existingBooking.ride_id}`);
          return;
        }
      }

      const { data: ridesData, error: ridesError } = await supabase
        .from('rides')
        .select('*')
        .eq('prayer_id', prayerId)
        .eq('status', 'active')
        .eq('ride_date', today)
        .eq('driver_gender', myGender);

      if (ridesError || !ridesData) {
        setLoading(false);
        return;
      }

      const rideIds = ridesData.map((r: any) => r.id);
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('ride_id')
        .in('ride_id', rideIds)
        .eq('status', 'accepted');

      const ridesWithCounts = ridesData.map((ride: any) => {
        const takenSeats = bookingsData?.filter((b: any) => b.ride_id === ride.id).length || 0;
        const freeSeats = ride.seats - takenSeats;
        return { ...ride, freeSeats };
      });

      setRides(ridesWithCounts);
      setLoading(false);
    };

    fetchRidesAndBookings();

    const interval = setInterval(fetchRidesAndBookings, 10000);
    return () => clearInterval(interval);
  }, [prayerId, router]);

  const handleBookRide = async (rideId: string) => {
    setBookingRideId(rideId);

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Bitte melde dich an, um mitzufahren.");
      router.push('/login');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profile || !profile.is_approved) {
      toast.error("Dein Konto wurde noch nicht freigeschaltet.");
      setBookingRideId(null);
      return;
    }

    if (!navigator.geolocation) {
      toast.error("GPS nicht verfügbar.");
      setBookingRideId(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        try {
          const { data: { session } } = await supabase.auth.getSession();
          const response = await fetch('/api/book-ride', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session?.access_token ?? ''}`,
            },
            body: JSON.stringify({
              ride_id: rideId,
              passenger_id: user.id,
              passenger_name: profile.full_name || "Mitfahrer",
              passenger_phone: profile.phone || "",
              pickup_lat: lat,
              pickup_lon: lon
            })
          });

          const result = await response.json();
          if (!response.ok) throw new Error(result.error);

          const bookedRide = rides.find(r => r.id === rideId);
          setBookingSuccess({
            driverName: bookedRide?.driver_name || "Fahrer",
            driverPhone: bookedRide?.driver_phone || "",
            rideId,
          });
          setBookingRideId(null);
        } catch (err: any) {
          toast.error("Fehler bei der Buchung: " + err.message);
          setBookingRideId(null);
        }
      },
      () => {
        setBookingRideId(null);
        toast.error("GPS-Zugriff wird benötigt.");
      }
    );
  };

  const waLink = (phone: string) => {
    const n = phone.replace(/[^0-9]/g, '').replace(/^0/, '49');
    return `https://wa.me/${n}?text=${encodeURIComponent("Salam Alaikum, ich fahre gleich bei dir mit! 🚕")}`;
  };

  return (
    <div className="min-h-screen p-6 pb-16 flex flex-col items-center" style={{ background: 'var(--app-bg)', paddingBottom: 'max(4rem, env(safe-area-inset-bottom))' }}>

      <div className="w-full max-w-md flex items-center mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <div className="ml-2">
          <h1 className="text-xl font-bold" style={{ color: 'var(--app-text)' }}>Verfügbare Fahrer</h1>
          <p className="text-xs" style={{ color: 'var(--app-text2)' }}>
            Für {prayerId} um {prayerTime} Uhr
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-20"><Loader2 className="animate-spin h-8 w-8" style={{ color: 'var(--app-text3)' }} /></div>
      ) : rides.length === 0 ? (
        <div className="text-center mt-10 p-6 rounded-xl shadow" style={{ background: 'var(--app-card)', border: '1px solid var(--app-border)' }}>
          <p className="text-lg font-semibold" style={{ color: 'var(--app-text)' }}>Keine Fahrer gefunden 😔</p>
          <p className="text-xs mt-2" style={{ color: 'var(--app-text3)' }}>
            Es werden nur Fahrer deines Geschlechts angezeigt.
          </p>
          <Button className="mt-4" onClick={() => router.push('/')}>Zurück</Button>
        </div>
      ) : (
        <div className="w-full max-w-md space-y-4">
          {rides.map((ride) => {
            const isFull = ride.freeSeats <= 0;

            return (
              <div
                key={ride.id}
                className="p-5 rounded-xl shadow-sm border-l-4 transition-all"
                style={{
                  background: 'var(--app-card)',
                  border: '1px solid var(--app-border)',
                  borderLeftColor: isFull ? 'var(--app-border)' : 'var(--app-text)',
                  borderLeftWidth: '4px',
                  opacity: isFull ? 0.7 : 1,
                }}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-3">
                    <div className="p-3 rounded-full" style={{ background: 'var(--app-surface2)' }}>
                      <User className="h-6 w-6" style={{ color: isFull ? 'var(--app-text3)' : 'var(--app-text2)' }} />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg" style={{ color: 'var(--app-text)' }}>{ride.driver_name}</h3>
                      <div className="text-sm flex items-center gap-1 mt-1" style={{ color: 'var(--app-text2)' }}>
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
                  className="w-full mt-4"
                  style={isFull
                    ? { background: 'var(--app-border)', color: 'var(--app-text3)', cursor: 'not-allowed' }
                    : { background: 'var(--app-text)', color: 'var(--app-bg)' }
                  }
                  disabled={bookingRideId === ride.id || isFull}
                  onClick={() => handleBookRide(ride.id)}
                >
                  {bookingRideId === ride.id ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : isFull ? "Leider voll" : "Mitfahren & Standort senden"}
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Buchungsbestätigung Bottom Sheet */}
      {bookingSuccess && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.55)' }}>
          <div
            className="w-full rounded-t-3xl p-6 space-y-4 animate-in slide-in-from-bottom-4 duration-300"
            style={{ background: 'var(--app-surface2)', paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
          >
            <div className="w-10 h-1 rounded-full mx-auto" style={{ background: 'var(--app-border)' }} />

            <div className="flex justify-center">
              <div className="p-4 rounded-full" style={{ background: 'var(--app-emerald-dim)' }}>
                <CheckCircle2 className="h-10 w-10" style={{ color: 'var(--app-emerald)' }} />
              </div>
            </div>

            <div className="text-center">
              <h2 className="text-xl font-bold" style={{ color: 'var(--app-emerald)' }}>Buchung erfolgreich!</h2>
              <p className="text-sm mt-1" style={{ color: 'var(--app-text2)' }}>Dein Standort wurde an den Fahrer übermittelt.</p>
            </div>

            <div className="p-4 rounded-2xl flex items-center gap-4" style={{ background: 'var(--app-card)', border: '1px solid var(--app-border)' }}>
              <div className="p-3 rounded-full" style={{ background: 'var(--app-surface2)' }}>
                <User className="h-6 w-6" style={{ color: 'var(--app-text2)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs uppercase font-bold" style={{ color: 'var(--app-text3)' }}>Dein Fahrer</p>
                <p className="font-bold text-lg truncate" style={{ color: 'var(--app-text)' }}>{bookingSuccess.driverName}</p>
                {bookingSuccess.driverPhone && (
                  <p className="text-sm" style={{ color: 'var(--app-text2)' }}>{bookingSuccess.driverPhone}</p>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              {bookingSuccess.driverPhone ? (
                <>
                  <a href={waLink(bookingSuccess.driverPhone)} target="_blank" rel="noopener noreferrer" className="flex-1">
                    <Button className="w-full h-12 rounded-xl bg-green-500 hover:bg-green-600 text-white">
                      <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp
                    </Button>
                  </a>
                  <a href={`tel:${bookingSuccess.driverPhone}`} className="shrink-0">
                    <Button variant="outline" className="h-12 w-12 rounded-xl p-0"
                      style={{ borderColor: 'var(--app-border)', color: 'var(--app-text2)' }}>
                      <Phone className="h-5 w-5" />
                    </Button>
                  </a>
                </>
              ) : <div className="flex-1" />}
              <Button
                className="flex-1 h-12 rounded-xl"
                style={{ background: 'var(--app-text)', color: 'var(--app-bg)' }}
                onClick={() => router.push(`/passenger/dashboard?rideId=${bookingSuccess.rideId}`)}
              >
                Weiter ➜
              </Button>
            </div>
          </div>
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
