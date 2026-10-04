import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hacherMotDePasse, creerJetonSession, poserCookieSession } from "@/lib/auth";
import type { Niveau } from "@prisma/client";

const schemaInscription = z.object({
  role: z.enum(["ELEVE", "PARENT", "ENSEIGNANT"]),
  prenom: z.string().min(1, "Le prénom est requis"),
  nom: z.string().min(1, "Le nom est requis"),
  email: z.string().email("Email invalide").optional(),
  telephone: z.string().min(8, "Numéro de téléphone invalide").optional(),
  motDePasse: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
  niveau: z.string().optional(),
  etablissement: z.string().optional(),
});

export async function POST(requete: NextRequest) {
  const corps = await requete.json().catch(() => null);
  const analyse = schemaInscription.safeParse(corps);
  if (!analyse.success) {
    return NextResponse.json({ erreur: analyse.error.issues[0]?.message ?? "Requête invalide" }, { status: 400 });
  }

  const donnees = analyse.data;
  if (!donnees.email && !donnees.telephone) {
    return NextResponse.json({ erreur: "Un email ou un numéro de téléphone est requis" }, { status: 400 });
  }

  if (donnees.role === "ELEVE" && !donnees.niveau) {
    return NextResponse.json({ erreur: "Le niveau scolaire est requis pour un compte élève" }, { status: 400 });
  }

  const existant = await prisma.utilisateur.findFirst({
    where: {
      OR: [donnees.email ? { email: donnees.email } : undefined, donnees.telephone ? { telephone: donnees.telephone } : undefined].filter(
        Boolean
      ) as Array<{ email: string } | { telephone: string }>,
    },
  });
  if (existant) {
    return NextResponse.json({ erreur: "Un compte existe déjà avec cet email ou ce numéro" }, { status: 409 });
  }

  const motDePasseH = await hacherMotDePasse(donnees.motDePasse);

  const utilisateur = await prisma.utilisateur.create({
    data: {
      email: donnees.email,
      telephone: donnees.telephone,
      motDePasseH,
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
