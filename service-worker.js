// This service worker will cache the application shell and assets,
// allowing the app to work offline.

const CACHE_NAME = 'asset-tracker-cache-v1';
// A list of all the essential files that make up the application shell.
const URLS_TO_CACHE = [
  '/',
  'My_Asset.html',
  'manifest.json',
  
  // --- ADDED NEW FILES ---
  'style.css',
  'app.js',
  // -----------------------

  'https://cdn.tailwindcss.com',
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
        // IMPROVEMENT: Force the waiting service worker to become the active service worker.
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
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
        // IMPROVEMENT: Take control of all open clients (tabs) immediately.
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
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // If we find a match in the cache, return it.
        if (response) {
          return response;
        }

        // If no match is found in the cache, fetch it from the network.
        return fetch(event.request).then(
          response => {
            // Check if we received a valid response.
            if (!response || response.status !== 200) {
              return response;
            }

            // We don't cache Firestore API calls.
            if(event.request.url.includes('firestore.googleapis.com')) {
                return response;
            }

            // Clone the response because it's a stream that can only be consumed once.
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        ).catch(error => {
            // This will be triggered if the network request fails,
            // which is expected when the user is offline.
            console.log('Fetch failed; app is running offline.', error);
        });
      })
  );
});