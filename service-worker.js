const CACHE_NAME = 'tripsplit-v20-pulse-fix';
const urlsToCache = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/db.js',
  './js/sync.js',
  './js/split.js',
  './js/planner.js',
  './js/share.js',
  './js/ai.js',
  './js/presets.js',
  './js/ui_engine.js',
  './manifest.json',
  './assets/icon-192.png',
  './assets/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Strategy: Cache-First for Map Tiles, Network-First for other assets
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Cache-First strategy for Leaflet assets & OpenStreetMap tiles (offline capability)
  if (url.hostname.includes('tile.openstreetmap.org') || url.pathname.includes('unpkg.com/leaflet')) {
    event.respondWith(
      caches.open('tripsplit-map-tiles').then(cache => {
        return cache.match(event.request).then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(event.request).then(networkResponse => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          }).catch(() => {
            // Silently fail if completely offline and not in cache
            return new Response('', { status: 404 });
          });
        });
      })
    );
    return;
  }

  // Standard Network-First strategy with Cache Fallback for app shell
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});

// Push Notification Handler
self.addEventListener('push', event => {
    const data = event.data ? event.data.json() : { 
        title: 'TripSplit Update', 
        body: 'Something happened in your trip!' 
    };

    const options = {
        body: data.body,
        icon: './assets/icon-192.png',
        badge: './assets/icon-192.png',
        vibrate: [100, 50, 100],
        data: {
            url: data.url || './'
        }
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data.url)
    );
});