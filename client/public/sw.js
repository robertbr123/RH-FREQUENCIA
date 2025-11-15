const VERSION = 'v2';
const APP_SHELL = `rhf-app-shell-${VERSION}`;
const RUNTIME_STATIC = `rhf-runtime-static-${VERSION}`;
const RUNTIME_IMAGES = `rhf-runtime-images-${VERSION}`;
const RUNTIME_FONTS = `rhf-runtime-fonts-${VERSION}`;

const APP_SHELL_URLS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Instalar service worker e cachear recursos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_SHELL)
      .then((cache) => cache.addAll(APP_SHELL_URLS))
  );
  self.skipWaiting();
});

// Ativar service worker e limpar caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (![
            APP_SHELL,
            RUNTIME_STATIC,
            RUNTIME_IMAGES,
            RUNTIME_FONTS
          ].includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Mensagens de controle (ex.: skipWaiting)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Estratégias de cache por destino
self.addEventListener('fetch', (event) => {
  // Só fazer cache de requisições GET
  if (event.request.method !== 'GET') {
    event.respondWith(fetch(event.request));
    return;
  }

  // Não fazer cache de APIs autenticadas
  if (event.request.url.includes('/api/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  const dest = event.request.destination;

  // Navegações (SPA): network-first com fallback para index.html
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cacheia a navegação básica (opcional)
          const copy = response.clone();
          caches.open(APP_SHELL).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(async () => {
          // Tenta do cache da navegação
          const cached = await caches.match(event.request);
          if (cached) return cached;
          // Fallback para app shell
          return caches.match('/index.html');
        })
    );
    return;
  }

  // Arquivos estáticos de build (js/css): cache-first
  if (dest === 'script' || dest === 'style') {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          const copy = response.clone();
          caches.open(RUNTIME_STATIC).then((cache) => cache.put(event.request, copy));
          return response;
        });
      })
    );
    return;
  }

  // Imagens: stale-while-revalidate
  if (dest === 'image') {
    event.respondWith(
      caches.open(RUNTIME_IMAGES).then((cache) =>
        cache.match(event.request).then((cached) => {
          const fetchPromise = fetch(event.request)
            .then((response) => {
              cache.put(event.request, response.clone());
              return response;
            })
            .catch(() => cached);
          return cached || fetchPromise;
        })
      )
    );
    return;
  }

  // Fontes: cache-first
  if (dest === 'font') {
    event.respondWith(
      caches.open(RUNTIME_FONTS).then((cache) =>
        cache.match(event.request).then((cached) => {
          if (cached) return cached;
          return fetch(event.request).then((response) => {
            cache.put(event.request, response.clone());
            return response;
          });
        })
      )
    );
    return;
  }

  // Demais GET: network-first com fallback a cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(RUNTIME_STATIC).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
