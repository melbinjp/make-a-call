const CACHE_NAME = 'call-v2'; // Bumped version
console.log(`Service Worker loading for cache version: ${CACHE_NAME}`);
const urlsToCache = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    '/config.js',
    '/manifest.json',
    '/assets/qrcode.min.js'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
            .then(() => self.skipWaiting()) // Force activation of new SW
    );
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
        }).then(() => self.clients.claim()) // Claim clients to use the new SW immediately
    );
});

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Network-first for app.js and config.js
    if (url.pathname.endsWith('/app.js') || url.pathname.endsWith('/config.js')) {
        event.respondWith(
            fetch(event.request).catch(() => {
                return caches.match(event.request);
            })
        );
        return;
    }

    // Cache-first for other assets
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response;
                }
                return fetch(event.request);
            })
    );
});