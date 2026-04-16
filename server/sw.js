var CACHE = 'manaqasa-v3';
var STATIC = [
  './',
  './index.html',
  './auth.html',
  './dashboard-client.html',
  './dashboard-provider.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap'
];

// Install: cache static assets
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(c) {
      return c.addAll(STATIC.map(function(url) {
        return new Request(url, { cache: 'reload' });
      })).catch(function(err) {
        console.log('SW cache error (non-fatal):', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate: remove old caches
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE; })
            .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

// Fetch handler
self.addEventListener('fetch', function(e) {
  var url = e.request.url;

  // ── API calls: NEVER intercept — go straight to network ──
  if (
    url.includes('manaqasati-production') ||
    url.includes('railway.app') ||
    url.includes('/api/')
  ) {
    return; // Don't call e.respondWith — browser handles it directly
  }

  // ── Non-GET requests: pass through ──
  if (e.request.method !== 'GET') return;

  // ── Google Fonts: cache first ──
  if (url.includes('fonts.googleapis') || url.includes('fonts.gstatic')) {
    e.respondWith(
      caches.match(e.request).then(function(cached) {
        return cached || fetch(e.request).then(function(res) {
          return caches.open(CACHE).then(function(c) {
            c.put(e.request, res.clone());
            return res;
          });
        });
      })
    );
    return;
  }

  // ── Static assets: cache first, fallback to network ──
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) return cached;
      return fetch(e.request).then(function(res) {
        if (res && res.status === 200 && res.type !== 'opaque') {
          var clone = res.clone();
          caches.open(CACHE).then(function(c) { c.put(e.request, clone); });
        }
        return res;
      }).catch(function() {
        if (e.request.headers.get('accept') &&
            e.request.headers.get('accept').includes('text/html')) {
          return caches.match('./auth.html');
        }
      });
    })
  );
});
