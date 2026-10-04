"use client";

import { useState } from "react";
import { appelAPI } from "@/lib/client-api";

interface Rapport {
  eleve: { prenom: string; nom: string; niveau: string };
  periode: string;
  tempsTravailSecondes: number;
  matieresEtudiees: { nom: string; reussies: number; total: number }[];
  nombreExercicesTentes: number;
  tauxReussite: number | null;
  nombreSessionsTuteur: number;
  difficultes: string[];
  recommandations: string[];
  badgesObtenus: string[];
  pointsTotal: number;
  streakJours: number;
}

interface EnfantLie {
  prenom: string;
  nom: string;
  niveau: string;
}

export default function TableauDeBordParent() {
  const [codeLiaison, setCodeLiaison] = useState("");
  const [eleveId, setEleveId] = useState<string | null>(null);
  const [enfant, setEnfant] = useState<EnfantLie | null>(null);
  const [rapport, setRapport] = useState<Rapport | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);

  async function lierEnfant() {
    setChargement(true);
    setErreur(null);
    try {
      const resultat = await appelAPI<{ relation: { eleveId: string }; enfant: EnfantLie }>("/api/parents/lier", {
        method: "POST",
        corpsJSON: { codeLiaison },
      });
      setEleveId(resultat.relation.eleveId);
      setEnfant(resultat.enfant);
      await chargerRapport(resultat.relation.eleveId, "HEBDOMADAIRE");
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setChargement(false);
    }
  }

  async function chargerRapport(id: string, periode: "HEBDOMADAIRE" | "MENSUEL") {
    const { rapport } = await appelAPI<{ rapport: Rapport }>(`/api/parents/rapport?eleveId=${id}&periode=${periode}`);
    setRapport(rapport);
  }

  if (!eleveId) {
    return (
      <div className="mx-auto max-w-sm">
        <h1 className="text-xl font-bold text-slate-900">Suivre mon enfant</h1>
        <p className="mt-1 text-sm text-slate-500">Entrez le code de liaison affiché dans le profil de votre enfant.</p>
        <div className="carte mt-4">
          <label className="etiquette">Code de liaison</label>
          <input className="champ-saisie uppercase" value={codeLiaison} onChange={(e) => setCodeLiaison(e.target.value)} />
          {erreur && <p className="mt-2 text-sm text-danger">{erreur}</p>}
          <button className="bouton-primaire mt-4 w-full" onClick={lierEnfant} disabled={chargement || !codeLiaison}>
            {chargement ? "Vérification…" : "Lier mon enfant"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">
          {enfant ? `Suivi de ${enfant.prenom}` : "Suivi"}
        </h1>
        <div className="flex gap-2 text-xs">
          <button className="bouton-secondaire px-3 py-1.5" onClick={() => chargerRapport(eleveId, "HEBDOMADAIRE")}>
            Semaine
          </button>
          <button className="bouton-secondaire px-3 py-1.5" onClick={() => chargerRapport(eleveId, "MENSUEL")}>
            Mois
          </button>
        </div>
      </div>

      {rapport && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="carte text-center">
              <p className="text-xl font-bold text-educia-700">{Math.round(rapport.tempsTravailSecondes / 60)} min</p>
              <p className="text-xs text-slate-500">temps de travail</p>
            </div>
            <div className="carte text-center">
              <p className="text-xl font-bold text-educia-700">{rapport.tauxReussite ?? "—"}%</p>
              <p className="text-xs text-slate-500">taux de réussite</p>
            </div>
            <div className="carte text-center">
              <p className="text-xl font-bold text-educia-700">🔥 {rapport.streakJours}</p>
              <p className="text-xs text-slate-500">jours de suite</p>
            </div>
          </div>

          <div className="carte">
            <h2 className="mb-2 text-sm font-semibold uppercase text-slate-500">Matières étudiées</h2>
            {rapport.matieresEtudiees.length === 0 ? (
              <p className="text-sm text-slate-400">Aucune activité sur la période.</p>
            ) : (
              rapport.matieresEtudiees.map((m) => (
                <p key={m.nom} className="text-sm text-slate-700">
                  {m.nom} — {m.reussies}/{m.total} exercices réussis
                </p>
              ))
            )}
          </div>

          <div className="carte">
            <h2 className="mb-2 text-sm font-semibold uppercase text-slate-500">Recommandations</h2>
            <ul className="list-inside list-disc space-y-1 text-sm text-slate-700">
              {rapport.recommandations.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>

          <div className="carte">
            <h2 className="mb-2 text-sm font-semibold uppercase text-slate-500">Badges obtenus</h2>
            <p className="text-sm text-slate-700">{rapport.badgesObtenus.join(", ") || "Aucun badge pour le moment."}</p>
          </div>
        </>
      )}
    </div>
  );
}
