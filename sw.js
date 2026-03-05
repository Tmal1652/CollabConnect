// Enhanced service worker: split caches & runtime strategies
const VERSION = 'v11';
const SHELL_CACHE = `cc-shell-${VERSION}`;
const ASSET_CACHE = `cc-assets-${VERSION}`;
const PAGE_CACHE = `cc-pages-${VERSION}`;
const APP_SHELL = [
  'index.html',
  'about.html',
  'features.html',
  'social.html',
  'projects.html',
  'profile.html',
  'login.html',
  'signup.html',
  'app.html',
  'style.css',
  'style.min.css',
  'app.js',
  'social.js',
  'projects.js',
  'mobile/app.js',
  'mobile/router.js',
  'mobile/auth.js',
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'background.webp',
  'image.webp'
];

const isHTML = (req) => req.destination === 'document' || (req.headers.get('accept') || '').includes('text/html');
const isAsset = (req) => ['style', 'script', 'image', 'font'].includes(req.destination);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => ![SHELL_CACHE, ASSET_CACHE, PAGE_CACHE].includes(k)).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

// Strategy:
// HTML pages: network-first (fallback to cache) then offline fallback to index.html
// Assets: stale-while-revalidate
// Other GET: cache-first fallback to network
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  if (isHTML(req)) {
    event.respondWith(networkFirst(req));
  } else if (isAsset(req)) {
    event.respondWith(staleWhileRevalidate(req));
  } else {
    event.respondWith(cacheFirst(req));
  }
});

async function networkFirst(request) {
  try {
    const fresh = await fetch(request);
    if (fresh && (fresh.ok || fresh.type === 'opaque')) {
      const cache = await caches.open(PAGE_CACHE);
      cache.put(request, fresh.clone());
    }
    return fresh;
  } catch (e) {
    const cached = await caches.match(request, { ignoreSearch: true });
    if (cached) return cached;
    if (request.mode === 'navigate') {
      return caches.match('index.html');
    }
    return Response.error();
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(ASSET_CACHE);
  const cached = await cache.match(request);
  const networkPromise = fetch(request).then(resp => {
    if (resp && (resp.ok || resp.type === 'opaque')) {
      cache.put(request, resp.clone());
    }
    return resp;
  }).catch(() => cached);
  if (cached) return cached;
  const resp = await networkPromise;
  return resp || Response.error();
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const resp = await fetch(request);
    if (request.url.startsWith(self.location.origin) && resp && (resp.ok || resp.type === 'opaque')) {
      const cache = await caches.open(ASSET_CACHE);
      cache.put(request, resp.clone());
    }
    return resp;
  } catch (e) {
    return cached || Response.error();
  }
}

// Optional: message handler for future skipWaiting or cache purge commands
self.addEventListener('message', e => {
  if (e.data === 'cc:skipWaiting') self.skipWaiting();
});
