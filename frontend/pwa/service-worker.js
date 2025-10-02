// PROMPT 22: FRONTEND & MOBILE PWA - SERVICE WORKER
// Cache strategies: Cache-First, Network-First, Stale-While-Revalidate

const CACHE_NAME = 'gimai-v1.0.0';
const RUNTIME_CACHE = 'gimai-runtime-v1';
const IMAGE_CACHE = 'gimai-images-v1';
const API_CACHE = 'gimai-api-v1';

// Assets to cache on install (App Shell)
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/css/main.css',
  '/css/mobile.css',
  '/js/app.js',
  '/js/offline-handler.js',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// ============================================
// INSTALL EVENT - Precache App Shell
// ============================================

self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Install event');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[ServiceWorker] Precaching app shell');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => {
        console.log('[ServiceWorker] App shell precached');
        return self.skipWaiting(); // Activate immediately
      })
      .catch((error) => {
        console.error('[ServiceWorker] Precache failed:', error);
      })
  );
});

// ============================================
// ACTIVATE EVENT - Clean old caches
// ============================================

self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activate event');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              // Delete old versions
              return cacheName.startsWith('gimai-') && cacheName !== CACHE_NAME;
            })
            .map((cacheName) => {
              console.log('[ServiceWorker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('[ServiceWorker] Claiming clients');
        return self.clients.claim(); // Take control immediately
      })
  );
});

// ============================================
// FETCH EVENT - Route requests to cache strategies
// ============================================

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip chrome extensions
  if (url.protocol === 'chrome-extension:') {
    return;
  }
  
  // Route to appropriate strategy
  if (url.pathname.startsWith('/api/')) {
    // API: Network-First
    event.respondWith(networkFirstStrategy(request));
  } else if (request.destination === 'image') {
    // Images: Cache-First
    event.respondWith(cacheFirstStrategy(request, IMAGE_CACHE));
  } else if (url.pathname.match(/\.(js|css)$/)) {
    // Static assets: Stale-While-Revalidate
    event.respondWith(staleWhileRevalidateStrategy(request));
  } else {
    // HTML pages: Network-First with offline fallback
    event.respondWith(networkFirstWithOffline(request));
  }
});

// ============================================
// CACHE STRATEGIES
// ============================================

/**
 * Cache-First: Try cache first, fallback to network
 * Best for: Static assets, images
 */
async function cacheFirstStrategy(request, cacheName = CACHE_NAME) {
  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      console.log('[ServiceWorker] Cache hit:', request.url);
      return cachedResponse;
    }
    
    console.log('[ServiceWorker] Cache miss, fetching:', request.url);
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[ServiceWorker] Cache-first failed:', error);
    return new Response('Offline', { status: 503 });
  }
}

/**
 * Network-First: Try network first, fallback to cache
 * Best for: API calls, dynamic content
 */
