// Rappels d'eprouvettes de beton (section 4.8, exigence QUA-04).
// Ages de controle : 7, 14, 28 jours.

export const AGES_CONTROLE = [7, 14, 28] as const;

// Tolérances par défaut par type d'essai (section 5, RG-04).
// Ces valeurs sont parametrables par chantier.
export type TolContrQuality = {
  epaisseur?: { min: number; max: number };
  depays?: { min: number; max: number };
  compactage?: { min: number; max: number };
  resistance_concrete?: { min: number; max: number }; // en MPa
  mise_en_oeuvre?: { min: number; max: number }; // en mm (slump)
};

export type ResultatConformite = {
  conform: boolean;
  ecart: number; // valeur mesurée - valeur exigée (positive = au-dessus, négative = en dessous)
  tolMin: number;
  tolMax: number;
  message: string;
};

/**
 * Vérifie la conformité d'un contrôle qualité par rapport à sa tolérance.
 * RG-04 : un contrôle qualité hors tolérance crée automatiquement une fiche de non-conformité.
 * @param valeurMesurée Valeur mesurée sur l'ouvrage
 * @param valeurExigée Valeur exigée dans le marché/DQE (référence, pour info)
 * @param tolérance Tolérance acceptée (plage min-max de valeurs acceptables)
 * @returns Résultat de la vérification de conformité
 */
export function verifierConformiteQualite(
  valeurMesuree: number,
  valeurExigée: number,
  tolérance: TolContrQuality,
): ResultatConformite {
  // La tolérance définit une plage [min, max] de valeurs acceptables.
  // La valeur exigée est une référence ; c'est la plage [min, max]
  // qui détermine ce qui est conforme.

  let min = tolérance.epaisseur?.min ?? tolérance.depays?.min ?? tolérance.compactage?.min ?? tolérance.resistance_concrete?.min ?? tolérance.mise_en_oeuvre?.min ?? 0;
  let max = tolérance.epaisseur?.max ?? tolérance.depays?.max ?? tolérance.compactage?.max ?? tolérance.resistance_concrete?.max ?? tolérance.mise_en_oeuvre?.max ?? Infinity;
  let champ = "";

  if (tolérance.epaisseur) champ = "épaisseur";
  else if (tolérance.depays) champ = "départ";
  else if (tolérance.compactage) champ = "compactage";
  else if (tolérance.resistance_concrete !== undefined) champ = "résistance béton";
  else if (tolérance.mise_en_oeuvre !== undefined) champ = "mise en œuvre";

  // La valeur mesurée doit être dans la plage [min, max]
  const conform = valeurMesuree >= min && valeurMesuree <= max;

  if (!conform) {
    // Hors tolérance -RG-04: devrait créer automatiquement une fiche de non-conformité
    const ecart = valeurMesuree - valeurExigée;
    return {
      conform: false,
      ecart,
      tolMin: min,
      tolMax: max,
      message: `Non-conformité ${champ} : valeur ${valeurMesuree} hors tolérance [${min}; ${max}]`,
    };
  }

  // Conforme
  const ecart = valeurMesuree - valeurExigée;
  return {
    conform: true,
    ecart,
    tolMin: min,
    tolMax: max,
    message: `Conforme : ${champ} dans les limites [${min}; ${max}]`,
  };
}

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