'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { X, Share, PlusSquare } from "lucide-react";

export default function InstallPrompt() {
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Prüfen: Ist es ein iPhone?
    const userAgent = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(ios);

    // Prüfen: Ist die App schon installiert?
    const standalone = window.matchMedia('(display-mode: standalone)').matches;
    setIsStandalone(standalone);

    // Wenn iPhone UND noch nicht installiert -> Zeigen (nach 3 Sekunden)
    if (ios && !standalone) {
      const timer = setTimeout(() => setShow(true), 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in slide-in-from-bottom-10">
        
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-bold text-slate-900">App installieren 📲</h3>
          <button onClick={() => setShow(false)} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <p className="text-sm text-slate-600 mb-4">
          Für das beste Erlebnis und Push-Nachrichten, füge die App zu deinem Home-Bildschirm hinzu.
        </p>

        <div className="space-y-3 border-t pt-4">
          <div className="flex items-center gap-3 text-sm text-slate-700">
            <span className="bg-slate-100 p-2 rounded-lg"><Share size={20} className="text-blue-500" /></span>
            <span>1. Tippe unten auf <b>Teilen</b></span>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-700">
            <span className="bg-slate-100 p-2 rounded-lg"><PlusSquare size={20} className="text-slate-900" /></span>
            <span>2. Wähle <b>"Zum Home-Bildschirm"</b></span>
          </div>
        </div>

        <Button className="w-full mt-6 bg-slate-900 text-white" onClick={() => setShow(false)}>
          Verstanden
        </Button>
        
        {/* Kleiner Pfeil nach unten, der auf den Teilen-Button zeigt (beim iPhone) */}
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rotate-45"></div>
      </div>
    </div>
  );
}