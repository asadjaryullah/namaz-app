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

  const SeatBtn = ({ index, w = 60, h = 68 }: { index: number; w?: number; h?: number }) => {
    const free = seats[index];
    return (
      <button
        onClick={() => toggleSeat(index)}
        className="flex flex-col items-center justify-center gap-1 select-none active:scale-[0.92] transition-transform"
        style={{
          width: w, height: h, borderRadius: 14,
          border: '2px solid',
          touchAction: 'manipulation',
          WebkitTapHighlightColor: 'transparent',
          background: free ? 'rgba(34,211,138,0.12)' : 'rgba(240,98,146,0.09)',
          borderColor: free ? 'var(--app-emerald)' : 'rgba(240,98,146,0.4)',
        }}
      >
        {free
          ? <UserRound size={w > 56 ? 22 : 18} strokeWidth={1.8} style={{ color: 'var(--app-emerald)' }} />
          : <X size={w > 56 ? 20 : 16} strokeWidth={2.5} style={{ color: 'var(--app-rose)' }} />
        }
        <span className="text-[8px] font-bold uppercase" style={{ color: free ? 'var(--app-emerald)' : 'var(--app-rose)' }}>
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

      {/* Auto-Karosserie — sehr rund, Pill-Form */}
      <div style={{
        width: 234,
        background: 'var(--app-surface1)',
        border: '3px solid var(--app-border)',
        borderRadius: 54,
        padding: '14px 16px',
        boxShadow: '0 8px 28px rgba(0,0,0,0.10)',
      }}>
        {/* Windschutzscheibe */}
        <div style={{
          height: 30, borderRadius: '32px 32px 6px 6px',
          margin: '0 8px 14px',
          opacity: 0.55,
          background: 'var(--app-blue-dim)',
          border: '1.5px solid var(--app-border)',
        }} />

        {/* Vordere Reihe */}
        <div className="flex justify-between items-center" style={{ marginBottom: 10, padding: '0 4px' }}>
          <div className="flex flex-col items-center gap-1">
            <div style={{
              width: 60, height: 68, borderRadius: 14,
              border: '2px solid',
              borderColor: gender === 'female' ? 'var(--app-rose)' : 'var(--app-border)',
              background: gender === 'female' ? 'rgba(240,98,146,0.12)' : 'var(--app-surface2)',
              position: 'relative', overflow: 'hidden',
            }}>
              <Image src={driverImage} alt="Fahrer" fill className="object-contain p-2"
                onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'var(--app-text3)' }}>Du</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <SeatBtn index={0} />
          </div>
        </div>

        {/* Mittelkonsole */}
        <div style={{ height: 4, borderRadius: 99, margin: '0 22px 10px', background: 'var(--app-border)', opacity: 0.3 }} />

        {/* Hintere Reihe — 3 Sitze */}
        <div className="flex justify-between items-center" style={{ padding: '0 2px', marginBottom: 12 }}>
          <SeatBtn index={1} w={54} h={62} />
          <SeatBtn index={2} w={54} h={62} />
          <SeatBtn index={3} w={54} h={62} />
        </div>

        {/* Heckscheibe */}
        <div style={{
          height: 24, borderRadius: '6px 6px 32px 32px',
          margin: '2px 8px 0',
          opacity: 0.4,
          background: 'var(--app-blue-dim)',
          border: '1.5px solid var(--app-border)',
        }} />
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
  const [shareSheet, setShareSheet] = useState<{ prayerName: string; seats: number } | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const today = new Date().toLocaleDateString('en-CA');

      const { data: prayersData } = await supabase.from('prayer_times').select('*').order('sort_order', { ascending: true });
      if (prayersData) setPrayers(prayersData);

      if (user) {
        if (user.email?.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase().trim()) setIsAdmin(true);

        const { data: profile } = await supabase.from('profiles').select('gender, is_approved, can_edit_events, can_edit_times').eq('id', user.id).single();
        if (profile) {
            setUserGender(profile.gender || 'male');
            if (profile.can_edit_events || profile.can_edit_times) setIsAdmin(true);
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
                  body: JSON.stringify({ prayer_id: selectedPrayer.id, driver_name: profile?.full_name, seats, driver_gender: profile?.gender || 'male' }),
                }).catch(() => {});
              }
            });
            setShareSheet({ prayerName: selectedPrayer.name, seats });
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
                className={`p-3 flex items-center gap-3 border-2 ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-[0.98] transition-transform'}`}
                style={{ transition: isDisabled ? undefined : 'background-color 0.15s ease-out, border-color 0.15s ease-out, transform 0.12s ease-out' }}
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

      {/* ── WhatsApp Share Sheet ── */}
      {shareSheet && (
        <div className="fixed inset-0 z-[60] flex items-end animate-in fade-in duration-150" style={{ background: 'rgba(0,0,0,0.55)' }}>
          <div
            className="w-full rounded-t-3xl animate-in slide-in-from-bottom-4 duration-300 ease-out"
            style={{ background: 'var(--app-surface2)', border: '1px solid var(--app-border)', paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
          >
            <div className="flex justify-center pt-4 pb-2">
              <div className="w-10 h-1 rounded-full" style={{ background: 'var(--app-border)' }} />
            </div>
            <div className="px-6 pb-2 flex flex-col items-center gap-4">
              <CheckCircle2 size={44} style={{ color: 'var(--app-emerald)' }} />
              <div className="text-center">
                <h3 className="text-lg font-extrabold" style={{ color: 'var(--app-text)' }}>Fahrt erstellt! 🎉</h3>
                <p className="text-sm mt-1" style={{ color: 'var(--app-text2)' }}>
                  {shareSheet.seats} {shareSheet.seats === 1 ? 'freier Platz' : 'freie Plätze'} zum {shareSheet.prayerName}
                </p>
              </div>
              <button
                onClick={() => {
                  const msg = `🚗 Ich fahre gleich zum ${shareSheet.prayerName}!\n\nNoch ${shareSheet.seats} freie ${shareSheet.seats === 1 ? 'Platz' : 'Plätze'}. Jetzt mitbuchen: https://ride2salah.vercel.app`;
                  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                }}
                className="w-full rounded-2xl py-3.5 text-[15px] font-extrabold flex items-center justify-center gap-2.5 active:scale-[0.97] transition-transform"
                style={{ background: '#25D366', color: '#fff', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                In WhatsApp Gruppe teilen
              </button>
              <button
                onClick={() => { setShareSheet(null); router.push('/driver/dashboard'); }}
                className="w-full rounded-xl py-3 text-sm font-semibold active:scale-[0.98] transition-transform"
                style={{ background: 'var(--app-surface1)', border: '1px solid var(--app-border)', color: 'var(--app-text3)', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
              >
                Überspringen →
              </button>
            </div>
          </div>
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