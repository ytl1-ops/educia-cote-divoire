/**
 * Programme scolaire ivoirien — référentiel interne EDUCIA.
 *
 * Cette table reflète l'architecture générale du système éducatif ivoirien
 * (préscolaire → primaire → collège → lycée, examens CEPE/BEPC/BAC) et sert
 * de base par défaut à l'adaptation automatique du contenu (niveau,
 * vocabulaire, matières disponibles). Elle doit être validée et affinée par
 * une équipe pédagogique (inspecteurs, enseignants) au regard des derniers
 * programmes officiels du Ministère de l'Education Nationale et de
 * l'Alphabétisation (MENA) avant mise en production — voir docs/ARCHITECTURE.md.
 */

export type CodeNiveau =
  | "MATERNELLE"
  | "CP1"
  | "CP2"
  | "CE1"
  | "CE2"
  | "CM1"
  | "CM2"
  | "SIXIEME"
  | "CINQUIEME"
  | "QUATRIEME"
  | "TROISIEME"
  | "SECONDE"
  | "PREMIERE"
  | "TERMINALE";

export type CycleScolaire = "PRESCOLAIRE" | "PRIMAIRE" | "COLLEGE" | "LYCEE";

export interface DefinitionNiveau {
  code: CodeNiveau;
  libelle: string;
  cycle: CycleScolaire;
  ordre: number;
  ageIndicatif: string;
  examenFinCycle?: string;
}

export const NIVEAUX: DefinitionNiveau[] = [
  { code: "MATERNELLE", libelle: "Maternelle", cycle: "PRESCOLAIRE", ordre: 0, ageIndicatif: "3-5 ans" },
  { code: "CP1", libelle: "CP1", cycle: "PRIMAIRE", ordre: 1, ageIndicatif: "6 ans" },
  { code: "CP2", libelle: "CP2", cycle: "PRIMAIRE", ordre: 2, ageIndicatif: "7 ans" },
  { code: "CE1", libelle: "CE1", cycle: "PRIMAIRE", ordre: 3, ageIndicatif: "8 ans" },
  { code: "CE2", libelle: "CE2", cycle: "PRIMAIRE", ordre: 4, ageIndicatif: "9 ans" },
  { code: "CM1", libelle: "CM1", cycle: "PRIMAIRE", ordre: 5, ageIndicatif: "10 ans" },
  { code: "CM2", libelle: "CM2", cycle: "PRIMAIRE", ordre: 6, ageIndicatif: "11 ans", examenFinCycle: "CEPE" },
  { code: "SIXIEME", libelle: "6ème", cycle: "COLLEGE", ordre: 7, ageIndicatif: "12 ans" },
  { code: "CINQUIEME", libelle: "5ème", cycle: "COLLEGE", ordre: 8, ageIndicatif: "13 ans" },
  { code: "QUATRIEME", libelle: "4ème", cycle: "COLLEGE", ordre: 9, ageIndicatif: "14 ans" },
  { code: "TROISIEME", libelle: "3ème", cycle: "COLLEGE", ordre: 10, ageIndicatif: "15 ans", examenFinCycle: "BEPC" },
  { code: "SECONDE", libelle: "Seconde", cycle: "LYCEE", ordre: 11, ageIndicatif: "16 ans" },
  { code: "PREMIERE", libelle: "Première", cycle: "LYCEE", ordre: 12, ageIndicatif: "17 ans" },
  { code: "TERMINALE", libelle: "Terminale", cycle: "LYCEE", ordre: 13, ageIndicatif: "18 ans", examenFinCycle: "BAC" },
];

export interface DefinitionMatiere {
  code: string;
  nom: string;
  cycles: CycleScolaire[];
  couleur: string;
  icone: string;
}

