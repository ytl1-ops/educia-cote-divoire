"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { appelAPI } from "@/lib/client-api";

export default function PageConnexionAdmin() {
  const routeur = useRouter();
  const [identifiant, setIdentifiant] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setChargement(true);
    try {
      const { utilisateur } = await appelAPI<{ utilisateur: { role: string } }>("/api/auth/connexion", {
        method: "POST",
        corpsJSON: { identifiant, motDePasse },
      });
      if (utilisateur.role !== "ADMIN") {
        setErreur("Ce compte n'a pas les droits administrateur.");
        return;
      }
      routeur.push("/admin/tableau-de-bord");
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setChargement(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="carte w-full max-w-sm">
        <h1 className="text-xl font-bold text-slate-900">Accès administrateur</h1>
        <p className="mt-1 text-sm text-slate-500">Réservé à la gestion de la plateforme EDUCIA.</p>

        <form className="mt-6 space-y-4" onSubmit={soumettre}>
          <div>
            <label className="etiquette">Email</label>
            <input className="champ-saisie" value={identifiant} onChange={(e) => setIdentifiant(e.target.value)} required />
          </div>
          <div>
            <label className="etiquette">Mot de passe</label>
            <input
              type="password"
              className="champ-saisie"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              required
            />
          </div>
          {erreur && <p className="text-sm text-danger">{erreur}</p>}
          <button className="bouton-primaire w-full" disabled={chargement} type="submit">
            {chargement ? "Connexion…" : "Se connecter"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          <Link href="/connexion" className="font-semibold text-educia-700">
            ← Retour à la sélection de profil
          </Link>
        </p>
      </div>
    </main>
  );
}
