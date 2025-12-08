'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

const MOSQUE_LOCATION = { lat: 49.685590, lng: 8.593480 }; 

function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; 
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export default function MosqueDetector() {
  const router = useRouter();

  useEffect(() => {
    // Check alle 2 Minuten (um Batterie zu sparen)
    const interval = setInterval(checkLocation, 120000);
    // Erster Check nach 5 Sekunden
    setTimeout(checkLocation, 5000);

    return () => clearInterval(interval);
  }, []);

  const checkLocation = async () => {
    if (!('geolocation' in navigator)) return;

    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const distance = getDistanceInMeters(lat, lng, MOSQUE_LOCATION.lat, MOSQUE_LOCATION.lng);

      // 1. Bin ich in der Moschee? (Radius 150m)
      if (distance < 150) {
        await handleMosqueArrival();
      }
    }, (err) => {
      // GPS Fehler ignorieren wir stillschweigend im Hintergrund
    });
  };

  const handleMosqueArrival = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 2. Welches Gebet ist gerade?
    const { data: prayers } = await supabase.from('prayer_times').select('*');
    if (!prayers) return;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const today = new Date().toISOString().split('T')[0];

    // Wir suchen ein Gebet, das +/- 45 Minuten um JETZT liegt
    const activePrayer = prayers.find(p => {
      const [h, m] = p.time.split(':').map(Number);
      const prayerMin = h * 60 + m;
      return Math.abs(prayerMin - currentMinutes) <= 45;
    });

    if (activePrayer) {
      // 3. Haben wir das heute schon geloggt? (Egal ob Fahrt oder Visit)
      
      // Check Visits
      const { data: existingVisit } = await supabase
        .from('mosque_visits')
        .select('*')
        .eq('user_id', user.id)
        .eq('visit_date', today)
        .eq('prayer_name', activePrayer.name)
        .maybeSingle();

      // Check Fahrten (Falls er Fahrer war)
      const { data: existingRide } = await supabase
        .from('rides')
        .select('*')
        .eq('driver_id', user.id)
        .eq('ride_date', today)
        .eq('prayer_id', activePrayer.id)
        .maybeSingle();

      // Wenn noch NICHTS da ist -> Eintragen!
      if (!existingVisit && !existingRide) {
        
        // Eintragen
        await supabase.from('mosque_visits').insert({
          user_id: user.id,
          prayer_name: activePrayer.name,
          visit_date: today
        });

        // Benachrichtigen & Weiterleiten
        if (Notification.permission === 'granted') {
          new Notification("Willkommen in der Moschee!", { body: `${activePrayer.name} wurde in deine Statistik eingetragen.` });
        }
        
        // Zur Checkliste leiten
        router.push('/arrival');
      }
    }
  };

  return null; // Unsichtbar
}