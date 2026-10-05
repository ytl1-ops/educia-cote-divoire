import { demanderIAAvecImage, demanderIA, extraireJSON, ImagePourIA } from "@/lib/ai/gemini";
import { MATIERES, NIVEAUX } from "@/lib/programmes/curriculum";

export interface ResultatAnalyseDocument {
  texteExtrait: string;
  matiereDetecteeCode: string | null;
  niveauDetecte: string | null;
  chapitreTitreDetecte: string | null;
  competencesVisees: string[];
  objectifsPedagogiques: string[];
  difficultesPotentielles: string[];
  indiceConfiance: number;
  typeContenu: "texte_imprime" | "ecriture_manuscrite" | "mixte" | "tableau_graphique" | "formule" | "schema" | "inconnu";
}

const PROMPT_SYSTEME_ANALYSE = `Tu es un expert en OCR et en analyse pédagogique pour le système éducatif ivoirien. Tu reçois une image (page de cahier, manuel, exercice, scan) ou un document.

Tâches, dans l'ordre :
1. Extraire fidèlement TOUT le texte visible, qu'il soit imprimé ou manuscrit. Pour les tableaux, restitue la structure en texte lisible. Pour les formules mathématiques ou chimiques, utilise une notation textuelle claire (ex: "x^2 + 3x - 4 = 0", "H2SO4"). Pour les schémas/figures géométriques, décris brièvement ce qu'ils représentent en plus de tout texte/légende qu'ils contiennent.
2. Corriger mentalement les défauts évidents de prise de vue (inclinaison, flou léger, luminosité) : ne les mentionne pas, concentre-toi sur le contenu.
3. Identifier la matière la plus probable parmi cette liste de codes : ${MATIERES.map((m) => m.code).join(", ")}.
4. Identifier le niveau scolaire le plus probable parmi : ${NIVEAUX.map((n) => n.code).join(", ")}.
5. Proposer un titre de chapitre/leçon concis.
6. Lister les compétences visées et les objectifs pédagogiques probables.
7. Lister les difficultés potentielles qu'un élève pourrait rencontrer sur ce contenu.
8. Donner un indice de confiance global entre 0 et 1 sur ta détection (pas sur l'extraction du texte).

Réponds UNIQUEMENT avec un objet JSON strictement conforme à ce schéma, sans aucun texte autour :
{
  "texteExtrait": string,
  "matiereDetecteeCode": string | null,
  "niveauDetecte": string | null,
  "chapitreTitreDetecte": string | null,
  "competencesVisees": string[],
  "objectifsPedagogiques": string[],
  "difficultesPotentielles": string[],
  "indiceConfiance": number,
  "typeContenu": "texte_imprime" | "ecriture_manuscrite" | "mixte" | "tableau_graphique" | "formule" | "schema" | "inconnu"
}`;

/** Analyse une image (photo, scan) via la vision de Gemini. */
export async function analyserImageDocument(image: ImagePourIA): Promise<ResultatAnalyseDocument> {
  const reponse = await demanderIAAvecImage({
    systeme: PROMPT_SYSTEME_ANALYSE,
    instructionUtilisateur:
      "Analyse ce document scolaire conformément à tes instructions et renvoie uniquement le JSON demandé.",
    images: [image],
    maxTokens: 4096,
  });
  return normaliser(extraireJSON<ResultatAnalyseDocument>(reponse));
}

/**
 * Analyse un texte déjà extrait (ex: PDF numérique lisible via pdf-parse,
 * ou fichier .txt/.csv importé) — évite un aller-retour vision inutile.
 */
export async function analyserTexteDocument(texte: string): Promise<ResultatAnalyseDocument> {
  const reponse = await demanderIA({
    systeme: PROMPT_SYSTEME_ANALYSE,
    messages: [
      {
        role: "user",
        content: `Voici le texte déjà extrait d'un document scolaire. Analyse-le et renvoie uniquement le JSON demandé (le champ "texteExtrait" doit reprendre ce texte, nettoyé si besoin) :\n\n"""\n${texte.slice(0, 20000)}\n"""`,
      },
    ],
    maxTokens: 4096,
    temperature: 0.1,
  });
  return normaliser(extraireJSON<ResultatAnalyseDocument>(reponse));
}

function normaliser(resultat: ResultatAnalyseDocument): ResultatAnalyseDocument {
  return {
    ...resultat,
    indiceConfiance: Math.max(0, Math.min(1, Number(resultat.indiceConfiance) || 0)),
    competencesVisees: resultat.competencesVisees ?? [],
    objectifsPedagogiques: resultat.objectifsPedagogiques ?? [],
    difficultesPotentielles: resultat.difficultesPotentielles ?? [],
  };
}

/**
 * Extraction de texte pour un PDF "numérique" (texte sélectionnable), sans
 * appel IA. Si le texte obtenu est trop court (PDF scanné = image), le
 * code appelant doit retomber sur la vision (convertir la première page en
 * image, ou appeler analyserImageDocument pour chaque page rendue).
 */
export async function extraireTextePDF(buffer: Buffer): Promise<string> {
  const pdfParse = (await import("pdf-parse")).default;
  const resultat = await pdfParse(buffer);
  return resultat.text.trim();
}

/** Seuil sous lequel on considère qu'un PDF est probablement scanné (image). */
export const SEUIL_PDF_SCANNE_CARACTERES = 40;
