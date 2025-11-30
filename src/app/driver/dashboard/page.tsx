'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { APIProvider, Map, useMapsLibrary, useMap, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { Card } from "@/components/ui/card";
import { Loader2, Navigation, User, Phone, CheckSquare, MapPin, MessageCircle } from "lucide-react"; // <--- MessageCircle hinzugefügt
import { Button } from "@/components/ui/button";

const MAP_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
const MOSQUE_LOCATION = { lat: 49.685590, lng: 8.593480 }; 

// Hilfs-Komponente: Zeichnet die Route
function Directions({ userLocation }: { userLocation: {lat: number, lng: number} | null }) {
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
      polylineOptions: { strokeColor: '#2563eb', strokeWeight: 5 } 
    }));
  }, [routesLibrary, map]);

  useEffect(() => {
    if (!ds || !dr || !userLocation) return;
    ds.route({
      origin: userLocation,
      destination: MOSQUE_LOCATION,
      travelMode: google.maps.TravelMode.DRIVING,
    }).then((res) => dr.setDirections(res));
  }, [ds, dr, userLocation]);

  return null;
}

export default function DriverDashboard() {
  const router = useRouter();
  const [startPoint, setStartPoint] = useState<{lat: number, lng: number} | null>(null);
  const [passengers, setPassengers] = useState<any[]>([]); 
  const [rideId, setRideId] = useState<string | null>(null);
  const [loadingEnd, setLoadingEnd] = useState(false);

  // 1. Eigene Fahrt laden
  useEffect(() => {
    const fetchRide = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: ride } = await supabase
        .from('rides')
        .select('*')
        .eq('driver_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (ride) {
        setRideId(ride.id);
        if (ride.start_lat) setStartPoint({ lat: ride.start_lat, lng: ride.start_lon });
      } else {
        alert("Keine aktive Fahrt gefunden.");
        router.push('/');
      }
    };
    fetchRide();
  }, []);

  // 2. Passagiere laden (Live-Polling alle 5 Sek)
  useEffect(() => {
    if (!rideId) return;

    const fetchPassengers = async () => {
      const { data } = await supabase
        .from('bookings')
        .select('*')
        .eq('ride_id', rideId)
        .eq('status', 'accepted');
      
      if (data) setPassengers(data);
    };

    fetchPassengers();
    const interval = setInterval(fetchPassengers, 5000); 
    return () => clearInterval(interval);
  }, [rideId]);

  // 3. Fahrt beenden
  const handleEndRide = async () => {
    if (!confirm("Sind alle angekommen? Fahrt wirklich beenden?")) return;
    setLoadingEnd(true);

    const { error } = await supabase
      .from('rides')
      .update({ status: 'completed' })
      .eq('id', rideId);

    if (!error) {
      router.push('/'); 
    } else {
      alert("Fehler: " + error.message);
      setLoadingEnd(false);
    }
  };

  // --- NEU: WhatsApp Link Generator ---
  const getWhatsAppLink = (phone: string, name: string) => {
    if (!phone) return "#";
    // Nummer säubern (0176 -> 49176)
    const cleanNumber = phone.replace(/[^0-9]/g, '').replace(/^0/, '49');
    const text = encodeURIComponent(`Salam Alaikum ${name}, ich bin gleich da! 🚗`);
    return `https://wa.me/${cleanNumber}?text=${text}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      
      {/* KARTE */}
      <div className="h-[55vh] w-full relative">
        <APIProvider apiKey={MAP_API_KEY}>
          <Map defaultCenter={MOSQUE_LOCATION} defaultZoom={13} disableDefaultUI={true} mapId="DEMO_MAP_ID">
            <Directions userLocation={startPoint} />
            <AdvancedMarker position={MOSQUE_LOCATION} title="Moschee"><div className="text-3xl">🕌</div></AdvancedMarker>
            
            {startPoint && (
              <AdvancedMarker position={startPoint} title="Start">
                 <Pin background={'#0f172a'} glyphColor={'#fff'} borderColor={'#fff'} />
              </AdvancedMarker>
            )}

            {passengers.map((p) => (
              p.pickup_lat && p.pickup_lon && (
                <AdvancedMarker 
                  key={p.id} 
                  position={{ lat: p.pickup_lat, lng: p.pickup_lon }}
                  title={p.passenger_name}
                >
                  <div className="bg-blue-600 p-1.5 rounded-full border-2 border-white shadow-md">
                    <User size={16} className="text-white" />
                  </div>
                </AdvancedMarker>
              )
            ))}
          </Map>
        </APIProvider>
      </div>

      {/* INFO UNTEN */}
      <div className="flex-1 p-6 -mt-6 bg-white rounded-t-3xl z-10 shadow-up overflow-y-auto pb-10">
        <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-6"></div>
        
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Aktive Fahrt</h1>
          <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded-full animate-pulse">
            LIVE
          </span>
        </div>
        
        <h3 className="text-sm font-bold text-slate-500 uppercase mb-3">Abholungen ({passengers.length})</h3>
        
        {passengers.length === 0 ? (
          <p className="text-slate-400 text-sm mb-6 bg-slate-50 p-4 rounded-xl text-center border border-dashed">
            Noch keine Mitfahrer gebucht.<br/>Warte auf Anfragen...
          </p>
        ) : (
          <div className="space-y-3 mb-8">
            {passengers.map((p) => (
              <div key={p.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="bg-white p-2 rounded-full border shadow-sm">
                    <MapPin size={18} className="text-blue-600"/>
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{p.passenger_name}</p>
                    <p className="text-xs text-slate-500">Wartet am Standort</p>
                  </div>
                </div>
                
                {/* --- NEU: BUTTONS FÜR WHATSAPP & TELEFON --- */}
                <div className="flex gap-2">
                  <a href={getWhatsAppLink(p.passenger_phone, p.passenger_name)} target="_blank" rel="noopener noreferrer">
                    <Button size="icon" className="bg-green-500 hover:bg-green-600 rounded-full h-10 w-10 shadow-sm text-white">
                      <MessageCircle size={18} />
                    </Button>
                  </a>
                  
                  <a href={`tel:${p.passenger_phone}`}>
                    <Button size="icon" variant="outline" className="text-green-600 border-green-200 hover:bg-green-50 rounded-full h-10 w-10">
                      <Phone size={18} />
                    </Button>
                  </a>
                </div>
                {/* ------------------------------------------ */}

              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3">
          <Button 
            variant="outline"
            className="w-full h-12 text-lg rounded-xl border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100"
            onClick={() => {
               const origin = `${startPoint?.lat},${startPoint?.lng}`;
               const destination = `${MOSQUE_LOCATION.lat},${MOSQUE_LOCATION.lng}`;
               const waypoints = passengers.map(p => `${p.pickup_lat},${p.pickup_lon}`).join('|');
               window.open(`https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}&travelmode=driving`, '_blank');
            }}
          >
            <Navigation className="mr-2" size={20} /> Navigation starten
          </Button>

          <Button 
            className="w-full h-12 text-lg rounded-xl bg-slate-900 text-white hover:bg-slate-800"
            onClick={handleEndRide}
            disabled={loadingEnd}
          >
            {loadingEnd ? <Loader2 className="animate-spin mr-2"/> : <CheckSquare className="mr-2" size={20} />}
            Fahrt beenden
          </Button>
        </div>

      </div>
    </div>
  );
}