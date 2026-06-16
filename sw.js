/* ============ WhisperPhone Service Worker ============ */
const CACHE_NAME = 'Mint#4-cache-v1';

self.addEventListener('install', function(event) {
    self.skipWaiting();
});

self.addEventListener('activate', function(event) {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', function(event) {
    event.respondWith(
        fetch(event.request).then(function(response) {
            return response;
        }).catch(function() {
            return caches.match(event.request).then(function(cached) {
                return cached || new Response('Offline', {
                    status: 503,
                    statusText: 'Offline',
                    headers: new Headers({ 'Content-Type': 'text/plain' })
                });
            });
        })
    );
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
            for (var i = 0; i < clientList.length; i++) {
                if ('focus' in clientList[i]) return clientList[i].focus();
            }
            if (clients.openWindow) return clients.openWindow('./index.html');
        })
    );
});
