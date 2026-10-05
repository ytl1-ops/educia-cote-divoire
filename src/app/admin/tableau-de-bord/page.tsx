"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { appelAPI } from "@/lib/client-api";
import { definitionNiveau } from "@/lib/programmes/curriculum";

interface Statistiques {
  utilisateurs: { eleves: number; parents: number; enseignants: number };
  contenu: { documents: number; exercices: number; sessionsTuteur: number; evaluations: number };
  repartitionNiveaux: { niveau: string; nombre: number }[];
}

const ACCUEIL_PAR_ROLE: Record<string, string> = {
  PARENT: "/parent/tableau-de-bord",
  ELEVE: "/eleve/tableau-de-bord",
};

export default function TableauDeBordAdmin() {
  const routeur = useRouter();
  const [stats, setStats] = useState<Statistiques | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [bascule, setBascule] = useState<"PARENT" | "ELEVE" | null>(null);

  useEffect(() => {
    appelAPI<Statistiques>("/api/admin/statistiques").then(setStats).catch((e) => setErreur(e.message));
  }, []);

  async function basculerVers(role: "PARENT" | "ELEVE") {
    setBascule(role);
    try {
      await appelAPI("/api/admin/connexion-demo", { method: "POST", corpsJSON: { role } });
      routeur.push(ACCUEIL_PAR_ROLE[role]);
    } catch (e) {
      setErreur((e as Error).message);
      setBascule(null);
    }
  }

  return (
    <div className="conteneur-page py-8">
      <h1 className="text-xl font-bold text-slate-900">Administration EDUCIA</h1>

      <div className="carte mt-4">
        <h2 className="text-sm font-semibold text-slate-900">Tester les autres parcours</h2>
        <p className="mt-1 text-xs text-slate-500">
          Bascule ta session sur un compte de démonstration déjà lié (le parent démo suit l'élève démo). Reconnecte-toi avec ton compte admin pour revenir.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="bouton-secondaire px-4 py-2 text-sm" onClick={() => basculerVers("PARENT")} disabled={bascule !== null}>
            {bascule === "PARENT" ? "Connexion…" : "👪 Voir en tant que Parent démo"}
          </button>
          <button className="bouton-secondaire px-4 py-2 text-sm" onClick={() => basculerVers("ELEVE")} disabled={bascule !== null}>
            {bascule === "ELEVE" ? "Connexion…" : "🎓 Voir en tant qu'Élève démo"}
          </button>
        </div>
      </div>

      {erreur && <p className="mt-4 text-sm text-danger">{erreur}</p>}

      {stats && (
        <div className="mt-6 space-y-6">
          <div className="grid grid-cols-3 gap-3">
            <div className="carte text-center">
              <p className="text-2xl font-bold text-educia-700">{stats.utilisateurs.eleves}</p>
              <p className="text-xs text-slate-500">élèves</p>
            </div>
            <div className="carte text-center">
              <p className="text-2xl font-bold text-educia-700">{stats.utilisateurs.parents}</p>
              <p className="text-xs text-slate-500">parents</p>
            </div>
            <div className="carte text-center">
              <p className="text-2xl font-bold text-educia-700">{stats.utilisateurs.enseignants}</p>
              <p className="text-xs text-slate-500">enseignants</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Object.entries(stats.contenu).map(([cle, valeur]) => (
              <div key={cle} className="carte text-center">
                <p className="text-xl font-bold text-slate-900">{valeur}</p>
                <p className="text-xs capitalize text-slate-500">{cle}</p>
              </div>
            ))}
          </div>

          <div className="carte">
            <h2 className="mb-3 text-sm font-semibold uppercase text-slate-500">Répartition par niveau</h2>
            <div className="space-y-2">
              {stats.repartitionNiveaux.map((r) => (
                <div key={r.niveau} className="flex items-center justify-between text-sm">
                  <span>{definitionNiveau(r.niveau as any)?.libelle ?? r.niveau}</span>
                  <span className="font-semibold text-slate-700">{r.nombre}</span>
                </div>
              ))}
              {stats.repartitionNiveaux.length === 0 && <p className="text-sm text-slate-400">Aucun élève inscrit pour le moment.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
