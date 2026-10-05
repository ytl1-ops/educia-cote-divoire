/**
 * Script ponctuel : crée le tout premier compte administrateur.
 * Ne passe pas par /api/auth/inscription (qui exclut volontairement le rôle
 * ADMIN du self-service public pour des raisons de sécurité).
 *
 * Usage : npx tsx prisma/creer-admin.ts <email> [motDePasse]
 * Si aucun mot de passe n'est fourni, un mot de passe aléatoire fort est
 * généré et affiché une seule fois — à changer dès la première connexion.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npx tsx prisma/creer-admin.ts <email> [motDePasse]");
    process.exit(1);
  }
  const motDePasse = process.argv[3] || randomBytes(12).toString("base64url");

  const existant = await prisma.utilisateur.findUnique({ where: { email } });
  if (existant) {
    console.error(`Un compte existe déjà avec l'email ${email} (rôle actuel : ${existant.role}).`);
    process.exit(1);
  }

  const motDePasseH = await bcrypt.hash(motDePasse, 12);

  const utilisateur = await prisma.utilisateur.create({
    data: {
      email,
      motDePasseH,
      role: "ADMIN",
      prenom: "Admin",
      nom: "EDUCIA",
      admin: { create: {} },
    },
  });

  console.log("Compte administrateur créé avec succès :");
  console.log(`  Email       : ${utilisateur.email}`);
  console.log(`  Mot de passe: ${motDePasse}`);
  console.log("  (changez ce mot de passe dès votre première connexion)");
}

main()
  .catch((erreur) => {
    console.error(erreur);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