async function networkFirstStrategy(request) {
  try {
    const cache = await caches.open(API_CACHE);
    
    try {
      const networkResponse = await fetch(request, {
        timeout: 5000 // 5 second timeout
      });
      
      // Cache successful API responses
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      
      return networkResponse;
    } catch (networkError) {
      console.log('[ServiceWorker] Network failed, trying cache:', request.url);
      const cachedResponse = await cache.match(request);
      
      if (cachedResponse) {
        console.log('[ServiceWorker] Serving from cache:', request.url);
        // Add custom header to indicate cached response
        const headers = new Headers(cachedResponse.headers);
        headers.append('X-From-Cache', 'true');
        
        return new Response(cachedResponse.body, {
          status: cachedResponse.status,
          statusText: cachedResponse.statusText,
          headers: headers
        });
      }
      
      throw networkError;
    }
  } catch (error) {
    console.error('[ServiceWorker] Network-first failed:', error);
    return new Response(JSON.stringify({ error: 'Offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Stale-While-Revalidate: Return cache immediately, update in background
 * Best for: JS/CSS files
 */
async function staleWhileRevalidateStrategy(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cachedResponse = await cache.match(request);
  
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => {
    // Network failed, but we already returned cache
    console.log('[ServiceWorker] Background fetch failed:', request.url);
  });
  
  // Return cache immediately if available, otherwise wait for network
  return cachedResponse || fetchPromise;
}

/**
 * Network-First with offline fallback page
 */
async function networkFirstWithOffline(request) {
  try {
    const networkResponse = await fetch(request);
    
    // Cache HTML pages
    if (networkResponse.ok && request.destination === 'document') {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[ServiceWorker] Network failed, serving offline page');
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Serve offline page
    return cache.match('/offline.html');
  }
}

// ============================================
// BACKGROUND SYNC
// ============================================

self.addEventListener('sync', (event) => {
  console.log('[ServiceWorker] Background sync:', event.tag);
  
  if (event.tag === 'sync-pending-checkins') {
    event.waitUntil(syncPendingCheckins());
  } else if (event.tag === 'sync-pending-reservations') {
    event.waitUntil(syncPendingReservations());
  }
});

async function syncPendingCheckins() {
  try {
    const db = await openIndexedDB();
    const pendingCheckins = await getPendingCheckins(db);
    
    console.log('[ServiceWorker] Syncing', pendingCheckins.length, 'pending check-ins');
    
    for (const checkin of pendingCheckins) {
      try {
        const response = await fetch('/api/checkin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(checkin)
        });
        
        if (response.ok) {
          await removePendingCheckin(db, checkin.id);
          console.log('[ServiceWorker] Synced check-in:', checkin.id);
        }
      } catch (error) {
        console.error('[ServiceWorker] Failed to sync check-in:', error);
      }
    }
  } catch (error) {
    console.error('[ServiceWorker] Background sync failed:', error);
    throw error;
  }
}

async function syncPendingReservations() {
  // Similar to syncPendingCheckins
  console.log('[ServiceWorker] Syncing pending reservations');
}

// ============================================
// PUSH NOTIFICATIONS
// ============================================

self.addEventListener('push', (event) => {
  console.log('[ServiceWorker] Push notification received');
  
  let data = {};
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (error) {
      data = { title: 'GIM_AI', body: event.data.text() };
    }
  }
  
  const options = {
    body: data.body || 'Nueva notificación',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: data.data || {},
    actions: data.actions || [
      { action: 'open', title: 'Abrir' },
      { action: 'close', title: 'Cerrar' }
    ],
    tag: data.tag || 'default',
    requireInteraction: data.requireInteraction || false
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'GIM_AI', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('[ServiceWorker] Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    const urlToOpen = event.notification.data.url || '/';
    
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((windowClients) => {
          // Check if app is already open
          for (const client of windowClients) {
            if (client.url === urlToOpen && 'focus' in client) {
              return client.focus();
            }
          }
          
          // Open new window
          if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
          }
        })
    );
  }
});

// ============================================
// PERIODIC BACKGROUND SYNC (Experimental)
// ============================================

self.addEventListener('periodicsync', (event) => {
  console.log('[ServiceWorker] Periodic sync:', event.tag);
  
  if (event.tag === 'refresh-dashboard') {
    event.waitUntil(refreshDashboardData());
  }
});

async function refreshDashboardData() {
  try {
    const response = await fetch('/api/dashboard/kpis');
    if (response.ok) {
      const cache = await caches.open(API_CACHE);
      cache.put('/api/dashboard/kpis', response.clone());
      console.log('[ServiceWorker] Dashboard data refreshed');
    }
  } catch (error) {
    console.error('[ServiceWorker] Failed to refresh dashboard:', error);
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('GIM_AI_Offline', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains('pending_checkins')) {
        db.createObjectStore('pending_checkins', { keyPath: 'id', autoIncrement: true });
      }
      
      if (!db.objectStoreNames.contains('pending_reservations')) {
        db.createObjectStore('pending_reservations', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

function getPendingCheckins(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pending_checkins'], 'readonly');
    const store = transaction.objectStore('pending_checkins');
    const request = store.getAll();
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function removePendingCheckin(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pending_checkins'], 'readwrite');
    const store = transaction.objectStore('pending_checkins');
    const request = store.delete(id);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

console.log('[ServiceWorker] Loaded successfully');
