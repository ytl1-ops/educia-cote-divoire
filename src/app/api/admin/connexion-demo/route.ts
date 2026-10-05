import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigerSession, reponseErreur, ErreurAPI } from "@/lib/securite-api";
import { creerJetonSession, poserCookieSession } from "@/lib/auth";

const schema = z.object({ role: z.enum(["PARENT", "ELEVE"]) });

const EMAIL_PAR_ROLE: Record<"PARENT" | "ELEVE", string> = {
  PARENT: "parent.demo@educia.ci",
  ELEVE: "eleve.demo@educia.ci",
};

/**
 * Réservé aux administrateurs : bascule la session active sur l'un des
 * comptes de démonstration (parent ou élève), pour tester rapidement les
 * autres parcours sans ressaisir d'identifiants. Remplace la session admin
 * en cours — se reconnecter avec le compte admin pour y revenir.
 */
export async function POST(requete: NextRequest) {
  try {
    await exigerSession(["ADMIN"]);
    const corps = await requete.json().catch(() => null);
    const { role } = schema.parse(corps);

    const email = EMAIL_PAR_ROLE[role];
    const utilisateur = await prisma.utilisateur.findUnique({ where: { email } });
    if (!utilisateur) {
      throw new ErreurAPI(404, `Compte de démonstration ${role} introuvable — relancez un déploiement pour le créer.`);
    }

    const jeton = await creerJetonSession({
      utilisateurId: utilisateur.id,
      role: utilisateur.role,
      prenom: utilisateur.prenom,
      nom: utilisateur.nom,
    });
    await poserCookieSession(jeton);

    return NextResponse.json({ role: utilisateur.role });
  } catch (erreur) {
    return reponseErreur(erreur);
  }
}
