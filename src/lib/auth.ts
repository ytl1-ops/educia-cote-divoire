import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import type { RoleUtilisateur } from "@prisma/client";

const NOM_COOKIE_SESSION = "educia_session";

function cleSecrete(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET manquant. Renseignez-le dans votre fichier .env (voir .env.example).");
  }
  return new TextEncoder().encode(secret);
}

export interface PayloadSession {
  utilisateurId: string;
  role: RoleUtilisateur;
  prenom: string;
  nom: string;
}

export async function hacherMotDePasse(motDePasse: string): Promise<string> {
  return bcrypt.hash(motDePasse, 12);
}

export async function verifierMotDePasse(motDePasse: string, hash: string): Promise<boolean> {
  return bcrypt.compare(motDePasse, hash);
}

export async function creerJetonSession(payload: PayloadSession): Promise<string> {
  const dureeExpiration = process.env.JWT_EXPIRES_IN || "30d";
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(dureeExpiration)
    .sign(cleSecrete());
}

export async function verifierJetonSession(jeton: string): Promise<PayloadSession | null> {
  try {
    const { payload } = await jwtVerify(jeton, cleSecrete());
    return payload as unknown as PayloadSession;
  } catch {
    return null;
  }
}

/** Pose le cookie de session HTTP-only après connexion/inscription. */
export async function poserCookieSession(jeton: string) {
  const magasin = await cookies();
  magasin.set(NOM_COOKIE_SESSION, jeton, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function supprimerCookieSession() {
  const magasin = await cookies();
  magasin.delete(NOM_COOKIE_SESSION);
}

/** Lit et vérifie la session courante côté serveur (route API ou Server Component). */
export async function sessionCourante(): Promise<PayloadSession | null> {
  const magasin = await cookies();
  const jeton = magasin.get(NOM_COOKIE_SESSION)?.value;
  if (!jeton) return null;
  return verifierJetonSession(jeton);
}

export { NOM_COOKIE_SESSION };
