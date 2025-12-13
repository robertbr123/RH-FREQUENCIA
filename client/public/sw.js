const VERSION = 'v7';
const APP_SHELL = `rhf-app-shell-${VERSION}`;
const RUNTIME_STATIC = `rhf-runtime-static-${VERSION}`;
const RUNTIME_IMAGES = `rhf-runtime-images-${VERSION}`;
const RUNTIME_FONTS = `rhf-runtime-fonts-${VERSION}`;
const OFFLINE_DATA = `rhf-offline-data-${VERSION}`;
const OFFLINE_QUEUE = `rhf-offline-queue-${VERSION}`;
const NOTIFICATIONS_CACHE = `rhf-notifications-${VERSION}`;

const APP_SHELL_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/portal-icon-192.png',
  '/portal-icon-512.png'
];

// URLs de API que devem ser cacheadas para modo offline
const CACHEABLE_API_URLS = [
  '/api/portal/me',
  '/api/portal/attendance/today',
  '/api/portal/schedule',
  '/api/portal/push/settings',
  '/api/portal/face-status'
];

// ==========================================
// FILA OFFLINE PARA REQUISIÇÕES PENDENTES
// ==========================================

async function addToOfflineQueue(request) {
  try {
    const cache = await caches.open(OFFLINE_QUEUE);
    const queueData = await getOfflineQueue();
    
    const queueItem = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      url: request.url,
      method: request.method,
      body: await request.clone().text(),
      headers: Object.fromEntries(request.headers.entries()),
      timestamp: Date.now()
    };
    
    queueData.push(queueItem);
    
    await cache.put(
      new Request('/_offline_queue'),
      new Response(JSON.stringify(queueData), {
        headers: { 'Content-Type': 'application/json' }
      })
    );
    
    console.log('[SW] Requisição adicionada à fila offline:', queueItem.id);
    return queueItem;
  } catch (error) {
    console.error('[SW] Erro ao adicionar à fila offline:', error);
    throw error;
  }
}

async function getOfflineQueue() {
  try {
    const cache = await caches.open(OFFLINE_QUEUE);
    const response = await cache.match(new Request('/_offline_queue'));
    if (!response) return [];
    return await response.json();
  } catch (error) {
    console.error('[SW] Erro ao ler fila offline:', error);
    return [];
  }
}

async function clearOfflineQueue() {
  try {
    const cache = await caches.open(OFFLINE_QUEUE);
    await cache.delete(new Request('/_offline_queue'));
    console.log('[SW] Fila offline limpa');
  } catch (error) {
    console.error('[SW] Erro ao limpar fila offline:', error);
  }
}

async function removeFromOfflineQueue(itemId) {
  try {
    const cache = await caches.open(OFFLINE_QUEUE);
    const queueData = await getOfflineQueue();
    const filtered = queueData.filter(item => item.id !== itemId);
    
    await cache.put(
      new Request('/_offline_queue'),
      new Response(JSON.stringify(filtered), {
        headers: { 'Content-Type': 'application/json' }
      })
    );
    console.log('[SW] Item removido da fila offline:', itemId);
  } catch (error) {
    console.error('[SW] Erro ao remover da fila offline:', error);
  }
}

async function processOfflineQueue() {
  const queue = await getOfflineQueue();
  
  if (queue.length === 0) {
    console.log('[SW] Fila offline vazia');
    return { processed: 0, failed: 0 };
  }
  
  console.log(`[SW] Processando ${queue.length} requisições offline...`);
  
  let processed = 0;
  let failed = 0;
  
  for (const item of queue) {
    try {
      const response = await fetch(item.url, {
        method: item.method,
        headers: item.headers,
        body: item.method !== 'GET' ? item.body : undefined
      });
      
      if (response.ok) {
        await removeFromOfflineQueue(item.id);
        processed++;
        console.log(`[SW] Requisição ${item.id} processada com sucesso`);
      } else if (response.status === 401 || response.status === 409 || response.status === 400) {
        await removeFromOfflineQueue(item.id);
        failed++;
        console.log(`[SW] Requisição ${item.id} falhou (${response.status}), removida da fila`);
      }
    } catch (error) {
      console.error(`[SW] Erro ao processar requisição ${item.id}:`, error);
      failed++;
    }
  }
  
  // Notificar o app
  const allClients = await self.clients.matchAll({ type: 'window' });
  const remainingQueue = await getOfflineQueue();
  allClients.forEach(client => {
    client.postMessage({
      type: 'OFFLINE_QUEUE_PROCESSED',
      processed,
      failed,
      remaining: remainingQueue.length
    });
  });
  
  return { processed, failed };
}

