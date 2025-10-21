// This service worker will cache the application shell and assets,
// allowing the app to work offline.

const CACHE_NAME = 'asset-tracker-cache-v2'; // IMPORTANT: Cache name is updated to v2
// A list of all the essential files that make up the application shell.
const URLS_TO_CACHE = [
  '/',
  'My_Asset.html',
  'manifest.json',
  
  // --- Local app files ---
  'style.css',
  'app.js',
  // -----------------------

  // --- CDN files that are safe to pre-cache ---
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
  'https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js',
  'https://www.gstatic.com/firebasejs/8.10.1/firebase-analytics.js',
  'https://www.gstatic.com/firebasejs/8.10.1/firebase-auth.js',
  'https://www.gstatic.com/firebasejs/8.10.1/firebase-firestore.js',
  'https://placehold.co/192x192/3b82f6/FFFFFF?text=AT',
  'https://placehold.co/512x512/3b82f6/FFFFFF?text=AT'
];


// Event listener for the 'install' event.
// This is where we open the cache and add the core files.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        // Add all the specified URLs to the cache.
        return cache.addAll(URLS_TO_CACHE);
      })
      .then(() => {
        // Force the waiting service worker to become the active service worker.
        return self.skipWaiting();
      })
      .catch(err => {
        console.error('Failed to cache resources during install:', err);
      })
  );
});

// Event listener for the 'activate' event.
// This is where we clean up old, unused caches.
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // If the cache name is not in our whitelist, delete it.
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
        // Take control of all open clients (tabs) immediately.
        return self.clients.claim();
    })
  );
});

// Event listener for the 'fetch' event.
// This intercepts network requests and serves cached files when offline.
self.addEventListener('fetch', event => {
  // We only want to handle GET requests.
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Use a "Network falling back to cache" strategy for Tailwind CSS.
  // This ensures we get the latest styles if online, but it can still work offline if cached.
  if (event.request.url.startsWith('https://cdn.tailwindcss.com')) {
      event.respondWith(
          fetch(event.request)
            .then(networkResponse => {
                // If we get a response, cache it and return it
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, responseToCache);
                });
                return networkResponse;
            })
            .catch(() => {
                // If the network fails, try to get it from the cache
                return caches.match(event.request);
            })
      );
      return;
  }

  // Use a "Cache-first" strategy for all other assets.
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // If we find a match in the cache, return it.
        if (response) {
          return response;
        }

        // If no match is found, fetch it from the network.
        return fetch(event.request).then(
          networkResponse => {
            // Check if we received a valid response.
            if (!networkResponse || networkResponse.status !== 200) {
              return networkResponse;
            }

            // We don't cache Firestore API calls.
            if(event.request.url.includes('firestore.googleapis.com')) {
                return networkResponse;
            }

            // Clone the response because it's a stream that can only be consumed once.
            const responseToCache = networkResponse.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return networkResponse;
          }
        ).catch(error => {
            console.log('Fetch failed; app may be running offline.', error);
            // Optional: return a fallback page here if needed
        });
      })
  );
});
