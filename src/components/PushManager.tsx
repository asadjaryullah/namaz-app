'use client';

import { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
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
  } else {
    console.log('✅ Push Subscription gespeichert');
  }
}

export default function PushManager() {
  const [showBanner, setShowBanner] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    // Auf Auth-Session warten, dann erst subscriben
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.access_token) return;

      const perm = Notification.permission;

      if (perm === 'granted') {
        // Sofort still subscriben
        registerAndSave(session.access_token).catch(console.error);
      } else if (perm === 'default' && sessionStorage.getItem('push-dismissed') !== '1') {
        // Banner nach 3s zeigen
        setTimeout(() => setShowBanner(true), 3000);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const enable = async () => {
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setShowBanner(false);
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        console.error('❌ Kein Token – User nicht eingeloggt?');
        return;
      }

      await registerAndSave(token);
      setShowBanner(false);
    } catch (e) {
      console.error('Push Fehler:', e);
    } finally {
      setLoading(false);
    }
  };

  const dismiss = () => {
    sessionStorage.setItem('push-dismissed', '1');
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[100]"
      style={{ animation: 'slide-up 0.4s ease' }}>
      <div className="rounded-2xl p-4 flex flex-col gap-3"
        style={{
          background: 'var(--app-surface2)',
          border: '1px solid var(--app-gold)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3), 0 0 0 1px var(--app-gold-dim)',
        }}>

        <div className="flex justify-between items-start gap-3">
          <div className="flex gap-3 items-start">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'var(--app-gold-dim)', border: '1px solid var(--app-gold)' }}>
              <Bell size={18} style={{ color: 'var(--app-gold)' }} />
            </div>
            <div>
              <p className="font-bold text-sm" style={{ color: 'var(--app-text)' }}>
                Kein Gebet verpassen 🕌
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--app-text2)' }}>
                Erhalte Erinnerungen 25 Min. vor jedem Gebet.
              </p>
            </div>
          </div>
          <button onClick={dismiss} style={{ color: 'var(--app-text3)' }}>
            <X size={18} />
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={enable}
            disabled={loading}
            className="btn-gold flex-1 text-sm py-2.5"
          >
            {loading ? 'Wird aktiviert...' : 'Aktivieren ✨'}
          </button>
          <button
            onClick={dismiss}
            className="flex-1 text-sm py-2.5 rounded-xl font-semibold"
            style={{ background: 'var(--app-surface1)', border: '1px solid var(--app-border)', color: 'var(--app-text2)' }}>
            Später
          </button>
        </div>
      </div>
    </div>
  );
}
