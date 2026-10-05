/**
 * Script ponctuel exécuté une fois pendant le build Netlify (qui a accès à
 * la base, contrairement à l'environnement de développement) pour créer :
 * - le compte administrateur du porteur de projet
 * - un compte élève de démonstration, pour tester le parcours parent
 *
 * Idempotent : ne recrée rien si les comptes existent déjà, donc sans
 * danger de le laisser dans le pipeline de build.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function creerSiAbsent(params: {
  email: string;
  motDePasse: string;
  role: "ADMIN" | "ELEVE";
  prenom: string;
  nom: string;
  niveau?: string;
}) {
  const existant = await prisma.utilisateur.findUnique({ where: { email: params.email } });
  if (existant) {
    console.log(`[OK] Compte déjà existant : ${params.email} (${existant.role})`);
    if (params.role === "ELEVE") {
      const eleve = await prisma.eleve.findUnique({ where: { utilisateurId: existant.id } });
      if (eleve) {
        if (params.niveau && eleve.niveau !== params.niveau) {
          const miseAJour = await prisma.eleve.update({
            where: { id: eleve.id },
            data: { niveau: params.niveau as any },
          });
          console.log(`      Niveau mis à jour : ${eleve.niveau} -> ${miseAJour.niveau}`);
        }
        console.log(`      Code de liaison : ${eleve.id.slice(-8).toUpperCase()}`);
      }
    }
    return;
  }

  const motDePasseH = await bcrypt.hash(params.motDePasse, 12);
  const utilisateur = await prisma.utilisateur.create({
    data: {
      email: params.email,
      motDePasseH,
      role: params.role,
      prenom: params.prenom,
      nom: params.nom,
      ...(params.role === "ADMIN" ? { admin: { create: {} } } : {}),
      ...(params.role === "ELEVE"
        ? { eleve: { create: { niveau: params.niveau as any, etablissement: "Groupe Scolaire Démo" } } }
        : {}),
    },
    include: { eleve: true },
  });

  console.log(`[CREE] ${params.role} : ${params.email} / mot de passe : ${params.motDePasse}`);
  if (utilisateur.eleve) {
    console.log(`       Code de liaison : ${utilisateur.eleve.id.slice(-8).toUpperCase()}`);
  }
}

async function main() {
  console.log("=== Comptes de démonstration EDUCIA ===");
  await creerSiAbsent({
    email: "yorot225@gmail.com",
    motDePasse: "xIyMY5xOc13lOZTS",
    role: "ADMIN",
    prenom: "Admin",
    nom: "EDUCIA",
  });
  await creerSiAbsent({
    email: "eleve.demo@educia.ci",
    motDePasse: "Eleve12345!",
    role: "ELEVE",
    prenom: "Aïcha",
    nom: "Démo",
    niveau: "SECONDE",
  });
  console.log("=== Fin comptes de démonstration ===");
}

main()
  .catch((erreur) => {
    console.error("Erreur création comptes démo (non bloquant) :", erreur.message);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
