// Parametres de calcul du devis (exigence MET-04) : coefficient de
// foisonnement, capacite de la benne, pertes par defaut.
//
// Ces parametres sont communs a tous les modeles de devis : ils sont
// exposes dans le calculateur, memorises sur l'appareil et appliques aux
// entrees de chaque modele qui les utilise.

export type ParametresCalcul = {
  foisonnement: string;
  capacite_benne: string;
  pertes: string;
};

export const PARAMETRES_DEFAUT: ParametresCalcul = {
  foisonnement: "1.2",
  capacite_benne: "15",
  pertes: "5",
};

/** Entrees de modele pour lesquelles un parametre s'applique. */
export const CLES_PARAMETRES = ["foisonnement", "capacite_benne", "pertes"] as const;

export type StockageSimple = {
  getItem(cle: string): string | null;
  setItem(cle: string, valeur: string): void;
};

const CLE_STOCKAGE = "btp.devis.parametres";

function nombreValide(valeur: unknown, defaut: string): string {
  const n = Number(String(valeur ?? "").replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return defaut;
  return String(valeur).replace(",", ".");
}

/** Complète les paramètres manquants ou invalides par les valeurs par défaut. */
export function normaliserParametres(
  valeurs: Partial<ParametresCalcul> | null | undefined,
): ParametresCalcul {
  return {
    foisonnement: nombreValide(valeurs?.foisonnement, PARAMETRES_DEFAUT.foisonnement),
    capacite_benne: nombreValide(valeurs?.capacite_benne, PARAMETRES_DEFAUT.capacite_benne),
    pertes: nombreValide(valeurs?.pertes, PARAMETRES_DEFAUT.pertes),
  };
}

/**
 * Applique les paramètres aux entrées d'un modèle : seuls les paramètres
 * réellement utilisés par le modèle sont remplacés.
 */
export function appliquerParametres(
  inputs: Record<string, string>,
  parametres: ParametresCalcul,
): Record<string, string> {
  const resultat = { ...inputs };
  for (const cle of CLES_PARAMETRES) {
    if (cle in resultat) resultat[cle] = parametres[cle];
  }
  return resultat;
}

/** Relit les paramètres mémorisés sur l'appareil. */
export function lireParametres(stockage: StockageSimple | null | undefined): ParametresCalcul {
  if (!stockage) return { ...PARAMETRES_DEFAUT };
  try {
    const brut = stockage.getItem(CLE_STOCKAGE);
    if (!brut) return { ...PARAMETRES_DEFAUT };
    return normaliserParametres(JSON.parse(brut) as Partial<ParametresCalcul>);
  } catch {
    return { ...PARAMETRES_DEFAUT };
  }
}

/** Mémorise les paramètres sur l'appareil. */
export function ecrireParametres(
  stockage: StockageSimple | null | undefined,
  parametres: ParametresCalcul,
): void {
  if (!stockage) return;
  try {
    stockage.setItem(CLE_STOCKAGE, JSON.stringify(normaliserParametres(parametres)));
  } catch {
    // Stockage indisponible : les paramètres restent valables pour la session.
  }
}
