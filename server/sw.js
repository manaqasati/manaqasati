var CACHE = 'manaqasa-v4';
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

// ═══════════════════════════════════════════════════════════════
// 🔔 PUSH NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════

// Handle incoming push notifications
self.addEventListener('push', function(e) {
  var data = {};
  try {
    if (e.data) {
      data = e.data.json();
    }
  } catch (err) {
    data = { title: 'مناقصة', body: e.data ? e.data.text() : 'إشعار جديد' };
  }

  var title = data.title || 'مناقصة';
  var options = {
    body: data.body || '',
    icon: '/manaqasa-icon-512.png',
    badge: '/manaqasa-icon-512.png',
    dir: 'rtl',
    lang: 'ar',
    tag: data.tag || 'manaqasa-' + Date.now(),
    renotify: true,
    requireInteraction: false,
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/',
      type: data.type || 'general',
      ref_id: data.ref_id || null
    }
  };

  e.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification click — open the relevant page
self.addEventListener('notificationclick', function(e) {
  e.notification.close();

  var targetUrl = (e.notification.data && e.notification.data.url) || '/';

  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // If a window is already open, focus it and navigate
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url.indexOf(self.location.origin) === 0 && 'focus' in client) {
          client.focus();
          if ('navigate' in client) {
            return client.navigate(targetUrl);
          }
          return;
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
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
