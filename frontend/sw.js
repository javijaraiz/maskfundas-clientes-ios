// Service Worker para Portal MásKFundas PWA
const CACHE_NAME = 'maskfundas-pwa-v19';
const STATIC_ASSETS = [
  '/manifest.json',
  '/static/css/styles.css?v=19',
  '/static/js/app.js?v=20',
  '/static/js/passkeys.js?v=1',
  '/static/js/notifications.js?v=1',
  '/css/admin_modern.css?v=3.5',
  '/js/admin_compact_tables.js?v=4',
  '/js/command_palette.js?v=3.5',
  '/static/img/favicon.png',
  '/static/img/logo.png',
  '/static/pwa/icon-192.png',
  '/static/pwa/icon-512.png',
  '/static/pwa/icon-maskable-512.png',
  '/static/pwa/apple-touch-icon.png'
];

// Instalación: Cachear shell estático
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload;
  try { payload = event.data.json(); } catch (_) { return; }
  const title = String(payload.title || 'MásKFundas').slice(0, 80);
  const body = String(payload.body || '').slice(0, 180);
  const candidate = typeof payload.url === 'string' ? payload.url : '/app';
  let url = '/app';
  try {
    const parsed = new URL(candidate, self.location.origin);
    if (candidate.startsWith('/') && !candidate.includes('\\') && parsed.origin === self.location.origin) {
      url = parsed.pathname + parsed.search + parsed.hash;
    }
  } catch (_) { /* Keep the safe default. */ }
  event.waitUntil(self.registration.showNotification(title, {
    body,
    icon: '/static/pwa/icon-192.png',
    badge: '/static/pwa/icon-192.png',
    data: { url },
    tag: 'maskfundas-client',
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const candidate = event.notification.data?.url || '/app';
  let url = new URL('/app', self.location.origin).href;
  try {
    const parsed = new URL(candidate, self.location.origin);
    if (parsed.origin === self.location.origin) url = parsed.href;
  } catch (_) { /* Keep the safe default. */ }
  event.waitUntil((async () => {
    const windows = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = windows.find(client => client.url.startsWith(self.location.origin));
    if (existing) {
      await existing.navigate(url);
      return existing.focus();
    }
    return clients.openWindow(url);
  })());
});

// Activación: Limpieza de caches antiguas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Estrategia de Fetch: Network-First para APIs y dinámico, Cache-First para estáticos
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // No cachear navegación, sesiones ni respuestas con datos de cliente.
  // El HTML de /app puede incluir el bootstrap de sesión y siempre debe venir
  // de red; un HTML antiguo puede producir bucles de login y credenciales obsoletas.
  if (url.pathname.startsWith('/api/') ||
      ['/app', '/login'].includes(url.pathname) ||
      url.pathname.startsWith('/admin/') ||
      event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const resClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, resClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
        });
      })
  );
});
