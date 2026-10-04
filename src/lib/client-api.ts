/** Petit client fetch partagé par les pages (cookies de session inclus automatiquement). */
export async function appelAPI<T = any>(
  chemin: string,
  options: RequestInit & { corpsJSON?: unknown } = {}
): Promise<T> {
  const { corpsJSON, ...reste } = options;
  const reponse = await fetch(chemin, {
    ...reste,
    credentials: "include",
    headers: {
      ...(corpsJSON ? { "Content-Type": "application/json" } : {}),
      ...(reste.headers ?? {}),
    },
    body: corpsJSON ? JSON.stringify(corpsJSON) : reste.body,
  });

  const donnees = await reponse.json().catch(() => ({}));
  if (!reponse.ok) {
    throw new Error(donnees?.erreur || `Erreur ${reponse.status}`);
  }
  return donnees as T;
}