// ==========================================
// NOTIFICAÇÕES LOCAIS AGENDADAS
// ==========================================

let scheduledAlarms = [];
let notificationCheckInterval = null;
let portalToken = null;
let lastNotificationId = 0;

self.addEventListener('message', async (event) => {
  const { type, ...data } = event.data || {};
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'SCHEDULE_NOTIFICATIONS':
      scheduleLocalNotifications(data.schedule, data.reminderMinutes, data.settings);
      break;
      
    case 'CANCEL_NOTIFICATIONS':
      cancelAllScheduledNotifications();
      break;
      
    case 'PROCESS_OFFLINE_QUEUE':
      const result = await processOfflineQueue();
      event.source?.postMessage({ type: 'OFFLINE_QUEUE_RESULT', ...result });
      break;
      
    case 'GET_OFFLINE_QUEUE':
      const queue = await getOfflineQueue();
      event.source?.postMessage({ type: 'OFFLINE_QUEUE_STATUS', queue });
      break;
      
    case 'CLEAR_OFFLINE_QUEUE':
      await clearOfflineQueue();
      event.source?.postMessage({ type: 'OFFLINE_QUEUE_CLEARED' });
      break;
      
    case 'CACHE_PORTAL_DATA':
      await cachePortalData(data.token);
      event.source?.postMessage({ type: 'PORTAL_DATA_CACHED' });
      break;
      
    // ==========================================
    // NOTIFICAÇÕES DO ADMIN EM BACKGROUND
    // ==========================================
    
    case 'START_NOTIFICATION_CHECK':
      portalToken = data.token;
      lastNotificationId = data.lastNotificationId || 0;
      startNotificationCheck();
      event.source?.postMessage({ type: 'NOTIFICATION_CHECK_STARTED' });
      break;
      
    case 'STOP_NOTIFICATION_CHECK':
      stopNotificationCheck();
      portalToken = null;
      event.source?.postMessage({ type: 'NOTIFICATION_CHECK_STOPPED' });
      break;
      
    case 'UPDATE_LAST_NOTIFICATION_ID':
      lastNotificationId = data.lastNotificationId || 0;
      break;
      
    case 'PORTAL_LOGOUT':
      // Limpar todos os caches relacionados ao portal ao fazer logout
      await clearPortalCaches();
      stopNotificationCheck();
      portalToken = null;
      lastNotificationId = 0;
      event.source?.postMessage({ type: 'PORTAL_LOGOUT_COMPLETE' });
      break;
  }
});

// Função para limpar todos os caches do portal ao fazer logout
async function clearPortalCaches() {
  console.log('[SW] Limpando caches do portal...');
  
  try {
    // Lista de caches para limpar (dados do usuário, não app shell)
    const cachesToClear = [
      OFFLINE_DATA,
      OFFLINE_QUEUE,
      NOTIFICATIONS_CACHE
    ];
    
    for (const cacheName of cachesToClear) {
      try {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();
        for (const key of keys) {
          await cache.delete(key);
        }
        console.log(`[SW] Cache ${cacheName} limpo`);
      } catch (error) {
        console.error(`[SW] Erro ao limpar cache ${cacheName}:`, error);
      }
    }
    
    // Limpar também qualquer dado cacheado da API do portal
    const runtimeCache = await caches.open(RUNTIME_STATIC);
    const runtimeKeys = await runtimeCache.keys();
    for (const key of runtimeKeys) {
      if (key.url.includes('/api/portal/')) {
        await runtimeCache.delete(key);
        console.log(`[SW] Removido cache de API: ${key.url}`);
      }
    }
    
    console.log('[SW] Caches do portal limpos com sucesso');
  } catch (error) {
    console.error('[SW] Erro ao limpar caches do portal:', error);
  }
}

