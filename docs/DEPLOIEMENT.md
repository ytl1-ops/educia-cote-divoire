# Déploiement cloud — EDUCIA Côte d'Ivoire

## Option recommandée : Vercel + PostgreSQL managé

Combinaison la plus simple pour une application Next.js, avec mise à l'échelle automatique et HTTPS natif.

### 1. Base de données

Créez une base PostgreSQL managée (au choix) :
- **Neon** (https://neon.tech) — niveau gratuit généreux, adapté au démarrage.
- **Supabase** (https://supabase.com) — inclut aussi stockage de fichiers compatible S3, utile pour `STORAGE_DRIVER=s3`.
- **Railway**, **Render**, ou une instance PostgreSQL auto-hébergée.

Récupérez la chaîne de connexion (`DATABASE_URL`).

### 2. Déploiement de l'application

```bash
npm install -g vercel
vercel login
vercel link
vercel env add DATABASE_URL
vercel env add JWT_SECRET
vercel env add GROQ_API_KEY
# ... (répéter pour chaque variable nécessaire de .env.example)
vercel --prod
```

Ou directement depuis l'interface Vercel : importer le dépôt GitHub `ytl1-ops/educia-cote-divoire`, renseigner les variables d'environnement dans Project Settings → Environment Variables, puis déployer.

### 3. Migrations en production

Avant le premier déploiement effectif (ou après toute modification du schéma) :

```bash
npx prisma migrate deploy
npm run db:seed
```

Idéalement automatisé via le script de build (`"build": "prisma generate && prisma migrate deploy && next build"` en production) ou une étape de CI/CD dédiée.

## Option alternative : conteneur Docker (auto-hébergement)

### Dockerfile (à ajouter à la racine si vous choisissez cette voie)

```dockerfile
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM base AS build
COPY . .
RUN npx prisma generate && npm run build

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.next ./.next
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/public ./public
EXPOSE 3000
CMD ["npm", "run", "start"]
```

Déploiement type (VPS, AWS ECS, Google Cloud Run, Fly.io...) :

```bash
docker build -t educia .
docker run -p 3000:3000 --env-file .env educia
```

## Stockage des fichiers en production

Le pilote `local` (par défaut) écrit sur le disque du serveur — **inadapté en production** sur une plateforme serverless (Vercel) où le système de fichiers n'est pas persistant entre les requêtes. Avant la mise en production :

1. Basculez `STORAGE_DRIVER=s3` dans les variables d'environnement.
2. Complétez l'implémentation dans `src/lib/stockage.ts` (fonction `enregistrerSurS3`) avec le SDK `@aws-sdk/client-s3` et un bucket S3, Cloudflare R2, ou le stockage Supabase (compatible S3).
3. Renseignez `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_ENDPOINT`.

## Notifications WhatsApp et Email (rapports parents)

Points d'intégration prévus (variables déjà dans `.env.example`) :

- **WhatsApp** : API Cloud de Meta (https://developers.facebook.com/docs/whatsapp/cloud-api) ou Twilio WhatsApp API. Renseignez `WHATSAPP_API_URL`, `WHATSAPP_API_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, puis implémentez l'envoi dans une nouvelle route (ex: `src/app/api/parents/rapport/envoyer/route.ts`) qui lit `RapportParent.contenuJson` et l'envoie au numéro `Parent.telephoneWhatsapp`.
- **Email** : tout fournisseur SMTP (SendGrid, Mailgun, Amazon SES, ou un compte SMTP classique) via `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASSWORD`. La bibliothèque `nodemailer` est un choix simple à ajouter (`npm install nodemailer`).

## Observabilité recommandée avant une mise en production à grande échelle

- Journalisation structurée des erreurs (ex: Sentry) sur les routes API, en particulier le moteur IA (latence et taux d'échec des appels Groq).
- Alerting sur le volume de recherches web déclenchées (dérive possible de l'agent autonome hors des règles prévues).
- Suivi de la consommation du quota gratuit Groq (requêtes/jour et tokens/minute) pour anticiper un passage à un palier payant si l’usage grandit.

## Checklist avant mise en production

- [ ] Toutes les variables de `.env.example` renseignées avec des valeurs de production (jamais les valeurs d'exemple).
- [ ] `JWT_SECRET` unique et fort, différent de tout environnement de test.
- [ ] `STORAGE_DRIVER=s3` configuré (le pilote local ne convient pas en production serverless).
- [ ] Migrations Prisma appliquées (`prisma migrate deploy`) et seed exécuté.
- [ ] HTTPS actif de bout en bout (natif sur Vercel ; à configurer via un reverse proxy — Caddy, Nginx + Let's Encrypt — en auto-hébergement).
- [ ] Sauvegardes automatiques de la base de données activées côté fournisseur.
- [ ] Tests de charge sur les routes IA (génération d'exercices/examens) avant ouverture à un large public, étant donné leur exécution synchrone actuelle (voir docs/ARCHITECTURE.md).
