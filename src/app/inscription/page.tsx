"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { appelAPI } from "@/lib/client-api";
import { NIVEAUX, CodeNiveau } from "@/lib/programmes/curriculum";

const ACCUEIL_PAR_ROLE: Record<string, string> = {
  ELEVE: "/eleve/tableau-de-bord",
  PARENT: "/parent/tableau-de-bord",
  ENSEIGNANT: "/enseignant/tableau-de-bord",
};

export default function PageInscription() {
  const routeur = useRouter();
  const [role, setRole] = useState<"ELEVE" | "PARENT" | "ENSEIGNANT">("ELEVE");
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [niveau, setNiveau] = useState<CodeNiveau>(NIVEAUX[0].code);
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);
  const [codeLiaison, setCodeLiaison] = useState<string | null>(null);

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setChargement(true);
    try {
      const { utilisateur } = await appelAPI<{ utilisateur: { role: string; codeLiaisonEleve?: string } }>(
        "/api/auth/inscription",
        { method: "POST", corpsJSON: { role, prenom, nom, niveau: role === "ELEVE" ? niveau : undefined } }
      );
      if (utilisateur.codeLiaisonEleve) {
        setCodeLiaison(utilisateur.codeLiaisonEleve);
        return;
      }
      routeur.push(ACCUEIL_PAR_ROLE[utilisateur.role] ?? "/");
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setChargement(false);
    }
  }

  if (codeLiaison) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="carte w-full max-w-sm text-center">
          <div className="text-4xl">🎉</div>
          <h1 className="mt-3 text-lg font-bold text-slate-900">Profil créé !</h1>
          <p className="mt-2 text-sm text-slate-600">
            Communique ce code à tes parents pour qu&apos;ils puissent suivre tes progrès :
          </p>
          <p className="mt-3 rounded-lg bg-educia-50 py-3 text-2xl font-bold tracking-widest text-educia-700">{codeLiaison}</p>
          <button className="bouton-primaire mt-6 w-full" onClick={() => routeur.push("/eleve/tableau-de-bord")}>
            Accéder à mon tableau de bord
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="carte w-full max-w-sm">
        <h1 className="text-xl font-bold text-slate-900">Nouveau profil EDUCIA</h1>
        <p className="mt-1 text-sm text-slate-500">Usage familial : indique simplement ton prénom, aucun mot de passe nécessaire.</p>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {(["ELEVE", "PARENT", "ENSEIGNANT"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={`rounded-lg border px-2 py-2 text-xs font-semibold ${
                role === r ? "border-educia-600 bg-educia-50 text-educia-700" : "border-slate-200 text-slate-500"
              }`}
            >
              {{ ELEVE: "Élève", PARENT: "Parent", ENSEIGNANT: "Enseignant" }[r]}
            </button>
          ))}
        </div>

        <form className="mt-5 space-y-4" onSubmit={soumettre}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="etiquette">Prénom</label>
              <input className="champ-saisie" value={prenom} onChange={(e) => setPrenom(e.target.value)} required />
            </div>
            <div>
              <label className="etiquette">Nom</label>
              <input className="champ-saisie" value={nom} onChange={(e) => setNom(e.target.value)} required />
            </div>
          </div>
          {role === "ELEVE" && (
            <div>
              <label className="etiquette">Niveau scolaire</label>
              <select className="champ-saisie" value={niveau} onChange={(e) => setNiveau(e.target.value as CodeNiveau)}>
                {NIVEAUX.map((n) => (
                  <option key={n.code} value={n.code}>
                    {n.libelle}
                  </option>
                ))}
              </select>
            </div>
          )}
          {erreur && <p className="text-sm text-danger">{erreur}</p>}
          <button className="bouton-primaire w-full" disabled={chargement} type="submit">
            {chargement ? "Création…" : "Créer mon profil"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Déjà un profil ?{" "}
          <Link href="/connexion" className="font-semibold text-educia-700">
            Retour à la sélection
          </Link>
        </p>
      </div>
    </main>
  );
}
