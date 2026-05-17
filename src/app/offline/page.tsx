'use client';

import { useState, useEffect } from 'react';
import Image from "next/image";
import { WifiOff, RotateCcw } from "lucide-react";

export default function OfflinePage() {
  const [retrying, setRetrying] = useState(false);
  const [dotCount, setDotCount] = useState(0);

  useEffect(() => {
    if (!retrying) return;
    const id = setInterval(() => setDotCount(n => (n + 1) % 4), 400);
    return () => clearInterval(id);
  }, [retrying]);

  const handleRetry = async () => {
    setRetrying(true);
    await new Promise(r => setTimeout(r, 1200));
    window.location.href = '/';
  };

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center p-6 text-center relative overflow-hidden"
      style={{ background: 'var(--app-bg)' }}
    >
      {/* Subtle glow */}
      <div style={{
        position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)',
        width: 280, height: 280, borderRadius: '50%', pointerEvents: 'none',
        background: 'radial-gradient(circle, var(--app-gold-glow) 0%, transparent 70%)',
      }} />

      <div className="relative z-10 flex flex-col items-center max-w-xs w-full">

        <div className="relative w-24 h-24 mb-6 opacity-40 grayscale">
          <Image src="/icon.png" alt="Logo" fill className="object-contain" />
        </div>

        <div className="p-5 rounded-full mb-5 animate-pulse"
          style={{ background: 'var(--app-surface2)', border: '1px solid var(--app-border)' }}>
          <WifiOff className="h-10 w-10" style={{ color: 'var(--app-text2)' }} />
        </div>

        <h1 className="text-2xl font-extrabold mb-2" style={{ color: 'var(--app-text)', letterSpacing: '-0.02em' }}>
          Keine Verbindung
        </h1>

        <p className="text-sm leading-relaxed mb-2" style={{ color: 'var(--app-text2)' }}>
          Du bist gerade offline. Bitte prüfe deine Internetverbindung.
        </p>

        <p className="text-lg mb-8" style={{ color: 'var(--app-text3)' }}>
          🤲 Deine Gebete werden trotzdem angenommen!
        </p>

        <button
          onClick={handleRetry}
          disabled={retrying}
          className="btn-gold w-full flex items-center justify-center gap-2"
        >
          {retrying ? (
            <>
              <RotateCcw className="h-4 w-4 animate-spin" />
              Verbinde{'.'.repeat(dotCount)}
            </>
          ) : (
            <>
              <RotateCcw className="h-4 w-4" />
              Erneut versuchen
            </>
          )}
        </button>

        <p className="text-xs mt-6" style={{ color: 'var(--app-text3)' }}>
          Ride 2 Salah · Bashier Moschee Bensheim
        </p>
      </div>
    </main>
  );
}
