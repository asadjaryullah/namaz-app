/* Version hochzaehlen, wenn sich die Logik hier aendert: Der activate-Handler
   loescht daraufhin alle aelteren Caches. */
const CACHE_NAME = 'r2s-v3';
const OFFLINE_URL = '/offline';

/* Wie lange auf das Netz gewartet wird, bevor aus dem Cache geliefert wird.
   Ohne Grenze wartet fetch() bei schlechtem Empfang teils eine halbe Minute,
   bevor es aufgibt - genau das fuehlt sich an, als lade die Seite gar nicht.
   Der Netz-Versuch laeuft im Hintergrund weiter und aktualisiert den Cache. */
const NETWORK_TIMEOUT_MS = 4000;

/* Schriften von jsdelivr: Die Urdu-Nastaliq-Datei liegt nicht auf unserer
   Domain, wird aber trotzdem mitgespeichert. */
const FONT_ORIGINS = ['https://cdn.jsdelivr.net'];

// Assets pre-cached on install so the offline page always works
const PRECACHE = [
  '/offline',
  '/icon.png',
  '/icon_2.png',
];

// ── Install: pre-cache offline shell ─────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      /* Einzeln statt addAll: Faellt eine Datei aus, scheiterte bisher die
         komplette Installation und der Worker blieb ohne jeden Cache. */
      Promise.all(PRECACHE.map(url => cache.add(url).catch(() => {})))
    )
  );
  self.skipWaiting();
});

// ── Activate: remove old caches ──────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Helfer ───────────────────────────────────────────────────────────────────

/* Dauerhaft aus dem Cache, Netz nur beim ersten Mal. Sicher fuer alles unter
   /_next/static/, weil Next.js dort den Inhalts-Hash in den Dateinamen
   schreibt: Aendert sich der Inhalt, aendert sich die Adresse. Eine
   gespeicherte Datei kann also nie veraltet sein. */
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  // Opake Antworten (fremde Domain, no-cors) haben ok === false, sind aber gueltig
  if (response.ok || response.type === 'opaque') {
    const clone = response.clone();
    caches.open(CACHE_NAME).then(cache => cache.put(request, clone)).catch(() => {});
  }
  return response;
}

/* Netz zuerst, aber mit Zeitlimit. Laeuft die Zeit ab oder faellt das Netz aus,
   kommt die letzte gespeicherte Fassung - und erst wenn auch die fehlt, die
   Offline-Seite. */
async function networkFirstWithTimeout(request) {
  const cache = await caches.open(CACHE_NAME);

  const network = fetch(request).then(response => {
    if (response.ok) cache.put(request, response.clone()).catch(() => {});
    return response;
  });

  let timer;
  const timeout = new Promise(resolve => {
    timer = setTimeout(() => resolve(null), NETWORK_TIMEOUT_MS);
  });

  try {
    const winner = await Promise.race([network, timeout]);
    if (winner) return winner;
  } catch {
    // Netz hat abgelehnt - unten weiter mit dem Cache
  } finally {
    clearTimeout(timer);
  }

  /* Der Netz-Versuch laeuft weiter und schreibt sein Ergebnis in den Cache,
     auch wenn wir hier schon die gespeicherte Fassung ausliefern. */
  network.catch(() => {});

  return (await cache.match(request))
    || (await cache.match(OFFLINE_URL))
    || new Response(
      '<!doctype html><meta charset="utf-8"><title>Offline</title>' +
      '<p style="font-family:system-ui;padding:2rem">Keine Verbindung.</p>',
      { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
}

// ── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Nur GET: Ein abgefangenes POST wuerde den Rumpf verlieren
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;

  // Schriften von fremden Domains mitspeichern, sonst nichts Fremdes anfassen
  if (!sameOrigin) {
    if (request.destination === 'font' && FONT_ORIGINS.includes(url.origin)) {
      event.respondWith(cacheFirst(request).catch(() => fetch(request)));
    }
    return;
  }

  // API-Aufrufe nie zwischenspeichern - die liefern Live-Daten
  if (url.pathname.startsWith('/api/')) return;

  /* Gebaute Dateien (JS, CSS, Schriften aus next/font). Ohne diesen Zweig ging
     jeder einzelne Chunk ans Netz. Offline hing die Seite dadurch weiss, obwohl
     der HTML-Rahmen laengst da war. */
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request).catch(() => caches.match(request)));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithTimeout(request));
    return;
  }

  if (request.destination === 'image' || request.destination === 'font') {
    event.respondWith(
      cacheFirst(request).catch(() =>
        request.destination === 'image' ? caches.match('/icon.png') : Response.error()
      )
    );
    return;
  }
});

// ── Push notifications ────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: 'Ride 2 Salah', body: event.data.text() };
  }

  const title = data.title || 'Ride 2 Salah';
  const options = {
    body: data.body || '',
    icon: '/icon.png',
    badge: '/icon.png',
    data: { url: data.url || '/' },
    vibrate: [200, 100, 200],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
