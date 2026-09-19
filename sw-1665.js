/* ============================================================
   SERVICE WORKER
   1665 · Digitalización aplicada a los sectores productivos
   ============================================================
   Misma estrategia que la app 1708:
   - El documento principal usa "network-first": si hay internet,
     siempre se sirve la versión más reciente y se actualiza la
     caché; si no hay conexión, se sirve la última copia guardada.
   - Los recursos externos (fuentes, librería de Supabase) usan
     "cache-first": una vez descargados, no vuelven a pedirse por red.
   - Las llamadas a Supabase NUNCA se cachean: necesitan red real
     siempre, así que se dejan pasar directamente.
*/

const CACHE_VERSION = 'v1';
const CACHE_NAME = `dasp-1665-${CACHE_VERSION}`;

const APP_SHELL = [
  './',
  './index-digitalizacion.html',
  './manifest-1665.json',
  './icon-192-1665.png',
  './icon-512-1665.png',
  './icon-512-maskable-1665.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('dasp-1665-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

function isSupabaseRequest(url) {
  return url.hostname.endsWith('.supabase.co');
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  if (isSupabaseRequest(url)) return;

  if (req.mode === 'navigate' || url.pathname.endsWith('index-digitalizacion.html') || url.pathname === '/') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((res) => res || caches.match('./index-digitalizacion.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          if (res && res.status === 200 && (res.type === 'basic' || res.type === 'cors')) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
    })
  );
});
