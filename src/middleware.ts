import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const NOM_COOKIE_SESSION = "educia_session";

const PREFIXES_PROTEGES: Record<string, string> = {
  "/eleve": "ELEVE",
  "/parent": "PARENT",
  "/enseignant": "ENSEIGNANT",
  "/admin": "ADMIN",
};

export async function middleware(requete: NextRequest) {
  const chemin = requete.nextUrl.pathname;
  if (chemin === "/admin/connexion") return NextResponse.next();

  const prefixeCorrespondant = Object.keys(PREFIXES_PROTEGES).find((p) => chemin.startsWith(p));
  if (!prefixeCorrespondant) return NextResponse.next();

  const pageConnexion = prefixeCorrespondant === "/admin" ? "/admin/connexion" : "/connexion";
  const jeton = requete.cookies.get(NOM_COOKIE_SESSION)?.value;
  if (!jeton) {
    return NextResponse.redirect(new URL(`${pageConnexion}?redirection=${encodeURIComponent(chemin)}`, requete.url));
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "");
    const { payload } = await jwtVerify(jeton, secret);
    const roleRequis = PREFIXES_PROTEGES[prefixeCorrespondant];
    if (payload.role !== roleRequis) {
      return NextResponse.redirect(new URL("/", requete.url));
    }
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL(`${pageConnexion}?redirection=${encodeURIComponent(chemin)}`, requete.url));
  }
}

export const config = {
  matcher: ["/eleve/:path*", "/parent/:path*", "/enseignant/:path*", "/admin/:path*"],
};
