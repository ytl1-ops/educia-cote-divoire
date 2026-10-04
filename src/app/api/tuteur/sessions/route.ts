import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigerEleve, reponseErreur } from "@/lib/securite-api";
import { messageAccueilTuteur } from "@/lib/ai/tuteur-prompt";
import type { CodeNiveau } from "@/lib/programmes/curriculum";

export async function GET() {
  try {
    const { eleve } = await exigerEleve();
    const sessions = await prisma.sessionTuteurIA.findMany({
      where: { eleveId: eleve.id },
      orderBy: { dateDebut: "desc" },
      take: 30,
    });
    return NextResponse.json({ sessions });
  } catch (erreur) {
    return reponseErreur(erreur);
  }
}

const schemaCreation = z.object({
  matiereCode: z.string().optional(),
  methode: z.string().optional(),
});

export async function POST(requete: NextRequest) {
  try {
    const { eleve, session } = await exigerEleve();
    const corps = await requete.json().catch(() => ({}));
    const { matiereCode, methode } = schemaCreation.parse(corps);

    const matiere = matiereCode ? await prisma.matiere.findUnique({ where: { code: matiereCode } }) : null;

    const nouvelleSession = await prisma.sessionTuteurIA.create({
      data: {
        eleveId: eleve.id,
        matiereId: matiere?.id,
        niveau: eleve.niveau,
        methode: methode as any,
      },
    });

    const messageAccueil = messageAccueilTuteur({
      niveau: eleve.niveau as CodeNiveau,
      matiereCode: matiere?.code,
      prenomEleve: session.prenom,
    });

    await prisma.messageTuteur.create({
      data: { sessionId: nouvelleSession.id, role: "IA", contenu: messageAccueil },
    });

    return NextResponse.json({ session: nouvelleSession, messageAccueil });
  } catch (erreur) {
    return reponseErreur(erreur);
  }
}
