import { PrismaClient } from "@prisma/client";
import { MATIERES } from "../src/lib/programmes/curriculum";
import { DEFINITIONS_BADGES } from "../src/lib/gamification";

const prisma = new PrismaClient();

async function main() {
  console.log("Seed — matières…");
  for (const matiere of MATIERES) {
    await prisma.matiere.upsert({
      where: { code: matiere.code },
      create: { code: matiere.code, nom: matiere.nom, cycles: matiere.cycles, couleur: matiere.couleur, icone: matiere.icone },
      update: { nom: matiere.nom, cycles: matiere.cycles, couleur: matiere.couleur, icone: matiere.icone },
    });
  }

  console.log("Seed — badges…");
  for (const badge of DEFINITIONS_BADGES) {
    await prisma.badge.upsert({
      where: { code: badge.code },
      create: badge,
      update: badge,
    });
  }

  console.log(`Terminé : ${MATIERES.length} matières, ${DEFINITIONS_BADGES.length} badges.`);
}

main()
  .catch((erreur) => {
    console.error(erreur);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
