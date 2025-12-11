'use client';

import { useEffect, useState } from 'react';
import OneSignal from 'react-onesignal';
import { Button } from "@/components/ui/button";
import { Bell, Check, Ban, Loader2 } from "lucide-react";

export default function NotificationSettings() {
  const [permission, setPermission] = useState<string>('loading');

  useEffect(() => {
    // Sicherstellen, dass wir im Browser sind
    if (typeof window === 'undefined') return;

    // Status prüfen
    const checkStatus = async () => {
      // Kleiner Timeout, damit OneSignal Zeit hat zu laden
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if ('Notification' in window) {
        if (Notification.permission === 'granted') {
          setPermission('granted');
        } else if (Notification.permission === 'denied') {
          setPermission('denied');
        } else {
          setPermission('default');
        }
      } else {
        setPermission('unsupported');
      }
    };
    
    checkStatus();
  }, []);

  const enable = async () => {
    try {
      // Das hier verbindet den User mit OneSignal!
      await OneSignal.Slidedown.promptPush();
      
      // Kurz warten und Status neu prüfen
      setTimeout(() => {
        if (Notification.permission === 'granted') setPermission('granted');
      }, 1000);
    } catch (e) {
      console.error("OneSignal Fehler:", e);
      // Fallback
      Notification.requestPermission().then(res => {
        if(res === 'granted') setPermission('granted');
      });
    }
  };

  if (permission === 'loading') return <Loader2 className="h-5 w-5 animate-spin text-slate-400" />;
  
  if (permission === 'unsupported') return <p className="text-xs text-red-400">Nicht unterstützt.</p>;

  if (permission === 'granted') {
    return (
      <div className="flex items-center gap-2 text-green-700 bg-green-50 p-3 rounded-lg border border-green-200 w-full">
        <Check size={18} />
        <span className="text-sm font-medium">Automatische Erinnerungen aktiv ✅</span>
      </div>
    );
  }

  if (permission === 'denied') {
    return (
      <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg border border-red-200 w-full">
        <Ban size={18} />
        <span className="text-sm">Blockiert. Bitte in Einstellungen erlauben.</span>
      </div>
    );
  }

  return (
    <Button 
      variant="outline" 
      onClick={enable}
      className="w-full justify-start gap-2 border-slate-300 text-slate-700"
    >
      <Bell size={18} />
      Erinnerungen einschalten
    </Button>
  );
}