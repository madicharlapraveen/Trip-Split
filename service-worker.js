const CACHE_NAME = 'tripsplit-v44-landing-page';
const RUNTIME_CACHE = 'tripsplit-runtime-v1';
const urlsToCache = [
  './',
  './index.html',
  './app.html',
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
  './assets/icon-512.png',
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .catch(err => console.warn('Cache addAll failed, but continuing', err))
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

// Fetch Strategy
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Custom routing: if the request path is /app, serve app.html from cache
  if (url.pathname === '/app' || url.pathname === '/app/') {
    event.respondWith(
      caches.match('./app.html').then(cachedResponse => {
        return cachedResponse || fetch(event.request);
      })
    );
    return;
  }

  // Skip cross-origin POST/API requests (like Supabase API) - let them fail naturally if offline
  if (event.request.method !== 'GET' || url.hostname.includes('supabase.co')) {
    return;
  }

  // Cache-First for Map Tiles
  if (url.hostname.includes('tile.openstreetmap.org')) {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        if (cachedResponse) return cachedResponse;
        return fetch(event.request).then(networkResponse => {
          return caches.open('tripsplit-map-tiles').then(cache => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        }).catch(() => new Response('', { status: 404 }));
      })
    );
    return;
  }

  // Stale-While-Revalidate for app assets and CDNs
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      const fetchPromise = fetch(event.request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          caches.open(RUNTIME_CACHE).then(cache => {
            cache.put(event.request, networkResponse.clone());
          });
        }
        return networkResponse;
      }).catch(err => {
        // If offline and no cache, just throw
        if (!cachedResponse) throw err;
      });

      return cachedResponse || fetchPromise;
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