/* SICTA — service worker : l'app complète (y compris les Pass) fonctionne hors ligne.
   BUILD et ASSETS sont régénérés par scripts/stamp-sw.mjs (lancé par le workflow de déploiement). */
const BUILD = 'local';
const CACHE = `sicta-${BUILD}`;
// <assets>
const ASSETS = [
  "./",
  "./css/base.css",
  "./css/components.css",
  "./css/screens.css",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/logo.svg",
  "./icons/sprite.svg",
  "./index.html",
  "./js/app.js",
  "./js/components/plateCheck.js",
  "./js/components/print.js",
  "./js/components/ui.js",
  "./js/data.js",
  "./js/domain.js",
  "./js/router.js",
  "./js/screens/centres.js",
  "./js/screens/compte.js",
  "./js/screens/flotte-compte.js",
  "./js/screens/flotte-facturation.js",
  "./js/screens/flotte-pass.js",
  "./js/screens/flotte-planning.js",
  "./js/screens/flotte.js",
  "./js/screens/home.js",
  "./js/screens/reserver.js",
  "./js/screens/simulateur.js",
  "./js/screens/vehicules.js",
  "./js/screens/verifier.js",
  "./js/store.js",
  "./js/util.js",
  "./js/vendor/qrcode.js",
  "./manifest.webmanifest",
  "./shots/e2e_fleet_pass.png",
  "./shots/e2e_pass.png"
];
// </assets>

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('sicta-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

// Stale-while-revalidate sur les fichiers de l'app ; la navigation retombe sur index.html hors ligne.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const hit = await cache.match(req, { ignoreSearch: true });
      const net = fetch(req)
        .then((res) => {
          if (res.ok) cache.put(req, res.clone());
          return res;
        })
        .catch(() => hit ?? (req.mode === 'navigate' ? cache.match('./index.html') : Response.error()));
      return hit ?? net;
    })
  );
});
