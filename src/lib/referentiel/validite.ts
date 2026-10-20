// Validite d'un prix unitaire (exigences REF-04 et REF-09) : chaque prix
// doit porter une source et une date, et un prix vieux de plus de six mois
// doit etre revalide.
//
// Logique pure, testable.

export type PrixAvecSource = {
  source?: string | null;
  date_source?: string | null;
  date_validite?: string | null;
  statut?: string | null;
};

export type EtatValiditePrix = {
  etat: "sourcé" | "a_verifier" | "a_revalider" | "sans_source";
  libelle: string;
  ageJours: number | null;
  source: string;
  dateReference: string | null;
};

const SEUIL_REVALIDATION_JOURS = 183; // environ six mois

function joursEntre( reference: Date, date: string): number | null {
  const d = new Date(`${date.slice(0, 10)}T00:00:00`).getTime();
  if (Number.isNaN(d)) return null;
  const r = new Date(
    reference.getFullYear(),
    reference.getMonth(),
    reference.getDate(),
  ).getTime();
  return Math.round((r - d) / 86400000);
}

/**
 * Etat d'un prix : source et date presentes ? a revalider (plus de six mois) ?
 * encore marque « a verifier » par l'administration ?
 */
export function etatValiditePrix(
  prix: PrixAvecSource,
  reference: Date = new Date(),
): EtatValiditePrix {
  const source = String(prix.source ?? "").trim();
  const dateValidite = prix.date_validite ?? prix.date_source ?? null;
  const ageJours = dateValidite ? joursEntre(reference, dateValidite) : null;

  let etat: EtatValiditePrix["etat"];
  let libelle: string;
  if (!source || !dateValidite) {
    etat = "sans_source";
    libelle = "Prix sans source ni date : à fiabiliser avant de chiffrer (REF-04).";
  } else if (prix.statut === "a_verifier") {
    etat = "a_verifier";
    libelle = "Prix estimé, à vérifier avant chiffrage définitif.";
  } else if (ageJours !== null && ageJours > SEUIL_REVALIDATION_JOURS) {
    etat = "a_revalider";
    libelle = `Prix de plus de six mois (${Math.round(ageJours / 30)} mois) : à revalider (REF-09).`;
  } else {
    etat = "sourcé";
    libelle = "Prix sourcé et à jour.";
  }

  return { etat, libelle, ageJours, source, dateReference: dateValidite };
}
