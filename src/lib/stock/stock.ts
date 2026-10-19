// Alertes de stock bas (section 4.5, exigence APP-04).
// Logique pure : compare le stock theorique au seuil d'alerte.

export type AlerteStock = {
  materiau: string;
  stockTheorique: number;
  seuilAlerte: number;
  enAlerte: boolean;
};

/** Verifie si le stock theorique est en dessous du seuil d'alerte. */
export function verifierStockBas(
  materiau: string,
  entrees: number,
  sorties: number,
  seuilAlerte: number,
): AlerteStock {
  const stock = entrees - sorties;
  return {
    materiau,
    stockTheorique: stock,
    seuilAlerte,
    enAlerte: stock <= seuilAlerte,
  };
}

/** Filtre les materiaux en alerte de stock bas. */
export function materiauxEnAlerte(alertes: AlerteStock[]): AlerteStock[] {
  return alertes.filter((a) => a.enAlerte);
}

// --- Alertes de stock sur l'ensemble des chantiers (centre d'alertes) --------
//
// Sur la page « Livraisons » d'un chantier, le stock est calculé à partir des
// livraisons de ce chantier. Le centre d'alertes doit, lui, regrouper les
// matériaux de tous les chantiers : on part donc des mêmes informations
// (quantité livrée, quantité mise en œuvre, seuil) mais agrégées par chantier.

export type EntreeStock = {
  chantier_id: string;
  /** Clé canonique du matériau (voir cleMateriau). */
  cle: string;
  /** Quantité livrée (entrée en stock). */
  quantite: number;
  /** Quantité mise en œuvre (sortie de stock). */
  mise_en_oeuvre: number;
};

export type SeuilStock = {
  chantier_id: string;
  cle: string;
  seuil: number;
};

export type StockAlerte = {
  chantier_id: string;
  cle: string;
  /** Stock théorique (entrées - sorties). */
  stock: number;
  seuil: number;
};

/** Stock théorique par chantier et par matériau. */
export function stocksTheoriques(entrees: EntreeStock[]): Map<string, number> {
  const stocks = new Map<string, number>();
  for (const entree of entrees) {
    const cle = `${entree.chantier_id}::${entree.cle}`;
    const stock =
      (stocks.get(cle) ?? 0) +
      (Number(entree.quantite) || 0) -
      (Number(entree.mise_en_oeuvre) || 0);
    stocks.set(cle, stock);
  }
  return stocks;
}

/**
 * Matériaux dont le stock est au seuil ou en dessous (APP-04).
 * Seuls les matériaux ayant un seuil défini (strictement positif) sont
 * signalés : un seuil à 0 signifie « pas de seuil » et ne doit pas
 * transformer le centre d'alertes en liste de matériaux sans stock.
 */
export function alertesStock(entrees: EntreeStock[], seuils: SeuilStock[]): StockAlerte[] {
  const stocks = stocksTheoriques(entrees);
  const alertes: StockAlerte[] = [];

  for (const seuil of seuils) {
    const valeur = Number(seuil.seuil) || 0;
    if (valeur <= 0) continue;
    const cle = `${seuil.chantier_id}::${seuil.cle}`;
    const stock = stocks.get(cle) ?? 0;
    if (stock <= valeur) {
      alertes.push({ chantier_id: seuil.chantier_id, cle: seuil.cle, stock, seuil: valeur });
    }
  }

  return alertes;
}