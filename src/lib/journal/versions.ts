// Versions tracées des journaux de chantier (RG-02 du cahier des charges :
// « un journal validé par le conducteur de travaux n'est plus modifiable ;
// toute correction cree une nouvelle version tracee »).
//
// A chaque reouverture d'un journal valide, son contenu est copie dans la
// table « journal_versions » : l'historique dit ce qui a ete valide, puis
// ce qui a ete corrige, et pourquoi.

export type ContenuJournal = {
  meteo?: string | null;
  observations?: string | null;
  effectif?: unknown[];
  engins?: unknown[];
  incidents?: unknown[];
  quantites?: unknown[];
  photos?: unknown[];
};

export type VersionJournal = {
  id?: string;
  journal_id?: string;
  version: number;
  motif: string | null;
  meteo: string | null;
  observations: string | null;
  effectif: unknown[];
  engins: unknown[];
  incidents: unknown[];
  quantites: unknown[];
  photos: unknown[];
  created_at?: string | null;
};

/** Numero de la prochaine version (la plus grande + 1). */
export function prochaineVersion(versions: { version: number }[]): number {
  let max = 0;
  for (const v of versions ?? []) {
    const n = Math.round(Number(v.version) || 0);
    if (n > max) max = n;
  }
  return max + 1;
}

/** Construit l'instantane d'un journal a l'ouverture d'une correction. */
export function construireVersion(
  contenu: ContenuJournal,
  motif: string | null,
  version: number,
): VersionJournal {
  return {
    version,
    motif: motif && motif.trim() ? motif.trim() : null,
    meteo: contenu.meteo ?? null,
    observations: contenu.observations ?? null,
    effectif: contenu.effectif ?? [],
    engins: contenu.engins ?? [],
    incidents: contenu.incidents ?? [],
    quantites: contenu.quantites ?? [],
    photos: contenu.photos ?? [],
  };
}

/** Resume lisible d'une version : effectifs, heures, incidents, quantites, photos. */
export function resumeVersion(version: VersionJournal): string {
  const parties: string[] = [];
  const effectif = version.effectif ?? [];
  const personnes = effectif.reduce(
    (total: number, e: any) => total + (Number(e?.nombre) || 0),
    0,
  );
  if (personnes > 0) parties.push(`${personnes} personne(s)`);
  const engins = version.engins ?? [];
  const heures = engins.reduce(
    (total: number, e: any) => total + (Number(e?.heures_marche) || 0),
    0,
  );
  if (heures > 0) {
    parties.push(`${(Math.round(heures * 100) / 100).toLocaleString("fr-FR")} h de marche`);
  }
  const incidents = version.incidents ?? [];
  if (incidents.length > 0) parties.push(`${incidents.length} incident(s)`);
  const quantites = version.quantites ?? [];
  if (quantites.length > 0) parties.push(`${quantites.length} quantité(s)`);
  const photos = version.photos ?? [];
  if (photos.length > 0) parties.push(`${photos.length} photo(s)`);
  if (parties.length === 0) return "Journal sans saisie.";
  return parties.join(" · ");
}

/** Versions triees de la plus recente a la plus ancienne. */
export function versionsTriees(versions: VersionJournal[]): VersionJournal[] {
  return [...(versions ?? [])].sort((a, b) => {
    const parVersion = (b.version ?? 0) - (a.version ?? 0);
    if (parVersion !== 0) return parVersion;
    return String(b.created_at ?? "").localeCompare(String(a.created_at ?? ""));
  });
}
