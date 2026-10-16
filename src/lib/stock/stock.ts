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