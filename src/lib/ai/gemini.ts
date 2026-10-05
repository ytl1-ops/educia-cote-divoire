/**
 * Client du moteur IA — Google Gemini (palier gratuit).
 *
 * EDUCIA utilise Gemini plutôt qu'un fournisseur payant pour rester
 * accessible sans frais : Google AI Studio délivre une clé API gratuite
 * (https://aistudio.google.com/apikey) avec un quota quotidien généreux,
 * sans moyen de paiement requis. Les noms exportés restent génériques
 * (demanderIA, pas demanderGemini) pour permettre de changer de
 * fournisseur plus tard sans toucher au reste du code.
 */

export const MODELE_IA = process.env.GEMINI_MODEL || "gemini-2.0-flash";

const URL_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

function cleAPI(): string {
  const cle = process.env.GEMINI_API_KEY;
  if (!cle) {
    throw new Error(
      "GEMINI_API_KEY manquante. Obtenez une clé gratuite sur https://aistudio.google.com/apikey et renseignez-la dans votre fichier .env (voir .env.example)."
    );
  }
  return cle;
}

export interface MessageIA {
  role: "user" | "assistant";
  content: string;
}

export interface ImagePourIA {
  /** Type MIME, ex: "image/jpeg", "image/png", "image/webp" */
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
  /** Données encodées en base64 (sans préfixe data:) */
  base64: string;
}

interface PartieGemini {
  text?: string;
  inline_data?: { mime_type: string; data: string };
}

interface ReponseGemini {
  candidates?: Array<{
    content?: { parts?: PartieGemini[] };
    finishReason?: string;
  }>;
  promptFeedback?: { blockReason?: string };
  error?: { message?: string };
}

async function appelerGemini(params: {
  systeme: string;
  contents: Array<{ role: "user" | "model"; parts: PartieGemini[] }>;
  maxTokens?: number;
  temperature?: number;
}): Promise<string> {
  const url = `${URL_BASE}/${MODELE_IA}:generateContent?key=${cleAPI()}`;

  const reponse = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: params.systeme }] },
      contents: params.contents,
      generationConfig: {
        maxOutputTokens: params.maxTokens ?? 2048,
        temperature: params.temperature ?? 0.4,
      },
    }),
  });

  const donnees = (await reponse.json()) as ReponseGemini;

  if (!reponse.ok) {
    throw new Error(`Erreur Gemini (${reponse.status}) : ${donnees.error?.message ?? "requête invalide"}`);
  }
  if (donnees.promptFeedback?.blockReason) {
    throw new Error(`Réponse bloquée par Gemini : ${donnees.promptFeedback.blockReason}`);
  }

  const texte = donnees.candidates?.[0]?.content?.parts
    ?.map((p) => p.text ?? "")
    .join("")
    .trim();

  if (!texte) {
    throw new Error("Gemini n'a renvoyé aucun texte exploitable.");
  }
  return texte;
}

/** Appel texte simple, utilisé par le tuteur, le générateur d'exercices, le correcteur et l'agent de recherche. */
export async function demanderIA(params: {
  systeme: string;
  messages: MessageIA[];
  maxTokens?: number;
  temperature?: number;
}): Promise<string> {
  const contents = params.messages.map((m) => ({
    role: m.role === "assistant" ? ("model" as const) : ("user" as const),
    parts: [{ text: m.content }],
  }));

  return appelerGemini({
    systeme: params.systeme,
    contents,
    maxTokens: params.maxTokens,
    temperature: params.temperature,
  });
}

/** Appel avec vision — utilisé par le pipeline OCR pour lire des photos de cahiers, manuels, exercices, etc. */
export async function demanderIAAvecImage(params: {
  systeme: string;
  instructionUtilisateur: string;
  images: ImagePourIA[];
  maxTokens?: number;
}): Promise<string> {
  const parties: PartieGemini[] = [
    ...params.images.map((img) => ({ inline_data: { mime_type: img.mediaType, data: img.base64 } })),
    { text: params.instructionUtilisateur },
  ];

  return appelerGemini({
    systeme: params.systeme,
    contents: [{ role: "user", parts: parties }],
    maxTokens: params.maxTokens ?? 4096,
    temperature: 0.2,
  });
}

/**
 * Extrait un bloc JSON de la réponse texte du modèle, de façon tolérante
 * (les modèles encadrent parfois le JSON de balises markdown ```json ... ```).
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
