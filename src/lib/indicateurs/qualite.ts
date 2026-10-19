// Indicateurs de qualité du portefeuille (non-conformités).
//
// Module pur : le calcul est vérifiable sans base de données. Le taux de
// traitement et le délai moyen de clôture sont les deux indicateurs de la
// démarche qualité que l'on présente en réunion de chantier.

export type NonConformiteIndicateur = {
  statut: string;
  created_at?: string | null;
  date_cloture?: string | null;
};

export type IndicateursQualite = {
  /** Non-conformités encore ouvertes (en cours de traitement). */
  ouvertes: number;
  /** Non-conformités clôturées ou rejetées. */
  traitees: number;
  /** Total des fiches qualité. */
  total: number;
  /** Part des fiches traitées, en pourcentage (0 à 100). */
  tauxTraitement: number;
  /** Délai moyen de clôture, en jours (null si aucune fiche clôturée). */
  delaiMoyenJours: number | null;
};

function joursEntre(debut: string, fin: string): number | null {
  const d1 = Date.parse(debut.slice(0, 10));
  const d2 = Date.parse(fin.slice(0, 10));
  if (Number.isNaN(d1) || Number.isNaN(d2)) return null;
  return Math.max(0, Math.round((d2 - d1) / 86400000));
}

/** Calcule les indicateurs qualité à partir des fiches de non-conformité. */
export function calculerIndicateursQualite(
  nonConformites: NonConformiteIndicateur[],
): IndicateursQualite {
  let ouvertes = 0;
  let traitees = 0;
  const delais: number[] = [];

  for (const fiche of nonConformites) {
    if (fiche.statut === "cloturee" || fiche.statut === "rejetee") {
      traitees += 1;
      if (fiche.created_at && fiche.date_cloture) {
        const delai = joursEntre(fiche.created_at, fiche.date_cloture);
        if (delai !== null) delais.push(delai);
      }
    } else {
      ouvertes += 1;
    }
  }

  const total = ouvertes + traitees;
  const tauxTraitement = total === 0 ? 0 : Math.round((traitees / total) * 100);
  const delaiMoyenJours =
    delais.length === 0
      ? null
      : Math.round((delais.reduce((somme, d) => somme + d, 0) / delais.length) * 10) / 10;

  return { ouvertes, traitees, total, tauxTraitement, delaiMoyenJours };
}
