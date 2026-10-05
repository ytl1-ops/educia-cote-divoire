import { demanderIA, extraireJSON } from "@/lib/ai/gemini";
import { CodeNiveau, definitionMatiere, definitionNiveau } from "@/lib/programmes/curriculum";

export interface ExerciceGenere {
  enonce: string;
  solutionDetaillee: string;
  explicationPedagogique: string;
  astuceMemorisation: string;
}

export interface JeuExercices {
  faciles: ExerciceGenere[];
  intermediaires: ExerciceGenere[];
  avances: ExerciceGenere[];
}

const SCHEMA_EXERCICE = `{ "enonce": string, "solutionDetaillee": string, "explicationPedagogique": string, "astuceMemorisation": string }`;

/**
 * Génère un jeu complet d'exercices pour une leçon/chapitre : 10 faciles,
 * 10 intermédiaires, 10 avancés — conformément au cahier des charges.
 * Le nombre est paramétrable (par défaut 10/10/10) pour permettre des
 * générations plus légères côté API (pagination, génération à la demande).
 */
export async function genererJeuExercices(params: {
  matiereCode: string;
  niveau: CodeNiveau;
  titreChapitre: string;
  contexteSupplementaire?: string;
  nombreParNiveau?: { facile: number; intermediaire: number; avance: number };
}): Promise<JeuExercices> {
  const matiere = definitionMatiere(params.matiereCode);
  const niveau = definitionNiveau(params.niveau);
  const n = params.nombreParNiveau ?? { facile: 10, intermediaire: 10, avance: 10 };

  const systeme = `Tu es un enseignant expert du programme ivoirien en ${matiere?.nom ?? params.matiereCode}, niveau ${niveau?.libelle ?? params.niveau}. Tu conçois des exercices rigoureux, variés et strictement adaptés à ce niveau.

Pour chaque exercice, fournis :
- "enonce" : l'énoncé complet, clair, sans ambiguïté.
- "solutionDetaillee" : la résolution complète, étape par étape (jamais juste le résultat final).
- "explicationPedagogique" : pourquoi cette méthode fonctionne, quel concept est mobilisé.
- "astuceMemorisation" : un moyen mnémotechnique ou une astuce pratique pour retenir la méthode.

Les exercices "faciles" vérifient la compréhension de base. Les "intermédiaires" demandent d'appliquer la notion dans un contexte nouveau. Les "avancés" combinent plusieurs notions ou demandent un raisonnement plus poussé. Ancre les exemples dans un contexte ivoirien quand c'est pertinent (prénoms, lieux, monnaie FCFA, situations locales).

Réponds UNIQUEMENT avec un JSON de cette forme exacte, sans aucun texte autour :
{ "faciles": [${SCHEMA_EXERCICE}, ...], "intermediaires": [${SCHEMA_EXERCICE}, ...], "avances": [${SCHEMA_EXERCICE}, ...] }`;

  const instruction = `Chapitre/leçon : "${params.titreChapitre}".${
    params.contexteSupplementaire ? `\nContexte supplémentaire tiré du cours de l'élève :\n"""${params.contexteSupplementaire.slice(0, 6000)}"""` : ""
  }\nGénère exactement ${n.facile} exercices faciles, ${n.intermediaire} intermédiaires et ${n.avance} avancés.`;

  const reponse = await demanderIA({
    systeme,
    messages: [{ role: "user", content: instruction }],
    maxTokens: 8192,
    temperature: 0.6,
  });

  return extraireJSON<JeuExercices>(reponse);
}

/**
 * Génère des variantes d'un exercice existant (même notion, valeurs ou
 * contexte différents) — utile pour l'apprentissage adaptatif et la
 * répétition espacée quand l'élève doit s'exercer à nouveau sur une notion.
 */
export async function genererVariantesExercice(params: {
  matiereCode: string;
  niveau: CodeNiveau;
  exerciceOriginal: ExerciceGenere;
  nombreVariantes?: number;
}): Promise<ExerciceGenere[]> {
  const matiere = definitionMatiere(params.matiereCode);
  const niveau = definitionNiveau(params.niveau);
  const nombre = params.nombreVariantes ?? 3;

  const systeme = `Tu es un enseignant de ${matiere?.nom ?? params.matiereCode}, niveau ${niveau?.libelle ?? params.niveau}. On te donne un exercice. Produis ${nombre} variantes qui testent EXACTEMENT la même notion et le même niveau de difficulté, mais avec un énoncé, des valeurs ou un contexte différents. Même structure de réponse que l'exercice original.

Réponds UNIQUEMENT avec un JSON : { "variantes": [${SCHEMA_EXERCICE}, ...] }`;

  const reponse = await demanderIA({
    systeme,
    messages: [
      {
        role: "user",
        content: `Exercice original :\n${JSON.stringify(params.exerciceOriginal, null, 2)}`,
      },
    ],
    maxTokens: 3072,
    temperature: 0.7,
  });

  const { variantes } = extraireJSON<{ variantes: ExerciceGenere[] }>(reponse);
  return variantes;
}
