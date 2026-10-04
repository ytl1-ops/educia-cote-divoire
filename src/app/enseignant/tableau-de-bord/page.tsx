"use client";

import { useEffect, useState } from "react";
import { appelAPI } from "@/lib/client-api";

interface Utilisateur {
  prenom: string;
  nom: string;
  enseignant?: { etablissement: string | null };
}

export default function TableauDeBordEnseignant() {
  const [utilisateur, setUtilisateur] = useState<Utilisateur | null>(null);

  useEffect(() => {
    appelAPI<{ utilisateur: Utilisateur }>("/api/auth/moi").then((d) => setUtilisateur(d.utilisateur));
  }, []);

  return (
    <div className="conteneur-page py-8">
      <h1 className="text-xl font-bold text-slate-900">
        {utilisateur ? `Bienvenue, ${utilisateur.prenom} ${utilisateur.nom}` : "Chargement…"}
      </h1>
      <p className="mt-1 text-sm text-slate-500">{utilisateur?.enseignant?.etablissement}</p>

      <div className="carte mt-6">
        <h2 className="font-semibold text-slate-900">Espace enseignant</h2>
        <p className="mt-2 text-sm text-slate-600">
          Cet espace est le socle du compte enseignant (authentification, matières et niveaux enseignés déjà
          modélisés en base — voir <code>prisma/schema.prisma</code>). Les fonctionnalités avancées prévues par le
          cahier des charges restent à construire dans une itération suivante :
        </p>
        <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-slate-600">
          <li>Gestion de classes et suivi collectif des élèves</li>
          <li>Création et correction assistée de devoirs</li>
          <li>Partage de ressources pédagogiques avec les élèves</li>
          <li>Statistiques de classe (difficultés communes, rythme d'apprentissage)</li>
        </ul>
        <p className="mt-3 text-sm text-slate-500">
          Voir <code>docs/ARCHITECTURE.md</code>, section « Pistes d'évolution », pour le détail de ce qui reste à implémenter.
        </p>
      </div>
    </div>
  );
}
