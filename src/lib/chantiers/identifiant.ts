// Generation d'identifiant pour les lignes creees cote navigateur.
//
// Pourquoi : apres la mise en place de l'isolation des donnees (politique RLS
// sur la table « chantiers »), la base refuse de renvoyer la ligne inserée
// (operation « insert ... returning »). En generant l'identifiant avant
// l'insertion, l'application garde la main sur l'id du chantier cree et peut
// rediriger l'utilisateur vers sa fiche.

/** Identifiant unique au format UUID version 4. */
export function creerId(): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }
  // Repli pour les navigateurs anciens ou les contextes non securises.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
