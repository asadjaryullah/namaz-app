'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { BellRing, X } from "lucide-react";

export default function NotificationManager() {
  const [showPopup, setShowPopup] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
      if (Notification.permission === 'default') {
        const timer = setTimeout(() => setShowPopup(true), 3000);
        return () => clearTimeout(timer);
      }
    }

    // Check alle 60 Sekunden
    const interval = setInterval(checkPrayerTimes, 60000);
    return () => clearInterval(interval);
  }, []);

  const checkPrayerTimes = async () => {
    if (Notification.permission !== 'granted') return;

    // Zeit holen
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const todayStr = now.toISOString().split('T')[0];

    const { data: prayers } = await supabase.from('prayer_times').select('*');
    if (!prayers) return;

    prayers.forEach(p => {
      if (!p.time) return;
      
      // Zeit parsen "13:30:00" -> 13:30
      const [hStr, mStr] = p.time.split(':');
      const h = parseInt(hStr);
      const m = parseInt(mStr);
      
      const prayerMinutes = h * 60 + m;
      const diff = prayerMinutes - currentMinutes;

      // Debugging in der Konsole (F12)
      console.log(`Prüfe ${p.name}: Noch ${diff} Minuten.`);

      // WENN NOCH 25 MINUTEN SIND (Bereich 24-26 Min)
      if (diff >= 24 && diff <= 26) {
        
        // TRICK: Wir speichern auch die Zeit im Key. 
        // Wenn du die Zeit im Admin änderst, ist der Key neu -> Nachricht kommt nochmal!
        const storageKey = `notified-${p.id}-${todayStr}-${p.time}`;
        
        if (!localStorage.getItem(storageKey)) {
          
          // PUSH SENDEN!
          try {
            new Notification(`Namaz Taxi: ${p.name}`, {
              body: `In 25 Minuten ist Gebet (${h}:${m < 10 ? '0'+m : m} Uhr). Buche jetzt deine Fahrt! 🕌`,
              icon: '/icon.png',
              tag: 'namaz-reminder'
            });
          } catch (e) {
            console.error("Push Fehler:", e);
          }

          // Merken
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