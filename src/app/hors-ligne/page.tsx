export default function PageHorsLigne() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <span className="text-5xl">📡</span>
      <h1 className="mt-4 text-xl font-bold text-slate-900">Vous êtes hors ligne</h1>
      <p className="mt-2 max-w-sm text-sm text-slate-500">
        EDUCIA fonctionne aussi sans connexion pour les cours, exercices et documents déjà consultés. Les
        fonctionnalités nécessitant l'IA (tuteur, génération d'exercices, import de nouveaux documents) reprendront
        automatiquement dès le retour du réseau.
      </p>
    </main>
  );
}
