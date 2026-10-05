import { demanderIA, extraireJSON } from "@/lib/ai/groq";

/**
 * Agent de recherche web autonome.
 *
 * Règle de recherche (cahier des charges) : la base de connaissances
 * interne, les documents importés par l'élève et son historique priment
 * TOUJOURS sur une recherche externe. Une recherche sur Internet n'est
 * déclenchée que si : l'information manque, doit être actualisée, des
 * exemples supplémentaires sont nécessaires, ou la compréhension de
 * l'élève exige un complément. Cette décision est prise par
 * `evaluerBesoinRecherche` avant tout appel réseau.
 */

export const SOURCES_AUTORISEES = [
  { domaine: "wikipedia.org", nom: "Wikipédia" },
  { domaine: "khanacademy.org", nom: "Khan Academy" },
  { domaine: "openstax.org", nom: "OpenStax" },
  { domaine: "coursera.org", nom: "Coursera" },
  { domaine: "ocw.mit.edu", nom: "MIT OpenCourseWare" },
  { domaine: "britannica.com", nom: "Encyclopædia Britannica" },
  { domaine: "unesco.org", nom: "UNESCO" },
  { domaine: "nationalgeographic.com", nom: "National Geographic Education" },
  { domaine: "bbc.co.uk", nom: "BBC Learning" },
  { domaine: "gouv.ci", nom: "Site gouvernemental ivoirien" },
  { domaine: "gov", nom: "Site gouvernemental (.gov)" },
  { domaine: "edu", nom: "Établissement universitaire reconnu (.edu)" },
] as const;

export interface DecisionRecherche {
  rechercheNecessaire: boolean;
  raison: string;
}

/**
 * Détermine si une recherche externe est justifiée, en appliquant l'ordre
 * de priorité : base interne > documents importés > historique élève >
 * web. Un appel léger à Claude tranche les cas ambigus sans jamais
 * invoquer Internet pour une question que le modèle sait déjà traiter.
 */
export async function evaluerBesoinRecherche(params: {
  question: string;
  contexteDisponible: string;
}): Promise<DecisionRecherche> {
  const systeme = `Tu évalues si une question d'élève nécessite une recherche Internet. Règle stricte : réponds "rechercheNecessaire": true UNIQUEMENT si l'information manque réellement dans tes connaissances et dans le contexte fourni, si une actualisation est nécessaire (ex: données récentes, actualité), ou si des exemples supplémentaires vérifiés sont indispensables. Pour toute question de cours standard (mathématiques, grammaire, sciences de base, histoire-géographie générale, etc.), réponds false : tu as déjà les connaissances nécessaires.

Réponds UNIQUEMENT avec un JSON : { "rechercheNecessaire": boolean, "raison": string }`;

  const reponse = await demanderIA({
    systeme,
    messages: [
      {
        role: "user",
        content: `Question de l'élève : "${params.question}"\n\nContexte déjà disponible (cours, historique) : """${params.contexteDisponible.slice(0, 3000)}"""`,
      },
    ],
    maxTokens: 300,
    temperature: 0,
  });

  return extraireJSON<DecisionRecherche>(reponse);
}

export interface ResultatRechercheBrute {
  titre: string;
  url: string;
  extrait: string;
}

/**
 * Interroge un fournisseur de recherche web (configurable via
 * WEB_SEARCH_PROVIDER / WEB_SEARCH_API_KEY). Si aucune clé n'est
 * configurée, la recherche reste désactivée par conception : l'application
 * continue de fonctionner sur sa base de connaissances interne plutôt que
 * d'échouer. Voir .env.example.
 */
