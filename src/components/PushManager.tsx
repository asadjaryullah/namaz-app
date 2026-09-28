'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

async function registerAndSave(token: string) {
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) {
    console.error('❌ NEXT_PUBLIC_VAPID_PUBLIC_KEY fehlt');
    return;
  }

  const reg = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey),
  });

  const res = await fetch('/api/push-subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(sub.toJSON()),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('❌ push-subscribe Fehler:', err);
  }
}

/**
 * Registriert den Service Worker und erneuert die Push-Anmeldung, sobald die
 * Erlaubnis bereits erteilt ist. Gefragt wird hier bewusst nicht — das macht
 * die Karte "Gebets-Erinnerungen aktivieren" auf der Startseite, damit die
 * Abfrage nur an einer Stelle passiert.
 *
 * Die Erneuerung läuft bei jedem App-Start aktiv (getSession), nicht nur
 * wenn Supabase zufällig ein Auth-Event feuert - sonst bleibt ein Nutzer,
 * dessen Subscription serverseitig geloescht wurde (z.B. nach 410 Gone bei
 * abgelaufenem iOS-Push-Abo), unbemerkt ohne Benachrichtigungen: die
 * Browser-Erlaubnis steht ja weiterhin auf "granted", also erscheint auch
 * die Aktivieren-Karte nicht mehr.
 */
export default function PushManager() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    // Service Worker immer registrieren, damit Offline-Caching für alle greift
    navigator.serviceWorker.register('/sw.js').catch(() => {});

    const tryRenew = (token?: string) => {
      if (!token) return;
      if (Notification.permission !== 'granted') return;
      registerAndSave(token).catch(console.error);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      tryRenew(session?.access_token);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      tryRenew(session?.access_token);
    });

    return () => subscription.unsubscribe();
  }, []);

  return null;
}
