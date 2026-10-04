"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { appelAPI } from "@/lib/client-api";
import { matieresDuNiveau, definitionNiveau } from "@/lib/programmes/curriculum";

interface DonneesProgres {
  points: number;
  niveauGamification: number;
  pointsPourNiveauSuivant: number;
  streakJours: number;
  badges: { nom: string; icone: string }[];
}

interface Utilisateur {
  prenom: string;
  eleve?: { niveau: string };
}

export default function TableauDeBordEleve() {
  const [utilisateur, setUtilisateur] = useState<Utilisateur | null>(null);
  const [progres, setProgres] = useState<DonneesProgres | null>(null);

  useEffect(() => {
    appelAPI<{ utilisateur: Utilisateur }>("/api/auth/moi").then((d) => setUtilisateur(d.utilisateur));
    appelAPI<DonneesProgres>("/api/eleves/progres").then(setProgres).catch(() => {});
  }, []);

  const niveau = utilisateur?.eleve?.niveau ? definitionNiveau(utilisateur.eleve.niveau as any) : undefined;
  const matieres = utilisateur?.eleve?.niveau ? matieresDuNiveau(utilisateur.eleve.niveau as any) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          {utilisateur ? `Salut ${utilisateur.prenom} 👋` : "Chargement…"}
        </h1>
        <p className="text-slate-500">{niveau ? `${niveau.libelle} — prêt(e) à progresser aujourd'hui ?` : ""}</p>
      </div>

      {progres && (
        <div className="grid grid-cols-3 gap-3">
          <div className="carte text-center">
            <p className="text-2xl font-bold text-educia-700">{progres.points}</p>
            <p className="text-xs text-slate-500">points</p>
          </div>
          <div className="carte text-center">
            <p className="text-2xl font-bold text-educia-700">Niv. {progres.niveauGamification}</p>
            <p className="text-xs text-slate-500">{progres.pointsPourNiveauSuivant - progres.points} pts avant le niveau suivant</p>
          </div>
          <div className="carte text-center">
            <p className="text-2xl font-bold text-educia-700">🔥 {progres.streakJours}</p>
            <p className="text-xs text-slate-500">jours de suite</p>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/eleve/tuteur-ia" className="carte flex items-center gap-3 hover:border-educia-300">
          <span className="text-3xl">🧑‍🏫</span>
          <div>
            <p className="font-semibold text-slate-900">Parler au Professeur IA</p>
            <p className="text-sm text-slate-500">Pose une question, révise une leçon</p>
          </div>
        </Link>
        <Link href="/eleve/importer" className="carte flex items-center gap-3 hover:border-educia-300">
          <span className="text-3xl">📸</span>
          <div>
            <p className="font-semibold text-slate-900">Importer un document</p>
            <p className="text-sm text-slate-500">Photo de cahier, PDF, exercice</p>
          </div>
        </Link>
        <Link href="/eleve/exercices" className="carte flex items-center gap-3 hover:border-educia-300">
          <span className="text-3xl">📝</span>
          <div>
            <p className="font-semibold text-slate-900">S'entraîner</p>
            <p className="text-sm text-slate-500">Exercices générés sur mesure</p>
          </div>
        </Link>
        <Link href="/eleve/examens" className="carte flex items-center gap-3 hover:border-educia-300">
          <span className="text-3xl">🎓</span>
          <div>
            <p className="font-semibold text-slate-900">Examen blanc</p>
            <p className="text-sm text-slate-500">CEPE, BEPC ou BAC</p>
          </div>
        </Link>
      </div>

      {matieres.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Mes matières</h2>
          <div className="flex flex-wrap gap-2">
            {matieres.map((m) => (
              <span key={m.code} className="rounded-full px-3 py-1.5 text-sm font-medium" style={{ backgroundColor: `${m.couleur}1A`, color: m.couleur }}>
                {m.icone} {m.nom}
              </span>
            ))}
          </div>
        </div>
      )}

      {progres && progres.badges.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Mes badges</h2>
          <div className="flex flex-wrap gap-3">
            {progres.badges.map((b) => (
              <div key={b.nom} className="carte flex flex-col items-center px-4 py-3">
                <span className="text-2xl">{b.icone}</span>
                <span className="mt-1 text-xs font-medium text-slate-600">{b.nom}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
