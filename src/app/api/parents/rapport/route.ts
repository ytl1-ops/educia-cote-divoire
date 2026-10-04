import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigerSession, reponseErreur, ErreurAPI } from "@/lib/securite-api";

const schema = z.object({
  eleveId: z.string(),
  periode: z.enum(["HEBDOMADAIRE", "MENSUEL"]).default("HEBDOMADAIRE"),
});

export async function GET(requete: NextRequest) {
  try {
    const session = await exigerSession(["PARENT"]);
    const { searchParams } = new URL(requete.url);
    const { eleveId, periode } = schema.parse({
      eleveId: searchParams.get("eleveId"),
      periode: searchParams.get("periode") ?? undefined,
    });

    const parent = await prisma.parent.findUnique({ where: { utilisateurId: session.utilisateurId } });
    if (!parent) throw new ErreurAPI(404, "Profil parent introuvable");

    const lien = await prisma.relationParentEleve.findUnique({ where: { parentId_eleveId: { parentId: parent.id, eleveId } } });
    if (!lien) throw new ErreurAPI(403, "Cet élève n'est pas lié à votre compte parent");

    const maintenant = new Date();
    const periodeDebut = new Date(maintenant);
    periodeDebut.setDate(maintenant.getDate() - (periode === "HEBDOMADAIRE" ? 7 : 30));

    const eleve = await prisma.eleve.findUnique({
      where: { id: eleveId },
      include: { utilisateur: true, badgesObtenus: { include: { badge: true } } },
    });
    if (!eleve) throw new ErreurAPI(404, "Élève introuvable");

    const [tentatives, sessionsTuteur, evaluations, journaux] = await Promise.all([
      prisma.tentativeExercice.findMany({ where: { eleveId, createdAt: { gte: periodeDebut } }, include: { exercice: { include: { matiere: true } } } }),
      prisma.sessionTuteurIA.findMany({ where: { eleveId, dateDebut: { gte: periodeDebut } } }),
      prisma.evaluation.findMany({ where: { eleveId, createdAt: { gte: periodeDebut } } }),
      prisma.journalActivite.findMany({ where: { utilisateurId: eleve.utilisateurId, createdAt: { gte: periodeDebut } } }),
    ]);

    const tempsTravailSecondes = journaux.reduce((total, j) => total + (j.dureeSecondes ?? 0), 0);
    const parMatiere = new Map<string, { nom: string; reussies: number; total: number }>();
    for (const t of tentatives) {
      const nom = t.exercice.matiere.nom;
      const entree = parMatiere.get(nom) ?? { nom, reussies: 0, total: 0 };
      entree.total += 1;
      if (t.estCorrecte) entree.reussies += 1;
      parMatiere.set(nom, entree);
    }

    const matieresEtudiees = Array.from(parMatiere.values());
    const difficultes = matieresEtudiees.filter((m) => m.total > 0 && m.reussies / m.total < 0.5).map((m) => m.nom);

    const contenuRapport = {
      eleve: { prenom: eleve.utilisateur.prenom, nom: eleve.utilisateur.nom, niveau: eleve.niveau },
      periode,
      periodeDebut,
      periodeFin: maintenant,
      tempsTravailSecondes,
      matieresEtudiees,
      nombreExercicesTentes: tentatives.length,
      tauxReussite: tentatives.length ? Math.round((tentatives.filter((t) => t.estCorrecte).length / tentatives.length) * 100) : null,
      nombreSessionsTuteur: sessionsTuteur.length,
      evaluationsPassees: evaluations.map((e) => ({ titre: e.titre, score: e.scoreObtenu, scoreMax: e.scoreMax })),
      difficultes,
      recommandations: difficultes.length
        ? difficultes.map((m) => `Prévoir des révisions ciblées en ${m} (taux de réussite sous 50% sur la période).`)
        : ["Aucune difficulté majeure détectée sur la période — continuez sur cette lancée !"],
      badgesObtenus: eleve.badgesObtenus.map((b) => b.badge.nom),
      pointsTotal: eleve.points,
      streakJours: eleve.streakJours,
    };

    const rapport = await prisma.rapportParent.create({
      data: {
        eleveId,
        periode,
        contenuJson: contenuRapport,
        periodeDebut,
        periodeFin: maintenant,
        canauxEnvoi: [],
      },
    });

    return NextResponse.json({ rapport: contenuRapport, rapportId: rapport.id });
  } catch (erreur) {
    return reponseErreur(erreur);
  }
}
