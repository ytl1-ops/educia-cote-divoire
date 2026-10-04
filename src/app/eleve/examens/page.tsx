"use client";

import { useState } from "react";
import { appelAPI } from "@/lib/client-api";
import { EXAMENS_NATIONAUX } from "@/lib/programmes/curriculum";

interface Epreuve {
  matiereCode: string;
  dureeMinutes: number;
  bareme: number;
  exercices: { enonce: string; solutionDetaillee: string }[];
}

export default function PageExamens() {
  const [chargement, setChargement] = useState<string | null>(null);
  const [epreuves, setEpreuves] = useState<Epreuve[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  async function genererExamen(code: string) {
    setChargement(code);
    setErreur(null);
    setEpreuves(null);
    try {
      const { epreuves } = await appelAPI<{ epreuves: Epreuve[] }>("/api/examens/generer", {
        method: "POST",
        corpsJSON: { codeExamen: code },
      });
      setEpreuves(epreuves);
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setChargement(null);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Examens blancs</h1>
        <p className="mt-1 text-sm text-slate-500">Génère un examen blanc complet, dans l'esprit des épreuves officielles.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {EXAMENS_NATIONAUX.map((ex) => (
          <button
            key={ex.code}
            className="carte text-left hover:border-educia-300"
            onClick={() => genererExamen(ex.code)}
            disabled={chargement !== null}
          >
            <p className="text-lg font-bold text-educia-700">{ex.code}</p>
            <p className="text-sm text-slate-500">{ex.nom}</p>
            {chargement === ex.code && <p className="mt-2 text-xs text-slate-400">Génération en cours (peut prendre 1-2 min)…</p>}
          </button>
        ))}
      </div>

      {erreur && <p className="text-sm text-danger">{erreur}</p>}

      {epreuves && (
        <div className="space-y-4">
          {epreuves.map((ep) => (
            <div key={ep.matiereCode} className="carte">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-slate-900">{ep.matiereCode}</h2>
                <span className="text-xs text-slate-500">
                  {ep.dureeMinutes} min · /{ep.bareme}
                </span>
              </div>
              <ol className="mt-3 space-y-3 list-decimal pl-5">
                {ep.exercices.map((item, i) => (
                  <li key={i} className="text-sm text-slate-700">
                    <p className="whitespace-pre-wrap">{item.enonce}</p>
                    <details className="mt-1 text-xs text-slate-500">
                      <summary className="cursor-pointer text-educia-700">Voir la solution détaillée</summary>
                      <p className="mt-1 whitespace-pre-wrap">{item.solutionDetaillee}</p>
                    </details>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
