// Cache local des écrans : hors connexion, l'application affiche la dernière
// version consultée au lieu d'un écran vide.
//
// Le cache est stocké dans IndexedDB (magasin « cache » de la base locale) et
// porte la clé de l'écran + l'identifiant du compte : deux comptes sur le même
// appareil ne voient jamais les données de l'autre.

import { cacheGet, cacheSet } from "./storage";

export type EntreeCache<T> = {
  donnees: T;
  /** Date de la mise en cache (affichée à l'utilisateur). */
  horodatage: number;
};

const PREFIXE = "donnees:";

/** Dernière version conservée d'un écran (null si jamais consultée en ligne). */
export async function lireCache<T>(cle: string): Promise<EntreeCache<T> | null> {
  return await cacheGet<EntreeCache<T>>(`${PREFIXE}${cle}`);
}

/** Conserve une version consultée en ligne. */
export async function ecrireCache<T>(cle: string, donnees: T): Promise<void> {
  await cacheSet(`${PREFIXE}${cle}`, { donnees, horodatage: Date.now() } satisfies EntreeCache<T>);
}

/**
 * Charge des données depuis le réseau ; si l'appel échoue (réseau coupé,
 * trop lent, serveur injoignable), renvoie la dernière version conservée sur
 * l'appareil. `horsLigne` indique à l'appelant qu'il s'agit d'une copie.
 *
 * Si aucune copie locale n'existe, l'erreur est propagée : l'appelant décide
 * alors d'afficher un message d'erreur.
 */
export async function chargerAvecCache<T>(
  cle: string,
  charger: () => Promise<T>,
): Promise<{ donnees: T; horsLigne: boolean; horodatage: number | null }> {
  try {
    const donnees = await charger();
    await ecrireCache(cle, donnees);
    return { donnees, horsLigne: false, horodatage: Date.now() };
  } catch {
    const enCache = await lireCache<T>(cle);
    if (enCache) {
      return { donnees: enCache.donnees, horsLigne: true, horodatage: enCache.horodatage };
    }
    throw new Error("Hors connexion et aucune copie locale disponible");
  }
}