export const MATIERES: DefinitionMatiere[] = [
  { code: "EVEIL", nom: "Éveil / Activités d'éveil", cycles: ["PRESCOLAIRE"], couleur: "#F59E0B", icone: "🧸" },
  { code: "LANGAGE", nom: "Langage et graphisme", cycles: ["PRESCOLAIRE"], couleur: "#EC4899", icone: "✏️" },
  { code: "MATHEMATIQUES", nom: "Mathématiques", cycles: ["PRIMAIRE", "COLLEGE", "LYCEE"], couleur: "#0B8FEF", icone: "📐" },
  { code: "FRANCAIS", nom: "Français", cycles: ["PRIMAIRE", "COLLEGE", "LYCEE"], couleur: "#DC2626", icone: "📖" },
  { code: "ANGLAIS", nom: "Anglais", cycles: ["PRIMAIRE", "COLLEGE", "LYCEE"], couleur: "#2563EB", icone: "🇬🇧" },
  { code: "EST", nom: "Éducation Scientifique et Technologique", cycles: ["PRIMAIRE"], couleur: "#16A34A", icone: "🔬" },
  { code: "PHYSIQUE", nom: "Physique", cycles: ["COLLEGE", "LYCEE"], couleur: "#7C3AED", icone: "⚡" },
  { code: "CHIMIE", nom: "Chimie", cycles: ["COLLEGE", "LYCEE"], couleur: "#9333EA", icone: "🧪" },
  { code: "SVT", nom: "Sciences de la Vie et de la Terre", cycles: ["COLLEGE", "LYCEE"], couleur: "#059669", icone: "🌱" },
  { code: "HISTOIRE", nom: "Histoire", cycles: ["PRIMAIRE", "COLLEGE", "LYCEE"], couleur: "#B45309", icone: "🏛️" },
  { code: "GEOGRAPHIE", nom: "Géographie", cycles: ["PRIMAIRE", "COLLEGE", "LYCEE"], couleur: "#0E7490", icone: "🗺️" },
  { code: "EDHC", nom: "Éducation aux Droits de l'Homme et à la Citoyenneté", cycles: ["PRIMAIRE", "COLLEGE", "LYCEE"], couleur: "#4D7C0F", icone: "🤝" },
  { code: "PHILOSOPHIE", nom: "Philosophie", cycles: ["LYCEE"], couleur: "#581C87", icone: "💭" },
  { code: "INFORMATIQUE", nom: "Informatique", cycles: ["COLLEGE", "LYCEE"], couleur: "#1D4ED8", icone: "💻" },
  { code: "ECONOMIE", nom: "Économie", cycles: ["LYCEE"], couleur: "#B91C1C", icone: "📊" },
  { code: "COMPTABILITE", nom: "Comptabilité", cycles: ["LYCEE"], couleur: "#92400E", icone: "🧮" },
  { code: "SCIENCES_ECONOMIQUES", nom: "Sciences Économiques et Sociales", cycles: ["LYCEE"], couleur: "#C2410C", icone: "📈" },
  { code: "ALLEMAND", nom: "Allemand", cycles: ["COLLEGE", "LYCEE"], couleur: "#111827", icone: "🇩🇪" },
  { code: "ESPAGNOL", nom: "Espagnol", cycles: ["COLLEGE", "LYCEE"], couleur: "#EA580C", icone: "🇪🇸" },
  { code: "LATIN", nom: "Latin", cycles: ["COLLEGE", "LYCEE"], couleur: "#78716C", icone: "🏺" },
  { code: "ARTS_PLASTIQUES", nom: "Arts Plastiques", cycles: ["PRIMAIRE", "COLLEGE"], couleur: "#DB2777", icone: "🎨" },
  { code: "MUSIQUE", nom: "Éducation Musicale", cycles: ["PRESCOLAIRE", "PRIMAIRE", "COLLEGE"], couleur: "#7C2D92", icone: "🎵" },
  { code: "EPS", nom: "Éducation Physique et Sportive", cycles: ["PRIMAIRE", "COLLEGE", "LYCEE"], couleur: "#0D9488", icone: "⚽" },
];

/** Matières offertes par cycle (filtrage rapide pour l'UI). */
export function matieresDuCycle(cycle: CycleScolaire): DefinitionMatiere[] {
  return MATIERES.filter((m) => m.cycles.includes(cycle));
}

/** Matières offertes pour un niveau donné (dérivées du cycle du niveau). */
export function matieresDuNiveau(codeNiveau: CodeNiveau): DefinitionMatiere[] {
  const niveau = NIVEAUX.find((n) => n.code === codeNiveau);
  if (!niveau) return [];
  return matieresDuCycle(niveau.cycle);
}

export function definitionNiveau(codeNiveau: CodeNiveau): DefinitionNiveau | undefined {
  return NIVEAUX.find((n) => n.code === codeNiveau);
}

export function definitionMatiere(codeMatiere: string): DefinitionMatiere | undefined {
  return MATIERES.find((m) => m.code === codeMatiere);
}

/**
 * Vocabulaire et registre de langage à adapter selon le cycle — utilisé par
 * le moteur de prompts du tuteur IA (src/lib/ai/tuteur-prompt.ts) pour
 * calibrer le ton et la complexité des explications.
 */
export const REGISTRE_PAR_CYCLE: Record<CycleScolaire, {
  ton: string;
  longueurPhrase: string;
  exemples: string;
}> = {
  PRESCOLAIRE: {
    ton: "très simple, chaleureux, ludique, avec beaucoup d'encouragements et d'émojis adaptés",
    longueurPhrase: "phrases très courtes (5-8 mots)",
    exemples: "objets du quotidien, animaux, couleurs, famille",
  },
  PRIMAIRE: {
    ton: "simple, encourageant, patient, proche du vécu de l'enfant",
    longueurPhrase: "phrases courtes et claires",
    exemples: "vie quotidienne en Côte d'Ivoire : marché, famille, école, nature",
  },
  COLLEGE: {
    ton: "clair, structuré, motivant, qui valorise l'effort et la méthode",
    longueurPhrase: "phrases de longueur moyenne, vocabulaire précis mais accessible",
    exemples: "situations concrètes, actualité locale, sport, numérique",
  },
  LYCEE: {
    ton: "rigoureux, exigeant mais respectueux, orienté vers l'autonomie et la réussite aux examens",
    longueurPhrase: "phrases plus complexes, vocabulaire disciplinaire précis",
    exemples: "enjeux économiques et sociaux ivoiriens et mondiaux, orientation post-bac",
  },
};

/** Examens nationaux pris en charge par le générateur d'examens blancs. */
export const EXAMENS_NATIONAUX = [
  { code: "CEPE", nom: "Certificat d'Études Primaires Élémentaires", niveau: "CM2" as CodeNiveau },
  { code: "BEPC", nom: "Brevet d'Études du Premier Cycle", niveau: "TROISIEME" as CodeNiveau },
  { code: "BAC", nom: "Baccalauréat", niveau: "TERMINALE" as CodeNiveau },
];
