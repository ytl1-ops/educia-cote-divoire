"use client";

import { useRef, useState } from "react";
import Link from "next/link";

interface DocumentAnalyse {
  id: string;
  nomFichier: string;
  statutAnalyse: "EN_ATTENTE" | "EN_COURS" | "TERMINEE" | "ECHEC";
  texteExtrait?: string | null;
  messageErreur?: string | null;
  matiereDetectee?: { nom: string; icone: string } | null;
  niveauDetecte?: string | null;
  ressources?: { contenuJson: any }[];
}

export default function PageImporter() {
  const entreeFichier = useRef<HTMLInputElement>(null);
  const entreeCamera = useRef<HTMLInputElement>(null);
  const [enCours, setEnCours] = useState(false);
  const [resultat, setResultat] = useState<DocumentAnalyse | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  async function importer(fichier: File) {
    setEnCours(true);
    setErreur(null);
    setResultat(null);
    try {
      const formulaire = new FormData();
      formulaire.append("fichier", fichier);
      const reponse = await fetch("/api/documents", { method: "POST", body: formulaire, credentials: "include" });
      const donnees = await reponse.json();
      if (!reponse.ok) throw new Error(donnees.erreur || "Échec de l'import");
      setResultat(donnees.document);
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Importer un document</h1>
        <p className="mt-1 text-sm text-slate-500">
          Photo de cahier, scan, PDF, image… EDUCIA lit le contenu et l'analyse automatiquement.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          className="carte flex flex-col items-center gap-2 py-8 hover:border-educia-300"
          onClick={() => entreeCamera.current?.click()}
          disabled={enCours}
        >
          <span className="text-3xl">📷</span>
          <span className="text-sm font-semibold">Prendre une photo</span>
        </button>
        <button
          className="carte flex flex-col items-center gap-2 py-8 hover:border-educia-300"
          onClick={() => entreeFichier.current?.click()}
          disabled={enCours}
        >
          <span className="text-3xl">📁</span>
          <span className="text-sm font-semibold">Choisir un fichier</span>
        </button>
      </div>

      <input
        ref={entreeCamera}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && importer(e.target.files[0])}
      />
      <input
        ref={entreeFichier}
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.webp,.txt,.csv"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && importer(e.target.files[0])}
      />

      {enCours && (
        <div className="carte text-center text-sm text-slate-500">
          Analyse en cours — lecture du texte, détection de la matière et du chapitre…
        </div>
      )}

      {erreur && <div className="carte border-danger/30 bg-danger/5 text-sm text-danger">{erreur}</div>}

      {resultat && (
        <div className="carte space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-slate-900">{resultat.nomFichier}</p>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                resultat.statutAnalyse === "TERMINEE"
                  ? "bg-succes/10 text-succes"
                  : resultat.statutAnalyse === "ECHEC"
                    ? "bg-danger/10 text-danger"
                    : "bg-alerte/10 text-alerte"
              }`}
            >
              {resultat.statutAnalyse}
            </span>
          </div>

          {resultat.matiereDetectee && (
            <p className="text-sm text-slate-600">
              Matière détectée : <strong>{resultat.matiereDetectee.icone} {resultat.matiereDetectee.nom}</strong>
              {resultat.niveauDetecte ? ` · ${resultat.niveauDetecte}` : ""}
            </p>
          )}

          {resultat.messageErreur && <p className="text-sm text-danger">{resultat.messageErreur}</p>}

          {resultat.texteExtrait && (
            <details className="text-sm text-slate-600">
              <summary className="cursor-pointer font-medium text-educia-700">Voir le texte extrait</summary>
              <p className="mt-2 whitespace-pre-wrap">{resultat.texteExtrait}</p>
            </details>
          )}

          {resultat.statutAnalyse === "TERMINEE" && (
            <Link href={`/eleve/exercices?documentId=${resultat.id}`} className="bouton-primaire mt-2 inline-flex w-full">
              Générer des exercices à partir de ce document
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
