// Indicateurs HSE (section 4.9, exigences HSE-03).
// Calculs purs, sans dpendance UI.

export type IndicateursHSE = {
  joursSansAccident: number;
  tauxFrequence: number; // accidents avec arret x 1 000 000 / heures travaillees
};

/** Calcule le taux de fréquence : (nb accidents avec arret x 1 000 000) / heures totales travaillees. */
export function calculTauxFrequence(
  accidentsAvecArret: number,
  heuresTravaillees: number,
): number {
  if (heuresTravaillees <= 0) return 0;
  return (accidentsAvecArret * 1_000_000) / heuresTravaillees;
}

/** Nombre de jours sans accident depuis le dernier accident enregistre. */
export function calculJoursSansAccident(
  dateDernierAccident: string | null,
  reference: Date = new Date(),
): number {
  if (!dateDernierAccident) return 0;
  const d = new Date(`${dateDernierAccident}T00:00:00`);
  if (Number.isNaN(d.getTime())) return 0;
  const diffMs = reference.getTime() - d.getTime();
  return Math.floor(diffMs / 86400000);
}