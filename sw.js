// ELG Dictaphone : service worker (15/11/2026).
// Garde l'appli dans le téléphone pour qu'elle s'ouvre sans réseau.
// Stratégie : on sert la copie gardée tout de suite (ouverture instantanée, même en zone blanche),
// et, s'il y a du réseau, on récupère en arrière-plan la dernière version, utilisée à l'ouverture suivante.
// Les dictées ne passent jamais par ici : elles restent dans IndexedDB.
const VERSION = 'elg-dictaphone-v2';
const FICHIERS = ['./', 'index.html', 'manifest.webmanifest', 'icone-192.png', 'icone-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSION)
      .then(c => c.addAll(FICHIERS.map(f => new Request(f, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(cles => Promise.all(cles.filter(k => k.startsWith('elg-dictaphone-') && k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  const navigation = req.mode === 'navigate';
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const garde = navigation
      ? (await cache.match('./')) || (await cache.match('index.html'))
      : await cache.match(req, { ignoreSearch: true });
    const frais = fetch(req, { cache: 'no-cache' })
      .then(rep => {
        if (rep && rep.ok) cache.put(navigation ? './' : req, rep.clone());
        return rep;
      })
      .catch(() => null);
    if (garde) {
      e.waitUntil(frais);
      return garde;
    }
    return (await frais) || new Response('ELG Dictaphone : pas de réseau et appli pas encore gardée sur ce téléphone. L\'ouvrir une fois avec du réseau.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  })());
});
