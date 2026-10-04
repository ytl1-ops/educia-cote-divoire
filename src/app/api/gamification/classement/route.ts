import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigerEleve, reponseErreur } from "@/lib/securite-api";

/**
 * Classement par niveau scolaire (l'élève ne se compare qu'à des pairs du
 * même niveau — jamais entre niveaux différents, pour un classement
 * pédagogiquement pertinent et motivant plutôt que décourageant).
 */
export async function GET() {
  try {
    const { eleve } = await exigerEleve();

    const classement = await prisma.eleve.findMany({
      where: { niveau: eleve.niveau },
      orderBy: { points: "desc" },
      take: 20,
      include: { utilisateur: true },
    });

    return NextResponse.json({
      classement: classement.map((e, index) => ({
        rang: index + 1,
        prenom: e.utilisateur.prenom,
        points: e.points,
        niveauGamification: e.niveauGamification,
        estMoi: e.id === eleve.id,
      })),
    });
  } catch (erreur) {
    return reponseErreur(erreur);
  }
}
