import type { Metadata, Viewport } from "next";
import "./globals.css";
import { InstallateurPWA } from "@/components/InstallateurPWA";
import { EnregistreurServiceWorker } from "@/components/EnregistreurServiceWorker";

export const metadata: Metadata = {
  title: "EDUCIA Côte d'Ivoire — Votre Professeur Particulier IA 24h/24",
  description:
    "EDUCIA Côte d'Ivoire : plateforme éducative intelligente qui remplace efficacement un répétiteur de maison grâce à l'IA, adaptée aux programmes scolaires ivoiriens de la Maternelle à la Terminale.",
  manifest: "/manifest.json",
  applicationName: "EDUCIA",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "EDUCIA",
  },
  icons: {
    icon: "/icons/icone-192.png",
    apple: "/icons/icone-192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0B8FEF",
};

export default function RacineLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        {children}
        <InstallateurPWA />
        <EnregistreurServiceWorker />
      </body>
    </html>
  );
}
