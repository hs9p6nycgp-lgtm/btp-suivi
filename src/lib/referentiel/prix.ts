// Regles metier du referentiel de prix (section 4.12, exigences REF-01 a REF-09).

export type LigneReferentiel = {
  id: string;
  code: string | null;
  designation: string;
  categorie: string | null;
  unite: string;
  prix_unitaire: number;
  source: string | null;
  date_source: string | null;
  date_validite: string | null;
  statut: "valide" | "a_verifier";
  zone: string | null;
};

export type EntreeHistorique = {
  referentiel_prix_id: string;
  ancien_prix: number;
  nouveau_prix: number;
  auteur: string | null;
  motif: string | null;
};

/** REF-09 (priorite C) : un prix est obsolete s'il n'a pas ete mis a jour depuis plus de `seuilMois` mois. */
export function estPrixObsolete(
  dateSource: string | null,
  reference: Date = new Date(),
  seuilMois: number = 6,
): boolean {
  if (!dateSource) return true;
  const d = new Date(`${dateSource}T00:00:00`);
  if (Number.isNaN(d.getTime())) return true;
  const limite = new Date(reference);
  limite.setMonth(limite.getMonth() - seuilMois);
  return d < limite;
}

/** REF-03 : construit l'entree d'historique lors d'un changement de prix. Renvoie null si le prix n'a pas change. */
export function construireEntreeHistorique(
  prixId: string,
  ancienPrix: number,
  nouveauPrix: number,
  auteur: string | null,
  motif: string | null,
): EntreeHistorique | null {
  if (ancienPrix === nouveauPrix) return null;
  return {
    referentiel_prix_id: prixId,
    ancien_prix: ancienPrix,
    nouveau_prix: nouveauPrix,
    auteur,
    motif,
  };
}

/** REF-06 : lignes d'un DQE / BPU affectees par la mise a jour d'un prix (par code ou designation). */
export type LigneAffectee = { id: string; code: string | null; designation: string };

export function lignesAffecteesParMiseAJour(
  prixCode: string | null,
  prixDesignation: string,
  lignes: LigneAffectee[],
): LigneAffectee[] {
  const codeNorm = (prixCode ?? "").trim().toLowerCase();
  const desigNorm = prixDesignation.trim().toLowerCase();
  return lignes.filter((l) => {
    const lc = (l.code ?? "").trim().toLowerCase();
    const ld = l.designation.trim().toLowerCase();
    if (codeNorm && lc && lc === codeNorm) return true;
    return ld === desigNorm;
  });
}

/** REF-05 (S) : exporte le referentiel en CSV (separateur point-virgule, UTF-8). */
export function exporterReferentielCSV(lignes: LigneReferentiel[]): string {
  const entete = "code;designation;categorie;unite;prix_unitaire;source;date_source;date_validite;statut;zone";
  const lignesCsv = lignes.map((l) =>
    [
      l.code ?? "",
      l.designation,
      l.categorie ?? "",
      l.unite,
      String(l.prix_unitaire),
      l.source ?? "",
      l.date_source ?? "",
      l.date_validite ?? "",
      l.statut,
      l.zone ?? "",
    ].join(";"),
  );
  return [entete, ...lignesCsv].join("\n");
}