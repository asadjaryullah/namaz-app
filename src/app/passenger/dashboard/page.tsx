'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { APIProvider, Map, useMapsLibrary, useMap, AdvancedMarker } from '@vis.gl/react-google-maps';
import { Button } from "@/components/ui/button";
import { CheckCircle2, Phone, XCircle, Loader2, MessageCircle, ArrowLeft } from "lucide-react";

const MAP_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
const MOSQUE_LOCATION = { lat: 49.685590, lng: 8.593480 };

// Route zeichnen
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
      polylineOptions: { strokeColor: '#16a34a', strokeWeight: 5 } 
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
  
  // Eigener Standort
  const [myPos, setMyPos] = useState<{lat: number, lng: number} | null>(null);

  // Fahrt laden und überwachen
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
    const interval = setInterval(fetchRide, 5000);
    return () => clearInterval(interval);
  }, [rideId]);

  // --- LIVE TRACKING DES MITFAHRERS ---
  useEffect(() => {
    if (!rideId) return;

    const trackLocation = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const watcher = navigator.geolocation.watchPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          
          setMyPos({ lat, lng: lon });

          // Update in der Datenbank
          await supabase
            .from('bookings')
            .update({ pickup_lat: lat, pickup_lon: lon })
            .eq('ride_id', rideId)
            .eq('passenger_id', user.id);
        },
        (err) => console.error("GPS Fehler:", err),
        { enableHighAccuracy: true } // <--- HIER KORRIGIERT (distanceFilter entfernt)
      );

      return () => navigator.geolocation.clearWatch(watcher);
    };

    trackLocation();
  }, [rideId]);
  // ----------------------------------------

  const handleCancel = async () => {
    if(!confirm("Möchtest du die Buchung wirklich stornieren?")) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('bookings').delete().eq('ride_id', rideId).eq('passenger_id', user.id);
    alert("Buchung storniert.");
    router.push('/');
  };

  const getWhatsAppLink = (phone: string) => {
    if (!phone) return "#";
    const cleanNumber = phone.replace(/[^0-9]/g, '').replace(/^0/, '49');
    const text = encodeURIComponent("Salam Alaikum, ich fahre gleich bei dir mit! 🚕");
    return `https://wa.me/${cleanNumber}?text=${text}`;
  };

  if (loading) return <div className="h-screen flex justify-center items-center"><Loader2 className="animate-spin"/></div>;
  if (!ride) return <div className="p-10 text-center">Fahrt nicht gefunden.</div>;

  // Wenn Fahrt beendet -> Ankunfts-Seite
  if (ride.status === 'completed') {
    return (
      <div className="min-h-screen bg-green-50 flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-500">
        <div className="bg-white p-6 rounded-full shadow-xl mb-6 animate-bounce">
          <span className="text-4xl">🕌</span>
        </div>
        <h1 className="text-2xl font-bold text-green-900">Alhamdulillah!</h1>
        <p className="text-green-800 mt-2 mb-8">
          Ihr seid an der Bashier Moschee angekommen.
        </p>
        <Button 
          className="w-full max-w-xs bg-green-600 hover:bg-green-700 text-white h-14 text-lg shadow-lg rounded-xl"
          onClick={() => router.push('/arrival')}
        >
          Zur Gebetsvorbereitung ➜
        </Button>
      </div>
    );
  }

  // Wo steht das Auto?
  const currentCarPosition = {
    lat: ride.current_lat || ride.start_lat,
    lng: ride.current_lon || ride.start_lon
  };

  const driverStart = { lat: ride.start_lat, lng: ride.start_lon };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative">
      
      {/* Zurück-Button */}
      <div className="absolute top-4 left-4 z-50">
        <Button 
          size="icon" 
          className="rounded-full bg-white text-slate-900 shadow-md hover:bg-slate-100 h-10 w-10"
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

            {/* LIVE POSITION DES FAHRERS */}
            <AdvancedMarker position={currentCarPosition} title="Fahrer">
               <div className="bg-slate-900 text-white text-xs px-2 py-1 rounded-full shadow border-2 border-white flex items-center gap-1 animate-pulse transition-all duration-1000">
                 🚗 {ride.driver_name}
               </div>
            </AdvancedMarker>

            {/* EIGENE POSITION (Blauer Punkt) */}
            {myPos && (
              <AdvancedMarker position={myPos} title="Ich">
                <div className="w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-lg"></div>
              </AdvancedMarker>
            )}

          </Map>
        </APIProvider>
      </div>

      {/* INFO UNTEN */}
      <div className="flex-1 p-6 -mt-6 bg-white rounded-t-3xl z-10 shadow-up">
        <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-6"></div>
        
        <div className="flex items-center gap-3 mb-6 bg-green-50 p-4 rounded-xl border border-green-100">
          <CheckCircle2 className="text-green-600 h-8 w-8" />
          <div className="flex-1">
            <h1 className="text-lg font-bold text-green-800">Du bist dabei!</h1>
            <div className="flex items-center gap-2 mt-1">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
                <p className="text-xs text-green-700 font-medium">Standort wird live geteilt</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border">
            <div>
              <p className="text-xs text-slate-500 uppercase font-bold">Dein Fahrer</p>
              <p className="text-xl font-bold text-slate-900">{ride.driver_name}</p>
            </div>
            
            <div className="flex gap-2">
              <a href={getWhatsAppLink(ride.driver_phone)} target="_blank" rel="noopener noreferrer">
                <Button size="icon" className="bg-green-500 hover:bg-green-600 rounded-full h-10 w-10 shadow-md">
                  <MessageCircle className="h-5 w-5 text-white" />
                </Button>
              </a>
              <a href={`tel:${ride.driver_phone}`}>
                <Button size="icon" variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-100 rounded-full h-10 w-10">
                  <Phone className="h-5 w-5" />
                </Button>
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 p-3 rounded-lg text-center">
              <p className="text-xs text-slate-500 uppercase">Gebet</p>
              <p className="font-mono font-bold text-lg">{ride.prayer_time} Uhr</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg text-center">
              <p className="text-xs text-slate-500 uppercase">Status</p>
              <p className="font-bold text-blue-600 uppercase text-sm mt-1">
                {ride.status === 'active' ? 'Unterwegs' : 'Beendet'}
              </p>
            </div>
          </div>

          <Button variant="destructive" className="w-full mt-4" onClick={handleCancel}>
            <XCircle className="mr-2 h-4 w-4" /> Fahrt stornieren
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function PassengerDashboard() {
  return (
    <Suspense fallback={<div>Lade...</div>}>
      <PassengerDashboardContent />
    </Suspense>
  );
}