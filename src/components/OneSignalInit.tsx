'use client';

import { useEffect } from "react";
import OneSignal from "react-onesignal";

declare global {
  interface Window {
    __onesignal_inited?: boolean;
    __onesignal_ready?: boolean;
  }
}

export default function OneSignalInit() {
  useEffect(() => {
    const init = async () => {
      if (typeof window === "undefined") return;

      const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
      if (!appId) {
        console.error("OneSignal init error: NEXT_PUBLIC_ONESIGNAL_APP_ID fehlt");
        return;
      }

      if (window.__onesignal_inited) return;
      window.__onesignal_inited = true;

      await OneSignal.init({
        appId,
        allowLocalhostAsSecureOrigin: true,
        // ✅ notifyButton absichtlich NICHT setzen
      });

      window.__onesignal_ready = true;
      window.dispatchEvent(new Event("onesignal-ready"));
    };

    init().catch((e) => console.error("OneSignal init error:", e));
  }, []);

  return null;
}
