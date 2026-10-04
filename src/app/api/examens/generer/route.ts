import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigerEleve, reponseErreur } from "@/lib/securite-api";
import { genererExamenBlancComplet, CodeExamenNational } from "@/lib/ai/examens";

const schema = z.object({ codeExamen: z.enum(["CEPE", "BEPC", "BAC"]) });

export async function POST(requete: NextRequest) {
  try {
    const { eleve } = await exigerEleve();
    const corps = await requete.json().catch(() => null);
    const { codeExamen } = schema.parse(corps);

    const examen = await genererExamenBlancComplet(codeExamen as CodeExamenNational);

    const evaluation = await prisma.evaluation.create({
      data: {
        eleveId: eleve.id,
        type: codeExamen === "CEPE" ? "CEPE_BLANC" : codeExamen === "BEPC" ? "BEPC_BLANC" : "BAC_BLANC",
        niveau: examen.niveau as any,
        titre: examen.titre,
        scoreMax: examen.epreuves.reduce((total, e) => total + e.bareme, 0),
        dureeMinutes: examen.epreuves.reduce((total, e) => total + e.dureeMinutes, 0),
      },
    });

    return NextResponse.json({ evaluation, epreuves: examen.epreuves });
  } catch (erreur) {
    return reponseErreur(erreur);
  }
}
