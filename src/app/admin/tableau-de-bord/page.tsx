"use client";

import { useEffect, useState } from "react";
import { appelAPI } from "@/lib/client-api";
import { definitionNiveau } from "@/lib/programmes/curriculum";

interface Statistiques {
  utilisateurs: { eleves: number; parents: number; enseignants: number };
  contenu: { documents: number; exercices: number; sessionsTuteur: number; evaluations: number };
  repartitionNiveaux: { niveau: string; nombre: number }[];
}

export default function TableauDeBordAdmin() {
  const [stats, setStats] = useState<Statistiques | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    appelAPI<Statistiques>("/api/admin/statistiques").then(setStats).catch((e) => setErreur(e.message));
  }, []);

  return (
    <div className="conteneur-page py-8">
      <h1 className="text-xl font-bold text-slate-900">Administration EDUCIA</h1>

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
