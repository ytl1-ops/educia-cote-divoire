"use client";

import { useEffect, useState } from "react";
import { appelAPI } from "@/lib/client-api";
import { NIVEAUX } from "@/lib/programmes/curriculum";

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
  id: string;
  prenom: string;
  nom: string;
  niveau: string;
}

function libelleNiveau(code: string) {
  return NIVEAUX.find((n) => n.code === code)?.libelle ?? code;
}

export default function TableauDeBordParent() {
  const [lies, setLies] = useState<EnfantLie[] | null>(null);
  const [disponibles, setDisponibles] = useState<EnfantLie[]>([]);
  const [eleveId, setEleveId] = useState<string | null>(null);
  const [rapport, setRapport] = useState<Rapport | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);

  async function chargerEnfants() {
    const { lies: l, disponibles: d } = await appelAPI<{ lies: EnfantLie[]; disponibles: EnfantLie[] }>("/api/parents/enfants");
    setLies(l);
    setDisponibles(d);
    if (l.length > 0 && !eleveId) {
      setEleveId(l[0].id);
      await chargerRapport(l[0].id, "HEBDOMADAIRE");
    }
  }

  useEffect(() => {
    chargerEnfants().catch((e) => setErreur((e as Error).message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function suivreEnfant(id: string) {
    setChargement(true);
    setErreur(null);
    try {
      await appelAPI("/api/parents/lier", { method: "POST", corpsJSON: { eleveId: id } });
      await chargerEnfants();
      setEleveId(id);
      await chargerRapport(id, "HEBDOMADAIRE");
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

  function changerEnfant(id: string) {
    setEleveId(id);
    chargerRapport(id, "HEBDOMADAIRE").catch((e) => setErreur((e as Error).message));
  }

  const enfantCourant = lies?.find((e) => e.id === eleveId) ?? null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Suivi de mes enfants</h1>
        <p className="text-sm text-slate-500">Choisissez un profil élève pour le suivre — aucun code requis.</p>
      </div>

      {erreur && <p className="text-sm text-danger">{erreur}</p>}

      {lies && lies.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {lies.map((e) => (
            <button
              key={e.id}
              onClick={() => changerEnfant(e.id)}
              className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${
                eleveId === e.id ? "border-educia-600 bg-educia-50 text-educia-700" : "border-slate-200 text-slate-500"
              }`}
            >
              {e.prenom}
            </button>
          ))}
        </div>
      )}

      {disponibles.length > 0 && (
        <div className="carte">
          <h2 className="text-sm font-semibold text-slate-900">
            {lies && lies.length > 0 ? "Suivre un autre profil" : "Choisissez le profil de votre enfant"}
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {disponibles.map((e) => (
              <button
                key={e.id}
                onClick={() => suivreEnfant(e.id)}
                disabled={chargement}
                className="flex flex-col items-center gap-1 rounded-lg border border-dashed border-slate-300 px-3 py-3 text-center hover:border-educia-400 hover:bg-educia-50 disabled:opacity-50"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-educia-600 text-sm font-bold text-white">
                  {e.prenom.charAt(0).toUpperCase()}
                </span>
                <span className="text-sm font-semibold text-slate-900">{e.prenom}</span>
                <span className="text-xs text-slate-500">{libelleNiveau(e.niveau)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {lies && lies.length === 0 && disponibles.length === 0 && (
        <p className="text-sm text-slate-500">
          Aucun profil élève n&apos;existe encore. Demandez à votre enfant de créer le sien depuis l&apos;écran de connexion
          (bouton « Nouveau profil »), il apparaîtra automatiquement ici.
        </p>
      )}

      {rapport && enfantCourant && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Suivi de {enfantCourant.prenom}</h2>
            <div className="flex gap-2 text-xs">
              <button className="bouton-secondaire px-3 py-1.5" onClick={() => chargerRapport(enfantCourant.id, "HEBDOMADAIRE")}>
                Semaine
              </button>
              <button className="bouton-secondaire px-3 py-1.5" onClick={() => chargerRapport(enfantCourant.id, "MENSUEL")}>
                Mois
              </button>
            </div>
          </div>

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
