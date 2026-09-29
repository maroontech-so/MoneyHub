const CACHE_NAME = 'earnwave-v1';
const STATIC_ASSETS = [
  '/', 
  '/index.html', 
  '/login.html', 
  '/register.html',
  '/offline.html',
  '/css/main.css', 
  '/css/components.css', 
  '/css/dashboard.css',
  '/js/config.js', 
  '/js/firebase-init.js', 
  '/js/auth.js',
  '/js/navigation.js',
  '/js/notifications.js'
];

// Install: cache static assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('Opened cache');
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch strategy
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Skip cross-origin requests, like Firebase API calls
    if (url.origin !== location.origin) {
        return; // Let browser handle it (Network only)
    }

    // Handle HTML pages - Network First, fallback to cache, fallback to offline.html
    if (event.request.mode === 'navigate' || (event.request.method === 'GET' && event.request.headers.get('accept').includes('text/html'))) {
        event.respondWith(
            fetch(event.request)
                .catch(() => {
                    return caches.match(event.request)
                        .then(response => {
                            return response || caches.match('/offline.html');
                        });
                })
        );
        return;
    }

    // Handle static assets - Cache First, fallback to network
    if (STATIC_ASSETS.includes(url.pathname)) {
        event.respondWith(
            caches.match(event.request)
                .then(response => {
                    if (response) {
                        return response;
                    }
                    return fetch(event.request).then(
                        function(response) {
                            if(!response || response.status !== 200 || response.type !== 'basic') {
                                return response;
                            }
                            var responseToCache = response.clone();
                            caches.open(CACHE_NAME)
                                .then(function(cache) {
                                    cache.put(event.request, responseToCache);
                                });
                            return response;
                        }
                    );
                })
        );
        return;
    }
});

// Background sync for deferred actions (placeholder)
self.addEventListener('sync', event => {
    if (event.tag === 'sync-messages') {
        console.log('Background sync triggered for messages');
    }
});

// Push notifications
self.addEventListener('push', event => {
    const data = event.data ? event.data.json() : {};
    
    const title = data.title || 'PesaWave Notification';
    const options = {
        body: data.body || 'You have a new message.',
        icon: '/assets/icons/icon-192.png',
        badge: '/assets/icons/icon-72.png',
        data: data.data || { url: '/dashboard.html' }
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    const urlToOpen = new URL(event.notification.data.url || '/dashboard.html', self.location.origin).href;

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});
