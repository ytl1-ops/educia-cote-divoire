import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigerSession, reponseErreur, ErreurAPI } from "@/lib/securite-api";

export const dynamic = "force-dynamic";

/** Liste, pour le parent en session, les enfants déjà suivis et les profils élève disponibles à ajouter. */
export async function GET() {
  try {
    const session = await exigerSession(["PARENT"]);
    const parent = await prisma.parent.findUnique({ where: { utilisateurId: session.utilisateurId } });
    if (!parent) throw new ErreurAPI(404, "Profil parent introuvable");

    const tousLesEleves = await prisma.eleve.findMany({
      include: { utilisateur: true },
      orderBy: { utilisateur: { prenom: "asc" } },
    });
    const relations = await prisma.relationParentEleve.findMany({ where: { parentId: parent.id } });
    const idsLies = new Set(relations.map((r) => r.eleveId));

    const versProfil = (e: (typeof tousLesEleves)[number]) => ({
      id: e.id,
      prenom: e.utilisateur.prenom,
      nom: e.utilisateur.nom,
      niveau: e.niveau,
    });

    return NextResponse.json({
      lies: tousLesEleves.filter((e) => idsLies.has(e.id)).map(versProfil),
      disponibles: tousLesEleves.filter((e) => !idsLies.has(e.id)).map(versProfil),
    });
  } catch (erreur) {
    return reponseErreur(erreur);
  }
}
