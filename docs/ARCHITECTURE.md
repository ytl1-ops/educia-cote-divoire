# Architecture — EDUCIA Côte d'Ivoire

## 1. Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (navigateur / PWA)                │
│  Next.js App Router · React · TypeScript · TailwindCSS           │
│  Service Worker (mode hors ligne) · Manifest (installation)      │
└───────────────────────────────┬───────────────────────────────────┘
                                 │ HTTPS (cookies JWT httpOnly)
┌───────────────────────────────▼───────────────────────────────────┐
│                    BACKEND — Next.js Route Handlers               │
│  /api/auth/*        authentification, sessions                    │
│  /api/documents/*    import, stockage, déclenchement OCR          │
│  /api/tuteur/*       sessions & messages du Professeur IA         │
│  /api/exercices/*    génération & correction d'exercices          │
│  /api/examens/*      génération d'examens blancs                  │
│  /api/parents/*      liaison parent-élève, rapports                │
│  /api/eleves/*       progrès, profils d'apprentissage              │
│  /api/gamification/* classements                                   │
│  /api/admin/*        statistiques plateforme                       │
└───────────────┬─────────────────────────────┬─────────────────────┘
                │                              │
┌───────────────▼───────────────┐  ┌───────────▼─────────────────────┐
│   Prisma ORM → PostgreSQL      │  │   Moteur IA (src/lib/ai/*)       │
│   Utilisateurs, rôles,         │  │   groq.ts          client IA (Groq)   │
│   programme scolaire,          │  │   tuteur-prompt.ts moteur péda.  │
│   documents, exercices,        │  │   ocr.ts           vision/OCR    │
│   évaluations, gamification,   │  │   generateur-exercices.ts        │
│   rapports, recherche web      │  │   correcteur.ts                  │
└─────────────────────────────────┘  │   examens.ts                     │
                                      │   recherche-web.ts (agent)       │
                                      └───────────────────────────────────┘
```

## 2. Pourquoi ces choix

- **Next.js App Router monolithique** (frontend + backend dans un seul projet) : réduit la complexité opérationnelle pour une V1, permet un déploiement unique (Vercel ou conteneur Docker), tout en gardant une séparation nette des responsabilités par dossier (`src/app/api/*` = backend, `src/app/(pages)` = frontend, `src/lib/*` = logique métier partagée).
- **Prisma + PostgreSQL** : schéma fortement typé généré automatiquement vers TypeScript, migrations versionnées, adapté à la fois à un hébergement managé (Neon, Supabase) et à une instance auto-hébergée.
- **Groq comme moteur IA unique** (modèles Llama, texte + vision), sur son palier gratuit : un seul fournisseur couvre le tuteur conversationnel, l'OCR/vision (texte imprimé et manuscrit, schémas, formules), la génération d'exercices/examens et la correction, sans frais et sans carte bancaire ni vérification téléphonique — au prix d'un quota de requêtes/tokens par minute à surveiller si l'usage grandit (voir docs/DEPLOIEMENT.md). Choisi après l'échec de Google Gemini : le compte Google du porteur de projet s'est vu refuser l'accès (`CONSUMER_SUSPENDED`) sur toutes les clés générées, un blocage au niveau du compte que changer de clé ne résout pas.
- **JWT en cookie httpOnly** plutôt qu'une bibliothèque d'authentification tierce : contrôle total sur le modèle de rôles (élève/parent/enseignant/admin) sans dépendance à un fournisseur externe, au prix d'une surface de code légèrement plus grande (acceptable ici, le code est court et isolé dans `src/lib/auth.ts`).
- **Connexion sans mot de passe pour les profils élève/parent/enseignant** : ce projet étant un usage familial/domestique et non commercial, l'écran `/connexion` affiche directement les profils existants (sélection façon « qui es-tu ? », comme des profils de streaming partagés) — un clic suffit, sans identifiant ni mot de passe, et chaque activité reste rattachée au profil choisi pour le suivi parental. Le champ `motDePasseH` d'`Utilisateur` est donc optionnel. Seul le compte **ADMIN** conserve une connexion par mot de passe (`/admin/connexion`), car il donne accès aux statistiques de toute la plateforme et à la bascule vers n'importe quel compte de démonstration.

## 3. Modèle pédagogique du tuteur IA

Le cœur pédagogique est encodé dans `src/lib/ai/tuteur-prompt.ts` : un prompt système reconstruit à chaque message, qui encode la méthode en 8 étapes (comprendre → expliquer → illustrer → guider → vérifier → corriger → pratiquer → mesurer), les méthodes pédagogiques mondiales (Active Recall, répétition espacée, mastery learning, etc.), et l'adaptation du registre de langue par cycle scolaire (préscolaire/primaire/collège/lycée — voir `REGISTRE_PAR_CYCLE` dans `src/lib/programmes/curriculum.ts`).

La règle « ne jamais donner la réponse immédiatement » est une instruction de prompt, pas une contrainte structurelle du code — c'est un choix délibéré : un verrou purement mécanique (ex: masquer systématiquement la réponse) empêcherait les cas légitimes (élève qui veut vérifier un devoir déjà fait). La fidélité à la règle dépend donc de la qualité du prompt et du modèle ; elle doit être surveillée en production (voir section 6).

## 4. Pipeline d'import et d'analyse de documents

1. L'élève importe un fichier (`POST /api/documents`, `multipart/form-data`).
2. Le fichier est stocké (pilote `local` par défaut, voir `src/lib/stockage.ts` — bascule vers S3/R2 en production).
3. Analyse synchrone selon le type :
   - **Image/Scan** → vision Groq (`analyserImageDocument`) : extraction du texte (imprimé ou manuscrit), détection matière/niveau/chapitre, compétences visées, difficultés potentielles.
   - **PDF** → extraction de texte via `pdf-parse` ; si le texte est trop court (< 40 caractères, probable PDF scanné sans couche texte), l'analyse échoue avec un message explicite invitant à réimporter en image.
   - **TXT** → analyse directe du texte.
   - **Word/Excel/PowerPoint/audio/vidéo** → import accepté et stocké, mais l'analyse automatique n'est **pas encore implémentée** (nécessite des convertisseurs dédiés, voir section 6).
4. Le résultat alimente `Document` (texte extrait, matière/niveau détectés, indice de confiance) et une `RessourcePedagogique` de type résumé.

## 5. Agent de recherche web autonome

`src/lib/ai/recherche-web.ts` implémente les règles du cahier des charges :

1. **Ordre de priorité strict** : base de connaissances interne → documents importés → historique de l'élève → web. `evaluerBesoinRecherche` interroge Groq pour décider si une recherche externe est réellement nécessaire (information manquante, à actualiser, ou exemples supplémentaires requis) — la très grande majorité des questions scolaires standard ne déclenchent **aucun** appel réseau.
2. **Recherche** : si `WEB_SEARCH_API_KEY` est configurée, interroge un fournisseur (Brave Search par défaut, adaptable). Sans clé, la recherche reste désactivée par conception et l'application continue de fonctionner sur ses connaissances internes.
3. **Vérification des sources** : les résultats sont filtrés par domaine (liste `SOURCES_AUTORISEES` : Wikipédia, Khan Academy, OpenStax, Coursera, MIT OCW, Britannica, UNESCO, National Geographic Education, BBC Learning, sites `.gouv.ci`/`.gov`/`.edu`). Une synthèse n'est produite que si au moins une source fiable est trouvée, avec un indice de confiance explicite.

## 6. Pistes d'évolution (honnêtement documentées)

Cette V1 couvre l'ensemble des piliers fonctionnels mais plusieurs points, listés ici sans détour, restent à construire avant une mise en production à grande échelle :

- **File de tâches asynchrone** : l'analyse de documents et la génération d'exercices/examens s'exécutent actuellement de façon synchrone dans la requête HTTP (acceptable pour une V1, mais source de lenteur/timeout sous charge). Prévoir une file (BullMQ + Redis, ou équivalent managé) pour découpler l'upload de l'analyse.
- **Conversion Word/Excel/PowerPoint/audio/vidéo** : seuls Image/Scan, PDF (texte) et TXT sont analysés automatiquement aujourd'hui. Ajouter des convertisseurs (`mammoth` pour DOCX, `xlsx` pour Excel, extraction de diapositives pour PPTX, transcription audio type Whisper pour les imports audio/vidéo).
- **Reconnaissance et synthèse vocales** (assistant vocal) : non implémentées dans cette V1 ; prévoir l'API Web Speech côté client ou un service de synthèse vocale (ex: ElevenLabs, Google Cloud TTS) et de reconnaissance vocale.
- **Notifications WhatsApp/Email effectives** : les variables d'environnement et la structure des rapports (`RapportParent`, `canauxEnvoi`) existent, mais l'envoi effectif via l'API WhatsApp Business/Twilio et un fournisseur SMTP reste à implémenter (`docs/DEPLOIEMENT.md` indique les points d'intégration).
- **Espace enseignant avancé** : gestion de classes, correction assistée de copies, statistiques de classe — le compte enseignant existe et est fonctionnel (authentification, matières/niveaux enseignés), mais ces fonctionnalités collectives restent à construire.
- **Génération d'examens blancs persistée en base** : les épreuves générées (`POST /api/examens/generer`) sont renvoyées à l'élève et l'évaluation est journalisée, mais les exercices de l'épreuve ne sont pas (encore) individuellement persistés et reliés via `EvaluationExercice` — à faire pour permettre la correction différée et l'historique détaillé.
- **Import de contenu sans IA** : aujourd'hui, l'analyse de documents (section 4) et toute la génération de contenu pédagogique passent par Groq. Il n'existe pas encore de voie manuelle (formulaire de saisie directe d'un exercice, import structuré par gabarit Excel/CSV) permettant d'alimenter la base sans aucun appel IA — utile en complément pour ne pas dépendre entièrement d'un fournisseur externe.
- **Vérification empirique de la règle pédagogique** « ne jamais donner la réponse immédiatement » : à instrumenter (tests de prompts, échantillonnage de conversations réelles) avant un déploiement à grande échelle, car c'est une instruction de prompt et non une contrainte mécanique.
- **Modération et sécurité enfant renforcées** : le prompt système inclut des garde-fous (pas de contenu inapproprié, orientation vers un adulte en cas de détresse), mais aucune couche de modération automatisée indépendante du modèle (filtrage de contenu, journalisation des signaux à risque pour les administrateurs) n'est en place.
- **Internationalisation** : l'anglais, l'allemand, l'espagnol et le latin sont pris en charge comme matières d'enseignement, mais l'interface elle-même n'est disponible qu'en français (conformément aux préférences du porteur de projet).
- **Tests automatisés** : aucune suite de tests (unitaires/E2E) n'est encore écrite. À prioriser avant toute mise en production, en particulier sur l'authentification, le pipeline OCR et les routes de gamification (idempotence des points/badges).
