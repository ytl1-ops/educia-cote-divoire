# Base de données — EDUCIA Côte d'Ivoire

Schéma complet : [`prisma/schema.prisma`](../prisma/schema.prisma). PostgreSQL, accédé via Prisma ORM.

## Groupes de modèles

### Utilisateurs & rôles
- `Utilisateur` — compte de base (email/téléphone, mot de passe haché, rôle, langue).
- `Eleve`, `Parent`, `Enseignant`, `Admin` — profils spécifiques à chaque rôle, en relation 1-1 avec `Utilisateur`.
- `RelationParentEleve` — table de liaison many-to-many (un parent peut suivre plusieurs enfants, un enfant peut avoir plusieurs tuteurs légaux).

### Programme scolaire
- `Matiere` — référentiel des matières (code, nom, cycles concernés, couleur/icône pour l'UI).
- `MatiereEnseignant` — matières enseignées par chaque enseignant.
- `Chapitre` — chapitres/leçons par matière et niveau, avec compétences visées, objectifs pédagogiques et difficultés potentielles (alimentés par l'analyse IA des documents).

### Documents & ressources pédagogiques
- `Document` — fichier importé (type, statut d'analyse, texte extrait, matière/niveau/chapitre détectés, indice de confiance).
- `RessourcePedagogique` — contenu dérivé d'un document ou généré librement (résumé, fiche de révision, carte mentale, quiz, exercices, corrigé, contrôle, devoir surveillé, examen blanc) — `contenuJson` stocke la structure spécifique à chaque type.

### Exercices & évaluations
- `Exercice` — énoncé, solution détaillée, explication pédagogique, astuce de mémorisation, difficulté (facile/intermédiaire/avancé), matière/niveau/chapitre, document source éventuel.
- `TentativeExercice` — chaque réponse d'élève à un exercice (réponse, correction, temps de réponse, numéro de tentative — permet le droit à l'erreur et le suivi de la progression).
- `Evaluation` / `EvaluationExercice` — quiz, contrôles, devoirs surveillés et examens blancs (CEPE/BEPC/BAC), composés d'exercices.

### Tuteur IA
- `SessionTuteurIA` — une conversation avec le Professeur IA (matière, niveau, méthode pédagogique dominante).
- `MessageTuteur` — chaque message (élève ou IA), avec URL audio optionnelle (assistant vocal).
- `RechercheWeb` — journal des recherches externes déclenchées par l'agent autonome (requête, raison, sources utilisées, indice de confiance) — traçabilité complète des informations externes injectées dans une conversation.

### Apprentissage adaptatif & intelligence prédictive
- `ProfilApprentissage` — par élève et par matière : points forts, difficultés, erreurs récurrentes, temps de réponse moyen, indice de risque d'échec. Alimente l'adaptation du tuteur IA et les recommandations parents.
- `JournalActivite` — trace générique des actions (durée, matière, métadonnées) utilisée pour les statistiques et rapports.

### Gamification
- `Badge` — définitions (voir `src/lib/gamification.ts`, `DEFINITIONS_BADGES`).
- `BadgeObtenu` — badges effectivement obtenus par un élève.
- Points et niveau de gamification sont stockés directement sur `Eleve` (`points`, `niveauGamification`, `streakJours`) plutôt que recalculés à chaque lecture, pour des tableaux de bord réactifs.

### Rapports parents
- `RapportParent` — rapport généré (hebdomadaire/mensuel), contenu structuré en JSON, canaux d'envoi prévus (WhatsApp/Email/PDF).

## Conventions

- Identifiants : `cuid()` partout (triables chronologiquement, sans collision, adaptés à un système distribué).
- Tous les noms de table sont explicitement mappés en français via `@@map(...)` pour une base de données lisible directement en SQL par une équipe francophone.
- Suppression en cascade (`onDelete: Cascade`) sur les relations de possession forte (ex: supprimer un élève supprime ses tentatives, sessions, documents) — à valider avec l'équipe produit avant la mise en production (RGPD / droit à l'oubli vs. historique pédagogique).

## Mise à jour du schéma

```bash
# Développement (synchronise directement, sans fichier de migration)
npm run db:push

# Production (génère et applique une migration versionnée)
npx prisma migrate dev --name description_du_changement   # en local, pour créer la migration
npx prisma migrate deploy                                   # en production, pour l'appliquer
```
