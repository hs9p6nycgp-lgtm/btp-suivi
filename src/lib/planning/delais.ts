// Delais du planning : comparaison prevu / reel par tache (exigence PLA-04,
// cahier des charges section 4.6).
//
// Regle : une tache est en retard lorsque sa date de fin prevue est
// depassee sans etre terminee, ou lorsque sa date de fin reelle est
// posterieure a la date de fin prevue.

export type TacheAvecDates = {
  id?: string;
  nom?: string | null;
  statut?: string | null;
  date_prevue_debut?: string | null;
  date_prevue_fin?: string | null;
  date_reelle_debut?: string | null;
  date_reelle_fin?: string | null;
};

export type DelaiTache = {
  etat:
    | "termine_en_retard"
    | "termine_a_lheure"
    | "en_retard"
    | "en_cours"
    | "a_lheure"
    | "sans_date"
    | "annule";
  retardJours: number | null;
  joursRestants: number | null;
  libelle: string;
};

function ms(valeur: string | null | undefined): number | null {
  if (!valeur) return null;
  const t = new Date(`${String(valeur).slice(0, 10)}T00:00:00`).getTime();
  return Number.isNaN(t) ? null : t;
}

function jour(msDate: number, reference: Date): number {
  const d = new Date(msDate);
  const r = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
  return Math.round((d.getTime() - r.getTime()) / 86400000);
}

/** Delai d'une tache : retard en jours et libelle. */
export function delaiTache(tache: TacheAvecDates, reference: Date = new Date()): DelaiTache {
  const statut = String(tache.statut ?? "a_faire");

  if (statut === "annule") {
    return { etat: "annule", retardJours: 0, joursRestants: null, libelle: "Annulée" };
  }

  const finPrevue = ms(tache.date_prevue_fin);
  const finReelle = ms(tache.date_reelle_fin);

  if (statut === "termine") {
    if (finReelle === null) {
      return { etat: "termine_a_lheure", retardJours: 0, joursRestants: null, libelle: "Terminée" };
    }
    if (finPrevue === null) {
      return { etat: "termine_a_lheure", retardJours: 0, joursRestants: null, libelle: "Terminée" };
    }
    const retard = Math.round((finReelle - finPrevue) / 86400000);
    if (retard > 0) {
      return {
        etat: "termine_en_retard",
        retardJours: retard,
        joursRestants: null,
        libelle: `Terminée avec ${retard} j de retard`,
      };
    }
    return {
      etat: "termine_a_lheure",
      retardJours: 0,
      joursRestants: null,
      libelle: retard === 0 ? "Terminée à l'heure" : `Terminée ${Math.abs(retard)} j avant`,
    };
  }

  if (finPrevue === null) {
    return { etat: "sans_date", retardJours: null, joursRestants: null, libelle: "Sans date de fin" };
  }

  const restant = jour(finPrevue, reference);
  if (restant < 0) {
    return {
      etat: "en_retard",
      retardJours: Math.abs(restant),
      joursRestants: restant,
      libelle: `En retard de ${Math.abs(restant)} j`,
    };
  }
  if (restant === 0) {
    return { etat: "en_cours", retardJours: 0, joursRestants: 0, libelle: "Échéance aujourd'hui" };
  }
  return {
    etat: "a_lheure",
    retardJours: 0,
    joursRestants: restant,
    libelle: `${restant} j avant la fin prévue`,
  };
}

export type SyntheseRetards = {
  total: number;
  terminees: number;
  enRetard: number;
  maxRetard: number;
  libelle: string;
};

/** Synthese des retards du planning. */
export function syntheseRetards(
  taches: TacheAvecDates[],
  reference: Date = new Date(),
): SyntheseRetards {
  const delais = (taches ?? []).map((t) => delaiTache(t, reference));
  const enRetard = delais.filter((d) => d.etat === "en_retard" || d.etat === "termine_en_retard");
  const maxRetard = enRetard.reduce((max, d) => Math.max(max, d.retardJours ?? 0), 0);
  return {
    total: delais.length,
    terminees: delais.filter((d) => d.etat === "termine_a_lheure" || d.etat === "termine_en_retard").length,
    enRetard: enRetard.length,
    maxRetard,
    libelle:
      enRetard.length === 0
        ? "Aucun retard"
        : `${enRetard.length} tâche(s) en retard (max ${maxRetard} j)`,
  };
}
