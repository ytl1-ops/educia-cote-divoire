import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigerSession, reponseErreur, ErreurAPI } from "@/lib/securite-api";

const schema = z.object({ eleveId: z.string().min(1) });

/**
 * Lie un compte parent à un profil élève choisi directement dans la liste
 * familiale (plus de code à saisir : usage domestique, tous les profils
 * sont visibles).
 */
export async function POST(requete: NextRequest) {
  try {
    const session = await exigerSession(["PARENT"]);
    const corps = await requete.json().catch(() => null);
    const { eleveId } = schema.parse(corps);

    const parent = await prisma.parent.findUnique({ where: { utilisateurId: session.utilisateurId } });
    if (!parent) throw new ErreurAPI(404, "Profil parent introuvable");

    const eleveTrouve = await prisma.eleve.findUnique({ where: { id: eleveId }, include: { utilisateur: true } });
    if (!eleveTrouve) throw new ErreurAPI(404, "Profil élève introuvable");

    const relation = await prisma.relationParentEleve.upsert({
      where: { parentId_eleveId: { parentId: parent.id, eleveId: eleveTrouve.id } },
      create: { parentId: parent.id, eleveId: eleveTrouve.id },
      update: {},
    });

    return NextResponse.json({
      relation,
      enfant: { id: eleveTrouve.id, prenom: eleveTrouve.utilisateur.prenom, nom: eleveTrouve.utilisateur.nom, niveau: eleveTrouve.niveau },
    });
  } catch (erreur) {
    return reponseErreur(erreur);
  }
}
