import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { creerJetonSession, poserCookieSession } from "@/lib/auth";

const schema = z.object({ utilisateurId: z.string().min(1) });

/**
 * Connexion sans mot de passe : l'utilisateur choisit son profil dans la
 * liste familiale. L'administrateur en est exclu — il garde la connexion
 * par mot de passe (/admin/connexion) pour protéger l'accès plateforme.
 */
export async function POST(requete: NextRequest) {
  const corps = await requete.json().catch(() => null);
  const analyse = schema.safeParse(corps);
  if (!analyse.success) {
    return NextResponse.json({ erreur: "Requête invalide" }, { status: 400 });
  }

  const utilisateur = await prisma.utilisateur.findUnique({ where: { id: analyse.data.utilisateurId } });
  if (!utilisateur || utilisateur.role === "ADMIN") {
    return NextResponse.json({ erreur: "Profil introuvable" }, { status: 404 });
  }
  if (!utilisateur.actif) {
    return NextResponse.json({ erreur: "Ce profil a été désactivé." }, { status: 403 });
  }

  await prisma.utilisateur.update({ where: { id: utilisateur.id }, data: { derniereConnexion: new Date() } });

  const jeton = await creerJetonSession({
    utilisateurId: utilisateur.id,
    role: utilisateur.role,
    prenom: utilisateur.prenom,
    nom: utilisateur.nom,
  });
  await poserCookieSession(jeton);

  return NextResponse.json({
    utilisateur: { id: utilisateur.id, prenom: utilisateur.prenom, nom: utilisateur.nom, role: utilisateur.role },
  });
}
