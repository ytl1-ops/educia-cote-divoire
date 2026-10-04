"use client";

import { useEffect } from "react";

/** Enregistre le service worker PWA au chargement de l'application. */
export function EnregistreurServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((erreur) => {
        console.warn("Échec de l'enregistrement du service worker :", erreur);
      });
    }
  }, []);

  return null;
}
