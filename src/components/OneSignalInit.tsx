'use client';

import { useEffect } from "react";
import OneSignal from "react-onesignal";

declare global {
  interface Window {
    __onesignal_inited?: boolean;
  }
}

export default function OneSignalInit() {
  useEffect(() => {
    const init = async () => {
      if (typeof window === "undefined") return;

      if (window.__onesignal_inited) return;
      window.__onesignal_inited = true;

      await OneSignal.init({
        appId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID!,
        allowLocalhostAsSecureOrigin: true,
        // ✅ notifyButton absichtlich NICHT setzen
      });
    };

    init().catch((e) => console.error("OneSignal init error:", e));
  }, []);

  return null;
}