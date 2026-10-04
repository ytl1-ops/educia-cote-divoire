"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { appelAPI } from "@/lib/client-api";
import { MATIERES } from "@/lib/programmes/curriculum";

interface Exercice {
  id: string;
  enonce: string;
  difficulte: "FACILE" | "INTERMEDIAIRE" | "AVANCE";
}

interface Correction {
  estCorrecte: boolean;
  scorePourcentage: number;
  feedback: string;
  pointsAAmeliorer: string[];
  encouragement: string;
}

const LIBELLE_DIFFICULTE: Record<string, string> = { FACILE: "🟢 Facile", INTERMEDIAIRE: "🟡 Intermédiaire", AVANCE: "🔴 Avancé" };

function CartesExercices({ exercices }: { exercices: Exercice[] }) {
  const [reponses, setReponses] = useState<Record<string, string>>({});
  const [corrections, setCorrections] = useState<Record<string, Correction & { pointsGagnes: number }>>({});
  const [enAttente, setEnAttente] = useState<string | null>(null);

  async function repondre(id: string) {
    setEnAttente(id);
    try {
      const resultat = await appelAPI<{ correction: Correction; pointsGagnes: number }>(`/api/exercices/${id}/repondre`, {
        method: "POST",
        corpsJSON: { reponse: reponses[id] ?? "" },
      });
      setCorrections((c) => ({ ...c, [id]: { ...resultat.correction, pointsGagnes: resultat.pointsGagnes } }));
    } finally {
      setEnAttente(null);
    }
  }

  return (
    <div className="space-y-4">
      {exercices.map((ex, i) => {
        const correction = corrections[ex.id];
        return (
          <div key={ex.id} className="carte">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Exercice {i + 1}</span>
              <span className="text-xs">{LIBELLE_DIFFICULTE[ex.difficulte]}</span>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">{ex.enonce}</p>

            {!correction ? (
              <div className="mt-3 flex gap-2">
                <input
                  className="champ-saisie flex-1"
                  placeholder="Ta réponse…"
                  value={reponses[ex.id] ?? ""}
                  onChange={(e) => setReponses((r) => ({ ...r, [ex.id]: e.target.value }))}
                />
                <button className="bouton-secondaire" disabled={enAttente === ex.id} onClick={() => repondre(ex.id)}>
                  {enAttente === ex.id ? "…" : "Valider"}
                </button>
              </div>
            ) : (
              <div className={`mt-3 rounded-lg p-3 text-sm ${correction.estCorrecte ? "bg-succes/10" : "bg-alerte/10"}`}>
                <p className="font-semibold">{correction.estCorrecte ? "✅ Correct !" : "🤔 Pas tout à fait"}</p>
                <p className="mt-1 text-slate-700">{correction.feedback}</p>
                {correction.pointsAAmeliorer.length > 0 && (
                  <ul className="mt-1 list-inside list-disc text-slate-600">
                    {correction.pointsAAmeliorer.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                )}
                <p className="mt-1 italic text-slate-500">{correction.encouragement}</p>
                <p className="mt-1 text-xs font-semibold text-educia-700">+{correction.pointsGagnes} points</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ContenuPageExercices() {
  const searchParams = useSearchParams();
  const documentId = searchParams.get("documentId");

  const [matiereCode, setMatiereCode] = useState(MATIERES[0].code);
  const [titreChapitre, setTitreChapitre] = useState("");
  const [exercices, setExercices] = useState<Exercice[] | null>(null);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function genererDepuisDocument() {
    if (!documentId) return;
    setChargement(true);
    setErreur(null);
    try {
      const { exercices } = await appelAPI<{ exercices: Exercice[] }>(`/api/documents/${documentId}/exercices`, { method: "POST" });
      setExercices(exercices);
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setChargement(false);
    }
  }

  async function genererLibrement() {
    setChargement(true);
    setErreur(null);
    try {
      const { exercices } = await appelAPI<{ exercices: Exercice[] }>("/api/exercices/generer", {
        method: "POST",
        corpsJSON: { matiereCode, titreChapitre },
      });
      setExercices(exercices);
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setChargement(false);
    }
  }

  if (exercices) return <CartesExercices exercices={exercices} />;

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <h1 className="text-xl font-bold text-slate-900">Exercices</h1>

      {documentId ? (
        <div className="carte">
          <p className="text-sm text-slate-600">
            Générer un jeu de 30 exercices (10 faciles, 10 intermédiaires, 10 avancés) à partir de ton document importé.
          </p>
          <button className="bouton-primaire mt-4 w-full" onClick={genererDepuisDocument} disabled={chargement}>
            {chargement ? "Génération en cours… (peut prendre une minute)" : "Générer les exercices"}
          </button>
        </div>
      ) : (
        <div className="carte space-y-3">
          <div>
            <label className="etiquette">Matière</label>
            <select className="champ-saisie" value={matiereCode} onChange={(e) => setMatiereCode(e.target.value)}>
              {MATIERES.map((m) => (
                <option key={m.code} value={m.code}>
                  {m.icone} {m.nom}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="etiquette">Chapitre / leçon</label>
            <input
              className="champ-saisie"
              placeholder="ex: Les fractions, Le présent de l'indicatif…"
              value={titreChapitre}
              onChange={(e) => setTitreChapitre(e.target.value)}
            />
          </div>
          <button className="bouton-primaire w-full" disabled={chargement || !titreChapitre} onClick={genererLibrement}>
            {chargement ? "Génération en cours… (peut prendre une minute)" : "Générer 30 exercices"}
          </button>
        </div>
      )}

      {erreur && <p className="text-sm text-danger">{erreur}</p>}
    </div>
  );
}

export default function PageExercices() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-400">Chargement…</p>}>
      <ContenuPageExercices />
    </Suspense>
  );
}
