import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { sessionCourante } from "@/lib/auth";

/**
 * Sert les fichiers stockés localement (pilote STORAGE_DRIVER=local).
 * En production avec le pilote S3, ces fichiers sont servis directement
 * depuis le bucket (URLs signées) et cette route n'est plus nécessaire.
 */
export async function GET(requete: NextRequest, { params }: { params: Promise<{ chemin: string[] }> }) {
  const session = await sessionCourante();
  if (!session) return NextResponse.json({ erreur: "Authentification requise" }, { status: 401 });

  const { chemin } = await params;
  // Empêche toute tentative de traversée de répertoire (ex: "..").
  if (chemin.some((segment) => segment.includes(".."))) {
    return NextResponse.json({ erreur: "Chemin invalide" }, { status: 400 });
  }

  const racine = process.env.STORAGE_LOCAL_PATH || "./storage";
  const cheminComplet = path.join(process.cwd(), racine, ...chemin);

  try {
    const donnees = await readFile(cheminComplet);
    return new NextResponse(donnees, {
      headers: { "Content-Type": "application/octet-stream", "Cache-Control": "private, max-age=86400" },
    });
  } catch {
    return NextResponse.json({ erreur: "Fichier introuvable" }, { status: 404 });
  }
}
