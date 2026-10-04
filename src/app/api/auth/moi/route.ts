import { NextResponse } from "next/server";
import { sessionCourante } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await sessionCourante();
  if (!session) return NextResponse.json({ utilisateur: null }, { status: 200 });

  const utilisateur = await prisma.utilisateur.findUnique({
    where: { id: session.utilisateurId },
    include: { eleve: true, parent: true, enseignant: true, admin: true },
  });

  if (!utilisateur) return NextResponse.json({ utilisateur: null }, { status: 200 });

  return NextResponse.json({
    utilisateur: {
      id: utilisateur.id,
      prenom: utilisateur.prenom,
      nom: utilisateur.nom,
      role: utilisateur.role,
      email: utilisateur.email,
      eleve: utilisateur.eleve,
      parent: utilisateur.parent,
      enseignant: utilisateur.enseignant,
    },
  });
}
