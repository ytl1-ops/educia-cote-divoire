import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigerSession, reponseErreur } from "@/lib/securite-api";

export async function GET() {
  try {
    await exigerSession(["ADMIN"]);

    const [nbEleves, nbParents, nbEnseignants, nbDocuments, nbExercices, nbSessionsTuteur, nbEvaluations, repartitionNiveaux] =
      await Promise.all([
        prisma.eleve.count(),
        prisma.parent.count(),
        prisma.enseignant.count(),
        prisma.document.count(),
        prisma.exercice.count(),
        prisma.sessionTuteurIA.count(),
        prisma.evaluation.count(),
        prisma.eleve.groupBy({ by: ["niveau"], _count: { _all: true } }),
      ]);

    return NextResponse.json({
      utilisateurs: { eleves: nbEleves, parents: nbParents, enseignants: nbEnseignants },
      contenu: { documents: nbDocuments, exercices: nbExercices, sessionsTuteur: nbSessionsTuteur, evaluations: nbEvaluations },
      repartitionNiveaux: repartitionNiveaux.map((r) => ({ niveau: r.niveau, nombre: r._count._all })),
    });
  } catch (erreur) {
    return reponseErreur(erreur);
  }
}
