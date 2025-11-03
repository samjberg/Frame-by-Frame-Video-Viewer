// Define a name for your cache
const CACHE_NAME ='frame-by-frame-video-viewer-v1';

// List all the files your app needs to run offline
// Since your app is one HTML file, this list is simple!
const FILES_TO_CACHE = [
  '/',
  'index.html',
  'manifest.json',
  'icon-192.png',
  'icon-512.png'
];

// 1. On install, cache all the app files
self.addEventListener('install', (evt) => {
  console.log('[ServiceWorker] Install');
  // We wait until the cache is populated
  evt.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Caching app shell');
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// 2. On activate, clean up any old caches
self.addEventListener('activate', (evt) => {
  console.log('[ServiceWorker] Activate');
  evt.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          console.log('[ServiceWorker] Removing old cache', key);
          return caches.delete(key);
        }
      }));
    })
  );
  self.clients.claim();
});

// 3. On fetch, serve from cache first (offline-first)
self.addEventListener('fetch', (evt) => {
  console.log('[ServiceWorker] Fetch', evt.request.url);
  evt.respondWith(
    // Try to find the request in the cache
    caches.match(evt.request).then((response) => {
      // If it's in the cache, return it. Otherwise, try to fetch from network.
      return response || fetch(evt.request);
    })
  );
});