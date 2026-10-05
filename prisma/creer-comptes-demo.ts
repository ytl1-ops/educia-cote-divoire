/**
 * Script ponctuel exécuté pendant le build Netlify (qui a accès à la base,
 * contrairement à l'environnement de développement) pour créer :
 * - le compte administrateur du porteur de projet
 * - un compte élève de démonstration
 * - un compte parent de démonstration, déjà lié à l'élève démo
 * - le profil parent réel du porteur de projet (Yoro Louis), sans mot de
 *   passe, qui apparaît dans la liste de sélection de /connexion
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
  role: "ADMIN" | "ELEVE" | "PARENT";
  prenom: string;
  nom: string;
  niveau?: string;
}): Promise<string> {
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
      }
    }
    return existant.id;
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
      ...(params.role === "PARENT" ? { parent: { create: {} } } : {}),
      ...(params.role === "ELEVE"
        ? { eleve: { create: { niveau: params.niveau as any, etablissement: "Groupe Scolaire Démo" } } }
        : {}),
    },
    include: { eleve: true },
  });

  console.log(`[CREE] ${params.role} : ${params.email} / mot de passe : ${params.motDePasse}`);
  return utilisateur.id;
}

/** Crée un profil familial réel (sans email ni mot de passe), identifié par nom+rôle pour l'idempotence. */
async function creerProfilSiAbsent(params: { role: "PARENT" | "ELEVE" | "ENSEIGNANT"; prenom: string; nom: string; niveau?: string }) {
  const existant = await prisma.utilisateur.findFirst({ where: { prenom: params.prenom, nom: params.nom, role: params.role } });
  if (existant) {
    console.log(`[OK] Profil déjà existant : ${params.prenom} ${params.nom} (${params.role})`);
    return existant.id;
  }

  const utilisateur = await prisma.utilisateur.create({
    data: {
      role: params.role,
      prenom: params.prenom,
      nom: params.nom,
      ...(params.role === "PARENT" ? { parent: { create: {} } } : {}),
      ...(params.role === "ELEVE" ? { eleve: { create: { niveau: params.niveau as any } } } : {}),
      ...(params.role === "ENSEIGNANT" ? { enseignant: { create: {} } } : {}),
    },
  });
  console.log(`[CREE] Profil ${params.role} : ${params.prenom} ${params.nom} (sans mot de passe)`);
  return utilisateur.id;
}

async function lierParentEleve(emailParent: string, emailEleve: string) {
  const parent = await prisma.parent.findFirst({ where: { utilisateur: { email: emailParent } } });
  const eleve = await prisma.eleve.findFirst({ where: { utilisateur: { email: emailEleve } } });
  if (!parent || !eleve) {
    console.log("[!] Impossible de lier parent/élève démo (compte introuvable)");
    return;
  }
  await prisma.relationParentEleve.upsert({
    where: { parentId_eleveId: { parentId: parent.id, eleveId: eleve.id } },
    create: { parentId: parent.id, eleveId: eleve.id },
    update: {},
  });
  console.log("[OK] Parent démo <-> Élève démo liés");
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
  await creerSiAbsent({
    email: "parent.demo@educia.ci",
    motDePasse: "Parent12345!",
    role: "PARENT",
    prenom: "Koffi",
    nom: "Démo",
  });
  await lierParentEleve("parent.demo@educia.ci", "eleve.demo@educia.ci");

  console.log("=== Profil réel du porteur de projet ===");
  await creerProfilSiAbsent({ role: "PARENT", prenom: "Yoro", nom: "Louis" });

  console.log("=== Fin comptes de démonstration ===");
}

main()
  .catch((erreur) => {
    console.error("Erreur création comptes démo (non bloquant) :", erreur.message);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