export async function rechercherSurLeWeb(requete: string): Promise<ResultatRechercheBrute[]> {
  const apiKey = process.env.WEB_SEARCH_API_KEY;
  if (!apiKey) return [];

  // Exemple d'intégration avec l'API Brave Search. Adaptable à Bing/Google
  // Custom Search selon la clé fournie dans WEB_SEARCH_PROVIDER.
  try {
    const url = new URL("https://api.search.brave.com/res/v1/web/search");
    url.searchParams.set("q", requete);
    url.searchParams.set("count", "8");

    const reponse = await fetch(url.toString(), {
      headers: { Accept: "application/json", "X-Subscription-Token": apiKey },
    });
    if (!reponse.ok) return [];
    const donnees = await reponse.json();
    const resultats = (donnees?.web?.results ?? []) as Array<{ title: string; url: string; description: string }>;
    return resultats.map((r) => ({ titre: r.title, url: r.url, extrait: r.description }));
  } catch {
    return [];
  }
}

export interface ResultatRechercheVerifiee {
  reponseSynthetisee: string;
  sourcesUtilisees: { titre: string; url: string; fiable: boolean }[];
  indiceConfiance: number;
}

/**
 * Vérifie, filtre et synthétise les résultats bruts : élimine les sources
 * non fiables (hors liste autorisée et sans caractère académique
 * manifeste), recoupe plusieurs sources, puis attribue un indice de
 * confiance global. Retourne une confiance nulle si aucune source fiable
 * n'a été trouvée plutôt que d'inventer une réponse.
 */
export async function verifierEtSynthetiserResultats(params: {
  question: string;
  resultats: ResultatRechercheBrute[];
}): Promise<ResultatRechercheVerifiee> {
  if (params.resultats.length === 0) {
    return { reponseSynthetisee: "", sourcesUtilisees: [], indiceConfiance: 0 };
  }

  const domaineFiable = (url: string) =>
    SOURCES_AUTORISEES.some((s) => url.includes(s.domaine)) || /\.(gouv\.ci|gov|edu)(\/|$)/.test(url);

  const resultatsAnnotes = params.resultats.map((r) => ({ ...r, fiable: domaineFiable(r.url) }));
  const sourcesFiables = resultatsAnnotes.filter((r) => r.fiable);

  if (sourcesFiables.length === 0) {
    return { reponseSynthetisee: "", sourcesUtilisees: [], indiceConfiance: 0 };
  }

  const systeme = `Tu es un vérificateur de sources pour une application éducative. On te donne une question et plusieurs résultats de recherche déjà filtrés comme provenant de sources académiques ou institutionnelles fiables (${SOURCES_AUTORISEES.map((s) => s.nom).join(", ")}). Recoupe les informations entre au moins deux sources quand c'est possible, rédige une synthèse factuelle et neutre adaptée à un contexte scolaire, et attribue un indice de confiance (0 à 1) reflétant le niveau d'accord entre les sources et leur fiabilité.

Réponds UNIQUEMENT avec un JSON : { "reponseSynthetisee": string, "indiceConfiance": number }`;

  const reponse = await demanderIA({
    systeme,
    messages: [
      {
        role: "user",
        content: `Question : "${params.question}"\n\nRésultats :\n${sourcesFiables
          .map((r, i) => `${i + 1}. [${r.titre}](${r.url})\n${r.extrait}`)
          .join("\n\n")}`,
      },
    ],
    maxTokens: 1024,
    temperature: 0.1,
  });

  const { reponseSynthetisee, indiceConfiance } = extraireJSON<{ reponseSynthetisee: string; indiceConfiance: number }>(reponse);

  return {
    reponseSynthetisee,
    sourcesUtilisees: sourcesFiables.map((r) => ({ titre: r.titre, url: r.url, fiable: true })),
    indiceConfiance: Math.max(0, Math.min(1, indiceConfiance)),
  };
}

/** Pipeline complet : décision → recherche → vérification. À utiliser depuis la route de chat du tuteur. */
export async function agentRechercheAutonome(params: {
  question: string;
  contexteDisponible: string;
}): Promise<{ decision: DecisionRecherche; resultat?: ResultatRechercheVerifiee }> {
  const decision = await evaluerBesoinRecherche(params);
  if (!decision.rechercheNecessaire) return { decision };

  const resultatsBruts = await rechercherSurLeWeb(params.question);
  const resultat = await verifierEtSynthetiserResultats({ question: params.question, resultats: resultatsBruts });
  return { decision, resultat };
}
