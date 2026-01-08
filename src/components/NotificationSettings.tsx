'use client';

import { useEffect, useState } from "react";
import OneSignal from "react-onesignal";
import { Button } from "@/components/ui/button";
import { Bell, Check, Ban, Loader2 } from "lucide-react";

type Perm = "loading" | "unsupported" | "granted" | "denied" | "default";

export default function NotificationSettings() {
  const [permission, setPermission] = useState<Perm>("loading");
  const [busy, setBusy] = useState(false);

  const refresh = () => {
    if (typeof window === "undefined") return;

    if (!("Notification" in window)) {
      setPermission("unsupported");
      return;
    }

    const p = Notification.permission; // "granted" | "denied" | "default"
    setPermission(p as Perm);
  };

  useEffect(() => {
    refresh();
    // optional: nochmal kurz später, falls OneSignal langsam initialisiert
    const t = setTimeout(refresh, 800);
    return () => clearTimeout(t);
  }, []);

  const enable = async () => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;

    setBusy(true);
    try {
      // ✅ OneSignal Prompt (falls init schon gelaufen ist)
      // (safe-call: existiert nicht immer sofort)
      const anyOS = OneSignal as any;
      if (anyOS?.Slidedown?.promptPush) {
        await anyOS.Slidedown.promptPush();
      } else {
        // Fallback: Browser Prompt
        await Notification.requestPermission();
      }
    } catch (e) {
      // Fallback
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
    return <p className="text-xs text-red-400">Benachrichtigungen werden hier nicht unterstützt.</p>;
  }

  if (permission === "granted") {
    return (
      <div className="flex items-center gap-2 text-green-700 bg-green-50 p-3 rounded-lg border border-green-200 w-full">
        <Check size={18} />
        <span className="text-sm font-medium">Automatische Erinnerungen aktiv ✅</span>
      </div>
    );
  }

  if (permission === "denied") {
    return (
      <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg border border-red-200 w-full">
        <Ban size={18} />
        <span className="text-sm">Blockiert. Bitte in Browser-/System-Einstellungen erlauben.</span>
      </div>
    );
  }

  // default
  return (
    <Button
      variant="outline"
      onClick={enable}
      disabled={busy}
      className="w-full justify-start gap-2 border-slate-300 text-slate-700"
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell size={18} />}
      Erinnerungen einschalten
    </Button>
  );
}