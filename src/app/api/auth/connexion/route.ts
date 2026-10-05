import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifierMotDePasse, creerJetonSession, poserCookieSession } from "@/lib/auth";

const schemaConnexion = z.object({
  identifiant: z.string().min(1, "Email ou téléphone requis"),
  motDePasse: z.string().min(1, "Mot de passe requis"),
});

export async function POST(requete: NextRequest) {
  const corps = await requete.json().catch(() => null);
  const analyse = schemaConnexion.safeParse(corps);
  if (!analyse.success) {
    return NextResponse.json({ erreur: analyse.error.issues[0]?.message ?? "Requête invalide" }, { status: 400 });
  }

  const { identifiant, motDePasse } = analyse.data;
  const utilisateur = await prisma.utilisateur.findFirst({
    where: { OR: [{ email: identifiant }, { telephone: identifiant }] },
  });

  if (!utilisateur || !utilisateur.motDePasseH || !(await verifierMotDePasse(motDePasse, utilisateur.motDePasseH))) {
    return NextResponse.json({ erreur: "Identifiants incorrects" }, { status: 401 });
  }

  if (!utilisateur.actif) {
    return NextResponse.json({ erreur: "Ce compte a été désactivé. Contactez un administrateur." }, { status: 403 });
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
