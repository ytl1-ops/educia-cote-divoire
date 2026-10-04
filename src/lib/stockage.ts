import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

/**
 * Abstraction de stockage des fichiers importés (documents, photos, audio,
 * vidéo). Pilote local pour le développement ; en production, basculez
 * STORAGE_DRIVER=s3 et complétez l'implémentation S3 ci-dessous avec le
 * SDK AWS (ou tout service compatible S3 : Cloudflare R2, Supabase
 * Storage) — voir docs/DEPLOIEMENT.md.
 */

export interface FichierEnregistre {
  url: string;
  nomFichier: string;
  tailleOctets: number;
}

export async function enregistrerFichier(params: {
  buffer: Buffer;
  nomOriginal: string;
  dossier: string;
}): Promise<FichierEnregistre> {
  const pilote = process.env.STORAGE_DRIVER || "local";
  const extension = path.extname(params.nomOriginal) || "";
  const nomFichier = `${randomUUID()}${extension}`;

  if (pilote === "s3") {
    return enregistrerSurS3({ ...params, nomFichier });
  }

  const racine = process.env.STORAGE_LOCAL_PATH || "./storage";
  const dossierComplet = path.join(process.cwd(), racine, params.dossier);
  await mkdir(dossierComplet, { recursive: true });
  const cheminComplet = path.join(dossierComplet, nomFichier);
  await writeFile(cheminComplet, params.buffer);

  return {
    url: `/api/fichiers/${params.dossier}/${nomFichier}`,
    nomFichier: params.nomOriginal,
    tailleOctets: params.buffer.byteLength,
  };
}

async function enregistrerSurS3(params: {
  buffer: Buffer;
  nomOriginal: string;
  dossier: string;
  nomFichier: string;
}): Promise<FichierEnregistre> {
  // Point d'extension production : intégrer @aws-sdk/client-s3 (PutObjectCommand)
  // avec les variables S3_BUCKET / S3_REGION / S3_ACCESS_KEY_ID /
  // S3_SECRET_ACCESS_KEY / S3_ENDPOINT définies dans .env.
  throw new Error(
    "Pilote de stockage S3 non encore implémenté dans ce scaffold — voir docs/DEPLOIEMENT.md pour l'intégrer avant la mise en production."
  );
}
