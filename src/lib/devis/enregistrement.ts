// Enregistrement des devis (exigences MET-02, MET-03) : calcul des lignes,
// total en FCFA sans decimale, controle de saisie et numerotation.
// Logique pure : testable, utilisee par le calculateur et par l'export.

export type LigneDevisEntree = {
  designation: string;
  unite: string;
  quantite: number | string;
  prix_unitaire: number | string;
};

export type LigneDevisCalculee = {
  designation: string;
  unite: string;
  quantite: number;
  prix_unitaire: number;
  total: number;
};

export type DevisEnregistre = {
  id: string;
  numero: string;
  client: string;
  objet: string | null;
  date_devis: string;
  chantier_id: string | null;
  total: number;
  remise_pct?: number | null;
  tva_pct?: number | null;
  conditions_paiement?: string | null;
};

export type TotauxDevis = {
  totalBrut: number;
  remisePct: number;
  remiseMontant: number;
  totalHT: number;
  tvaPct: number;
  tvaMontant: number;
  totalTTC: number;
};

/**
 * Totaux d'un devis : brut, remise, HT, TVA et TTC (exigence MET-02).
 * Les taux sont en pourcentage ; 0 signifie « non applicable ».
 * Tous les montants sont arrondis au franc (FCFA sans decimale).
 */
export function calculerTotauxDevis(
  lignes: { total: number }[],
  remisePct: number | string | null | undefined = 0,
  tvaPct: number | string | null | undefined = 0,
): TotauxDevis {
  const totalBrut = arrondirFcfa(
    (lignes ?? []).reduce((s, l) => s + (Number(l.total) || 0), 0),
  );
  const tauxRemise = Math.max(0, Number(remisePct) || 0);
  const tauxTva = Math.max(0, Number(tvaPct) || 0);
  const remiseMontant = arrondirFcfa((totalBrut * tauxRemise) / 100);
  const totalHT = arrondirFcfa(totalBrut - remiseMontant);
  const tvaMontant = arrondirFcfa((totalHT * tauxTva) / 100);
  return {
    totalBrut,
    remisePct: tauxRemise,
    remiseMontant,
    totalHT,
    tvaPct: tauxTva,
    tvaMontant,
    totalTTC: arrondirFcfa(totalHT + tvaMontant),
  };
}

function nombre(valeur: number | string | null | undefined): number {
  if (valeur === null || valeur === undefined) return 0;
  const n = Number(valeur);
  return Number.isFinite(n) ? n : 0;
}

/** Arrondi au franc : le FCFA ne s'ecrit pas avec de decimale. */
export function arrondirFcfa(valeur: number): number {
  if (!Number.isFinite(valeur)) return 0;
  return Math.round(valeur);
}

/** Une ligne de devis avec son total. */
export function calculerLigne(ligne: LigneDevisEntree): LigneDevisCalculee {
  const quantite = nombre(ligne.quantite);
  const prix = nombre(ligne.prix_unitaire);
  return {
    designation: String(ligne.designation ?? "").trim(),
    unite: String(ligne.unite ?? "").trim(),
    quantite,
    prix_unitaire: prix,
    total: arrondirFcfa(quantite * prix),
  };
}

/** Les lignes calculées, sans ligne vide. */
export function calculerLignes(lignes: LigneDevisEntree[]): LigneDevisCalculee[] {
  return (lignes ?? []).map(calculerLigne).filter((l) => l.designation.length > 0);
}

/** Total général du devis (FCFA, sans decimale). */
export function totalDevis(lignes: LigneDevisCalculee[]): number {
  return arrondirFcfa((lignes ?? []).reduce((s, l) => s + l.total, 0));
}

/** Montant affiché : « 230 120 800 FCFA ». */
export function formaterMontantFcfa(valeur: number): string {
  return `${arrondirFcfa(valeur).toLocaleString("fr-FR")} FCFA`;
}

/** Controle de la saisie avant enregistrement. */
export function validerDevis(devis: {
  client: string;
  numero: string;
  date_devis: string;
  lignes: LigneDevisCalculee[];
}): { ok: boolean; erreurs: string[] } {
  const erreurs: string[] = [];
  if (!String(devis.client ?? "").trim()) erreurs.push("Indiquez le client du devis.");
  if (!String(devis.numero ?? "").trim()) erreurs.push("Indiquez le numéro du devis.");

  const date = String(devis.date_devis ?? "").trim();
  if (!date) {
    erreurs.push("Indiquez la date du devis.");
  } else if (Number.isNaN(new Date(`${date}T00:00:00`).getTime())) {
    erreurs.push("La date du devis est illisible.");
  }

  const lignes = devis.lignes ?? [];
  if (lignes.length === 0) erreurs.push("Ajoutez au moins une ligne au devis.");
  if (lignes.some((l) => l.quantite <= 0)) {
    erreurs.push("Chaque ligne doit avoir une quantité supérieure à zéro.");
  }
  if (lignes.some((l) => l.prix_unitaire < 0)) {
    erreurs.push("Un prix unitaire ne peut pas être négatif.");
  }

  return { ok: erreurs.length === 0, erreurs };
}

/** Numéro suivant : DEV-001, DEV-002… */
export function numeroDevisAuto(numerosExistants: string[]): string {
  let max = 0;
  for (const numero of numerosExistants ?? []) {
    const trouve = /(\d+)\s*$/.exec(String(numero).trim());
    if (trouve) max = Math.max(max, Number(trouve[1]));
  }
  return `DEV-${String(max + 1).padStart(3, "0")}`;
}

/** Lignes du devis issues du modèle de calcul et des prix retenus. */
export function lignesDevisDepuisModele(
  modele: {
    lignes: Array<{
      code: string;
      designation: string;
      unite: string;
      quantite: (inputs: Record<string, string>) => number;
    }>;
  },
  inputs: Record<string, string>,
  prixParCode: Record<string, number | null | undefined>,
): LigneDevisEntree[] {
  return (modele?.lignes ?? []).map((ligne) => ({
    designation: ligne.designation,
    unite: ligne.unite,
    quantite: ligne.quantite(inputs),
    prix_unitaire: prixParCode[ligne.code] ?? 0,
  }));
}
