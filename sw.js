// =============================================
// COPA DO MUNDO 2026 — Service Worker v4
// Cache First para assets · Network First para API
// Push notifications para jogos do Brasil
// =============================================

const CACHE_NAME = 'copa2026-v4';
const BASE = self.location.pathname.replace('/sw.js', '');

const ASSETS = [
  BASE + '/',
  BASE + '/index.html',
  BASE + '/css/style.css',
  BASE + '/js/data.js',
  BASE + '/js/app.js',
  BASE + '/manifest.json',
  BASE + '/icons/icon-192.png',
  'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;900&family=Barlow:wght@400;500;600&display=swap',
];

// ── Install ───────────────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS).catch(err => {
        console.warn('[SW] Alguns assets não cacheados:', err);
      }))
      .then(() => self.skipWaiting())
  );
});

// ── Activate — limpa caches antigos ──────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch ─────────────────────────────────────────────────────
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;

  // Sempre network para APIs externas
  if (
    url.hostname.includes('sofascore') ||
    url.hostname.includes('rapidapi') ||
    url.hostname.includes('corsproxy') ||
    url.hostname.includes('allorigins') ||
    url.hostname.includes('thingproxy')
  ) {
    e.respondWith(
      fetch(e.request).catch(() =>
        new Response('{"error":"offline"}', { headers: { 'Content-Type': 'application/json' } })
      )
    );
    return;
  }

  // Cache first para assets estáticos + fontes Google
  if (url.origin === location.origin || url.hostname.includes('fonts.')) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
          }
          return response;
        }).catch(() => {
          // Fallback para navegação offline: serve index.html cacheado
          if (e.request.mode === 'navigate') {
            return caches.match(BASE + '/index.html');
          }
        });
      })
    );
    return;
  }

  // Network first para todo o resto
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});

// ── Push Notifications ────────────────────────────────────────
self.addEventListener('push', e => {
  let data = { title: '⚽ Copa do Mundo 2026', body: 'Atualização de jogo!', tag: 'copa-update' };
  try { Object.assign(data, e.data?.json()); } catch (_) {}

  e.waitUntil(
    self.registration.showNotification(data.title, {
      body:    data.body,
      icon:    BASE + '/icons/icon-192.png',
      badge:   BASE + '/icons/icon-192.png',
      tag:     data.tag || 'copa-update',
      renotify: true,
      data:    { url: BASE + '/' },
    })
  );
});

// ── Clique na notificação → abre o app ───────────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const target = e.notification.data?.url || BASE + '/';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const existing = list.find(c => c.url.includes(BASE));
      if (existing) return existing.focus();
      return clients.openWindow(target);
    })
  );
});
