'use client';

import { useEffect, useState } from 'react';
import { Bell, X } from "lucide-react";
import OneSignal from 'react-onesignal';

export default function NotificationManager() {
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    // Nur zeigen wenn noch nicht entschieden
    if (Notification.permission !== 'default') return;

    // Bereits dauerhaft weggeklickt?
    if (sessionStorage.getItem('notif-dismissed') === '1') return;

    // Nach 3s anzeigen
    const t = setTimeout(() => setShowPopup(true), 3000);
    return () => clearTimeout(t);
  }, []);

  const enable = async () => {
    setShowPopup(false);
    try {
      // Direkt nativer Browser-Prompt — zuverlässigste Methode
      const result = await Notification.requestPermission();
      if (result === 'granted') {
        // OneSignal nach Erlaubnis registrieren
        try {
          const anyOS = OneSignal as any;
          if (anyOS?.User?.PushSubscription?.optIn) {
            await anyOS.User.PushSubscription.optIn();
          }
        } catch (_) {}
      }
    } catch (e) {
      console.error('Notification request failed:', e);
    }
  };

  const dismiss = () => {
    sessionStorage.setItem('notif-dismissed', '1');
    setShowPopup(false);
  };

  if (!showPopup) return null;

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
          <button onClick={enable} className="btn-gold flex-1 text-sm py-2.5">
            Aktivieren ✨
          </button>
          <button onClick={dismiss}
            className="flex-1 text-sm py-2.5 rounded-xl font-semibold"
            style={{ background: 'var(--app-surface1)', border: '1px solid var(--app-border)', color: 'var(--app-text2)' }}>
            Später
          </button>
        </div>
      </div>
    </div>
  );
}
