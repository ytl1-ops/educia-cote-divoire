import { demanderIA, extraireJSON } from "@/lib/ai/groq";
import { CodeNiveau, definitionNiveau } from "@/lib/programmes/curriculum";
import { ExerciceGenere } from "@/lib/ai/generateur-exercices";

export type CodeExamenNational = "CEPE" | "BEPC" | "BAC";

export interface EpreuveExamen {
  matiereCode: string;
  dureeMinutes: number;
  bareme: number;
  exercices: ExerciceGenere[];
}

export interface ExamenBlancGenere {
  titre: string;
  codeExamen: CodeExamenNational;
  niveau: CodeNiveau;
  epreuves: EpreuveExamen[];
}

const LIBELLES_EXAMEN: Record<CodeExamenNational, { nom: string; niveau: CodeNiveau; matieresTypes: string[] }> = {
  CEPE: { nom: "Certificat d'Études Primaires Élémentaires", niveau: "CM2", matieresTypes: ["FRANCAIS", "MATHEMATIQUES", "EST", "HISTOIRE", "GEOGRAPHIE"] },
  BEPC: { nom: "Brevet d'Études du Premier Cycle", niveau: "TROISIEME", matieresTypes: ["FRANCAIS", "MATHEMATIQUES", "ANGLAIS", "PHYSIQUE", "CHIMIE", "SVT", "HISTOIRE", "GEOGRAPHIE", "EDHC"] },
  BAC: { nom: "Baccalauréat", niveau: "TERMINALE", matieresTypes: ["FRANCAIS", "MATHEMATIQUES", "ANGLAIS", "PHILOSOPHIE", "PHYSIQUE", "CHIMIE", "SVT", "HISTOIRE", "GEOGRAPHIE"] },
};

/**
 * Génère une épreuve d'examen blanc pour une matière donnée, dans l'esprit
 * des sujets officiels (structure, durée, barème) — à affiner avec de
 * vraies annales par l'équipe pédagogique (voir docs/ARCHITECTURE.md).
 */
export async function genererEpreuveExamen(params: {
  codeExamen: CodeExamenNational;
  matiereCode: string;
  nombreExercices?: number;
}): Promise<EpreuveExamen> {
  const infos = LIBELLES_EXAMEN[params.codeExamen];
  const niveau = definitionNiveau(infos.niveau);
  const nombre = params.nombreExercices ?? 4;

  const systeme = `Tu es un examinateur officiel ivoirien chargé de produire un sujet blanc de ${infos.nom} en ${params.matiereCode}, niveau ${niveau?.libelle}. Respecte la structure habituelle de cet examen (exercices progressifs, mélange de restitution et de raisonnement, style des annales ivoiriennes). Donne pour chaque exercice son énoncé complet, le barème implicite déjà intégré à l'énoncé si pertinent, la solution détaillée, l'explication pédagogique et une astuce de mémorisation.

Réponds UNIQUEMENT avec un JSON :
{ "dureeMinutes": number, "bareme": number, "exercices": [{ "enonce": string, "solutionDetaillee": string, "explicationPedagogique": string, "astuceMemorisation": string }, ...] }`;

  const reponse = await demanderIA({
    systeme,
    messages: [
      { role: "user", content: `Génère ${nombre} exercices formant une épreuve complète et cohérente de ${infos.nom} en ${params.matiereCode}.` },
    ],
    maxTokens: 6144,
    temperature: 0.5,
  });

  const { dureeMinutes, bareme, exercices } = extraireJSON<{ dureeMinutes: number; bareme: number; exercices: ExerciceGenere[] }>(reponse);
  return { matiereCode: params.matiereCode, dureeMinutes, bareme, exercices };
}

/** Génère un examen blanc complet (toutes épreuves types de l'examen). */
export async function genererExamenBlancComplet(codeExamen: CodeExamenNational): Promise<ExamenBlancGenere> {
  const infos = LIBELLES_EXAMEN[codeExamen];
  const epreuves = await Promise.all(
    infos.matieresTypes.map((matiereCode) => genererEpreuveExamen({ codeExamen, matiereCode }))
  );

  return {
    titre: `${infos.nom} Blanc — ${new Date().getFullYear()}`,
    codeExamen,
    niveau: infos.niveau,
    epreuves,
  };
}

export { LIBELLES_EXAMEN };
