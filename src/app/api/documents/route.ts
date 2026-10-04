import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigerEleve, reponseErreur } from "@/lib/securite-api";
import { enregistrerFichier } from "@/lib/stockage";
import { analyserImageDocument, analyserTexteDocument, extraireTextePDF, SEUIL_PDF_SCANNE_CARACTERES } from "@/lib/ai/ocr";
import { ajouterPoints, mettreAJourStreak, POINTS } from "@/lib/gamification";
import type { TypeDocument } from "@prisma/client";

const EXTENSIONS_IMAGE: Record<string, "image/jpeg" | "image/png" | "image/webp" | "image/gif"> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

function deduireTypeDocument(nomFichier: string): TypeDocument {
  const ext = nomFichier.slice(nomFichier.lastIndexOf(".")).toLowerCase();
  if ([".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext)) return "IMAGE";
  if (ext === ".pdf") return "PDF";
  if ([".doc", ".docx"].includes(ext)) return "WORD";
  if ([".xls", ".xlsx", ".csv"].includes(ext)) return "EXCEL";
  if ([".ppt", ".pptx"].includes(ext)) return "POWERPOINT";
  if ([".mp4", ".mov", ".webm"].includes(ext)) return "VIDEO";
  if ([".mp3", ".wav", ".m4a", ".ogg"].includes(ext)) return "AUDIO";
  if (ext === ".txt") return "TEXTE";
  return "SCAN";
}

export async function GET() {
  try {
    const { eleve } = await exigerEleve();
    const documents = await prisma.document.findMany({
      where: { eleveId: eleve.id },
      orderBy: { createdAt: "desc" },
      include: { matiereDetectee: true, chapitreDetecte: true },
      take: 50,
    });
    return NextResponse.json({ documents });
  } catch (erreur) {
    return reponseErreur(erreur);
  }
}

export async function POST(requete: NextRequest) {
  try {
    const { eleve } = await exigerEleve();

    const formulaire = await requete.formData();
    const fichier = formulaire.get("fichier");
    if (!(fichier instanceof File)) {
      return NextResponse.json({ erreur: "Fichier manquant (champ 'fichier' attendu)" }, { status: 400 });
    }

    const buffer = Buffer.from(await fichier.arrayBuffer());
    const type = deduireTypeDocument(fichier.name);

    const fichierEnregistre = await enregistrerFichier({
      buffer,
      nomOriginal: fichier.name,
      dossier: `documents/${eleve.id}`,
    });

    const document = await prisma.document.create({
      data: {
        eleveId: eleve.id,
        type,
        nomFichier: fichierEnregistre.nomFichier,
        urlFichier: fichierEnregistre.url,
        tailleOctets: fichierEnregistre.tailleOctets,
        statutAnalyse: "EN_COURS",
      },
    });

    // Analyse immédiate (synchrone). Pour une volumétrie en production,
    // déplacer cet appel vers une file de tâches (ex: BullMQ + Redis) et
    // laisser le document en statut EN_ATTENTE jusqu'au traitement —
    // voir docs/ARCHITECTURE.md, section "Pistes d'évolution".
    try {
      const resultat = await analyserDocumentSelonType(type, buffer, fichier.name);

      const matiere = resultat.matiereDetecteeCode
        ? await prisma.matiere.findUnique({ where: { code: resultat.matiereDetecteeCode } })
        : null;

      await prisma.document.update({
        where: { id: document.id },
        data: {
          statutAnalyse: "TERMINEE",
          texteExtrait: resultat.texteExtrait,
          matiereDetecteeId: matiere?.id,
          niveauDetecte: (resultat.niveauDetecte as any) ?? undefined,
          indiceConfiance: resultat.indiceConfiance,
          analyseTerminee: new Date(),
        },
      });

      await prisma.ressourcePedagogique.create({
        data: {
          eleveId: eleve.id,
          documentId: document.id,
          type: "RESUME",
          titre: resultat.chapitreTitreDetecte ?? "Résumé du document",
          contenuJson: {
            competencesVisees: resultat.competencesVisees,
            objectifsPedagogiques: resultat.objectifsPedagogiques,
            difficultesPotentielles: resultat.difficultesPotentielles,
            typeContenu: resultat.typeContenu,
          },
        },
      });

      await ajouterPoints(eleve.id, POINTS.DOCUMENT_IMPORTE);
      await mettreAJourStreak(eleve.id);
    } catch (erreurAnalyse) {
      await prisma.document.update({
        where: { id: document.id },
        data: { statutAnalyse: "ECHEC", messageErreur: (erreurAnalyse as Error).message },
      });
    }

    const documentFinal = await prisma.document.findUnique({
      where: { id: document.id },
      include: { matiereDetectee: true, ressources: true },
    });

    return NextResponse.json({ document: documentFinal });
  } catch (erreur) {
    return reponseErreur(erreur);
  }
}

async function analyserDocumentSelonType(type: TypeDocument, buffer: Buffer, nomFichier: string) {
  if (type === "IMAGE" || type === "SCAN") {
    const ext = nomFichier.slice(nomFichier.lastIndexOf(".")).toLowerCase();
    const mediaType = EXTENSIONS_IMAGE[ext] ?? "image/jpeg";
    return analyserImageDocument({ mediaType, base64: buffer.toString("base64") });
  }

  if (type === "PDF") {
    const texte = await extraireTextePDF(buffer);
    if (texte.length < SEUIL_PDF_SCANNE_CARACTERES) {
      throw new Error(
        "Ce PDF semble être un scan image sans texte sélectionnable. Convertissez-le en image (JPG/PNG) par page pour permettre l'OCR par vision, ou importez-le page par page."
      );
    }
    return analyserTexteDocument(texte);
  }

  if (type === "TEXTE") {
    return analyserTexteDocument(buffer.toString("utf-8"));
  }

  throw new Error(
    `L'analyse automatique du format ${type} n'est pas encore implémentée dans ce scaffold (Word/Excel/PowerPoint/audio/vidéo nécessitent des convertisseurs dédiés — voir docs/ARCHITECTURE.md, section "Pistes d'évolution"). Le fichier a bien été importé et reste disponible dans la bibliothèque.`
  );
}
