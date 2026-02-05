export function waitForOneSignalReady(timeoutMs = 5000): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);

  if ((window as any).__onesignal_ready) return Promise.resolve(true);

  return new Promise((resolve) => {
    let done = false;

    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      window.removeEventListener("onesignal-ready", onReady);
      resolve(ok);
    };

    const onReady = () => finish(true);

    window.addEventListener("onesignal-ready", onReady, { once: true });

    setTimeout(() => finish(false), timeoutMs);
  });
}
