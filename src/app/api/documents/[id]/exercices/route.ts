import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigerEleve, reponseErreur, ErreurAPI } from "@/lib/securite-api";
import { genererJeuExercices } from "@/lib/ai/generateur-exercices";
import type { CodeNiveau } from "@/lib/programmes/curriculum";

export async function POST(requete: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { eleve } = await exigerEleve();
    const { id } = await params;

    const document = await prisma.document.findUnique({
      where: { id },
      include: { matiereDetectee: true, chapitreDetecte: true },
    });

    if (!document || document.eleveId !== eleve.id) throw new ErreurAPI(404, "Document introuvable");
    if (document.statutAnalyse !== "TERMINEE") {
      throw new ErreurAPI(409, "L'analyse de ce document n'est pas encore terminée");
    }
    if (!document.matiereDetecteeId) {
      throw new ErreurAPI(422, "Aucune matière n'a pu être détectée pour ce document — impossible de générer des exercices adaptés");
    }

    const jeu = await genererJeuExercices({
      matiereCode: document.matiereDetectee!.code,
      niveau: (document.niveauDetecte ?? eleve.niveau) as CodeNiveau,
      titreChapitre: document.chapitreDetecte?.titre ?? document.nomFichier,
      contexteSupplementaire: document.texteExtrait ?? undefined,
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
            matiereId: document.matiereDetecteeId!,
            chapitreId: document.chapitreDetecteId,
            niveau: (document.niveauDetecte ?? eleve.niveau) as any,
            difficulte: ex.difficulte,
            enonce: ex.enonce,
            solutionDetaillee: ex.solutionDetaillee,
            explicationPedagogique: ex.explicationPedagogique,
            astuceMemorisation: ex.astuceMemorisation,
            documentSourceId: document.id,
          },
        })
      )
    );

    return NextResponse.json({ exercices: exercicesCrees });
  } catch (erreur) {
    return reponseErreur(erreur);
  }
}
