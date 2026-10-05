import { demanderIA, extraireJSON } from "@/lib/ai/gemini";
import { CodeNiveau, definitionNiveau } from "@/lib/programmes/curriculum";

export interface ResultatCorrectionReponse {
  estCorrecte: boolean;
  scorePourcentage: number;
  feedback: string;
  pointsAAmeliorer: string[];
  encouragement: string;
}

/**
 * Corrige la réponse d'un élève à un exercice donné (toutes matières hors
 * production écrite longue — voir corrigerTexteFrancais pour la rédaction).
 */
export async function corrigerReponseExercice(params: {
  matiereCode: string;
  niveau: CodeNiveau;
  enonce: string;
  solutionAttendue: string;
  reponseEleve: string;
}): Promise<ResultatCorrectionReponse> {
  const niveau = definitionNiveau(params.niveau);

  const systeme = `Tu es un correcteur pédagogique bienveillant et rigoureux, niveau ${niveau?.libelle ?? params.niveau}. On te donne un énoncé, la solution attendue et la réponse d'un élève. Évalue si la réponse est correcte (accepte les méthodes alternatives valides, pas seulement une correspondance exacte au texte). Donne un retour constructif qui explique l'erreur sans jamais être blessant, et toujours un mot d'encouragement sincère adapté à l'âge.

Réponds UNIQUEMENT avec un JSON :
{ "estCorrecte": boolean, "scorePourcentage": number (0-100), "feedback": string, "pointsAAmeliorer": string[], "encouragement": string }`;

  const reponse = await demanderIA({
    systeme,
    messages: [
      {
        role: "user",
        content: `Énoncé :\n${params.enonce}\n\nSolution attendue :\n${params.solutionAttendue}\n\nRéponse de l'élève :\n${params.reponseEleve}`,
      },
    ],
    maxTokens: 1536,
    temperature: 0.3,
  });

  return extraireJSON<ResultatCorrectionReponse>(reponse);
}

export interface ErreurTexteFrancais {
  type: "orthographe" | "grammaire" | "conjugaison" | "syntaxe" | "ponctuation" | "vocabulaire";
  extraitOriginal: string;
  correction: string;
  explication: string;
}

export interface ResultatCorrectionTexte {
  texteCorrige: string;
  erreurs: ErreurTexteFrancais[];
  appreciationGenerale: string;
  pistesAmelioration: string[];
}

/**
 * Corrige un texte libre en français (dictée, rédaction, réponse de
 * compréhension écrite) : orthographe, grammaire, conjugaison, syntaxe —
 * avec explication pédagogique de chaque erreur, pas seulement la correction.
 */
export async function corrigerTexteFrancais(params: {
  niveau: CodeNiveau;
  typeProduction: "dictee" | "redaction" | "comprehension_ecrite" | "autre";
  texteEleve: string;
  consigneOriginale?: string;
}): Promise<ResultatCorrectionTexte> {
  const niveau = definitionNiveau(params.niveau);

  const systeme = `Tu es un professeur de français expert, niveau ${niveau?.libelle ?? params.niveau}. Corrige le texte de l'élève (${params.typeProduction}) : repère chaque faute d'orthographe, de grammaire, de conjugaison, de syntaxe, de ponctuation ou de vocabulaire. Pour chacune, explique la règle en des termes adaptés au niveau. Fournis aussi une version intégralement corrigée du texte et une appréciation générale bienveillante mais honnête, avec des pistes concrètes d'amélioration.

Réponds UNIQUEMENT avec un JSON :
{ "texteCorrige": string, "erreurs": [{ "type": "orthographe"|"grammaire"|"conjugaison"|"syntaxe"|"ponctuation"|"vocabulaire", "extraitOriginal": string, "correction": string, "explication": string }], "appreciationGenerale": string, "pistesAmelioration": string[] }`;

  const reponse = await demanderIA({
    systeme,
    messages: [
      {
        role: "user",
        content: `${params.consigneOriginale ? `Consigne : ${params.consigneOriginale}\n\n` : ""}Texte de l'élève :\n"""\n${params.texteEleve}\n"""`,
      },
    ],
    maxTokens: 3072,
    temperature: 0.2,
  });

  return extraireJSON<ResultatCorrectionTexte>(reponse);
}
