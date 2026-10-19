// Identite des materiaux et suggestions de saisie (exigence APP-03, APP-04).
//
// Le materiau d'une livraison etait saisi en texte libre : « Laterite »,
// « Latérite » ou « LAT-01 » créaient trois stocks différents, et le seuil
// d'alerte ne s'appliquait plus.
//
// Le materiau a donc une **identite** (cle canonique) et un **libelle**
// (l'écriture la plus utilisée). Le libelle reste lisible dans les listes ;
// la cle sert a regrouper les stocks, les seuils et les alertes.
//
// Module pur : regroupement, suggestions et fusion sont testables.

/** Nettoie un nom de materiau : minuscules, sans accents, espaces en tirets. */
export function cleMateriau(nom: string | null | undefined): string {
  return String(nom ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Un materiau regroupe, pour un chantier, les differentes ecritures rencontrees. */
export type MateriauRegroupe = {
  /** Identite canonique du materiau. */
  cle: string;
  /** Libelle affiche (l'ecriture la plus frequente). */
  libelle: string;
  /** Toutes les ecritures rencontrees pour ce materiau. */
  variantes: string[];
  /** Nombre de lignes concernees. */
  occurrences: number;
};

/** Regroupe des lignes par materiau (cle canonique) et detecte les doublons d'ecriture. */
export function reconcilierMateriaux(
  lignes: Array<{ materiau: string | null | undefined }>,
): MateriauRegroupe[] {
  const parCle = new Map<string, { libelles: Map<string, number>; total: number }>();
  for (const ligne of lignes) {
    const brut = String(ligne.materiau ?? "").trim();
    if (!brut) continue;
    const cle = cleMateriau(brut);
    if (!cle) continue;
    const entree = parCle.get(cle) ?? { libelles: new Map<string, number>(), total: 0 };
    entree.libelles.set(brut, (entree.libelles.get(brut) ?? 0) + 1);
    entree.total += 1;
    parCle.set(cle, entree);
  }
  return [...parCle.entries()]
    .map(([cle, donnees]) => {
      const variantes = [...donnees.libelles.entries()].sort((a, b) => b[1] - a[1]).map(([v]) => v);
      return {
        cle,
        libelle: variantes[0] ?? cle,
        variantes,
        occurrences: donnees.total,
      };
    })
    .sort((a, b) => b.occurrences - a.occurrences || a.libelle.localeCompare(b.libelle, "fr"));
}

export type SuggestionMateriau = {
  cle: string;
  libelle: string;
  /** Origine de la suggestion : catalogue BPU, poste du DQE ou deja livre. */
  origine: "bpu" | "dqe" | "livraison";
};

/**
 * Liste des materiaux proposés a la saisie : le catalogue BPU, les postes du
 * DQE du chantier et les materiaux deja livres. Les doublons d'identite
 * (meme materiau ecrit diff.remment) sont regroupes, le libelle le plus
 * lisible est conserve.
 */
export function suggestionsMateriaux(sources: {
  bpu?: string[];
  postes?: string[];
  livraisons?: string[];
}): SuggestionMateriau[] {
  const parCle = new Map<string, SuggestionMateriau>();
  const ajouter = (liste: string[] | undefined, origine: SuggestionMateriau["origine"]) => {
    for (const brut of liste ?? []) {
      const libelle = String(brut ?? "").trim();
      if (!libelle) continue;
      const cle = cleMateriau(libelle);
      if (!cle) continue;
      const existant = parCle.get(cle);
      if (!existant) {
        parCle.set(cle, { cle, libelle, origine });
        continue;
      }
      // Le BPU prime sur le DQE, le DQE sur une livraison deja saisie.
      const priorite = { bpu: 0, dqe: 1, livraison: 2 } as const;
      if (priorite[origine] < priorite[existant.origine]) {
        parCle.set(cle, { cle, libelle, origine });
      }
    }
  };
  ajouter(sources.bpu, "bpu");
  ajouter(sources.postes, "dqe");
  ajouter(sources.livraisons, "livraison");
  return [...parCle.values()].sort((a, b) => a.libelle.localeCompare(b.libelle, "fr"));
}

/**
 * Plan de fusion des doublons d'ecriture : toutes les lignes d'un materiau
 * sont reecrites avec le libelle retenu. Aucune ligne n'est supprimee.
 */
export function planifierFusion(
  lignes: Array<{ id: string; materiau: string | null | undefined }>,
  cle: string,
  libelleRetenu: string,
): { id: string; ancien: string; nouveau: string }[] {
  return lignes
    .filter((l) => cleMateriau(l.materiau) === cle && l.materiau !== libelleRetenu)
    .map((l) => ({ id: l.id, ancien: String(l.materiau), nouveau: libelleRetenu }));
}
