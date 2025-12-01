'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { APIProvider, Map, useMapsLibrary, useMap, AdvancedMarker } from '@vis.gl/react-google-maps';
import { Button } from "@/components/ui/button";
import { CheckCircle2, Phone, XCircle, Loader2, MessageCircle } from "lucide-react";

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

  // Fahrt laden UND überwachen
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
    
    // --- NEU: Alle 5 Sekunden prüfen, ob die Fahrt beendet ist ---
    const interval = setInterval(fetchRide, 5000);
    return () => clearInterval(interval);
    // ------------------------------------------------------------
  }, [rideId]);

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

  // --- NEU: WENN FAHRT BEENDET IST -> ZEIGE ANKUNFTS-SCREEN ---
  if (ride.status === 'completed') {
    return (
      <div className="min-h-screen bg-green-50 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
        <div className="bg-white p-6 rounded-full shadow-xl mb-6 animate-bounce">
          <span className="text-4xl">🕌</span>
        </div>
        <h1 className="text-2xl font-bold text-green-900">Alhamdulillah!</h1>
        <p className="text-green-800 mt-2 mb-8">
          Ihr seid an der Bashir Moschee angekommen.
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
  // -----------------------------------------------------------

  const driverStart = { lat: ride.start_lat, lng: ride.start_lon };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="h-[50vh] w-full relative">
        <APIProvider apiKey={MAP_API_KEY}>
          <Map defaultCenter={MOSQUE_LOCATION} defaultZoom={12} disableDefaultUI={true} mapId="DEMO_MAP_ID">
            <Directions startPoint={driverStart} />
            <AdvancedMarker position={MOSQUE_LOCATION} title="Moschee"><div className="text-3xl">🕌</div></AdvancedMarker>
            <AdvancedMarker position={driverStart} title="Fahrer Start">
               <div className="bg-slate-900 text-white text-xs px-2 py-1 rounded-full shadow border-2 border-white">🚗 {ride.driver_name}</div>
            </AdvancedMarker>
          </Map>
        </APIProvider>
      </div>

      <div className="flex-1 p-6 -mt-6 bg-white rounded-t-3xl z-10 shadow-up">
        <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-6"></div>
        
        <div className="flex items-center gap-3 mb-6 bg-green-50 p-4 rounded-xl border border-green-100">
          <CheckCircle2 className="text-green-600 h-8 w-8" />
          <div>
            <h1 className="text-lg font-bold text-green-800">Du bist dabei!</h1>
            <p className="text-sm text-green-700">Fahrer benachrichtigt.</p>
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
              <p className="font-bold text-blue-600 uppercase text-sm mt-1">{ride.status === 'active' ? 'Unterwegs' : 'Beendet'}</p>
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