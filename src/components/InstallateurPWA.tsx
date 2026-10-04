"use client";

import { useEffect, useState } from "react";

interface EvenementInstallationPWA extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** Bannière discrète invitant à installer EDUCIA comme application (PWA). */
export function InstallateurPWA() {
  const [evenementDiffere, setEvenementDiffere] = useState<EvenementInstallationPWA | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const masqueeRecemment = typeof window !== "undefined" && localStorage.getItem("educia_pwa_masquee");
    const gestionnaire = (evenement: Event) => {
      evenement.preventDefault();
      setEvenementDiffere(evenement as EvenementInstallationPWA);
      if (!masqueeRecemment) setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", gestionnaire);
    return () => window.removeEventListener("beforeinstallprompt", gestionnaire);
  }, []);

  if (!visible || !evenementDiffere) return null;

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 flex items-center justify-between gap-3 rounded-xl2 border border-educia-200 bg-white p-4 shadow-lg sm:left-auto sm:right-4 sm:w-96">
      <div>
        <p className="text-sm font-semibold text-slate-900">Installer EDUCIA</p>
        <p className="text-xs text-slate-500">Accédez à votre professeur IA même hors ligne, directement depuis votre écran d'accueil.</p>
      </div>
      <div className="flex shrink-0 flex-col gap-2">
        <button
          className="rounded-lg bg-educia-600 px-3 py-1.5 text-xs font-semibold text-white"
          onClick={async () => {
            await evenementDiffere.prompt();
            setVisible(false);
          }}
        >
          Installer
        </button>
        <button
          className="text-xs text-slate-400 underline"
          onClick={() => {
            localStorage.setItem("educia_pwa_masquee", "1");
            setVisible(false);
          }}
        >
          Plus tard
        </button>
      </div>
    </div>
  );
}
