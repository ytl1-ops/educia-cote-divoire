import { prisma } from "@/lib/prisma";

/**
 * Règles de gamification d'EDUCIA : points, badges, niveaux, séries.
 * Centralisées ici pour que l'API et les tâches de fond (rapports,
 * notifications) appliquent exactement la même logique.
 */

export const POINTS = {
  EXERCICE_REUSSI_FACILE: 5,
  EXERCICE_REUSSI_INTERMEDIAIRE: 10,
  EXERCICE_REUSSI_AVANCE: 20,
  EXERCICE_ECHOUE: 1, // encourager l'essai, pas seulement la réussite
  DOCUMENT_IMPORTE: 5,
  SESSION_TUTEUR_TERMINEE: 8,
  EVALUATION_TERMINEE: 15,
  BONUS_STREAK_JOUR: 3,
} as const;

/** Seuils de points pour chaque niveau de gamification (paliers progressifs). */
export function niveauGamificationPourPoints(points: number): number {
  // Palier n nécessite 100 * n * (n+1) / 2 points (croissance douce).
  let niveau = 1;
  while (points >= 100 * ((niveau + 1) * (niveau + 2)) / 2) niveau += 1;
  return niveau;
}

export function pointsRequisPourNiveauSuivant(niveauActuel: number): number {
  return Math.round(100 * ((niveauActuel + 1) * (niveauActuel + 2)) / 2);
}

export const DEFINITIONS_BADGES: Array<{ code: string; nom: string; description: string; icone: string; critere: string }> = [
  { code: "PREMIER_PAS", nom: "Premier pas", description: "Terminer son premier exercice.", icone: "🌱", critere: "1 exercice terminé" },
  { code: "SERIE_3_JOURS", nom: "Assidu", description: "3 jours consécutifs d'activité.", icone: "🔥", critere: "streak >= 3" },
  { code: "SERIE_7_JOURS", nom: "Régularité en or", description: "7 jours consécutifs d'activité.", icone: "⭐", critere: "streak >= 7" },
  { code: "SERIE_30_JOURS", nom: "Champion de la constance", description: "30 jours consécutifs d'activité.", icone: "🏆", critere: "streak >= 30" },
  { code: "CENT_EXERCICES", nom: "Cent exercices", description: "100 exercices complétés.", icone: "💯", critere: "100 exercices terminés" },
  { code: "MAITRE_MATHS", nom: "Maître des mathématiques", description: "90% de réussite sur 20 exercices de mathématiques.", icone: "📐", critere: "maîtrise mathématiques" },
  { code: "PLUME_DOR", nom: "Plume d'or", description: "Excellent score en rédaction.", icone: "✒️", critere: "excellence en français" },
  { code: "EXPLORATEUR", nom: "Explorateur", description: "A étudié 5 matières différentes.", icone: "🧭", critere: "5 matières distinctes" },
  { code: "PREMIER_EXAMEN_BLANC", nom: "Prêt pour l'examen", description: "A terminé son premier examen blanc.", icone: "📝", critere: "1 examen blanc terminé" },
];

/** Ajoute des points à un élève et recalcule son niveau de gamification. */
export async function ajouterPoints(eleveId: string, points: number) {
  const eleve = await prisma.eleve.update({
    where: { id: eleveId },
    data: { points: { increment: points } },
  });

  const nouveauNiveau = niveauGamificationPourPoints(eleve.points);
  if (nouveauNiveau !== eleve.niveauGamification) {
    await prisma.eleve.update({ where: { id: eleveId }, data: { niveauGamification: nouveauNiveau } });
  }

  return { points: eleve.points, niveau: nouveauNiveau, niveauAChange: nouveauNiveau !== eleve.niveauGamification };
}

/** Met à jour la série de jours consécutifs d'activité (streak). */
export async function mettreAJourStreak(eleveId: string) {
  const eleve = await prisma.eleve.findUniqueOrThrow({ where: { id: eleveId } });
  const maintenant = new Date();
  const derniere = eleve.derniereActivite;

  let nouveauStreak = eleve.streakJours;
  if (!derniere) {
    nouveauStreak = 1;
  } else {
    const joursEcoules = Math.floor((maintenant.getTime() - derniere.getTime()) / (1000 * 60 * 60 * 24));
    if (joursEcoules === 0) {
      nouveauStreak = eleve.streakJours; // déjà actif aujourd'hui
    } else if (joursEcoules === 1) {
      nouveauStreak = eleve.streakJours + 1;
      await ajouterPoints(eleveId, POINTS.BONUS_STREAK_JOUR);
    } else {
      nouveauStreak = 1; // série rompue
    }
  }

  await prisma.eleve.update({
    where: { id: eleveId },
    data: { streakJours: nouveauStreak, derniereActivite: maintenant },
  });

  await verifierEtAttribuerBadges(eleveId);
  return nouveauStreak;
}

/** Vérifie les critères de badges simples basés sur les compteurs de l'élève et les attribue si nécessaire. */
export async function verifierEtAttribuerBadges(eleveId: string) {
  const eleve = await prisma.eleve.findUniqueOrThrow({
    where: { id: eleveId },
    include: { tentatives: true, badgesObtenus: { include: { badge: true } } },
  });

  const codesDejaObtenus = new Set(eleve.badgesObtenus.map((b) => b.badge.code));
  const nouveauxBadges: string[] = [];

  const nombreExercicesReussis = eleve.tentatives.filter((t) => t.estCorrecte).length;

  const candidats: Array<{ code: string; obtenu: boolean }> = [
    { code: "PREMIER_PAS", obtenu: nombreExercicesReussis >= 1 },
    { code: "SERIE_3_JOURS", obtenu: eleve.streakJours >= 3 },
    { code: "SERIE_7_JOURS", obtenu: eleve.streakJours >= 7 },
    { code: "SERIE_30_JOURS", obtenu: eleve.streakJours >= 30 },
    { code: "CENT_EXERCICES", obtenu: nombreExercicesReussis >= 100 },
  ];

  for (const candidat of candidats) {
    if (candidat.obtenu && !codesDejaObtenus.has(candidat.code)) {
      const badge = await prisma.badge.findUnique({ where: { code: candidat.code } });
      if (badge) {
        await prisma.badgeObtenu.create({ data: { eleveId, badgeId: badge.id } });
        nouveauxBadges.push(candidat.code);
      }
    }
  }

  return nouveauxBadges;
}

/** Points attribués pour une tentative d'exercice selon sa difficulté et son résultat. */
export function pointsPourTentative(difficulte: "FACILE" | "INTERMEDIAIRE" | "AVANCE", estCorrecte: boolean): number {
  if (!estCorrecte) return POINTS.EXERCICE_ECHOUE;
  return {
    FACILE: POINTS.EXERCICE_REUSSI_FACILE,
    INTERMEDIAIRE: POINTS.EXERCICE_REUSSI_INTERMEDIAIRE,
    AVANCE: POINTS.EXERCICE_REUSSI_AVANCE,
  }[difficulte];
}
