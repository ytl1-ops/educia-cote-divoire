"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { appelAPI } from "@/lib/client-api";

const LIENS = [
  { href: "/eleve/tableau-de-bord", label: "Accueil", icone: "🏠" },
  { href: "/eleve/tuteur-ia", label: "Tuteur IA", icone: "🧑‍🏫" },
  { href: "/eleve/importer", label: "Importer", icone: "📸" },
  { href: "/eleve/exercices", label: "Exercices", icone: "📝" },
  { href: "/eleve/examens", label: "Examens", icone: "🎓" },
  { href: "/eleve/progres", label: "Progrès", icone: "📊" },
];

export function NavigationEleve() {
  const chemin = usePathname();
  const routeur = useRouter();

  async function deconnexion() {
    await appelAPI("/api/auth/deconnexion", { method: "POST" });
    routeur.push("/connexion");
  }

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="conteneur-page flex h-16 items-center justify-between">
          <Link href="/eleve/tableau-de-bord" className="font-bold text-educia-700">
            EDUCIA
          </Link>
          <button onClick={deconnexion} className="text-sm text-slate-400 hover:text-slate-600">
            Déconnexion
          </button>
        </div>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white sm:static sm:border-0 sm:bg-transparent">
        <div className="conteneur-page flex justify-between py-2 sm:justify-start sm:gap-2 sm:py-4">
          {LIENS.map((lien) => {
            const actif = chemin === lien.href;
            return (
              <Link
                key={lien.href}
                href={lien.href}
                className={`flex flex-1 flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-xs font-medium sm:flex-none sm:flex-row sm:gap-2 sm:px-4 sm:py-2 sm:text-sm ${
                  actif ? "bg-educia-600 text-white" : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                <span>{lien.icone}</span>
                <span>{lien.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
