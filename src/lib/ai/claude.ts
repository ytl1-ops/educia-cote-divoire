import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

/**
 * Client Anthropic partagé. Lève une erreur explicite si la clé API n'est
 * pas configurée plutôt que d'échouer silencieusement en production.
 */
export function clientClaude(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        "ANTHROPIC_API_KEY manquante. Renseignez-la dans votre fichier .env (voir .env.example)."
      );
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

export const MODELE_CLAUDE = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

export interface ImagePourClaude {
  /** Type MIME, ex: "image/jpeg", "image/png", "image/webp" */
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
  /** Données encodées en base64 (sans préfixe data:) */
  base64: string;
}

/**
 * Appel texte simple (sans vision), utilisé par le tuteur, le générateur
 * d'exercices, le correcteur et l'agent de recherche.
 */
export async function demanderClaude(params: {
  systeme: string;
  messages: Anthropic.MessageParam[];
  maxTokens?: number;
  temperature?: number;
}): Promise<string> {
  const anthropic = clientClaude();
  const reponse = await anthropic.messages.create({
    model: MODELE_CLAUDE,
    max_tokens: params.maxTokens ?? 2048,
    temperature: params.temperature ?? 0.4,
    system: params.systeme,
    messages: params.messages,
  });

  return reponse.content
    .filter((bloc) => bloc.type === "text")
    .map((bloc) => (bloc.type === "text" ? bloc.text : ""))
    .join("\n")
    .trim();
}

/**
 * Appel avec vision — utilisé par le pipeline OCR pour lire des photos de
 * cahiers, manuels, schémas, formules manuscrites, etc. Claude gère
 * nativement le texte imprimé et manuscrit, les tableaux, les schémas et
 * les formules mathématiques/chimiques sur image.
 */
export async function demanderClaudeAvecImage(params: {
  systeme: string;
  instructionUtilisateur: string;
  images: ImagePourClaude[];
  maxTokens?: number;
}): Promise<string> {
  const anthropic = clientClaude();

  const contenuImages: Anthropic.ImageBlockParam[] = params.images.map((img) => ({
    type: "image",
    source: {
      type: "base64",
      media_type: img.mediaType,
      data: img.base64,
    },
  }));

  const reponse = await anthropic.messages.create({
    model: MODELE_CLAUDE,
    max_tokens: params.maxTokens ?? 4096,
    temperature: 0.2,
    system: params.systeme,
    messages: [
      {
        role: "user",
        content: [...contenuImages, { type: "text", text: params.instructionUtilisateur }],
      },
    ],
  });

  return reponse.content
    .filter((bloc) => bloc.type === "text")
    .map((bloc) => (bloc.type === "text" ? bloc.text : ""))
    .join("\n")
    .trim();
}

/**
 * Extrait un bloc JSON de la réponse texte de Claude, de façon tolérante
 * (Claude encadre parfois le JSON de balises markdown ```json ... ```).
 */
export function extraireJSON<T>(texte: string): T {
  const nettoye = texte
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "");
  try {
    return JSON.parse(nettoye) as T;
  } catch (erreur) {
    const premiereAccolade = nettoye.indexOf("{");
    const premiereCrochet = nettoye.indexOf("[");
    const debut =
      premiereAccolade === -1
        ? premiereCrochet
        : premiereCrochet === -1
          ? premiereAccolade
          : Math.min(premiereAccolade, premiereCrochet);
    if (debut > 0) {
      try {
        return JSON.parse(nettoye.slice(debut)) as T;
      } catch {
        // on continue vers l'erreur ci-dessous
      }
    }
    throw new Error(
      `Impossible d'interpréter la réponse IA comme JSON : ${(erreur as Error).message}`
    );
  }
}
