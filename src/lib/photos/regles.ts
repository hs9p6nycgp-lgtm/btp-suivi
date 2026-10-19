// Règles de mise en file des photos hors connexion.
//
// Module pur (aucun import réseau, aucun accès au navigateur) : les cas
// particuliers sont donc testés directement
// (voir src/lib/photos/__tests__/regles.test.ts).

import { estErreurReseau } from "../offline/erreurs.ts";

/**
 * Chemin de stockage d'une photo.
 * Le dossier depend de l'ecran : « journaux/<id> », « livraisons/<id> »…
 */
export function cheminPhoto(dossier: string, nomFichier: string, horodatage: number): string {
  const nom = nomFichier
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|-+$/g, "");
  return `${dossier}/${horodatage}-${nom || "photo.jpg"}`;
}

/**
 * Faut-il mettre la photo en file d'attente ?
 * Oui si le réseau est coupé ou si l'échec vient du réseau.
 * Non si c'est une erreur métier (accès refusé, quota dépassé, fichier
 * refusé) : dans ce cas, on montre l'erreur plutôt que de la mettre en file.
 */
export function doitMettreEnFile(
  erreur: { message?: string; name?: string } | null | undefined,
  enLigne: boolean,
): boolean {
  if (!enLigne) return true;
  return estErreurReseau(erreur);
}
