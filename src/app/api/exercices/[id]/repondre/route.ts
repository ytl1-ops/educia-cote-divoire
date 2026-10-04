import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigerEleve, reponseErreur, ErreurAPI } from "@/lib/securite-api";
import { corrigerReponseExercice } from "@/lib/ai/correcteur";
import { ajouterPoints, mettreAJourStreak, pointsPourTentative, verifierEtAttribuerBadges } from "@/lib/gamification";
import type { CodeNiveau } from "@/lib/programmes/curriculum";

const schema = z.object({ reponse: z.string().min(1), tempsReponseSecondes: z.number().optional() });

export async function POST(requete: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { eleve } = await exigerEleve();
    const { id } = await params;
    const corps = await requete.json().catch(() => null);
    const { reponse, tempsReponseSecondes } = schema.parse(corps);

    const exercice = await prisma.exercice.findUnique({ where: { id }, include: { matiere: true } });
    if (!exercice) throw new ErreurAPI(404, "Exercice introuvable");

    const correction = await corrigerReponseExercice({
      matiereCode: exercice.matiere.code,
      niveau: exercice.niveau as CodeNiveau,
      enonce: exercice.enonce,
      solutionAttendue: exercice.solutionDetaillee,
      reponseEleve: reponse,
    });

    const nombreTentativesPrecedentes = await prisma.tentativeExercice.count({ where: { eleveId: eleve.id, exerciceId: id } });

    await prisma.tentativeExercice.create({
      data: {
        eleveId: eleve.id,
        exerciceId: id,
        reponseEleve: reponse,
        estCorrecte: correction.estCorrecte,
        tempsReponseSecondes,
        tentativeNumero: nombreTentativesPrecedentes + 1,
      },
    });

    const points = pointsPourTentative(exercice.difficulte, correction.estCorrecte);
    await ajouterPoints(eleve.id, points);
    await mettreAJourStreak(eleve.id);
    const nouveauxBadges = await verifierEtAttribuerBadges(eleve.id);

    // Mise à jour simplifiée du profil d'apprentissage (points forts / difficultés).
    await prisma.profilApprentissage.upsert({
      where: { eleveId_matiereId: { eleveId: eleve.id, matiereId: exercice.matiereId } },
      create: {
        eleveId: eleve.id,
        matiereId: exercice.matiereId,
        pointsForts: correction.estCorrecte ? [exercice.enonce.slice(0, 80)] : [],
        difficultes: correction.estCorrecte ? [] : [exercice.enonce.slice(0, 80)],
        erreursRecurrentes: [],
      },
      update: correction.estCorrecte
        ? {}
        : { difficultes: { push: exercice.enonce.slice(0, 80) }, erreursRecurrentes: { push: correction.pointsAAmeliorer[0] ?? "" } },
    });

    return NextResponse.json({ correction, pointsGagnes: points, nouveauxBadges });
  } catch (erreur) {
    return reponseErreur(erreur);
  }
}
