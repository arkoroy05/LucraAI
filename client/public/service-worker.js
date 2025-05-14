/**
 * LucraAI Service Worker
 * This service worker provides caching and offline capabilities
 */

const CACHE_NAME = 'lucra-ai-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/vercel.svg',
  '/window.svg',
  '/file.svg'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing Service Worker...', event);

  // Skip waiting to ensure the new service worker activates immediately
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching app shell');
        return cache.addAll(ASSETS_TO_CACHE);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating Service Worker...', event);

  // Claim clients to ensure the service worker controls all clients
  self.clients.claim();

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );

  return self.clients.claim();
});

// Fetch event - serve from cache if available, otherwise fetch from network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip API requests, localStorage access, and other non-cacheable requests
  if (event.request.url.includes('/api/') ||
      event.request.url.includes('chrome-extension://') ||
      event.request.url.includes('localhost:3000/_next/webpack-hmr') ||
      event.request.url.includes('[object%20Object]')) {
    return;
  }

  // Don't intercept requests that might be related to localStorage or IndexedDB
  // This ensures that the smart wallet functionality works correctly
  if (event.request.mode === 'navigate' &&
      event.request.destination === 'document') {
    // For navigation requests, let the browser handle them normally
    // This prevents interference with client-side storage mechanisms
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached response if found
        if (response) {
          return response;
        }

        // Clone the request because it's a one-time use stream
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest)
          .then((response) => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response because it's a one-time use stream
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch((error) => {
            console.log('[Service Worker] Fetch failed; returning offline page instead.', error);
            // You could return a custom offline page here
          });
      })
  );
});

// Handle messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
