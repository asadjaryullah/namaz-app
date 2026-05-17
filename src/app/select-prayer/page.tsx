'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeft, Loader2, Settings, CheckCircle2, UserRound, X } from "lucide-react";
import { Sunrise, Sun, Sunset, Moon, CloudMoon, Clock } from "lucide-react";
import { toast } from "sonner";

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "";

const getIcon = (id: string) => {
  switch(id) {
    case 'fajr': return Sunrise;
    case 'dhuhr': return Sun;
    case 'asr': return CloudMoon;
    case 'maghrib': return Sunset;
    case 'isha': return Moon;
    default: return Clock;
  }
};

function CarSeatSelector({ availableSeats, onChange, gender }: { availableSeats: number, onChange: (n: number) => void, gender: string }) {
  const [seats, setSeats] = useState([true, true, true, true]);

  const toggleSeat = (index: number) => {
    const newSeats = [...seats];
    newSeats[index] = !newSeats[index];
    setSeats(newSeats);
    onChange(newSeats.filter(s => s).length);
  };

  const driverImage = gender === 'female' ? '/driver-icon-female.png' : '/driver-icon.png';

  const SeatBtn = ({ index }: { index: number }) => {
    const free = seats[index];
    return (
      <button
        onClick={() => toggleSeat(index)}
        className="flex flex-col items-center justify-center rounded-2xl border-2 gap-1 select-none transition-opacity active:opacity-60"
        style={{
          width: 64, height: 72,
          touchAction: 'manipulation',
          WebkitTapHighlightColor: 'transparent',
          background: free ? 'rgba(34,211,138,0.12)' : 'rgba(240,98,146,0.09)',
          borderColor: free ? 'var(--app-emerald)' : 'rgba(240,98,146,0.4)',
        }}
      >
        {free
          ? <UserRound size={22} strokeWidth={1.8} style={{ color: 'var(--app-emerald)' }} />
          : <X size={20} strokeWidth={2.5} style={{ color: 'var(--app-rose)' }} />
        }
        <span className="text-[9px] font-bold uppercase" style={{ color: free ? 'var(--app-emerald)' : 'var(--app-rose)' }}>
          {free ? 'Frei' : 'Belegt'}
        </span>
      </button>
    );
  };

  return (
    <div className="flex flex-col items-center mt-4 mb-6 animate-in fade-in zoom-in duration-300">

      {/* Counter */}
      <div className="flex items-baseline gap-1.5 mb-4">
        <span className="text-3xl font-black" style={{ color: 'var(--app-emerald)' }}>{availableSeats}</span>
        <span className="text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--app-text2)' }}>
          {availableSeats === 1 ? 'freier Platz' : 'freie Plätze'}
        </span>
      </div>

      {/* Sitzplan-Karte */}
      <div className="rounded-3xl p-4 shadow-lg" style={{ background: 'var(--app-surface1)', border: '2px solid var(--app-border)' }}>

        {/* Vorderreihe */}
        <p className="text-[9px] font-black uppercase tracking-widest mb-2 text-center" style={{ color: 'var(--app-text3)' }}>Vorne</p>
        <div className="flex gap-3 justify-center mb-4">
          {/* Fahrersitz */}
          <div className="flex flex-col items-center gap-1">
            <div className="rounded-2xl border-2 flex items-center justify-center relative overflow-hidden"
              style={{ width: 64, height: 72, background: gender === 'female' ? 'rgba(240,98,146,0.12)' : 'var(--app-surface2)', borderColor: gender === 'female' ? 'var(--app-rose)' : 'var(--app-border)' }}>
              <Image src={driverImage} alt="Fahrer" fill className="object-contain p-2" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'var(--app-text3)' }}>Du</span>
          </div>
          {/* Beifahrer */}
          <div className="flex flex-col items-center gap-1">
            <SeatBtn index={0} />
            <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'var(--app-text3)' }}>Vorne</span>
          </div>
        </div>

        {/* Trennlinie */}
        <div className="h-px mb-4 mx-2 opacity-30" style={{ background: 'var(--app-border)' }} />

        {/* Hintenreihe */}
        <p className="text-[9px] font-black uppercase tracking-widest mb-2 text-center" style={{ color: 'var(--app-text3)' }}>Hinten</p>
        <div className="flex gap-3 justify-center">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex flex-col items-center gap-1">
              <SeatBtn index={i} />
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs mt-3 text-center" style={{ color: 'var(--app-text3)' }}>Tippe auf einen Sitz um ihn zu blockieren</p>
    </div>
  );
}

function SelectPrayerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = searchParams.get('role') || 'passenger'; 

  const [prayers, setPrayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [seats, setSeats] = useState(4);
  const [creatingRide, setCreatingRide] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [bookedPrayerIds, setBookedPrayerIds] = useState<string[]>([]);
  const [userGender, setUserGender] = useState('male'); 

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const today = new Date().toLocaleDateString('en-CA');

      const { data: prayersData } = await supabase.from('prayer_times').select('*').order('sort_order', { ascending: true });
      if (prayersData) setPrayers(prayersData);

      if (user) {
        if (user.email?.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase().trim()) setIsAdmin(true);

        const { data: profile } = await supabase.from('profiles').select('gender, is_approved').eq('id', user.id).single();
        if (profile) {
            setUserGender(profile.gender || 'male');
            // Check Freigabe
            if (role === 'driver' && profile.is_approved === false) {
                 toast.error("Dein Konto ist noch nicht freigeschaltet.");
                 router.push('/');
                 return;
            }
        }

        const { data: myDrives } = await supabase.from('rides').select('prayer_id').eq('driver_id', user.id).eq('ride_date', today).eq('status', 'active');
        const { data: myRides } = await supabase.from('bookings').select('ride_id, rides!inner(prayer_id, ride_date, status)').eq('passenger_id', user.id).eq('status', 'accepted').eq('rides.ride_date', today).eq('rides.status', 'active');

        const driveIds = myDrives?.map(d => d.prayer_id) || [];
        // @ts-ignore
        const rideIds = myRides?.map((r: any) => r.rides.prayer_id) || [];
        setBookedPrayerIds([...driveIds, ...rideIds]);
      }
      setLoading(false);
    };
    init();
  }, []);

  const handleNext = async () => {
    const selectedPrayer = prayers.find(p => p.id === selectedId);
    if (!selectedPrayer) return;

    if (role === 'driver') {
      setCreatingRide(true);
      if (!navigator.geolocation) { toast.error("GPS nicht verfügbar."); setCreatingRide(false); return; }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;
          const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
          const today = new Date().toLocaleDateString('en-CA');

          const { error } = await supabase.from('rides').insert({
            driver_id: user.id,
            driver_name: profile?.full_name || "Unbekannt",
            driver_phone: profile?.phone || "",
            driver_gender: profile?.gender || "male",
            prayer_id: selectedPrayer.id,
            prayer_time: selectedPrayer.time,
            seats: seats,
            start_lat: lat,
            start_lon: lon,
            ride_date: today,
            status: 'active',
          });

          setCreatingRide(false);
          if (error) {
            toast.error("Fehler: " + error.message);
          } else {
            supabase.auth.getSession().then(({ data: { session } }) => {
              if (session?.access_token) {
                fetch('/api/notify-new-ride', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
                  body: JSON.stringify({ prayer_id: selectedPrayer.id, driver_name: profile?.full_name, seats }),
                }).catch(() => {});
              }
            });
            router.push('/driver/dashboard');
          }
        },
        () => { setCreatingRide(false); toast.error("GPS-Zugriff wird benötigt."); }
      );
    } else {
      router.push(`/passenger/list?prayer=${selectedPrayer.id}&time=${selectedPrayer.time}`);
    }
  };

  return (
    <div className="w-full max-w-md flex flex-col items-center">
      <div className="w-full flex items-center justify-between mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.push('/')}><ChevronLeft className="h-6 w-6" /></Button>
        <div className="text-center">
          <h1 className="text-xl font-bold" style={{ color: 'var(--app-text)' }}>Wann ist das Gebet?</h1>
          {isAdmin && <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded font-bold">ADMIN VIEW</span>}
          {!isAdmin && <p className="text-xs uppercase font-bold mt-1" style={{ color: 'var(--app-text2)' }}>{role === 'driver' ? 'Fahrt anbieten' : 'Fahrt suchen'}</p>}
        </div>
        <div className="w-9"></div>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-slate-400"/></div>
      ) : (
        <div className="w-full space-y-3 mb-24">
          {prayers.map((prayer) => {
            const Icon = getIcon(prayer.id);
            const isSelected = selectedId === prayer.id;
            const isAlreadyBooked = bookedPrayerIds.includes(prayer.id);
            // Admin darf immer alles, andere User sind gesperrt wenn gebucht
            const isDisabled = isAlreadyBooked && !isAdmin;

            return (
              <Card
                key={prayer.id}
                onClick={() => !isDisabled && setSelectedId(prayer.id)}
                className={`p-3 flex items-center gap-3 transition-all border-2 ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                style={{
                  borderColor: isSelected ? 'var(--app-text)' : 'transparent',
                  background: isSelected ? 'var(--app-surface2)' : 'var(--app-card)',
                  outline: isSelected ? '1px solid var(--app-text)' : 'none',
                }}
              >
                <div className="p-2 rounded-full" style={{ background: isSelected ? 'var(--app-text)' : 'var(--app-surface2)', color: isSelected ? 'var(--app-bg)' : 'var(--app-text2)' }}>
                  <Icon size={20} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold" style={{ color: 'var(--app-text)' }}>{prayer.name}</h3>
                  {isDisabled && <span className="text-[10px] font-bold flex items-center gap-1" style={{ color: 'var(--app-emerald)' }}><CheckCircle2 size={10}/> BEREITS AKTIV</span>}
                </div>
                <div className="text-xl font-mono font-bold" style={{ color: 'var(--app-text2)' }}>{prayer.time}</div>
              </Card>
            );
          })}
          
          {role === 'driver' && selectedId && (
            <CarSeatSelector availableSeats={seats} onChange={setSeats} gender={userGender} />
          )}
          
          {/* Admin Button nur als Link, nicht zum Speichern hier */}
          {isAdmin && (
            <Button variant="outline" className="w-full mt-4" onClick={() => router.push('/admin')}>
              <Settings className="mr-2 h-4 w-4"/> Zeiten verwalten (Admin)
            </Button>
          )}
        </div>
      )}

      {!loading && (
          <div className="fixed bottom-0 left-0 right-0 p-6 flex justify-center z-10" style={{ background: 'var(--app-surface2)', borderTop: '1px solid var(--app-border)', paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
            <Button className="w-full max-w-md h-12 text-lg rounded-xl shadow-lg" style={{ background: 'var(--app-text)', color: 'var(--app-bg)' }} disabled={!selectedId || creatingRide} onClick={handleNext}>
              {creatingRide ? <><Loader2 className="animate-spin mr-2"/> Starten...</> : role === 'driver' ? `Fahrt mit ${seats} Plätzen starten ➜` : 'Fahrer suchen ➜'}
            </Button>
          </div>
      )}
    </div>
  );
}

export default function SelectPrayerPage() {
  return (
    <main className="min-h-screen flex flex-col pb-24" style={{ background: 'var(--app-bg)' }}>
      <div className="p-6 flex flex-col items-center">
        <Suspense fallback={<div className="py-20 flex justify-center"><Loader2 className="animate-spin h-8 w-8" style={{ color: 'var(--app-text3)' }} /></div>}>
          <SelectPrayerContent />
        </Suspense>
      </div>
    </main>
  );
}