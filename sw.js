var CACHE_NAME = 'propakt-v23.5.1';
var urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Yükleme — dosyaları önbelleğe al ve hemen aktif ol
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

// Aktivasyon — eski önbelleği temizle + tüm sekmeleri devral
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.filter(function(name) {
          return name !== CACHE_NAME;
        }).map(function(name) {
          return caches.delete(name);
        })
      );
    })
  );
  self.clients.claim();
});

// v19: Network-first strateji
// Önce internetten indir (güncel versiyon), başarısız olursa cache'den göster
self.addEventListener('fetch', function(event) {
  // Firebase ve harici API isteklerini cache'leme
  if (event.request.url.indexOf('firebaseio.com') !== -1 ||
      event.request.url.indexOf('googleapis.com') !== -1 ||
      event.request.url.indexOf('gstatic.com') !== -1) {
    return;
  }

  // v23.5.1: sayfa dosyaları tarayıcı önbelleğine takılmadan her seferinde sunucudan kontrol edilir
  var req = event.request;
  var sameOrigin = req.url.indexOf(self.location.origin) === 0;
  var netReq = (sameOrigin && req.method === 'GET') ? fetch(req.url, {cache: 'no-cache', credentials: 'same-origin'}) : fetch(req);
  event.respondWith(
    netReq.then(function(networkResponse) {
      // İnternetten başarıyla aldık — cache'i güncelle
      if (networkResponse && networkResponse.status === 200) {
        var responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, responseClone);
        });
      }
      return networkResponse;
    }).catch(function() {
      // İnternet yok — cache'den göster (offline mod)
      return caches.match(event.request).then(function(cachedResponse) {
        if (cachedResponse) return cachedResponse;
        // Cache'de de yok — offline mesajı
        return new Response('<h1>Çevrimdışısınız</h1><p>İnternet bağlantınızı kontrol edin.</p>', {
          headers: { 'Content-Type': 'text/html; charset=UTF-8' }
        });
      });
    })
  );
});
