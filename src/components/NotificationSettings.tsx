'use client';

import { useEffect, useState } from "react";
import OneSignal from "react-onesignal";
import { Button } from "@/components/ui/button";
import { Bell, Check, BellOff, Loader2, Smartphone, Chrome, Apple } from "lucide-react";

type Perm = "loading" | "unsupported" | "granted" | "denied" | "default";
type Platform = "ios-safari" | "ios-pwa" | "android" | "desktop";

function detectPlatform(): Platform {
  if (typeof window === "undefined") return "desktop";
  const ua = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/.test(ua);
  const isAndroid = /Android/.test(ua);
  const isPWA = window.matchMedia("(display-mode: standalone)").matches
    || (window.navigator as any).standalone === true;

  if (isIOS && isPWA) return "ios-pwa";
  if (isIOS) return "ios-safari";
  if (isAndroid) return "android";
  return "desktop";
}

export default function NotificationSettings() {
  const [permission, setPermission] = useState<Perm>("loading");
  const [platform, setPlatform] = useState<Platform>("desktop");
  const [busy, setBusy] = useState(false);

  const refresh = () => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) { setPermission("unsupported"); return; }
    setPermission(Notification.permission as Perm);
    setPlatform(detectPlatform());
  };

  useEffect(() => {
    refresh();
    const t = setTimeout(refresh, 800);
    return () => clearTimeout(t);
  }, []);

  const enable = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    setBusy(true);
    try {
      const anyOS = OneSignal as any;
      if (anyOS?.Slidedown?.promptPush) {
        await anyOS.Slidedown.promptPush();
      } else {
        await Notification.requestPermission();
      }
    } catch {
      await Notification.requestPermission();
    } finally {
      setBusy(false);
      refresh();
    }
  };

  if (permission === "loading") {
    return <Loader2 className="h-5 w-5 animate-spin text-slate-400" />;
  }

  if (permission === "unsupported") {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        <p className="font-bold mb-1">Browser unterstützt keine Benachrichtigungen</p>
        <p className="text-amber-700 text-xs">Versuche die App auf einem anderen Gerät oder Browser zu öffnen.</p>
      </div>
    );
  }

  if (permission === "granted") {
    return (
      <div className="flex items-center gap-3 text-green-700 bg-green-50 p-4 rounded-xl border border-green-200 w-full">
        <Check size={20} className="shrink-0" />
        <div>
          <p className="font-bold text-sm">Benachrichtigungen aktiv ✅</p>
          <p className="text-xs text-green-600 mt-0.5">Du wirst vor jedem Gebet erinnert.</p>
        </div>
      </div>
    );
  }

  // --- BLOCKIERT ---
  if (permission === "denied") {
    const instructions: Record<Platform, { icon: React.ReactNode; title: string; steps: string[] }> = {
      "ios-safari": {
        icon: <Apple size={18} />,
        title: "iPhone: App zuerst installieren",
        steps: [
          "Öffne diese Seite in Safari",
          'Tippe auf das Teilen-Symbol  ↑',
          'Wähle „Zum Home-Bildschirm“',
          "Öffne die App vom Home-Bildschirm",
          "Benachrichtigungen werden jetzt angefragt",
        ],
      },
      "ios-pwa": {
        icon: <Smartphone size={18} />,
        title: "Benachrichtigungen auf iPhone aktivieren",
        steps: [
          "Öffne die iPhone-Einstellungen",
          'Scrolle zu „Ride 2 Salah"',
          'Tippe auf „Mitteilungen"',
          'Aktiviere „Mitteilungen erlauben"',
        ],
      },
      "android": {
        icon: <Chrome size={18} />,
        title: "Benachrichtigungen aktivieren",
        steps: [
          "Tippe auf das 🔒 in der Adressleiste",
          '„Website-Einstellungen" öffnen',
          '„Benachrichtigungen" → Erlauben',
          "Seite neu laden",
        ],
      },
      "desktop": {
        icon: <BellOff size={18} />,
        title: "Benachrichtigungen entsperren",
        steps: [
          "Klicke auf das 🔒 in der Adressleiste",
          '„Website-Einstellungen" öffnen',
          '„Benachrichtigungen" → Erlauben',
          "Seite neu laden",
        ],
      },
    };

    const info = instructions[platform];

    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 w-full space-y-3">
        <div className="flex items-center gap-2 text-red-700 font-bold text-sm">
          <span>{info.icon}</span>
          <span>{info.title}</span>
        </div>
        <ol className="space-y-1.5">
          {info.steps.map((step, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-red-700">
              <span className="bg-red-200 text-red-800 font-black rounded-full w-4 h-4 flex items-center justify-center shrink-0 mt-0.5 text-[9px]">{i + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
        {platform === "ios-safari" && (
          <p className="text-[10px] text-red-500 italic">
            iPhone erfordert Installation als App für Push-Benachrichtigungen.
          </p>
        )}
      </div>
    );
  }

  // default → Button anzeigen
  return (
    <Button
      variant="outline"
      onClick={enable}
      disabled={busy}
      className="w-full justify-start gap-2 border-slate-200 text-slate-700 hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50 transition-all"
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell size={18} />}
      Erinnerungen einschalten
    </Button>
  );
}
