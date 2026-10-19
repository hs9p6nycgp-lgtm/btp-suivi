// Suivi de l'avancement dans le temps (CHA-04) : points d'avancement datés,
// cadence constatee et date de fin estimee. Fonctions pures, testables.

export type PointAvancement = {
  id: string;
  /** Date du point au format "AAAA-MM-JJ". */
  date_point: string;
  avancement_pct: number;
  commentaire?: string | null;
  section_id?: string | null;
  created_at?: string | null;
};

export type ResumeProgression = {
  nbPoints: number;
  premier: PointAvancement | null;
  dernier: PointAvancement | null;
  /** Ecart en points de % entre le premier et le dernier point. */
  ecart: number | null;
  /** Cadence constatee en points de % par semaine (null si non calculable). */
  cadenceHebdo: number | null;
  /** Jours restants estimes pour atteindre l'objectif (null si non calculable). */
  joursEstimes: number | null;
  /** Date de fin estimee "AAAA-MM-JJ" (null si non calculable). */
  dateFinEstimee: string | null;
};

const JOUR_MS = 86400000;

function nombre(valeur: unknown): number | null {
  const n = Number(valeur);
  return Number.isFinite(n) ? n : null;
}

function jourDuTexte(valeur: string): string {
  return valeur.slice(0, 10);
}

/** Convertit "AAAA-MM-JJ" (ou un horodatage) en Date ; null si invalide. */
export function datePoint(valeur: string | null | undefined): Date | null {
  if (!valeur) return null;
  const d = new Date(valeur.length <= 10 ? `${valeur}T00:00:00Z` : valeur);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Trie les points par date croissante et fusionne les doublons de date
 * (le point le plus recemment cree gagne). Les dates invalides sont ignorees.
 */
export function normaliserPoints(points: PointAvancement[] | null | undefined): PointAvancement[] {
  const liste = (points ?? []).filter((p) => datePoint(p.date_point) !== null);
  const tries = [...liste].sort((a, b) => {
    const da = (datePoint(a.date_point) as Date).getTime();
    const db = (datePoint(b.date_point) as Date).getTime();
    if (da !== db) return da - db;
    const ca = a.created_at ? new Date(a.created_at).getTime() : 0;
    const cb = b.created_at ? new Date(b.created_at).getTime() : 0;
    return ca - cb;
  });
  const resultat: PointAvancement[] = [];
  for (const p of tries) {
    const jour = jourDuTexte(p.date_point);
    const precedent = resultat[resultat.length - 1];
    if (precedent && jourDuTexte(precedent.date_point) === jour) {
      resultat[resultat.length - 1] = p;
    } else {
      resultat.push(p);
    }
  }
  return resultat;
}

/** Premier point (le plus ancien) apres normalisation. */
export function premierPoint(points: PointAvancement[] | null | undefined): PointAvancement | null {
  const liste = normaliserPoints(points);
  return liste.length > 0 ? liste[0] : null;
}

/** Dernier point (le plus recent) apres normalisation. */
export function dernierPoint(points: PointAvancement[] | null | undefined): PointAvancement | null {
  const liste = normaliserPoints(points);
  return liste.length > 0 ? liste[liste.length - 1] : null;
}

/** Cadence constatee en points de % par semaine entre le premier et le dernier point. */
export function cadenceHebdo(points: PointAvancement[] | null | undefined): number | null {
  const liste = normaliserPoints(points);
  if (liste.length < 2) return null;
  const debut = datePoint(liste[0].date_point) as Date;
  const fin = datePoint(liste[liste.length - 1].date_point) as Date;
  const jours = (fin.getTime() - debut.getTime()) / JOUR_MS;
  if (jours <= 0) return null;
  const pctDebut = nombre(liste[0].avancement_pct) ?? 0;
  const pctFin = nombre(liste[liste.length - 1].avancement_pct) ?? 0;
  return Math.round((((pctFin - pctDebut) / jours) * 7) * 10) / 10;
}

/**
 * Jours necessaires pour atteindre l'objectif au rythme constate
 * (0 si l'objectif est deja atteint, null si la cadence est nulle ou negative).
 */
export function joursEstimesRestants(
  points: PointAvancement[] | null | undefined,
  objectif = 100,
): number | null {
  const cadence = cadenceHebdo(points);
  const dernier = dernierPoint(points);
  if (cadence === null || cadence <= 0 || !dernier) return null;
  const actuel = nombre(dernier.avancement_pct) ?? 0;
  if (actuel >= objectif) return 0;
  return Math.ceil((objectif - actuel) / (cadence / 7));
}

/**
 * Date de fin estimee ("AAAA-MM-JJ") au rythme constate, a partir de la plus
 * tardive des deux dates : aujourd'hui (reference) ou le dernier point.
 */
export function dateFinEstimee(
  points: PointAvancement[] | null | undefined,
  reference: Date = new Date(),
  objectif = 100,
): string | null {
  const jours = joursEstimesRestants(points, objectif);
  const dernier = dernierPoint(points);
  if (jours === null || !dernier) return null;
  const dateDernier = datePoint(dernier.date_point);
  if (!dateDernier) return null;
  const base = Math.max(dateDernier.getTime(), reference.getTime());
  return new Date(base + jours * JOUR_MS).toISOString().slice(0, 10);
}

/** Resume complet pour l'interface : ecart, cadence et projection de fin. */
export function resumerProgression(
  points: PointAvancement[] | null | undefined,
  reference: Date = new Date(),
  objectif = 100,
): ResumeProgression {
  const liste = normaliserPoints(points);
  const premier = liste.length > 0 ? liste[0] : null;
  const dernier = liste.length > 0 ? liste[liste.length - 1] : null;
  const ecart =
    premier && dernier
      ? Math.round(((nombre(dernier.avancement_pct) ?? 0) - (nombre(premier.avancement_pct) ?? 0)) * 10) / 10
      : null;
  return {
    nbPoints: liste.length,
    premier,
    dernier,
    ecart,
    cadenceHebdo: cadenceHebdo(liste),
    joursEstimes: joursEstimesRestants(liste, objectif),
    dateFinEstimee: dateFinEstimee(liste, reference, objectif),
  };
}
