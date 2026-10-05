import { NextResponse } from "next/server";
import type { RoleUtilisateur } from "@prisma/client";
import { sessionCourante, PayloadSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export class ErreurAPI extends Error {
  constructor(public statut: number, message: string) {
    super(message);
  }
}

/** Exige une session valide, et optionnellement un ou plusieurs rôles précis. */
export async function exigerSession(rolesAutorises?: RoleUtilisateur[]): Promise<PayloadSession> {
  const session = await sessionCourante();
  if (!session) throw new ErreurAPI(401, "Authentification requise");
  if (rolesAutorises && !rolesAutorises.includes(session.role)) {
    throw new ErreurAPI(403, "Accès refusé pour ce rôle");
  }
  return session;
}

/** Récupère le profil Eleve lié à l'utilisateur en session (lève 403 si l'utilisateur n'est pas élève). */
export async function exigerEleve() {
  const session = await exigerSession(["ELEVE"]);
  const eleve = await prisma.eleve.findUnique({ where: { utilisateurId: session.utilisateurId } });
  if (!eleve) throw new ErreurAPI(404, "Profil élève introuvable");
  return { session, eleve };
}

export function reponseErreur(erreur: unknown) {
  if (erreur instanceof ErreurAPI) {
    return NextResponse.json({ erreur: erreur.message }, { status: erreur.statut });
  }
  console.error(erreur);
  const message = erreur instanceof Error ? erreur.message : "Erreur interne du serveur";
  return NextResponse.json({ erreur: message }, { status: 500 });
}
