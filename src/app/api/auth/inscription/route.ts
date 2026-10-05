import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { creerJetonSession, poserCookieSession } from "@/lib/auth";
import type { Niveau } from "@prisma/client";

const schemaCreationProfil = z.object({
  role: z.enum(["ELEVE", "PARENT", "ENSEIGNANT"]),
  prenom: z.string().min(1, "Le prénom est requis"),
  nom: z.string().min(1, "Le nom est requis"),
  niveau: z.string().optional(),
  etablissement: z.string().optional(),
});

/**
 * Crée un profil familial sans email ni mot de passe : usage domestique,
 * chaque membre se nomme simplement pour que ses activités soient
 * rattachées à son profil et visibles par les parents qui le suivent.
 */
export async function POST(requete: NextRequest) {
  const corps = await requete.json().catch(() => null);
  const analyse = schemaCreationProfil.safeParse(corps);
  if (!analyse.success) {
    return NextResponse.json({ erreur: analyse.error.issues[0]?.message ?? "Requête invalide" }, { status: 400 });
  }

  const donnees = analyse.data;
  if (donnees.role === "ELEVE" && !donnees.niveau) {
    return NextResponse.json({ erreur: "Le niveau scolaire est requis pour un profil élève" }, { status: 400 });
  }

  const utilisateur = await prisma.utilisateur.create({
    data: {
      role: donnees.role,
      prenom: donnees.prenom,
      nom: donnees.nom,
      ...(donnees.role === "ELEVE"
        ? { eleve: { create: { niveau: donnees.niveau as Niveau, etablissement: donnees.etablissement } } }
        : {}),
      ...(donnees.role === "PARENT" ? { parent: { create: {} } } : {}),
      ...(donnees.role === "ENSEIGNANT" ? { enseignant: { create: { etablissement: donnees.etablissement } } } : {}),
    },
    include: { eleve: true, parent: true, enseignant: true },
  });

  const jeton = await creerJetonSession({
    utilisateurId: utilisateur.id,
    role: utilisateur.role,
    prenom: utilisateur.prenom,
    nom: utilisateur.nom,
  });
  await poserCookieSession(jeton);

  return NextResponse.json({
    utilisateur: {
      id: utilisateur.id,
      prenom: utilisateur.prenom,
      nom: utilisateur.nom,
      role: utilisateur.role,
      codeLiaisonEleve: utilisateur.eleve ? utilisateur.eleve.id.slice(-8).toUpperCase() : undefined,
    },
  });
}
