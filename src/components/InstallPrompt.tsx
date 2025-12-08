'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { X, Share, PlusSquare, Download } from "lucide-react";

export default function InstallPrompt() {
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    // 1. Prüfen: Läuft die App schon als "App"?
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;
    setIsStandalone(isStandaloneMode);
    if (isStandaloneMode) return; // Wenn schon installiert, nichts anzeigen

    // 2. Prüfen: Ist es ein iPhone?
    const userAgent = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(ios);

    // 3. Android: Das "Installier-Event" abfangen
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Zeige den Button nach 3 Sekunden
      setTimeout(() => setShow(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // iOS: Zeige die Anleitung nach 3 Sekunden
    if (ios) {
      setTimeout(() => setShow(true), 3000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Funktion für den Android-Button
  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShow(false);
    }
    setDeferredPrompt(null);
  };

  if (!show || isStandalone) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-500">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in slide-in-from-bottom-10 relative">
        
        {/* Schließen Button */}
        <button 
          onClick={() => setShow(false)} 
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
        >
          <X size={20} />
        </button>

        <div className="mb-4">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            App installieren 📲
          </h3>
          <p className="text-sm text-slate-600 mt-1">
            Installiere <b>Ride 2 Salah</b> für Vollbild-Modus und Push-Nachrichten.
          </p>
        </div>

        {/* --- VARIANTE 1: ANDROID (Echter Button) --- */}
        {deferredPrompt && (
          <Button 
            className="w-full bg-slate-900 text-white h-12 text-lg rounded-xl shadow-lg" 
            onClick={handleInstallClick}
          >
            <Download className="mr-2 h-5 w-5" /> Jetzt installieren
          </Button>
        )}

        {/* --- VARIANTE 2: IPHONE (Anleitung) --- */}
        {isIOS && (
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-3 text-sm text-slate-700 bg-slate-50 p-3 rounded-lg">
              <Share size={24} className="text-blue-500 shrink-0" />
              <span>1. Tippe unten auf <b>Teilen</b></span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-700 bg-slate-50 p-3 rounded-lg">
              <PlusSquare size={24} className="text-slate-900 shrink-0" />
              <span>2. Wähle <b>"Zum Home-Bildschirm"</b></span>
            </div>
            
            {/* Pfeil, der auf den Safari-Button zeigt */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rotate-45 border-r border-b border-slate-200"></div>
          </div>
        )}

      </div>
    </div>
  );
}