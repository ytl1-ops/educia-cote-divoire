/**
 * Client du moteur IA — Groq (palier gratuit).
 *
 * Remplace Gemini : le compte Google du porteur de projet reste bloqué
 * (CONSUMER_SUSPENDED sur toutes les clés testées, au niveau du compte et
 * non de la clé). Groq propose un palier gratuit sans carte bancaire ni
 * vérification de téléphone, sur des modèles Llama (texte + vision), via
 * une API compatible OpenAI. Les noms exportés restent génériques
 * (demanderIA, pas demanderGroq) pour permettre de changer de fournisseur
 * plus tard sans toucher au reste du code.
 */

export const MODELE_IA = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
const MODELE_VISION = process.env.GROQ_VISION_MODEL || "meta-llama/llama-4-scout-17b-16e-instruct";

const URL_BASE = "https://api.groq.com/openai/v1/chat/completions";

function cleAPI(): string {
  const cle = process.env.GROQ_API_KEY;
  if (!cle) {
    throw new Error(
      "GROQ_API_KEY manquante. Obtenez une clé gratuite sur https://console.groq.com/keys et renseignez-la dans votre fichier .env (voir .env.example)."
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

type ContenuMessage = string | Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }>;

interface ReponseGroq {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
}

async function appelerGroq(params: {
  modele: string;
  systeme: string;
  messages: Array<{ role: "user" | "assistant"; content: ContenuMessage }>;
  maxTokens?: number;
  temperature?: number;
}): Promise<string> {
  const reponse = await fetch(URL_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${cleAPI()}` },
    body: JSON.stringify({
      model: params.modele,
      messages: [{ role: "system", content: params.systeme }, ...params.messages],
      max_tokens: params.maxTokens ?? 2048,
      temperature: params.temperature ?? 0.4,
    }),
  });

  const donnees = (await reponse.json()) as ReponseGroq;

  if (!reponse.ok) {
    throw new Error(`Erreur Groq (${reponse.status}) : ${donnees.error?.message ?? "requête invalide"}`);
  }

  const texte = donnees.choices?.[0]?.message?.content?.trim();
  if (!texte) {
    throw new Error("Groq n'a renvoyé aucun texte exploitable.");
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
  return appelerGroq({
    modele: MODELE_IA,
    systeme: params.systeme,
    messages: params.messages.map((m) => ({ role: m.role, content: m.content })),
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
  const contenu: ContenuMessage = [
    { type: "text", text: params.instructionUtilisateur },
    ...params.images.map((img) => ({
      type: "image_url" as const,
      image_url: { url: `data:${img.mediaType};base64,${img.base64}` },
    })),
  ];

  return appelerGroq({
    modele: MODELE_VISION,
    systeme: params.systeme,
    messages: [{ role: "user", content: contenu }],
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