function scheduleLocalNotifications(schedule, reminderMinutes, settings) {
  cancelAllScheduledNotifications();
  if (!schedule) return;
  
  const now = new Date();
  
  const notifications = [
    { key: 'entry', time: schedule.entry_time || schedule.start_time, title: 'Hora da Entrada! 🕐', body: 'Está na hora de registrar sua entrada.', enabled: settings.remind_entry },
    { key: 'break_start', time: schedule.break_start, title: 'Hora do Intervalo! ☕', body: 'Está na hora do seu intervalo.', enabled: settings.remind_break_start },
    { key: 'break_end', time: schedule.break_end, title: 'Fim do Intervalo! ⏰', body: 'Seu intervalo está acabando.', enabled: settings.remind_break_end },
    { key: 'exit', time: schedule.exit_time || schedule.end_time, title: 'Hora da Saída! 🏠', body: 'Está na hora de registrar sua saída.', enabled: settings.remind_exit },
  ];
  
  notifications.forEach(notif => {
    if (!notif.time || !notif.enabled) return;
    
    const [hours, minutes] = notif.time.split(':').map(Number);
    
    let reminderDate = new Date(now);
    reminderDate.setHours(hours, minutes, 0, 0);
    reminderDate.setMinutes(reminderDate.getMinutes() - reminderMinutes);
    
    if (reminderDate <= now) return;
    
    const delay = reminderDate.getTime() - now.getTime();
    
    const timeoutId = setTimeout(() => {
      showLocalNotification(notif.title, notif.body, notif.key);
    }, delay);
    
    scheduledAlarms.push({ id: timeoutId, key: notif.key, time: reminderDate });
    console.log(`[SW] Notificação agendada: ${notif.key} às ${reminderDate.toLocaleTimeString()}`);
  });
  
  notifyClientsAboutSchedule(scheduledAlarms.length);
}

function cancelAllScheduledNotifications() {
  scheduledAlarms.forEach(alarm => clearTimeout(alarm.id));
  scheduledAlarms = [];
  console.log('[SW] Todas as notificações canceladas');
}

function showLocalNotification(title, body, tag) {
  const options = {
    body: body,
    icon: '/portal-icon-192.png',
    badge: '/portal-icon-192.png',
    vibrate: [200, 100, 200],
    tag: `punch-${tag}-${Date.now()}`,
    renotify: true,
    requireInteraction: true,
    data: { url: '/portal/ponto', type: tag },
    actions: [
      { action: 'open', title: 'Registrar Ponto' },
      { action: 'dismiss', title: 'Dispensar' }
    ]
  };
  self.registration.showNotification(title, options);
}

async function notifyClientsAboutSchedule(count) {
  const allClients = await self.clients.matchAll({ type: 'window' });
  allClients.forEach(client => {
    client.postMessage({
      type: 'NOTIFICATIONS_SCHEDULED',
      count,
      alarms: scheduledAlarms.map(a => ({ key: a.key, time: a.time.toISOString() }))
    });
  });
}

// ==========================================
// VERIFICAÇÃO DE NOTIFICAÇÕES DO ADMIN EM BACKGROUND
// ==========================================

function startNotificationCheck() {
  // Limpar intervalo anterior se existir
  stopNotificationCheck();
  
  console.log('[SW] Iniciando verificação de notificações em background');
  
  // Verificar imediatamente
  checkForNewNotifications();
  
  // Verificar a cada 30 segundos
  notificationCheckInterval = setInterval(() => {
    checkForNewNotifications();
  }, 30000);
}

function stopNotificationCheck() {
  if (notificationCheckInterval) {
    clearInterval(notificationCheckInterval);
    notificationCheckInterval = null;
    console.log('[SW] Verificação de notificações parada');
  }
}

