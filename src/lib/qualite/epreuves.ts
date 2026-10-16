// Rappels d'eprouvettes de beton (section 4.8, exigence QUA-04).
// Ages de controle : 7, 14, 28 jours.

export const AGES_CONTROLE = [7, 14, 28] as const;

export type EpreuveRappel = {
  epreuveId: string;
  dateCoulage: string;
  ageJours: number;
  dateControlePrevue: string;
  joursRestants: number;
  enRetard: boolean;
};

/** Calcule la date de controle prevue pour une eprouvette. */
export function dateControlePrevue(dateCoulage: string, ageJours: number): string | null {
  const d = new Date(`${dateCoulage}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + ageJours);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Calcule les rappels d'eprouvettes a controle. */
export function calculerRappelsEpreuves(
  epreuves: Array<{ id: string; date_coulage: string }>,
  reference: Date = new Date(),
): EpreuveRappel[] {
  const rappels: EpreuveRappel[] = [];
  const aujourdhui = reference.getTime();

  for (const e of epreuves) {
    for (const age of AGES_CONTROLE) {
      const dateStr = dateControlePrevue(e.date_coulage, age);
      if (!dateStr) continue;
      const dateControle = new Date(`${dateStr}T00:00:00`).getTime();
      const joursRestants = Math.round((dateControle - aujourdhui) / 86400000);
      rappels.push({
        epreuveId: e.id,
        dateCoulage: e.date_coulage,
        ageJours: age,
        dateControlePrevue: dateStr,
        joursRestants,
        enRetard: joursRestants < 0,
      });
    }
  }

  return rappels;
}

/** Filtre les eprouvettes dont le controle est en retard ou a echancier dans X jours. */
export function epreuvesAEchancier(
  rappels: EpreuveRappel[],
  dansXJours: number,
): EpreuveRappel[] {
  return rappels.filter((r) => r.joursRestants <= dansXJours && r.joursRestants >= 0);
}