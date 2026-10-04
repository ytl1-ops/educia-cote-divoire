import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigerEleve, reponseErreur, ErreurAPI } from "@/lib/securite-api";
import { demanderClaude } from "@/lib/ai/claude";
import { construirePromptTuteur } from "@/lib/ai/tuteur-prompt";
import { agentRechercheAutonome } from "@/lib/ai/recherche-web";
import { ajouterPoints, mettreAJourStreak, POINTS } from "@/lib/gamification";
import type { CodeNiveau } from "@/lib/programmes/curriculum";
import type { Anthropic } from "@anthropic-ai/sdk";

const schemaMessage = z.object({ contenu: z.string().min(1).max(4000) });

export async function GET(_requete: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { eleve } = await exigerEleve();
    const { id } = await params;
    const session = await prisma.sessionTuteurIA.findUnique({ where: { id }, include: { messages: { orderBy: { createdAt: "asc" } } } });
    if (!session || session.eleveId !== eleve.id) throw new ErreurAPI(404, "Session introuvable");
    return NextResponse.json({ session });
  } catch (erreur) {
    return reponseErreur(erreur);
  }
}

export async function POST(requete: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { eleve, session: utilisateurSession } = await exigerEleve();
    const { id } = await params;
    const corps = await requete.json().catch(() => null);
    const { contenu } = schemaMessage.parse(corps);

    const session = await prisma.sessionTuteurIA.findUnique({
      where: { id },
      include: { messages: { orderBy: { createdAt: "asc" }, take: 30 }, matiere: true },
    });
    if (!session || session.eleveId !== eleve.id) throw new ErreurAPI(404, "Session introuvable");

    await prisma.messageTuteur.create({ data: { sessionId: id, role: "ELEVE", contenu } });

    const profil = session.matiereId
      ? await prisma.profilApprentissage.findUnique({ where: { eleveId_matiereId: { eleveId: eleve.id, matiereId: session.matiereId } } })
      : null;

    const contexteDocuments = (
      await prisma.document.findMany({
        where: { eleveId: eleve.id, statutAnalyse: "TERMINEE" },
        orderBy: { createdAt: "desc" },
        take: 3,
        select: { texteExtrait: true },
      })
    )
      .map((d) => d.texteExtrait ?? "")
      .join("\n")
      .slice(0, 4000);

    // Agent de recherche autonome : n'est déclenché que si réellement nécessaire
    // (voir règles dans src/lib/ai/recherche-web.ts).
    const recherche = await agentRechercheAutonome({ question: contenu, contexteDisponible: contexteDocuments });
    let complementRecherche = "";
    if (recherche.resultat && recherche.resultat.indiceConfiance > 0) {
      complementRecherche = `\n\nCOMPLÉMENT DE RECHERCHE WEB VÉRIFIÉ (indice de confiance ${Math.round(recherche.resultat.indiceConfiance * 100)}%) :\n${recherche.resultat.reponseSynthetisee}\nSources : ${recherche.resultat.sourcesUtilisees.map((s) => s.url).join(", ")}`;

      await prisma.rechercheWeb.create({
        data: {
          sessionId: id,
          requete: contenu,
          raisonDeclenchement: recherche.decision.raison,
          sourcesUtilisees: recherche.resultat.sourcesUtilisees,
          indiceConfiance: recherche.resultat.indiceConfiance,
        },
      });
    }

    const promptSysteme =
      construirePromptTuteur({
        niveau: eleve.niveau as CodeNiveau,
        matiereCode: session.matiere?.code,
        prenomEleve: utilisateurSession.prenom,
        profilApprentissage: profil
          ? { pointsForts: profil.pointsForts, difficultes: profil.difficultes, erreursRecurrentes: profil.erreursRecurrentes }
          : undefined,
        extraitDocumentImporte: contexteDocuments || undefined,
      }) + complementRecherche;

    const historique: Anthropic.MessageParam[] = session.messages.map((m) => ({
      role: m.role === "ELEVE" ? "user" : "assistant",
      content: m.contenu,
    }));
    historique.push({ role: "user", content: contenu });

    const reponseIA = await demanderClaude({ systeme: promptSysteme, messages: historique, maxTokens: 1536 });

    const messageIA = await prisma.messageTuteur.create({ data: { sessionId: id, role: "IA", contenu: reponseIA } });

    await ajouterPoints(eleve.id, POINTS.SESSION_TUTEUR_TERMINEE);
    await mettreAJourStreak(eleve.id);

    return NextResponse.json({ message: messageIA, rechercheDeclenchee: recherche.decision.rechercheNecessaire });
  } catch (erreur) {
    return reponseErreur(erreur);
  }
}
