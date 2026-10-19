// Declarations HSE et indicateurs securite (exigences HSE-01 et HSE-03).
//
//   HSE-01 : declaration d'un incident ou d'un accident, avec photos.
//   HSE-03 : indicateurs — nombre de jours sans accident et taux de
//            frequence.
//
// Module pur : les calculs sont testables sans base de donnees.

import { calculJoursSansAccident, calculTauxFrequence } from "./hse.ts";

export const TYPES_INCIDENT = [
  "accident_travail",
  "accident_route",
  "incident",
  "presqu_accident",
] as const;

export type TypeIncident = (typeof TYPES_INCIDENT)[number];

export const LIBELLES_INCIDENT: Record<TypeIncident, { fr: string; en: string }> = {
  accident_travail: { fr: "Accident du travail", en: "Work accident" },
  accident_route: { fr: "Accident de la route", en: "Road accident" },
  incident: { fr: "Incident", en: "Incident" },
  presqu_accident: { fr: "Presqu'accident", en: "Near miss" },
};

/** Une declaration HSE (table hse_incidents). */
export type IncidentHse = {
  id: string;
  chantier_id: string;
  type: TypeIncident;
  date_occurrence: string;
  lieu: string | null;
  description: string;
  personnes_concernees: number;
  accident_avec_arret: boolean;
  duree_arret_heures: number | null;
  action_immediate: string | null;
  responsable: string | null;
  photos: string[] | null;
  created_at: string;
};

export type Gravite = "critique" | "moyen" | "faible";

/** Un accident avec arret est critique ; un incident simple est faible. */
export function classerGravite(incident: Pick<IncidentHse, "type" | "accident_avec_arret" | "personnes_concernees" | "duree_arret_heures">): Gravite {
  if (incident.accident_avec_arret) return "critique";
  if (incident.type === "accident_travail" || incident.type === "accident_route") return "moyen";
  if (incident.personnes_concernees > 0) return "moyen";
  return "faible";
}

/** L'accident le plus recent (travail ou route) : point de depart des jours sans accident. */
export function accidentLePlusRecent(incidents: IncidentHse[]): IncidentHse | null {
  const accidents = incidents
    .filter((i) => i.type === "accident_travail" || i.type === "accident_route")
    .sort((a, b) => (a.date_occurrence < b.date_occurrence ? 1 : -1));
  return accidents[0] ?? null;
}

/**
 * Heures effectivement travaillees, deduites des journaux : chaque personne
 * comptee dans un journal est comptee pour une journee de 8 heures
 * (hypothese du cahier des charges, parametre `heuresParJour`).
 */
export function heuresTravailleesDepuisJournaux(
  effectifsParJour: Array<{ nombre: number }>,
  heuresParJour = 8,
): number {
  return effectifsParJour.reduce((total, jour) => total + (Number(jour.nombre) || 0) * heuresParJour, 0);
}

export type IndicateursHse = {
  /** Jours ecoules depuis le dernier accident (0 si aucun accident). */
  joursSansAccident: number;
  /** Taux de frequence pour 1 000 000 heures travaillees. */
  tauxFrequence: number;
  /** Nombre d'accidents avec arret. */
  accidentsAvecArret: number;
  /** Nombre total d'accidents (travail + route). */
  accidents: number;
  /** Nombre d'incidents et presqu'accidents. */
  incidents: number;
  /** Presqu'accidents (les presque accidents evites). */
  presquAccidents: number;
  /** Heures travaillees retenues pour le calcul. */
  heuresTravaillees: number;
  /** True si le taux de frequence depasse le seuil d'alerte. */
  tauxEleve: boolean;
};

/**
 * Indicateurs HSE (HSE-03). Le taux de frequence est le nombre
 * d'accidents avec arret pour 1 000 000 heures travaillees (formule du
 * cahier des charges, reprise dans `hse.ts`).
 */
export function calculIndicateursHse(
  incidents: IncidentHse[],
  heuresTravaillees: number,
  reference: Date = new Date(),
  seuilTaux = 1,
): IndicateursHse {
  const accidents = incidents.filter(
    (i) => i.type === "accident_travail" || i.type === "accident_route",
  );
  const accidentsAvecArret = accidents.filter((i) => i.accident_avec_arret).length;
  const incidentsLegers = incidents.filter(
    (i) => i.type === "incident" || i.type === "presqu_accident",
  ).length;
  const presquAccidents = incidents.filter((i) => i.type === "presqu_accident").length;
  const dernier = accidentLePlusRecent(incidents);
  const joursSansAccident = dernier
    ? calculJoursSansAccident(dernier.date_occurrence, reference)
    : 0;
  const tauxFrequence = calculTauxFrequence(accidentsAvecArret, heuresTravaillees);
  return {
    joursSansAccident,
    tauxFrequence,
    accidentsAvecArret,
    accidents: accidents.length,
    incidents: incidentsLegers,
    presquAccidents,
    heuresTravaillees,
    tauxEleve: tauxFrequence > seuilTaux,
  };
}

/** Resume par type, pour l'affichage. */
export function resumeParType(
  incidents: IncidentHse[],
): { type: TypeIncident; nombre: number; libelle: string }[] {
  return TYPES_INCIDENT.map((type) => ({
    type,
    nombre: incidents.filter((i) => i.type === type).length,
    libelle: LIBELLES_INCIDENT[type].fr,
  }));
}

/** Un incident necessite-t-il une action corrective (suivi a faire) ? */
export function actionRequise(incident: Pick<IncidentHse, "action_immediate" | "accident_avec_arret">): boolean {
  if (incident.accident_avec_arret) return true;
  return !incident.action_immediate || !String(incident.action_immediate).trim();
}
