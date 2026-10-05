import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Liste les profils familiaux (élève/parent/enseignant) pour l'écran de sélection sans mot de passe. */
export async function GET() {
  const utilisateurs = await prisma.utilisateur.findMany({
    where: { actif: true, role: { in: ["ELEVE", "PARENT", "ENSEIGNANT"] } },
    select: {
      id: true,
      prenom: true,
      nom: true,
      role: true,
      eleve: { select: { niveau: true } },
    },
    orderBy: [{ role: "asc" }, { prenom: "asc" }],
  });

  return NextResponse.json({
    profils: utilisateurs.map((u) => ({
      id: u.id,
      prenom: u.prenom,
      nom: u.nom,
      role: u.role,
      niveau: u.eleve?.niveau ?? null,
    })),
  });
}