async function checkForNewNotifications() {
  if (!portalToken) {
    console.log('[SW] Token não disponível, pulando verificação');
    return;
  }
  
  try {
    // Buscar notificações do servidor
    const response = await fetch('/api/portal/notifications', {
      headers: {
        'Authorization': `Bearer ${portalToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        // Token expirado ou inválido, parar verificação
        console.log('[SW] Token inválido (status ' + response.status + '), parando verificação');
        stopNotificationCheck();
        portalToken = null;
      }
      return;
    }
    
    const data = await response.json();
    const notifications = data.notifications || [];
    
    // Verificar se há novas notificações não lidas
    const unreadNotifications = notifications.filter(n => !n.is_read);
    
    if (unreadNotifications.length > 0) {
      // Pegar a notificação mais recente
      const latestNotification = unreadNotifications[0];
      
      // Só mostrar se for nova (ID maior que o último conhecido)
      if (latestNotification.id > lastNotificationId) {
        console.log('[SW] Nova notificação detectada:', latestNotification.id);
        
        // Atualizar último ID
        lastNotificationId = latestNotification.id;
        
        // Salvar no cache para persistir
        await saveLastNotificationId(lastNotificationId);
        
        // Verificar se o app está em foco
        const allClients = await self.clients.matchAll({ 
          type: 'window', 
          includeUncontrolled: true 
        });
        
        const isAppFocused = allClients.some(client => client.visibilityState === 'visible');
        
        // Se o app NÃO está em foco, mostrar notificação nativa
        if (!isAppFocused) {
          showAdminNotification(latestNotification);
        }
        
        // Notificar todos os clientes sobre a nova notificação
        allClients.forEach(client => {
          client.postMessage({
            type: 'NEW_ADMIN_NOTIFICATION',
            notification: latestNotification,
            unreadCount: data.unread_count
          });
        });
      }
    }
  } catch (error) {
    console.error('[SW] Erro ao verificar notificações:', error);
  }
}

function showAdminNotification(notification) {
  const typeEmoji = {
    info: 'ℹ️',
    warning: '⚠️',
    success: '✅',
    error: '🚨'
  };
  
  const emoji = typeEmoji[notification.type] || 'ℹ️';
  
  const options = {
    body: notification.message,
    icon: '/portal-icon-192.png',
    badge: '/portal-icon-192.png',
    vibrate: [300, 100, 300, 100, 300],
    tag: `admin-notif-${notification.id}`,
    renotify: true,
    requireInteraction: true,
    data: { 
      url: notification.link || '/portal/inbox', 
      type: 'admin-notification',
      notificationId: notification.id
    },
    actions: [
      { action: 'open', title: 'Ver mensagem' },
      { action: 'dismiss', title: 'Dispensar' }
    ]
  };
  
  self.registration.showNotification(`${emoji} ${notification.title}`, options);
  console.log('[SW] Notificação nativa exibida:', notification.title);
}

async function saveLastNotificationId(id) {
  try {
    const cache = await caches.open(NOTIFICATIONS_CACHE);
    await cache.put(
      new Request('/_last_notification_id'),
      new Response(JSON.stringify({ id }), {
        headers: { 'Content-Type': 'application/json' }
      })
    );
  } catch (error) {
    console.error('[SW] Erro ao salvar último ID de notificação:', error);
  }
}

async function loadLastNotificationId() {
  try {
    const cache = await caches.open(NOTIFICATIONS_CACHE);
    const response = await cache.match(new Request('/_last_notification_id'));
    if (response) {
      const data = await response.json();
      return data.id || 0;
    }
  } catch (error) {
    console.error('[SW] Erro ao carregar último ID de notificação:', error);
  }
  return 0;
}

// ==========================================
// PUSH NOTIFICATIONS (servidor)
// ==========================================

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: 'Notificação', body: event.data.text() };
  }
  
  const options = {
    body: data.body || 'Você tem um lembrete',
    icon: '/portal-icon-192.png',
    badge: '/portal-icon-192.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'punch-reminder',
    renotify: true,
    requireInteraction: data.requireInteraction !== false,
    data: { url: data.url || '/portal/ponto', type: data.type || 'reminder' },
    actions: data.actions || [
      { action: 'open', title: 'Registrar Ponto' },
      { action: 'dismiss', title: 'Dispensar' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Lembrete de Ponto', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const urlToOpen = event.notification.data?.url || '/portal/ponto';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes('/portal') && 'focus' in client) {
            client.navigate(urlToOpen);
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notificação dispensada:', event.notification.tag);
});

// ==========================================
// CACHE DE DADOS DO PORTAL PARA OFFLINE
// ==========================================

async function cachePortalData(token) {
  if (!token) return;
  
  const cache = await caches.open(OFFLINE_DATA);
  
  for (const url of CACHEABLE_API_URLS) {
    try {
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        await cache.put(new Request(url), response.clone());
        console.log(`[SW] Dados cacheados: ${url}`);
      }
    } catch (error) {
      console.error(`[SW] Erro ao cachear ${url}:`, error);
    }
  }
}

// ==========================================
// INSTALAÇÃO E ATIVAÇÃO
// ==========================================

self.addEventListener('install', (event) => {
  console.log(`[SW] Instalando versão ${VERSION}`);
  event.waitUntil(
    caches.open(APP_SHELL)
      .then(async (cache) => {
        // Cachear URLs individualmente para não falhar se alguma não existir
        for (const url of APP_SHELL_URLS) {
          try {
            await cache.add(url);
            console.log(`[SW] Cacheado: ${url}`);
          } catch (err) {
            console.warn(`[SW] Falha ao cachear ${url}:`, err.message);
          }
        }
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  console.log(`[SW] Ativando versão ${VERSION}`);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName.includes('rhf-') && !cacheName.includes(VERSION)) {
            console.log(`[SW] Removendo cache antigo: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// ==========================================
// BACKGROUND SYNC
// ==========================================

self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  if (event.tag === 'sync-offline-queue') {
    event.waitUntil(processOfflineQueue());
  }
});

// ==========================================
// ESTRATÉGIAS DE CACHE
// ==========================================

self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return;
  }
  
  const isAPIRequest = url.includes('/api/');
  const isPortalAPI = url.includes('/api/portal/');
  const isNavigate = event.request.mode === 'navigate';
  const method = event.request.method;
  
  // ==========================================
  // APIs - Network First com Fallback Offline
  // ==========================================
  
  if (isAPIRequest) {
    // POST/PUT/DELETE - Tentar enviar, se falhar adicionar à fila offline
    if (method !== 'GET') {
      event.respondWith(
        fetch(event.request.clone())
          .catch(async (error) => {
            console.warn('[SW] Falha na requisição, verificando fila offline:', url);
            
            // Adicionar à fila offline apenas para requisições de ponto
            if (isPortalAPI && url.includes('/punch')) {
              try {
                const queueItem = await addToOfflineQueue(event.request.clone());
                
                if ('sync' in self.registration) {
                  await self.registration.sync.register('sync-offline-queue');
                }
                
                return new Response(JSON.stringify({ 
                  offline: true,
                  queued: true,
                  queueId: queueItem.id,
                  message: 'Ponto salvo offline. Será sincronizado quando a conexão voltar.'
                }), {
                  status: 202,
                  headers: { 'Content-Type': 'application/json' }
                });
              } catch (queueError) {
                console.error('[SW] Erro ao adicionar à fila:', queueError);
              }
            }
            
            return new Response(JSON.stringify({ 
              error: 'Sem conexão com a internet',
              offline: true 
            }), {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            });
          })
      );
      return;
    }
    
    // GET - Network first, fallback para cache offline
    event.respondWith(
      fetch(event.request)
        .then(async (response) => {
          if (response.ok && CACHEABLE_API_URLS.some(u => url.includes(u))) {
            const cache = await caches.open(OFFLINE_DATA);
            cache.put(event.request, response.clone());
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          if (cached) {
            console.log('[SW] Retornando API do cache offline:', url);
            return cached;
          }
          
          return new Response(JSON.stringify({ 
            error: 'Dados não disponíveis offline',
            offline: true 
          }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          });
        })
    );
    return;
  }
  
  // ==========================================
  // Navegações (SPA) - Network First
  // ==========================================
  
  if (isNavigate) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(APP_SHELL).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          if (cached) return cached;
          return caches.match('/index.html');
        })
    );
    return;
  }
  
  // ==========================================
  // Recursos Estáticos
  // ==========================================
  
  const dest = event.request.destination;
  
  // Scripts e CSS - Cache First
  if (dest === 'script' || dest === 'style') {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request)
          .then((response) => {
            const copy = response.clone();
            caches.open(RUNTIME_STATIC).then((cache) => cache.put(event.request, copy));
            return response;
          })
          .catch(() => new Response('', { status: 503 }));
      })
    );
    return;
  }
  
  // Imagens - Stale While Revalidate
  if (dest === 'image') {
    event.respondWith(
      caches.open(RUNTIME_IMAGES).then((cache) =>
        cache.match(event.request).then((cached) => {
          const fetchPromise = fetch(event.request)
            .then((response) => {
              if (response.ok) cache.put(event.request, response.clone());
              return response;
            })
            .catch(() => cached || new Response('', { status: 503 }));
          return cached || fetchPromise;
        })
      )
    );
    return;
  }
  
  // Fontes - Cache First
  if (dest === 'font') {
    event.respondWith(
      caches.open(RUNTIME_FONTS).then((cache) =>
        cache.match(event.request).then((cached) => {
          if (cached) return cached;
          return fetch(event.request)
            .then((response) => {
              if (response.ok) cache.put(event.request, response.clone());
              return response;
            })
            .catch(() => new Response('', { status: 503 }));
        })
      )
    );
    return;
  }
  
  // Demais - Network First
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(RUNTIME_STATIC).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then(cached => cached || new Response('', { status: 503 })))
  );
});
