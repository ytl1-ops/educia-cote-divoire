"use client";

import { useEffect, useState } from "react";
import { appelAPI } from "@/lib/client-api";

interface DonneesProgres {
  points: number;
  niveauGamification: number;
  pointsPourNiveauSuivant: number;
  streakJours: number;
  progressionParMatiere: { matiere: string; total: number; reussies: number }[];
  profilsApprentissage: { matiere: string; pointsForts: string[]; difficultes: string[] }[];
  badges: { nom: string; icone: string; dateObtention: string }[];
}

export default function PageProgres() {
  const [donnees, setDonnees] = useState<DonneesProgres | null>(null);

  useEffect(() => {
    appelAPI<DonneesProgres>("/api/eleves/progres").then(setDonnees);
  }, []);

  if (!donnees) return <p className="text-sm text-slate-400">Chargement…</p>;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-xl font-bold text-slate-900">Mes progrès</h1>

      <div className="carte">
        <h2 className="mb-3 text-sm font-semibold uppercase text-slate-500">Réussite par matière</h2>
        <div className="space-y-3">
          {donnees.progressionParMatiere.length === 0 && <p className="text-sm text-slate-400">Pas encore de données — lance-toi sur un exercice !</p>}
          {donnees.progressionParMatiere.map((m) => {
            const pct = m.total ? Math.round((m.reussies / m.total) * 100) : 0;
            return (
              <div key={m.matiere}>
                <div className="flex justify-between text-sm">
                  <span>{m.matiere}</span>
                  <span className="text-slate-500">
                    {m.reussies}/{m.total} ({pct}%)
                  </span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-slate-100">
                  <div className="h-2 rounded-full bg-educia-500" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="carte">
        <h2 className="mb-3 text-sm font-semibold uppercase text-slate-500">Points forts & difficultés</h2>
        {donnees.profilsApprentissage.length === 0 && <p className="text-sm text-slate-400">Pas encore assez de données.</p>}
        {donnees.profilsApprentissage.map((p) => (
          <div key={p.matiere} className="mb-3">
            <p className="font-medium text-slate-800">{p.matiere}</p>
            {p.difficultes.length > 0 && (
              <p className="text-sm text-alerte">⚠️ À retravailler : {p.difficultes.slice(0, 2).join(", ")}</p>
            )}
            {p.pointsForts.length > 0 && <p className="text-sm text-succes">✅ Maîtrisé : {p.pointsForts.slice(0, 2).join(", ")}</p>}
          </div>
        ))}
      </div>

      <div className="carte">
        <h2 className="mb-3 text-sm font-semibold uppercase text-slate-500">Badges obtenus</h2>
        <div className="flex flex-wrap gap-3">
          {donnees.badges.length === 0 && <p className="text-sm text-slate-400">Aucun badge encore — continue à t'entraîner !</p>}
          {donnees.badges.map((b) => (
            <div key={b.nom} className="flex flex-col items-center rounded-lg bg-educia-50 px-4 py-3">
              <span className="text-2xl">{b.icone}</span>
              <span className="mt-1 text-xs font-medium text-educia-800">{b.nom}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
