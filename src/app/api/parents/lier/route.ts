import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigerSession, reponseErreur, ErreurAPI } from "@/lib/securite-api";

const schema = z.object({ codeLiaison: z.string().min(4) });

/**
 * Lie un compte parent à un compte élève via le code de liaison communiqué
 * à l'élève lors de son inscription (8 derniers caractères de son
 * identifiant, affichés dans son profil).
 */
export async function POST(requete: NextRequest) {
  try {
    const session = await exigerSession(["PARENT"]);
    const corps = await requete.json().catch(() => null);
    const { codeLiaison } = schema.parse(corps);

    const parent = await prisma.parent.findUnique({ where: { utilisateurId: session.utilisateurId } });
    if (!parent) throw new ErreurAPI(404, "Profil parent introuvable");

    const eleves = await prisma.eleve.findMany({ include: { utilisateur: true } });
    const eleveTrouve = eleves.find((e) => e.id.slice(-8).toUpperCase() === codeLiaison.toUpperCase());
    if (!eleveTrouve) throw new ErreurAPI(404, "Code de liaison invalide");

    const relation = await prisma.relationParentEleve.upsert({
      where: { parentId_eleveId: { parentId: parent.id, eleveId: eleveTrouve.id } },
      create: { parentId: parent.id, eleveId: eleveTrouve.id },
      update: {},
    });

    return NextResponse.json({
      relation,
      enfant: { prenom: eleveTrouve.utilisateur.prenom, nom: eleveTrouve.utilisateur.nom, niveau: eleveTrouve.niveau },
    });
  } catch (erreur) {
    return reponseErreur(erreur);
  }
}
