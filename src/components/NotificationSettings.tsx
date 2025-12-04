'use client';

import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Bell, Check, Ban, Loader2 } from "lucide-react";

export default function NotificationSettings() {
  const [permission, setPermission] = useState<NotificationPermission | 'loading'>('loading');
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    if (!('Notification' in window)) {
      setIsSupported(false);
      setPermission('denied');
      return;
    }
    setPermission(Notification.permission);
  }, []);

  const requestPermission = async () => {
    const res = await Notification.requestPermission();
    setPermission(res);
    if (res === 'granted') {
      new Notification("Namaz Taxi", { body: "Test: Benachrichtigungen funktionieren! 🔔" });
    }
  };

  if (!isSupported) {
    return <p className="text-xs text-red-400">Auf diesem Gerät nicht verfügbar.</p>;
  }

  if (permission === 'loading') {
    return <Loader2 className="h-5 w-5 animate-spin text-slate-400" />;
  }

  if (permission === 'granted') {
    return (
      <div className="flex items-center gap-2 text-green-700 bg-green-50 p-3 rounded-lg border border-green-200 w-full">
        <Check size={18} />
        <span className="text-sm font-medium">Aktiviert</span>
      </div>
    );
  }

  if (permission === 'denied') {
    return (
      <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg border border-red-200 w-full">
        <Ban size={18} />
        <span className="text-sm">Blockiert (bitte in iPhone-Einstellungen ändern)</span>
      </div>
    );
  }

  // Status: default (noch nicht gefragt)
  return (
    <Button 
      variant="outline" 
      onClick={requestPermission}
      className="w-full justify-start gap-2 border-slate-300 text-slate-700"
    >
      <Bell size={18} />
      Jetzt aktivieren
    </Button>
  );
}