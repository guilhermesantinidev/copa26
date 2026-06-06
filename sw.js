// =============================================
// COPA DO MUNDO 2026 — Service Worker
// Compatível com GitHub Pages (/repo/) e root (/)
// Estratégia: Cache First para assets estáticos
//             Network First para dados dinâmicos
// =============================================

const CACHE_NAME = 'copa2026-v3';

// Detecta automaticamente o base path (ex: /copa2026/ no GitHub Pages)
const BASE = self.location.pathname.replace('/sw.js', '');

const ASSETS = [
  BASE + '/',
  BASE + '/index.html',
  BASE + '/css/style.css',
  BASE + '/js/data.js',
  BASE + '/js/app.js',
  BASE + '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;900&family=Barlow:wght@400;500;600&display=swap',
];

// Install — cache assets estáticos
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS).catch(err => {
        console.warn('[SW] Alguns assets não cacheados:', err);
      }))
      .then(() => self.skipWaiting())
  );
});

// Activate — limpa caches antigos
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Ignora requisições não-GET
  if (e.request.method !== 'GET') return;

  // Sempre network para a API externa (dados ao vivo)
  if (url.hostname.includes('rapidapi') || url.hostname.includes('api-football')) {
    e.respondWith(
      fetch(e.request).catch(() => new Response('{"error":"offline"}', {
        headers: { 'Content-Type': 'application/json' }
      }))
    );
    return;
  }

  // Cache first para assets estáticos (mesmo origin + fontes Google)
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
