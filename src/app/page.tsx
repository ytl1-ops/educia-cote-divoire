import Link from "next/link";
import { NIVEAUX } from "@/lib/programmes/curriculum";

const AVANTAGES = [
  { icone: "🧑‍🏫", titre: "Un vrai pédagogue, pas un distributeur de réponses", texte: "Le Professeur IA explique, illustre, guide étape par étape — il ne donne jamais la solution d'un coup." },
  { icone: "📸", titre: "Importez vos cours en une photo", texte: "Cahier, manuel, devoir — l'IA lit le texte imprimé ou manuscrit et transforme le document en parcours complet." },
  { icone: "🧮", titre: "Toutes les matières, tous les niveaux", texte: "De la Maternelle à la Terminale, dans toutes les matières du programme ivoirien." },
  { icone: "🏆", titre: "Motivant comme un jeu", texte: "Points, badges, séries de réussite — pour progresser sans jamais se décourager." },
  { icone: "👪", titre: "Les parents suivent les progrès", texte: "Rapports hebdomadaires et mensuels envoyés par WhatsApp, email ou PDF." },
  { icone: "📶", titre: "Fonctionne même hors ligne", texte: "Installable comme une application mobile (PWA) : cours et exercices accessibles sans connexion." },
];

export default function PageAccueil() {
  return (
    <main>
      <header className="bg-gradient-to-br from-educia-600 to-educia-800 text-white">
        <div className="conteneur-page flex flex-col items-center py-16 text-center">
          <span className="rounded-full bg-white/15 px-4 py-1 text-sm font-medium">🇨🇮 Conçu pour les élèves de Côte d'Ivoire</span>
          <h1 className="mt-6 text-4xl font-extrabold sm:text-5xl">EDUCIA Côte d'Ivoire</h1>
          <p className="mt-3 text-lg text-educia-100">Votre Professeur Particulier IA disponible 24h/24</p>
          <p className="mx-auto mt-6 max-w-2xl text-educia-50">
            De la Maternelle à la Terminale, EDUCIA explique, corrige, fait pratiquer et suit vos progrès dans
            toutes les matières du programme ivoirien — par web, WhatsApp ou email.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/inscription" className="bouton-primaire bg-white text-educia-700 hover:bg-educia-50">
              Commencer gratuitement
            </Link>
            <Link href="/connexion" className="rounded-xl border border-white/40 px-5 py-3 font-semibold text-white hover:bg-white/10">
              J'ai déjà un compte
            </Link>
          </div>
        </div>
      </header>

      <section className="conteneur-page py-14">
        <h2 className="text-center text-2xl font-bold text-slate-900">Pourquoi EDUCIA remplace efficacement un répétiteur</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {AVANTAGES.map((a) => (
            <div key={a.titre} className="carte">
              <div className="text-3xl">{a.icone}</div>
              <h3 className="mt-3 font-semibold text-slate-900">{a.titre}</h3>
              <p className="mt-1 text-sm text-slate-600">{a.texte}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white py-14">
        <div className="conteneur-page">
          <h2 className="text-center text-2xl font-bold text-slate-900">Tous les niveaux, de la Maternelle à la Terminale</h2>
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {NIVEAUX.map((n) => (
              <span key={n.code} className="rounded-full border border-educia-200 bg-educia-50 px-4 py-1.5 text-sm font-medium text-educia-800">
                {n.libelle}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="conteneur-page py-14 text-center">
        <h2 className="text-2xl font-bold text-slate-900">Prêt à progresser dès aujourd'hui ?</h2>
        <p className="mx-auto mt-3 max-w-xl text-slate-600">
          Créez un compte élève, parent ou enseignant en moins d'une minute. Aucune carte bancaire requise pour démarrer.
        </p>
        <Link href="/inscription" className="bouton-primaire mt-6 inline-flex">
          Créer mon compte
        </Link>
      </section>

      <footer className="border-t border-slate-200 py-8 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} EDUCIA Côte d'Ivoire — Construire la meilleure plateforme éducative IA d'Afrique francophone.
      </footer>
    </main>
  );
}
