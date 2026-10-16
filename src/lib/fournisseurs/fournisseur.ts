// Regles metier du module Fournisseurs (section 4.13, FOU-01 a FOU-06).

const TYPES_FOURNISSEUR = ["materiaux", "loueur_engins", "transporteur", "sous_traitant", "laboratoire"] as const;
export type TypeFournisseur = (typeof TYPES_FOURNISSEUR)[number];

/** FOU-01 : validation de la fiche fournisseur. Renvoie null si valide, sinon le message du probleme. */
export function validerFournisseur(raisonSociale: string, type: string): string | null {
  if (!raisonSociale || !raisonSociale.trim()) {
    return "la raison sociale est obligatoire";
  }
  if (!TYPES_FOURNISSEUR.includes(type as TypeFournisseur)) {
    return "le type de fournisseur est invalide";
  }
  return null;
}

/** FOU-02 : validation des conditions commerciales. Renvoie null si valides. */
export function validerConditionsCommerciales(
  delaiPaiementJours: number | null,
  validitePrixJours: number | null,
): string | null {
  if (delaiPaiementJours !== null && delaiPaiementJours < 0) {
    return "le delai de paiement ne peut pas etre negatif";
  }
  if (validitePrixJours !== null && validitePrixJours < 0) {
    return "la validite des prix ne peut pas etre negative";
  }
  return null;
}

export type DevisFournisseur = {
  fournisseur: string;
  prix_unitaire: number;
  delai_livraison_jours: number | null;
  conditions: string | null;
};

/** FOU-04 : choisit le meilleur devis parmi plusieurs (prix le plus bas, puis delai le plus court). */
export function meilleurDevis(devis: DevisFournisseur[]): { index: number; raison: string } | null {
  if (devis.length === 0) return null;
  let meilleur = 0;
  for (let i = 1; i < devis.length; i++) {
    const a = devis[meilleur];
    const b = devis[i];
    if (b.prix_unitaire < a.prix_unitaire) {
      meilleur = i;
    } else if (b.prix_unitaire === a.prix_unitaire) {
      const da = a.delai_livraison_jours ?? Number.MAX_SAFE_INTEGER;
      const db = b.delai_livraison_jours ?? Number.MAX_SAFE_INTEGER;
      if (db < da) meilleur = i;
    }
  }
  const raison =
    devis.length === 1
      ? "seul devis disponible"
      : `prix le plus bas (${devis[meilleur].prix_unitaire})`;
  return { index: meilleur, raison };
}

export type CriteresEvaluation = {
  respect_delais: number | null;
  conformite_livraisons: number | null;
  ecarts_prix: number | null;
};

/** FOU-06 : calcule la note globale sur 5 (moyenne des criteres renseignes). */
export function calculerNoteFournisseur(criteres: CriteresEvaluation): number {
  const valeurs = [criteres.respect_delais, criteres.conformite_livraisons, criteres.ecarts_prix].filter(
    (v): v is number => v !== null,
  );
  if (valeurs.length === 0) return 0;
  const somme = valeurs.reduce((a, b) => a + b, 0);
  return Math.round((somme / valeurs.length) * 100) / 100;
}