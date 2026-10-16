// Prix par zone geographique avec coefficient de transport (section 4.12, exigence REF-08).

export type ZonePrix = {
  zone: string;
  coefficientTransport: number; // multiplicateur, ex: 1.10 = +10%
};

/** Applique le coefficient de transport d'une zone a un prix unitaire de base. */
export function prixAvecZone(
  prixBase: number,
  coefficient: number,
): number {
  return Math.round(prixBase * coefficient);
}

/** Calcule le prix ajuste pour une zone donnee (coefficient par defaut 1.0). */
export function prixPourZone(
  prixBase: number,
  zones: ZonePrix[],
  zone: string | null,
): number {
  if (!zone) return prixBase;
  const z = zones.find((z) => z.zone.toLowerCase() === zone.toLowerCase());
  if (!z) return prixBase;
  return prixAvecZone(prixBase, z.coefficientTransport);
}