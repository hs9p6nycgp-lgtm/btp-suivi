// Service worker BTP Suivi Pro — mode hors connexion (PWA).
// Stratégies :
//  - fichiers de build Next.js (/_next/static) : cache d'abord, car leur nom
//    contient une empreinte qui change à chaque version (jamais périmés) ;
//  - pages : réseau d'abord (fraîcheur), repli sur le cache puis la page « hors connexion » ;
//  - autres fichiers du site (icônes, manifeste…) : réseau d'abord, repli sur le cache.
// Correctif : les fichiers de build sont désormais mis en cache. Avant, une page
// servie depuis le cache s'affichait sans styles ni scripts (CSS/JS manquants).
const CACHE = "btp-suivi-v2";
const PAGE_HORS_LIGNE = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      try {
        await cache.addAll([PAGE_HORS_LIGNE]);
      } catch {
        // Si la page hors connexion n'est pas encore disponible, on continue :
        // la mise en cache se fera au premier passage en ligne.
      }
    })(),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cles = await caches.keys();
      await Promise.all(cles.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

/** Va chercher la réponse sur le réseau et la met en cache si elle est valide. */
async function reseauPuisCache(requete) {
  const reponse = await fetch(requete);
  if (reponse && reponse.ok) {
    try {
      const cache = await caches.open(CACHE);
      await cache.put(requete, reponse.clone());
    } catch {
      // Un échec de mise en cache ne doit jamais empêcher l'affichage de la page.
    }
  }
  return reponse;
}

self.addEventListener("fetch", (event) => {
  const requete = event.request;
  if (requete.method !== "GET") return;

  let url;
  try {
    url = new URL(requete.url);
  } catch {
    return;
  }
  if (url.origin !== self.location.origin) return;

  // 1) Fichiers de build : cache d'abord (nom unique par version, donc jamais périmés).
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      (async () => {
        const enCache = await caches.match(requete);
        if (enCache) return enCache;
        return reseauPuisCache(requete);
      })(),
    );
    return;
  }

  // 2) Pages : réseau d'abord, repli sur le cache, puis page hors connexion.
  if (requete.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return await reseauPuisCache(requete);
        } catch {
          const enCache = await caches.match(requete);
          if (enCache) return enCache;
          const horsLigne = await caches.match(PAGE_HORS_LIGNE);
          return horsLigne ?? Response.error();
        }
      })(),
    );
    return;
  }

  // 3) Autres ressources du site : réseau d'abord, repli sur le cache.
  event.respondWith(
    (async () => {
      try {
        return await reseauPuisCache(requete);
      } catch {
        const enCache = await caches.match(requete);
        if (enCache) return enCache;
        throw new Error("Ressource indisponible hors connexion");
      }
    })(),
  );
});
