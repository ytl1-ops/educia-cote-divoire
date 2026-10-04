import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigerEleve, reponseErreur } from "@/lib/securite-api";
import { pointsRequisPourNiveauSuivant } from "@/lib/gamification";

export async function GET() {
  try {
    const { eleve } = await exigerEleve();

    const [tentatives, profils, badges, evaluations] = await Promise.all([
      prisma.tentativeExercice.findMany({ where: { eleveId: eleve.id }, include: { exercice: { include: { matiere: true } } } }),
      prisma.profilApprentissage.findMany({ where: { eleveId: eleve.id }, include: { matiere: true } }),
      prisma.badgeObtenu.findMany({ where: { eleveId: eleve.id }, include: { badge: true } }),
      prisma.evaluation.findMany({ where: { eleveId: eleve.id }, orderBy: { createdAt: "desc" }, take: 10 }),
    ]);

    const parMatiere = new Map<string, { matiere: string; total: number; reussies: number }>();
    for (const t of tentatives) {
      const nom = t.exercice.matiere.nom;
      const entree = parMatiere.get(nom) ?? { matiere: nom, total: 0, reussies: 0 };
      entree.total += 1;
      if (t.estCorrecte) entree.reussies += 1;
      parMatiere.set(nom, entree);
    }

    return NextResponse.json({
      points: eleve.points,
      niveauGamification: eleve.niveauGamification,
      pointsPourNiveauSuivant: pointsRequisPourNiveauSuivant(eleve.niveauGamification),
      streakJours: eleve.streakJours,
      progressionParMatiere: Array.from(parMatiere.values()),
      profilsApprentissage: profils.map((p) => ({
        matiere: p.matiere.nom,
        pointsForts: p.pointsForts,
        difficultes: p.difficultes,
        risqueEchec: p.risqueEchec,
      })),
      badges: badges.map((b) => ({ nom: b.badge.nom, icone: b.badge.icone, dateObtention: b.dateObtention })),
      dernieresEvaluations: evaluations,
    });
  } catch (erreur) {
    return reponseErreur(erreur);
  }
}
