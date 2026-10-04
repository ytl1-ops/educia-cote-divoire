/**
 * Service worker EDUCIA — mode hors ligne.
 *
 * Stratégie :
 * - Pages/API (navigation, /api/*) : réseau prioritaire, repli sur le cache
 *   si hors ligne (mode hors ligne : consultation des cours, exercices
 *   téléchargés, historique personnel déjà visités).
 * - Fichiers statiques (_next/static, icônes, manifest) : cache prioritaire
 *   pour un chargement instantané, avec mise à jour en arrière-plan.
 * - Toute requête hors ligne sans équivalent en cache retombe sur la page
 *   /hors-ligne.
 */

const VERSION_CACHE = "educia-v1";
const CACHE_STATIQUE = `${VERSION_CACHE}-statique`;
const CACHE_PAGES = `${VERSION_CACHE}-pages`;

const RESSOURCES_PRE_CACHE = ["/", "/hors-ligne", "/manifest.json", "/icons/icone-192.png", "/icons/icone-512.png"];

self.addEventListener("install", (evenement) => {
  evenement.waitUntil(
    caches.open(CACHE_STATIQUE).then((cache) => cache.addAll(RESSOURCES_PRE_CACHE)).catch(() => undefined)
  );
  self.skipWaiting();
});

self.addEventListener("activate", (evenement) => {
  evenement.waitUntil(
    caches.keys().then((cles) =>
      Promise.all(cles.filter((cle) => !cle.startsWith(VERSION_CACHE)).map((cle) => caches.delete(cle)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (evenement) => {
  const requete = evenement.request;
  if (requete.method !== "GET") return;

  const url = new URL(requete.url);
  const estStatique = url.pathname.startsWith("/_next/static") || url.pathname.startsWith("/icons/");

  if (estStatique) {
    evenement.respondWith(strategieCachePrioritaire(requete));
    return;
  }

  if (requete.mode === "navigate" || url.pathname.startsWith("/api/")) {
    evenement.respondWith(strategieReseauPrioritaire(requete));
  }
});

async function strategieCachePrioritaire(requete) {
  const cache = await caches.open(CACHE_STATIQUE);
  const reponseCache = await cache.match(requete);
  if (reponseCache) return reponseCache;

  try {
    const reponseReseau = await fetch(requete);
    cache.put(requete, reponseReseau.clone());
    return reponseReseau;
  } catch {
    return reponseCache || Response.error();
  }
}

async function strategieReseauPrioritaire(requete) {
  const cache = await caches.open(CACHE_PAGES);
  try {
    const reponseReseau = await fetch(requete);
    if (requete.mode === "navigate" && reponseReseau.ok) {
      cache.put(requete, reponseReseau.clone());
    }
    return reponseReseau;
  } catch {
    const reponseCache = await cache.match(requete);
    if (reponseCache) return reponseCache;
    if (requete.mode === "navigate") {
      const pageHorsLigne = await cache.match("/hors-ligne");
      if (pageHorsLigne) return pageHorsLigne;
    }
    return Response.error();
  }
}
