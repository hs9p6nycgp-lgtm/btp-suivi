// Formules metier de la section 5 du cahier des charges.
// A verifier contre la fiche de recette (T-01, T-02, ...).

export function volumeCouche(longueur: number, largeur: number, epaisseur: number): number {
  return longueur * largeur * epaisseur;
}

export function volumeFoisonne(volumeEnPlace: number, coefficientFoisonnement: number): number {
  return volumeEnPlace * coefficientFoisonnement;
}

export function nombreBennes(volumeFoisonne: number, capaciteBenne: number): number {
  if (capaciteBenne <= 0) throw new Error("La capacite d'une benne doit etre > 0.");
  return Math.ceil(volumeFoisonne / capaciteBenne);
}

export function volumeBeton(elements: Array<{ longueur: number; largeur: number; hauteur: number }>): number {
  return elements.reduce((total, el) => total + el.longueur * el.largeur * el.hauteur, 0);
}

export function ratioAcier(masseAcier: number, volumeBeton: number): number {
  if (volumeBeton <= 0) throw new Error("Le volume de beton doit etre > 0.");
  return masseAcier / volumeBeton;
}

export function surfaceRectangle(longueur: number, largeur: number): number {
  return longueur * largeur;
}

export function avancementPoste(qteRealisee: number, qteMarche: number): number {
  if (qteMarche <= 0) return 0;
  return (qteRealisee / qteMarche) * 100;
}

export function arrondir2Decimales(valeur: number): number {
  return Math.round(valeur * 100) / 100;
}