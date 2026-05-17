'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { APIProvider, Map, useMapsLibrary, useMap, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { Card } from "@/components/ui/card";
import { Loader2, Navigation, User, Phone, CheckSquare, MapPin, MessageCircle, XCircle, ArrowLeft, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const MAP_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
const MOSQUE_LOCATION = { lat: 49.685590, lng: 8.593480 };

// Hilfsfunktion: Abstand berechnen
function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

const getWhatsAppLink = (phone: string, name: string) => {
  if (!phone) return "#";
  const cleanNumber = phone.replace(/[^0-9]/g, '').replace(/^0/, '49');
  const text = encodeURIComponent(`Salam Alaikum ${name}, ich bin gleich da! 🚗`);
  return `https://wa.me/${cleanNumber}?text=${text}`;
};

// Route zeichnen
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
      polylineOptions: { strokeColor: '#5B7FFF', strokeWeight: 5 }
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
  const [currentPos, setCurrentPos] = useState<{lat: number, lng: number} | null>(null);
  const [passengers, setPassengers] = useState<any[]>([]);
  const [rideId, setRideId] = useState<string | null>(null);
  const [loadingEnd, setLoadingEnd] = useState(false);

  // Dialog & Undo
  const [confirmType, setConfirmType] = useState<'end' | 'cancel' | null>(null);
  const [undoVisible, setUndoVisible] = useState(false);
  const [undoCountdown, setUndoCountdown] = useState(5);
  const undoIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const undoCancelledRef = useRef(false);

  const rideEndedRef = useRef(false);

  // Refs für Notification-Logik
  const previousCountRef = useRef(0);
  const isFirstLoadRef = useRef(true);

  // Cleanup undo interval on unmount
  useEffect(() => {
    return () => {
      if (undoIntervalRef.current) clearInterval(undoIntervalRef.current);
    };
  }, []);

  // 1. Eigene Fahrt laden
  useEffect(() => {
    const fetchRide = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toISOString().split('T')[0];

      const { data: ride } = await supabase
        .from('rides')
        .select('*')
        .eq('driver_id', user.id)
        .eq('status', 'active')
        .eq('ride_date', today)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (ride) {
        setRideId(ride.id);
        if (ride.start_lat) setStartPoint({ lat: ride.start_lat, lng: ride.start_lon });
      } else {
        router.push('/');
      }
    };
    fetchRide();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  // 2. Passagiere laden & Benachrichtigen
  useEffect(() => {
    if (!rideId) return;

    const fetchPassengers = async () => {
      const { data } = await supabase
        .from('bookings')
        .select('*')
        .eq('ride_id', rideId)
        .eq('status', 'accepted');

      if (data) {
        setPassengers(data);

        // Check: Neue Buchung oder Stornierung?
        const currentCount = data.length;
        const prevCount = previousCountRef.current;
        if (!isFirstLoadRef.current) {
          if (currentCount > prevCount) {
            const newPassenger = data[data.length - 1];
            const name = newPassenger?.passenger_name || "Jemand";
            if (Notification.permission === "granted") {
              new Notification("Neuer Mitfahrer! 🙋‍♂️", { body: `${name} hat gerade deine Fahrt gebucht.`, icon: "/icon.png" });
            } else {
              toast.success(`${name} hat deine Fahrt gebucht! 🙋`);
            }
          } else if (currentCount < prevCount) {
            if (Notification.permission === "granted") {
              new Notification("Mitfahrer abgesprungen ⚠️", { body: "Ein Mitfahrer hat seine Buchung storniert.", icon: "/icon.png" });
            } else {
              toast.warning("Ein Mitfahrer hat seine Buchung storniert.");
            }
          }
        }
        previousCountRef.current = currentCount;
        isFirstLoadRef.current = false;
      }
    };

    fetchPassengers();
    const interval = setInterval(fetchPassengers, 10000);
    return () => clearInterval(interval);
  }, [rideId]);

  // 3. Fahrt tatsächlich beenden (nach Bestätigung + Undo-Zeit)
  const executeEndRide = async () => {
    if (!rideId || rideEndedRef.current) return;
    rideEndedRef.current = true;
    setLoadingEnd(true);

    const { error } = await supabase
      .from('rides')
      .update({ status: 'completed' })
      .eq('id', rideId);

    if (!error) {
      router.push('/arrival');
    } else {
      toast.error("Fehler: " + error.message);
      setLoadingEnd(false);
      rideEndedRef.current = false;
    }
  };

  // Undo-Countdown starten (5s bis executeEndRide)
  const startUndoCountdown = () => {
    setUndoVisible(true);
    setUndoCountdown(5);
    undoCancelledRef.current = false;
    let count = 5;
    undoIntervalRef.current = setInterval(() => {
      count--;
      setUndoCountdown(count);
      if (count <= 0) {
        if (undoIntervalRef.current) clearInterval(undoIntervalRef.current);
        setUndoVisible(false);
        if (!undoCancelledRef.current) executeEndRide();
      }
    }, 1000);
  };

  const handleUndo = () => {
    undoCancelledRef.current = true;
    if (undoIntervalRef.current) clearInterval(undoIntervalRef.current);
    setUndoVisible(false);
  };

  // Fahrt beenden: manuell → Confirm Dialog, auto (Geofencing) → direkt Undo-Toast
  const handleEndRide = (auto = false) => {
    if (rideEndedRef.current) return;
    if (auto) {
      startUndoCountdown();
    } else {
      setConfirmType('end');
    }
  };

  // 4. Fahrt ABSAGEN (Stornieren)
  const executeCancelRide = async () => {
    setConfirmType(null);
    setLoadingEnd(true);
    await supabase.from('bookings').delete().eq('ride_id', rideId);
    const { error } = await supabase.from('rides').delete().eq('id', rideId);
    if (!error) {
      router.push('/');
    } else {
      toast.error("Fehler beim Stornieren: " + error.message);
      setLoadingEnd(false);
    }
  };

  // 5. GPS Tracking & Live-Update in DB
  useEffect(() => {
    if (!rideId || rideEndedRef.current) return;

    const watcher = navigator.geolocation.watchPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCurrentPos({ lat, lng });

        // Position in DB speichern (für Mitfahrer sichtbar machen)
        await supabase
          .from('rides')
          .update({ current_lat: lat, current_lon: lng })
          .eq('id', rideId);

        // Geofencing Check
        const distance = getDistanceInMeters(lat, lng, MOSQUE_LOCATION.lat, MOSQUE_LOCATION.lng);
        if (distance < 150) {
           handleEndRide(true);
        }
      },
      (err) => {
        // Timeout ist normal bei kurzem GPS-Verlust – kein Fehler loggen
        if (err.code !== err.TIMEOUT) console.error('GPS Fehler:', err);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );

    return () => navigator.geolocation.clearWatch(watcher);
  }, [rideId]);

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
      <div className="h-[55vh] w-full relative">
        <APIProvider apiKey={MAP_API_KEY}>
          <Map defaultCenter={MOSQUE_LOCATION} defaultZoom={14} disableDefaultUI={true} mapId="DEMO_MAP_ID">
            <Directions userLocation={startPoint} />
            <AdvancedMarker position={MOSQUE_LOCATION} title="Moschee"><div className="text-3xl">🕌</div></AdvancedMarker>

            {startPoint && (
              <AdvancedMarker position={startPoint} title="Start">
                 <Pin background={'#666'} glyphColor={'#fff'} borderColor={'#888'} scale={0.8} />
              </AdvancedMarker>
            )}

            {currentPos && (
              <AdvancedMarker position={currentPos} title="Ich">
                 <div className="w-4 h-4 rounded-full border-2 shadow-lg animate-pulse" style={{ background: 'var(--app-blue)', borderColor: 'white' }}></div>
              </AdvancedMarker>
            )}

            {passengers.map((p) => (
              p.pickup_lat && p.pickup_lon && (
                <AdvancedMarker
                  key={p.id}
                  position={{ lat: p.pickup_lat, lng: p.pickup_lon }}
                  title={p.passenger_name}
                >
                  <div className="p-1.5 rounded-full border-2 shadow-md" style={{ background: 'var(--app-blue)', borderColor: 'white' }}>
                    <User size={16} color="white" />
                  </div>
                </AdvancedMarker>
              )
            ))}
          </Map>
        </APIProvider>
      </div>

      {/* INFO UNTEN */}
      <div className="flex-1 p-6 -mt-6 rounded-t-3xl z-10 shadow-up overflow-y-auto pb-10" style={{ background: 'var(--app-surface2)' }}>
        <div className="w-12 h-1 rounded-full mx-auto mb-6" style={{ background: 'var(--app-border)' }}></div>

        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--app-text)' }}>Aktive Fahrt</h1>
          <span className="text-xs font-bold px-2 py-1 rounded-full animate-pulse" style={{ background: 'var(--app-emerald-dim)', color: 'var(--app-emerald)' }}>
            GPS AKTIV
          </span>
        </div>

        <h3 className="text-sm font-bold uppercase mb-3" style={{ color: 'var(--app-text2)' }}>Abholungen ({passengers.length})</h3>

        {passengers.length === 0 ? (
          <p className="text-sm mb-6 p-4 rounded-xl text-center border border-dashed" style={{ color: 'var(--app-text3)', background: 'var(--app-card)', borderColor: 'var(--app-border)' }}>
            Noch keine Mitfahrer gebucht.
          </p>
        ) : (
          <div className="space-y-3 mb-8">
            {passengers.map((p) => (
              <div key={p.id} className="flex justify-between items-center p-3 rounded-xl animate-in slide-in-from-right duration-300" style={{ background: 'var(--app-card)', border: '1px solid var(--app-border)' }}>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full shadow-sm" style={{ background: 'var(--app-surface2)', border: '1px solid var(--app-border)' }}>
                    <MapPin size={18} style={{ color: 'var(--app-blue)' }}/>
                  </div>
                  <div>
                    <p className="font-bold" style={{ color: 'var(--app-text)' }}>{p.passenger_name}</p>
                    <p className="text-xs" style={{ color: 'var(--app-text2)' }}>
                       {p.seats_booked > 1 ? `${p.seats_booked} Personen` : '1 Person'} warten
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <a href={getWhatsAppLink(p.passenger_phone, p.passenger_name)} target="_blank" rel="noopener noreferrer">
                    <Button size="icon" className="bg-green-500 hover:bg-green-600 rounded-full h-10 w-10 shadow-sm text-white">
                      <MessageCircle size={18} />
                    </Button>
                  </a>
                  <a href={`tel:${p.passenger_phone}`}>
                    <Button size="icon" variant="outline" className="rounded-full h-10 w-10"
                      style={{ color: 'var(--app-emerald)', borderColor: 'var(--app-emerald)', background: 'var(--app-emerald-dim)' }}>
                      <Phone size={18} />
                    </Button>
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3">
          <Button
            variant="outline"
            className="w-full h-12 text-lg rounded-xl"
            style={{ borderColor: 'var(--app-blue)', color: 'var(--app-blue)', background: 'var(--app-blue-dim)' }}
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
            className="w-full h-12 text-lg rounded-xl"
            style={{ background: 'var(--app-text)', color: 'var(--app-bg)' }}
            onClick={() => handleEndRide(false)}
            disabled={loadingEnd || undoVisible}
          >
            {loadingEnd ? <Loader2 className="animate-spin mr-2"/> : <CheckSquare className="mr-2" size={20} />}
            Fahrt beenden
          </Button>

          <Button
            variant="ghost"
            className="w-full"
            style={{ color: 'var(--app-rose)' }}
            onClick={() => setConfirmType('cancel')}
            disabled={loadingEnd || undoVisible}
          >
            <XCircle className="mr-2" size={18} /> Fahrt absagen
          </Button>
        </div>

      </div>

      {/* CONFIRM DIALOG (Bottom Sheet) */}
      {confirmType && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end" onClick={() => setConfirmType(null)}>
          <div className="w-full rounded-t-3xl p-6 space-y-3" style={{ background: 'var(--app-surface2)' }} onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-1 rounded-full mx-auto mb-2" style={{ background: 'var(--app-border)' }}></div>
            <h3 className="text-lg font-bold text-center" style={{ color: 'var(--app-text)' }}>
              {confirmType === 'end' ? 'Fahrt beenden?' : 'Fahrt absagen?'}
            </h3>
            <p className="text-sm text-center pb-2" style={{ color: 'var(--app-text2)' }}>
              {confirmType === 'end'
                ? 'Die Fahrt wird als abgeschlossen markiert.'
                : 'Die Fahrt und alle Buchungen werden gelöscht.'}
            </p>
            <Button
              className={`w-full h-12 rounded-xl ${confirmType === 'cancel' ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-900 hover:bg-slate-800'}`}
              onClick={() => {
                if (confirmType === 'end') {
                  setConfirmType(null);
                  startUndoCountdown();
                } else {
                  executeCancelRide();
                }
              }}
            >
              {confirmType === 'end' ? 'Ja, beenden' : 'Ja, absagen'}
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => setConfirmType(null)}>
              Abbrechen
            </Button>
          </div>
        </div>
      )}

      {/* UNDO TOAST */}
      {undoVisible && (
        <div className="fixed bottom-8 left-4 right-4 rounded-2xl p-4 z-50 flex items-center justify-between shadow-2xl" style={{ background: 'var(--app-surface2)', border: '1px solid var(--app-border)' }}>
          <div>
            <p className="text-sm font-bold" style={{ color: 'var(--app-text)' }}>Fahrt wird beendet...</p>
            <p className="text-xs" style={{ color: 'var(--app-text3)' }}>Rückgängig möglich ({undoCountdown}s)</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 gap-1"
            style={{ borderColor: 'var(--app-border)', color: 'var(--app-text2)' }}
            onClick={handleUndo}
          >
            <RotateCcw size={14} /> Rückgängig
          </Button>
        </div>
      )}
    </div>
  );
}
