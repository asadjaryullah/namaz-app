'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";

// Hilfsfunktion um den Key umzuwandeln
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

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // Service Worker registrieren
      navigator.serviceWorker.register('/sw.js');
    }
  }, []);

  const subscribeToPush = async () => {
    if (!('serviceWorker' in navigator)) return;

    const registration = await navigator.serviceWorker.ready;
    
    // User um Erlaubnis fragen (Browser Popup)
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
  };

  if (isSubscribed) return null; // Schon angemeldet

  return (
    <Button onClick={subscribeToPush} variant="outline" size="sm" className="w-full mt-4 border-blue-200 bg-blue-50 text-blue-700">
      <Bell className="mr-2 h-4 w-4" /> Benachrichtigungen aktivieren
    </Button>
  );
}