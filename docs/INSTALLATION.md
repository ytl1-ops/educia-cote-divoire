# Installation locale — EDUCIA Côte d'Ivoire

## Prérequis

- Node.js ≥ 18.18 (recommandé : 20 ou 22)
- Une base PostgreSQL accessible (locale via Docker, ou managée — Neon, Supabase, Railway…)
- Une clé API Google Gemini, gratuite (https://aistudio.google.com/apikey) pour le moteur IA

## 1. Cloner et installer les dépendances

```bash
git clone https://github.com/ytl1-ops/educia-cote-divoire.git
cd educia-cote-divoire
npm install
```

## 2. Configurer les variables d'environnement

```bash
cp .env.example .env
```

Renseignez au minimum dans `.env` :

- `DATABASE_URL` — chaîne de connexion PostgreSQL
- `JWT_SECRET` — générez une valeur aléatoire : `openssl rand -base64 32`
- `GEMINI_API_KEY` — votre clé API Gemini (gratuite)

Les autres variables (recherche web, WhatsApp, email, stockage S3) sont optionnelles pour un démarrage local : l'application fonctionne sans elles, avec les fonctionnalités correspondantes désactivées proprement (voir `.env.example` pour le détail de chacune).

### Démarrer PostgreSQL rapidement avec Docker (optionnel)

```bash
docker run --name educia-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=educia -p 5432:5432 -d postgres:16
```

Dans ce cas, `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/educia?schema=public"`.

## 3. Initialiser la base de données

```bash
npm run db:push     # crée les tables à partir du schéma Prisma
npm run db:seed      # insère les matières et badges de référence
```

## 4. Lancer l'application

```bash
npm run dev
```

Ouvrez http://localhost:3000. Créez un compte élève depuis `/inscription`.

## 5. Vérifications utiles

```bash
npm run typecheck   # vérification TypeScript
npm run lint        # ESLint
npm run db:studio   # interface graphique Prisma pour explorer la base
```

## Dépannage

- **`GEMINI_API_KEY manquante`** : vérifiez que `.env` existe bien à la racine (pas seulement `.env.example`) et contient une clé valide.
- **Erreur de connexion PostgreSQL** : vérifiez que le service tourne et que `DATABASE_URL` correspond exactement (hôte, port, utilisateur, mot de passe, nom de base).
- **Upload de documents qui échoue en local** : le pilote de stockage par défaut (`STORAGE_DRIVER=local`) écrit dans `./storage` à la racine du projet — vérifiez les droits d'écriture.
