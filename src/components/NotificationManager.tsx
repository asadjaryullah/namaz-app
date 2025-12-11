'use client';

import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { BellRing, X } from "lucide-react";
import OneSignal from 'react-onesignal';

export default function NotificationManager() {
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    // Prüfen, ob wir im Browser sind und ob der Nutzer schon gefragt wurde
    if (typeof window !== 'undefined' && 'Notification' in window) {
      // Nur anzeigen, wenn die Entscheidung noch "default" (offen) ist
      if (Notification.permission === 'default') {
        // Warte 5 Sekunden, bevor du fragst (nicht sofort nerven)
        const timer = setTimeout(() => setShowPopup(true), 5000);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  const enableNotifications = async () => {
    // Wir nutzen jetzt die OneSignal-Funktion zum Fragen
    try {
      await OneSignal.Slidedown.promptPush();
    } catch (e) {
      console.error("OneSignal Prompt Fehler:", e);
      // Fallback: Native Browser Anfrage
      Notification.requestPermission();
    }
    setShowPopup(false);
  };

  if (!showPopup) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[100] animate-in slide-in-from-bottom-5 fade-in duration-500">
      <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-slate-700 flex flex-col gap-3">
        
        <div className="flex justify-between items-start">
          <div className="flex gap-3">
            <div className="bg-blue-600 p-2 rounded-full h-10 w-10 flex items-center justify-center">
              <BellRing size={20} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Kein Gebet verpassen</h3>
              <p className="text-slate-300 text-sm leading-tight mt-1">
                Aktiviere Benachrichtigungen, damit Ride 2 Salah dich rechtzeitig erinnern kann.
              </p>
            </div>
          </div>
          <button onClick={() => setShowPopup(false)} className="text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="flex gap-2 mt-1">
          <Button 
            className="flex-1 bg-white text-slate-900 hover:bg-slate-200"
            onClick={enableNotifications}
          >
            Aktivieren
          </Button>
          <Button 
            variant="ghost" 
            className="flex-1 text-slate-400 hover:text-white hover:bg-slate-800"
            onClick={() => setShowPopup(false)}
          >
            Später
          </Button>
        </div>

      </div>
    </div>
  );
}