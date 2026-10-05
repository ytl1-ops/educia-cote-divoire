# EDUCIA Côte d'Ivoire

**Votre Professeur Particulier IA disponible 24h/24.**

EDUCIA est une plateforme éducative intelligente conçue pour les élèves ivoiriens, de la Maternelle à la Terminale, dans toutes les matières du programme national. Elle combine un tuteur IA pédagogique, un pipeline d'import et d'analyse automatique de documents scolaires (OCR + vision), un générateur d'exercices et d'examens blancs, un système de gamification et des rapports de suivi pour les parents.

Accessible par navigateur, installable comme application mobile (PWA), pensée pour fonctionner même en cas de connexion limitée.

## Statut de ce dépôt

Ce dépôt contient une **implémentation fonctionnelle de première version** couvrant l'ensemble des piliers du cahier des charges : architecture, base de données, authentification par rôle, moteur IA (tuteur, OCR, génération d'exercices et d'examens, correction, recherche web encadrée), API backend, interfaces élève/parent/enseignant/admin, PWA et documentation.

Certains points sont volontairement simplifiés pour une V1 solide plutôt qu'une façade complète non fonctionnelle — ils sont listés explicitement dans [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), section « Pistes d'évolution ». Rien n'est caché : ce qui n'est pas encore implémenté est documenté comme tel plutôt que simulé.

## Démarrage rapide

Voir [docs/INSTALLATION.md](docs/INSTALLATION.md) pour la procédure complète. En résumé :

```bash
npm install
cp .env.example .env   # puis renseignez DATABASE_URL et GROQ_API_KEY au minimum
npm run db:push
npm run db:seed
npm run dev
```

Ouvrez http://localhost:3000.

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — architecture technique complète, choix de conception, pistes d'évolution.
- [docs/BASE_DE_DONNEES.md](docs/BASE_DE_DONNEES.md) — schéma de données détaillé.
- [docs/INSTALLATION.md](docs/INSTALLATION.md) — installation locale pas à pas.
- [docs/DEPLOIEMENT.md](docs/DEPLOIEMENT.md) — déploiement cloud (production).

## Pile technologique

| Couche | Technologies |
|---|---|
| Frontend | Next.js 14 (App Router), React, TypeScript, TailwindCSS, PWA |
| Backend | Next.js Route Handlers (Node.js), Prisma ORM |
| Base de données | PostgreSQL |
| IA | Groq — palier gratuit (tuteur, vision/OCR, génération, correction) |
| Authentification | JWT (jose) + cookies HTTP-only, mots de passe hachés (bcrypt) |

## Licence et usage

Projet propriétaire — © EDUCIA Côte d'Ivoire. Tous droits réservés.
