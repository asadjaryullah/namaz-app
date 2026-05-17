'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { APIProvider, Map, useMapsLibrary, useMap, AdvancedMarker } from '@vis.gl/react-google-maps';
import { Button } from "@/components/ui/button";
import { CheckCircle2, Phone, XCircle, Loader2, MessageCircle, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const MAP_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
const MOSQUE_LOCATION = { lat: 49.685590, lng: 8.593480 };

function Directions({ startPoint }: { startPoint: {lat: number, lng: number} | null }) {
  const map = useMap();
  const routesLibrary = useMapsLibrary('routes');
  const [ds, setDs] = useState<google.maps.DirectionsService | null>(null);
  const [dr, setDr] = useState<google.maps.DirectionsRenderer | null>(null);

  useEffect(() => {
    if (!routesLibrary || !map) return;
    setDs(new routesLibrary.DirectionsService());
    setDr(new routesLibrary.DirectionsRenderer({
      map,
      suppressMarkers: true,
      polylineOptions: { strokeColor: '#22D38A', strokeWeight: 5 }
    }));
  }, [routesLibrary, map]);

  useEffect(() => {
    if (!ds || !dr || !startPoint) return;
    ds.route({
      origin: startPoint,
      destination: MOSQUE_LOCATION,
      travelMode: google.maps.TravelMode.DRIVING,
    }).then((res) => dr.setDirections(res));
  }, [ds, dr, startPoint]);

  return null;
}

function PassengerDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rideId = searchParams.get('rideId');

  const [ride, setRide] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [myPos, setMyPos] = useState<{lat: number, lng: number} | null>(null);
  const gpsErrorShownRef = useRef(false);

  useEffect(() => {
    if (!rideId) return;

    const fetchRide = async () => {
      const { data } = await supabase
        .from('rides')
        .select('*')
        .eq('id', rideId)
        .single();

      if (data) setRide(data);
      setLoading(false);
    };

    fetchRide();
    const interval = setInterval(fetchRide, 10000);
    return () => clearInterval(interval);
  }, [rideId]);

  useEffect(() => {
    if (!rideId) return;

    let watcherId: number | null = null;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;

      watcherId = navigator.geolocation.watchPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          setMyPos({ lat, lng: lon });

          await supabase
            .from('bookings')
            .update({ pickup_lat: lat, pickup_lon: lon })
            .eq('ride_id', rideId)
            .eq('passenger_id', user.id);
        },
        (err) => {
          if (err.code !== err.TIMEOUT && !gpsErrorShownRef.current) {
            gpsErrorShownRef.current = true;
            toast.error("GPS nicht verfügbar. Bitte GPS aktivieren.");
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      );
    });

    return () => {
      if (watcherId !== null) navigator.geolocation.clearWatch(watcherId);
    };
  }, [rideId]);

  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const handleCancel = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setShowCancelDialog(false);
    await supabase.from('bookings').delete().eq('ride_id', rideId).eq('passenger_id', user.id);
    router.push('/');
  };

  const getWhatsAppLink = (phone: string) => {
    if (!phone) return "#";
    const cleanNumber = phone.replace(/[^0-9]/g, '').replace(/^0/, '49');
    const text = encodeURIComponent("Salam Alaikum, ich fahre gleich bei dir mit! 🚕");
    return `https://wa.me/${cleanNumber}?text=${text}`;
  };

  if (loading) return (
    <div className="h-screen flex justify-center items-center" style={{ background: 'var(--app-bg)' }}>
      <Loader2 className="animate-spin" style={{ color: 'var(--app-text2)' }} />
    </div>
  );

  if (!ride) return (
    <div className="p-10 text-center" style={{ color: 'var(--app-text2)' }}>Fahrt nicht gefunden.</div>
  );

  if (ride.status === 'completed') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-500"
        style={{ background: 'var(--app-emerald-dim)' }}>
        <div className="p-6 rounded-full shadow-xl mb-6 animate-bounce" style={{ background: 'var(--app-surface2)' }}>
          <span className="text-4xl">🕌</span>
        </div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--app-emerald)' }}>Alhamdulillah!</h1>
        <p className="mt-2 mb-8" style={{ color: 'var(--app-text)' }}>
          Ihr seid an der Bashier Moschee angekommen.
        </p>
        <Button
          className="w-full max-w-xs h-14 text-lg shadow-lg rounded-xl"
          style={{ background: 'var(--app-emerald)', color: '#fff' }}
          onClick={() => router.push('/arrival')}
        >
          Zur Gebetsvorbereitung ➜
        </Button>
      </div>
    );
  }

  const currentCarPosition = {
    lat: ride.current_lat || ride.start_lat,
    lng: ride.current_lon || ride.start_lon
  };
  const driverStart = { lat: ride.start_lat, lng: ride.start_lon };

  return (
    <div className="min-h-screen flex flex-col relative" style={{ background: 'var(--app-bg)' }}>

      {/* Zurück-Button */}
      <div className="absolute top-4 left-4 z-50">
        <Button
          size="icon"
          className="rounded-full shadow-md h-10 w-10"
          style={{ background: 'var(--app-surface2)', color: 'var(--app-text)', border: '1px solid var(--app-border)' }}
          onClick={() => router.push('/')}
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
      </div>

      {/* KARTE */}
      <div className="h-[50vh] w-full relative">
        <APIProvider apiKey={MAP_API_KEY}>
          <Map defaultCenter={MOSQUE_LOCATION} defaultZoom={13} disableDefaultUI={true} mapId="DEMO_MAP_ID">
            <Directions startPoint={driverStart} />
            <AdvancedMarker position={MOSQUE_LOCATION} title="Moschee"><div className="text-3xl">🕌</div></AdvancedMarker>

            <AdvancedMarker position={currentCarPosition} title="Fahrer">
              <div className="text-xs px-2 py-1 rounded-full shadow border-2 border-white flex items-center gap-1 animate-pulse"
                style={{ background: 'var(--app-text)', color: 'var(--app-bg)' }}>
                🚗 {ride.driver_name}
              </div>
            </AdvancedMarker>

            {myPos && (
              <AdvancedMarker position={myPos} title="Ich">
                <div className="w-4 h-4 rounded-full border-2 border-white shadow-lg" style={{ background: 'var(--app-emerald)' }}></div>
              </AdvancedMarker>
            )}
          </Map>
        </APIProvider>
      </div>

      {/* INFO UNTEN */}
      <div className="flex-1 p-6 -mt-6 rounded-t-3xl z-10 shadow-up" style={{ background: 'var(--app-surface2)' }}>
        <div className="w-12 h-1 rounded-full mx-auto mb-6" style={{ background: 'var(--app-border)' }}></div>

        <div className="flex items-center gap-3 mb-6 p-4 rounded-xl" style={{ background: 'var(--app-emerald-dim)', border: '1px solid var(--app-emerald)' }}>
          <CheckCircle2 className="h-8 w-8 shrink-0" style={{ color: 'var(--app-emerald)' }} />
          <div className="flex-1">
            <h1 className="text-lg font-bold" style={{ color: 'var(--app-emerald)' }}>Du bist dabei!</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: 'var(--app-emerald)' }}></span>
                <span className="relative inline-flex rounded-full h-3 w-3" style={{ background: 'var(--app-emerald)' }}></span>
              </span>
              <p className="text-xs font-medium" style={{ color: 'var(--app-emerald)' }}>Standort wird live geteilt</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center p-4 rounded-xl" style={{ background: 'var(--app-card)', border: '1px solid var(--app-border)' }}>
            <div>
              <p className="text-xs uppercase font-bold" style={{ color: 'var(--app-text2)' }}>Dein Fahrer</p>
              <p className="text-xl font-bold" style={{ color: 'var(--app-text)' }}>{ride.driver_name}</p>
            </div>
            <div className="flex gap-2">
              <a href={getWhatsAppLink(ride.driver_phone)} target="_blank" rel="noopener noreferrer">
                <Button size="icon" className="bg-green-500 hover:bg-green-600 rounded-full h-10 w-10 shadow-md">
                  <MessageCircle className="h-5 w-5 text-white" />
                </Button>
              </a>
              <a href={`tel:${ride.driver_phone}`}>
                <Button size="icon" variant="outline" className="rounded-full h-10 w-10"
                  style={{ borderColor: 'var(--app-border)', color: 'var(--app-text2)' }}>
                  <Phone className="h-5 w-5" />
                </Button>
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg text-center" style={{ background: 'var(--app-card)', border: '1px solid var(--app-border)' }}>
              <p className="text-xs uppercase" style={{ color: 'var(--app-text2)' }}>Gebet</p>
              <p className="font-mono font-bold text-lg" style={{ color: 'var(--app-text)' }}>{ride.prayer_time} Uhr</p>
            </div>
            <div className="p-3 rounded-lg text-center" style={{ background: 'var(--app-card)', border: '1px solid var(--app-border)' }}>
              <p className="text-xs uppercase" style={{ color: 'var(--app-text2)' }}>Status</p>
              <p className="font-bold uppercase text-sm mt-1" style={{ color: 'var(--app-blue)' }}>
                {ride.status === 'active' ? 'Unterwegs' : 'Beendet'}
              </p>
            </div>
          </div>

          <Button variant="destructive" className="w-full mt-4" onClick={() => setShowCancelDialog(true)}>
            <XCircle className="mr-2 h-4 w-4" /> Fahrt stornieren
          </Button>
        </div>
      </div>

      {/* CONFIRM DIALOG */}
      {showCancelDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end" onClick={() => setShowCancelDialog(false)}>
          <div className="w-full rounded-t-3xl p-6 space-y-3" style={{ background: 'var(--app-surface2)' }} onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-1 rounded-full mx-auto mb-2" style={{ background: 'var(--app-border)' }}></div>
            <h3 className="text-lg font-bold text-center" style={{ color: 'var(--app-text)' }}>Buchung stornieren?</h3>
            <p className="text-sm text-center pb-2" style={{ color: 'var(--app-text2)' }}>
              Du wirst aus der Fahrt entfernt und der Fahrer wird informiert.
            </p>
            <Button className="w-full h-12 rounded-xl bg-red-600 hover:bg-red-700" onClick={handleCancel}>
              Ja, stornieren
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => setShowCancelDialog(false)}>
              Abbrechen
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PassengerDashboard() {
  return (
    <Suspense fallback={
      <div className="h-screen flex justify-center items-center" style={{ background: 'var(--app-bg)' }}>
        <Loader2 className="animate-spin h-8 w-8" style={{ color: 'var(--app-text3)' }} />
      </div>
    }>
      <PassengerDashboardContent />
    </Suspense>
  );
}
