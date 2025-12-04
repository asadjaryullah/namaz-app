'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { BellRing, X } from "lucide-react";

export default function NotificationManager() {
  const [showPopup, setShowPopup] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    // 1. Initialer Check beim Laden
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
      
      // Wenn noch nicht gefragt wurde -> Popup zeigen nach 3 Sekunden
      if (Notification.permission === 'default') {
        const timer = setTimeout(() => setShowPopup(true), 3000);
        return () => clearTimeout(timer);
      }
    }

    // 2. Hintergrund-Logik starten (Check alle 60 Sekunden)
    const interval = setInterval(checkPrayerTimes, 60000);
    return () => clearInterval(interval);
  }, []);

  // --- LOGIK FÜR DIE ERINNERUNG ---
  const checkPrayerTimes = async () => {
    if (Notification.permission !== 'granted') return;

    const { data: prayers } = await supabase.from('prayer_times').select('*');
    if (!prayers) return;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const todayStr = now.toISOString().split('T')[0];

    prayers.forEach(p => {
      if (!p.time) return;
      const [h, m] = p.time.split(':').map(Number);
      const prayerMinutes = h * 60 + m;
      
      const diff = prayerMinutes - currentMinutes;

      // WENN NOCH 25 MINUTEN SIND
      if (diff >= 24 && diff <= 26) {
        const storageKey = `notified-${p.id}-${todayStr}`;
        if (!localStorage.getItem(storageKey)) {
          new Notification(`Bald ist ${p.name}! 🕌`, {
            body: `In 25 Minuten ist Gebet (${p.time} Uhr). Buche jetzt deine Fahrt!`,
            icon: '/icon.png',
            tag: 'namaz-reminder'
          });
          localStorage.setItem(storageKey, 'true');
        }
      }
    });
  };

  const enableNotifications = async () => {
    if (!('Notification' in window)) return;
    const res = await Notification.requestPermission();
    setPermission(res);
    setShowPopup(false);

    if (res === 'granted') {
      new Notification("Namaz Taxi", { body: "Benachrichtigungen aktiviert! ✅" });
      checkPrayerTimes(); 
    }
  };

  if (!showPopup || permission !== 'default') return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[100] animate-in slide-in-from-bottom-5 fade-in duration-500">
      <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-slate-700 flex flex-col gap-3">
        <div className="flex justify-between items-start">
          <div className="flex gap-3">
            <div className="bg-blue-600 p-2 rounded-full h-10 w-10 flex items-center justify-center">
              <BellRing size={20} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Namaz Erinnerung</h3>
              <p className="text-slate-300 text-sm leading-tight mt-1">
                Lass dich 25 Min vor dem Gebet benachrichtigen.
              </p>
            </div>
          </div>
          <button onClick={() => setShowPopup(false)} className="text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>
        <div className="flex gap-2 mt-1">
          <Button className="flex-1 bg-white text-slate-900 hover:bg-slate-200" onClick={enableNotifications}>
            Aktivieren
          </Button>
          <Button variant="ghost" className="flex-1 text-slate-400 hover:text-white hover:bg-slate-800" onClick={() => setShowPopup(false)}>
            Später
          </Button>
        </div>
      </div>
    </div>
  );
}