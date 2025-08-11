const CACHE_NAME = 'call-v1';
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
	);
});

self.addEventListener('fetch', event => {
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