// Suivi des fiches de non-conformite (QUA-03, RG-04) : echeance, retard,
// libelles francais et regles de cloture. Logique pure, testable.
//
// Rappel du cahier des charges : une fiche de non-conformite porte une
// description, une gravite, un responsable, une action corrective, une
// echeance et une date de cloture. La colonne « action corrective » existe
// en base mais doit etre renseignee pour que la fiche puisse etre closee.

export type FicheNonConformite = {
  id?: string;
  description?: string | null;
  gravite?: string | null;
  statut?: string | null;
  responsable?: string | null;
  action_corrective?: string | null;
  echeance?: string | null;
  date_cloture?: string | null;
  date_creation?: string | null;
};

const STATUTS_NC: Record<string, string> = {
  ouverte: "Ouverte",
  en_cours: "En cours",
  cloturee: "Clôturée",
  rejetee: "Rejetée",
};

const GRAVITES_NC: Record<string, string> = {
  mineure: "Mineure",
  majeure: "Majeure",
  critique: "Critique",
};

/** Statut d'une fiche, en francais. */
export function libelleStatutNC(statut: string | null | undefined): string {
  const cle = String(statut ?? "").trim();
  if (!cle) return "—";
  return STATUTS_NC[cle] ?? cle.charAt(0).toUpperCase() + cle.slice(1);
}

/** Gravite d'une fiche, en francais. */
export function libelleGraviteNC(gravite: string | null | undefined): string {
  const cle = String(gravite ?? "").trim();
  if (!cle) return "—";
  return GRAVITES_NC[cle] ?? cle.charAt(0).toUpperCase() + cle.slice(1);
}

/** Date au format JJ/MM/AAAA (chaine vide si absente). */
export function formaterDateNC(valeur: string | null | undefined): string {
  if (!valeur) return "";
  const [annee, mois, jour] = String(valeur).slice(0, 10).split("-");
  if (!annee || !mois || !jour) return String(valeur);
  return `${jour}/${mois}/${annee}`;
}

export type EtatEcheanceNC = {
  clos: boolean;
  enRetard: boolean;
  joursRestants: number | null;
  libelle: string;
};

/** Echeance d'une fiche : retard, jours restants, libelle. */
export function etatEcheanceNC(
  fiche: FicheNonConformite,
  reference: Date = new Date(),
): EtatEcheanceNC {
  const statut = String(fiche.statut ?? "");
  if (statut === "cloturee" || statut === "rejetee") {
    return {
      clos: true,
      enRetard: false,
      joursRestants: null,
      libelle: `${libelleStatutNC(statut)}${fiche.date_cloture ? ` le ${formaterDateNC(fiche.date_cloture)}` : ""}`,
    };
  }
  if (!fiche.echeance) {
    return { clos: false, enRetard: false, joursRestants: null, libelle: "Sans échéance" };
  }
  const echeance = new Date(`${String(fiche.echeance).slice(0, 10)}T00:00:00`).getTime();
  if (Number.isNaN(echeance)) {
    return { clos: false, enRetard: false, joursRestants: null, libelle: "Échéance illisible" };
  }
  const debut = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate()).getTime();
  const jours = Math.round((echeance - debut) / 86400000);

  if (jours < 0) {
    return {
      clos: false,
      enRetard: true,
      joursRestants: jours,
      libelle: `En retard de ${Math.abs(jours)} jour(s)`,
    };
  }
  if (jours === 0) {
    return { clos: false, enRetard: false, joursRestants: 0, libelle: "Échéance aujourd'hui" };
  }
  return { clos: false, enRetard: false, joursRestants: jours, libelle: `Dans ${jours} jour(s)` };
}

export type SuiviNC = {
  responsable: string;
  action_corrective: string;
  echeance: string;
};

/** Controle de la saisie du suivi d'une fiche. */
export function validerSuiviNC(
  suivi: SuiviNC,
  options: { cloture?: boolean } = {},
): { ok: boolean; erreurs: string[] } {
  const erreurs: string[] = [];
  if (!String(suivi.responsable ?? "").trim()) {
    erreurs.push("Indiquez le responsable du traitement.");
  }
  if (!String(suivi.action_corrective ?? "").trim()) {
    erreurs.push(
      options.cloture
        ? "Une action corrective est obligatoire pour clôturer la fiche."
        : "Indiquez l'action corrective prévue.",
    );
  }
  if (suivi.echeance && Number.isNaN(new Date(`${suivi.echeance}T00:00:00`).getTime())) {
    erreurs.push("L'échéance est illisible.");
  }
  return { ok: erreurs.length === 0, erreurs };
}
