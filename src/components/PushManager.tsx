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
 */
export default function PushManager() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    // Service Worker immer registrieren, damit Offline-Caching für alle greift
    navigator.serviceWorker.register('/sw.js').catch(() => {});

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.access_token) return;
      if (Notification.permission !== 'granted') return;
      registerAndSave(session.access_token).catch(console.error);
    });

    return () => subscription.unsubscribe();
  }, []);

  return null;
}
