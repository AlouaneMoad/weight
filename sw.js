const CACHE_NAME = 'weight-manager-v2';

function urlsToPrecache() {
  const scope = self.registration.scope;
  return [
    scope,
    new URL('index.html', scope).href,
    new URL('manifest.json', scope).href,
    new URL('icon.svg', scope).href,
    'https://cdn.tailwindcss.com/3.3.3',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap'
  ];
}

// Install event - cache essential resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToPrecache());
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached response if found
        if (response) {
          return response;
        }
        
        // Clone the request
        const fetchRequest = event.request.clone();
        
        return fetch(fetchRequest).then((response) => {
          // Check if valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Clone the response
          const responseToCache = response.clone();
          
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });
          
          return response;
        }).catch(() => {
          // Return offline page or fallback for HTML requests
          const accept = event.request.headers.get('accept');
          if (accept && accept.includes('text/html')) {
            return caches.match(new URL('index.html', self.registration.scope).href);
          }
        });
      })
  );
});

// Handle background sync for weight data
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-weight-data') {
    event.waitUntil(syncWeightData());
  }
});

async function syncWeightData() {
  // Sync any pending weight data when back online
  console.log('Background sync triggered');
}

// Push notifications support (for future use)
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'New update available!',
    icon: new URL('icon.svg', self.registration.scope).href,
    badge: new URL('icon.svg', self.registration.scope).href,
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };
  
  event.waitUntil(
    self.registration.showNotification('Weight Manager', options)
  );
});