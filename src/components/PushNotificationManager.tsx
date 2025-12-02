'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Bell, BellOff, Loader2 } from "lucide-react";

// Hilfsfunktion: Konvertiert den Key für den Browser
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function PushNotificationManager() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Prüfen, ob wir schon angemeldet sind
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        registration.pushManager.getSubscription().then(sub => {
          setIsSubscribed(!!sub);
          setLoading(false);
        });
      });
    } else {
      setLoading(false);
    }
  }, []);

  const subscribeToPush = async () => {
    setLoading(true);
    try {
      if (!('serviceWorker' in navigator)) {
        alert("Dein Browser unterstützt keine Push-Nachrichten.");
        return;
      }

      const registration = await navigator.serviceWorker.register('/sw.js');
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!)
      });

      // Abo in Supabase speichern
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const p256dh = sub.getKey('p256dh');
        const auth = sub.getKey('auth');
        
        if (p256dh && auth) {
          await supabase.from('push_subscriptions').insert({
            user_id: user.id,
            endpoint: sub.endpoint,
            p256dh: btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(p256dh)))),
            auth: btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(auth))))
          });
          setIsSubscribed(true);
          alert("Benachrichtigungen aktiviert! 🔔");
        }
      }
    } catch (error: any) {
      console.error(error);
      alert("Fehler: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loader2 className="animate-spin h-4 w-4 text-slate-400" />;

  if (isSubscribed) {
    return (
      <Button variant="outline" disabled className="w-full border-green-200 text-green-700 bg-green-50">
        <Bell className="mr-2 h-4 w-4" /> Benachrichtigungen aktiv
      </Button>
    );
  }

  return (
    <Button onClick={subscribeToPush} variant="outline" className="w-full border-slate-300 text-slate-700">
      <BellOff className="mr-2 h-4 w-4" /> Benachrichtigungen aktivieren
    </Button>
  );
}