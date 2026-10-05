"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { appelAPI } from "@/lib/client-api";
import { NIVEAUX } from "@/lib/programmes/curriculum";

const ACCUEIL_PAR_ROLE: Record<string, string> = {
  ELEVE: "/eleve/tableau-de-bord",
  PARENT: "/parent/tableau-de-bord",
  ENSEIGNANT: "/enseignant/tableau-de-bord",
};

const LIBELLE_ROLE: Record<string, string> = {
  ELEVE: "Élève",
  PARENT: "Parent",
  ENSEIGNANT: "Enseignant",
};

const COULEUR_ROLE: Record<string, string> = {
  ELEVE: "bg-educia-100 text-educia-700",
  PARENT: "bg-amber-100 text-amber-700",
  ENSEIGNANT: "bg-emerald-100 text-emerald-700",
};

interface Profil {
  id: string;
  prenom: string;
  nom: string;
  role: "ELEVE" | "PARENT" | "ENSEIGNANT";
  niveau: string | null;
}

function initiales(prenom: string, nom: string) {
  return `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase();
}

export default function PageConnexion() {
  const routeur = useRouter();
  const [profils, setProfils] = useState<Profil[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [connexionEnCours, setConnexionEnCours] = useState<string | null>(null);

  useEffect(() => {
    appelAPI<{ profils: Profil[] }>("/api/auth/profils")
      .then((r) => setProfils(r.profils))
      .catch((e) => setErreur((e as Error).message));
  }, []);

  async function choisirProfil(id: string, role: string) {
    setErreur(null);
    setConnexionEnCours(id);
    try {
      await appelAPI("/api/auth/connexion-profil", { method: "POST", corpsJSON: { utilisateurId: id } });
      routeur.push(ACCUEIL_PAR_ROLE[role] ?? "/");
    } catch (e) {
      setErreur((e as Error).message);
      setConnexionEnCours(null);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">Qui es-tu ?</h1>
          <p className="mt-1 text-sm text-slate-500">Choisis ton profil pour accéder à EDUCIA. Aucun mot de passe requis.</p>
        </div>

        {erreur && <p className="mt-4 text-center text-sm text-danger">{erreur}</p>}

        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {profils?.map((p) => (
            <button
              key={p.id}
              onClick={() => choisirProfil(p.id, p.role)}
              disabled={connexionEnCours !== null}
              className="carte flex flex-col items-center gap-2 py-5 text-center transition hover:border-educia-400 hover:shadow-md disabled:opacity-50"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-educia-600 text-lg font-bold text-white">
                {initiales(p.prenom, p.nom)}
              </span>
              <span className="font-semibold text-slate-900">{p.prenom}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${COULEUR_ROLE[p.role]}`}>
                {LIBELLE_ROLE[p.role]}
                {p.niveau ? ` · ${NIVEAUX.find((n) => n.code === p.niveau)?.libelle ?? p.niveau}` : ""}
              </span>
              {connexionEnCours === p.id && <span className="text-xs text-slate-400">Connexion…</span>}
            </button>
          ))}

          <Link
            href="/inscription"
            className="carte flex flex-col items-center justify-center gap-2 border-dashed py-5 text-center text-educia-700 hover:border-educia-400 hover:bg-educia-50"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed border-educia-400 text-2xl">
              +
            </span>
            <span className="font-semibold">Nouveau profil</span>
          </Link>
        </div>

        {profils && profils.length === 0 && (
          <p className="mt-6 text-center text-sm text-slate-500">
            Aucun profil pour l&apos;instant — crée le premier avec le bouton ci-dessus.
          </p>
        )}

        <p className="mt-10 text-center text-xs text-slate-400">
          <Link href="/admin/connexion" className="hover:text-slate-600">
            Accès administrateur
          </Link>
        </p>
      </div>
    </main>
  );
}
