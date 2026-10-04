import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigerEleve, reponseErreur, ErreurAPI } from "@/lib/securite-api";
import { genererJeuExercices } from "@/lib/ai/generateur-exercices";
import type { CodeNiveau } from "@/lib/programmes/curriculum";

const schema = z.object({
  matiereCode: z.string(),
  chapitreId: z.string().optional(),
  titreChapitre: z.string().min(1),
});

/** Génère un jeu d'exercices (10 faciles / 10 intermédiaires / 10 avancés) pour une leçon choisie librement par l'élève, sans document importé. */
export async function POST(requete: NextRequest) {
  try {
    const { eleve } = await exigerEleve();
    const corps = await requete.json().catch(() => null);
    const { matiereCode, chapitreId, titreChapitre } = schema.parse(corps);

    const matiere = await prisma.matiere.findUnique({ where: { code: matiereCode } });
    if (!matiere) throw new ErreurAPI(404, "Matière inconnue");

    const jeu = await genererJeuExercices({
      matiereCode,
      niveau: eleve.niveau as CodeNiveau,
      titreChapitre,
    });

    const tousLesExercices = [
      ...jeu.faciles.map((e) => ({ ...e, difficulte: "FACILE" as const })),
      ...jeu.intermediaires.map((e) => ({ ...e, difficulte: "INTERMEDIAIRE" as const })),
      ...jeu.avances.map((e) => ({ ...e, difficulte: "AVANCE" as const })),
    ];

    const exercicesCrees = await prisma.$transaction(
      tousLesExercices.map((ex) =>
        prisma.exercice.create({
          data: {
            matiereId: matiere.id,
            chapitreId,
            niveau: eleve.niveau,
            difficulte: ex.difficulte,
            enonce: ex.enonce,
            solutionDetaillee: ex.solutionDetaillee,
            explicationPedagogique: ex.explicationPedagogique,
            astuceMemorisation: ex.astuceMemorisation,
          },
        })
      )
    );

    return NextResponse.json({ exercices: exercicesCrees });
  } catch (erreur) {
    return reponseErreur(erreur);
  }
}
