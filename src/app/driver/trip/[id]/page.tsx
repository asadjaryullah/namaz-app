'use client';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../../../lib/supabase';
import Map from '../../../components/Map';
import { DESTINATION_ADDRESS } from '../../../../config';

export default function DriverTrip() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [ride, setRide] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return router.replace('/login');
      const { data: rideData } = await supabase.from('rides').select('*').eq('id', id).single();
      setRide(rideData);
    })();
  }, [id, router]);

  const target = DESTINATION_ADDRESS; // ✅ fest

  const appleMapsUrl = useMemo(() => {
    return `http://maps.apple.com/?q=${encodeURIComponent(target)}`;
  }, [target]);

  const googleMapsUrl = useMemo(() => {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(target)}`;
  }, [target]);

  if (!ride) return <main><p>Lade Fahrt …</p></main>;

  return (
    <main>
      <h1>Fahrt erstellt ✅</h1>
      <div className="card" style={{ marginBottom: 16 }}>
        <p><b>Moschee:</b> {target}</p>
        <p><b>Gebet:</b> {ride.prayer?.toUpperCase()}</p>
        <p><b>Plätze frei:</b> {ride.seats_available} / {ride.seats_total}</p>
        <p>Status: {ride.status}</p>
      </div>

      <Map destinationQuery={target} />

      <div style={{ display:'flex', gap:10, marginTop:16, flexWrap:'wrap' }}>
        <a href={appleMapsUrl} target="_blank" rel="noreferrer">
          <button>In Apple Maps öffnen</button>
        </a>
        <a href={googleMapsUrl} target="_blank" rel="noreferrer">
          <button>In Google Maps öffnen</button>
        </a>
      </div>
    </main>
  );
}