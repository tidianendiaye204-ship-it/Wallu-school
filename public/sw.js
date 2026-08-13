self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
  // A minimal fetch event handler is required by Chrome to trigger the install prompt.
  // We can just pass the request through.
  e.respondWith(fetch(e.request).catch(() => new Response("Hors ligne")));
});
