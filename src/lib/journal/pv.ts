// Résumé texte d'un journal de chantier.
//
// Deux usages :
//  - le procès-verbal imprimable (feuille A4) ;
//  - le partage par SMS / WhatsApp : le chef de chantier colle le texte
//    dans la discussion du groupe sans avoir à quitter l'application.
//
// Module pur : la mise en forme est testable sans base de données.

export type EffectifPv = {
  corps_metier: string;
  nombre: number;
};

export type EnginPv = {
  type_engin: string;
  immatriculation: string | null;
  heures_marche: number;
  quantite_produite: number | null;
};

export type IncidentPv = {
  type: string;
  description: string | null;
  duree_heures: number;
};

export type QuantitePv = {
  designation: string;
  unite: string | null;
  quantite: number;
};

export type PhotoPv = {
  legende: string | null;
};

export type JournalPv = {
  chantierNom: string;
  maitreOuvrage: string | null;
  entreprise: string | null;
  numeroMarche: string | null;
  dateJournal: string;
  meteo: string | null;
  observations: string | null;
  effectifs: EffectifPv[];
  engins: EnginPv[];
  incidents: IncidentPv[];
  quantites: QuantitePv[];
  photos: PhotoPv[];
};

/** Date au format JJ/MM/AAAA (sans décalage de fuseau horaire). */
export function formaterDatePj(date: string | null | undefined): string {
  if (!date) return "-";
  const iso = date.slice(0, 10);
  const parties = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (parties) return `${parties[3]}/${parties[2]}/${parties[1]}`;
  const valeur = new Date(date);
  if (Number.isNaN(valeur.getTime())) return "-";
  return `${String(valeur.getDate()).padStart(2, "0")}/${String(valeur.getMonth() + 1).padStart(2, "0")}/${valeur.getFullYear()}`;
}

/** Nombre lisible (sans zéros inutiles). */
export function formaterNombrePj(valeur: number | string): string {
  const nombre = Number(valeur);
  if (!Number.isFinite(nombre)) return String(valeur);
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(nombre);
}

const LIBELLES_INCIDENT: Record<string, string> = {
  panne: "Panne",
  intemperie: "Intempérie",
  accident: "Accident",
  arret: "Arrêt de chantier",
  autre: "Autre incident",
};

/** Libellé lisible d'un incident. */
export function libelleIncidentPj(type: string): string {
  return LIBELLES_INCIDENT[type] ?? "Autre incident";
}

/** Total des heures de marche des engins du jour. */
export function totalHeuresPv(engins: EnginPv[]): number {
  return engins.reduce((total, engin) => total + (Number(engin.heures_marche) || 0), 0);
}

/** Total de l'effectif présent sur le chantier. */
export function totalEffectifPv(effectifs: EffectifPv[]): number {
  return effectifs.reduce((total, effectif) => total + (Number(effectif.nombre) || 0), 0);
}

/** Texte partageable (SMS / WhatsApp) du journal. */
export function resumerJournalPv(pv: JournalPv): string {
  const lignes: string[] = [];

  lignes.push(`*Journal de chantier — ${pv.chantierNom}`);
  lignes.push(`Date : ${formaterDatePj(pv.dateJournal)}`);
  if (pv.maitreOuvrage) lignes.push(`Maître d'ouvrage : ${pv.maitreOuvrage}`);
  if (pv.entreprise) lignes.push(`Entreprise : ${pv.entreprise}`);
  if (pv.meteo) lignes.push(`Météo : ${pv.meteo}`);
  if (pv.observations) lignes.push(`Observations : ${pv.observations}`);

  if (pv.effectifs.length > 0) {
    const detail = pv.effectifs
      .map((effectif) => `${effectif.corps_metier} ${formaterNombrePj(effectif.nombre)}`)
      .join(", ");
    lignes.push(`Effectif : ${formaterNombrePj(totalEffectifPv(pv.effectifs))} personne(s) — ${detail}`);
  }

  if (pv.engins.length > 0) {
    const detail = pv.engins
      .map(
        (engin) =>
          `${engin.type_engin}${engin.immatriculation ? ` (${engin.immatriculation})` : ""} ${formaterNombrePj(engin.heures_marche)} h`,
      )
      .join(", ");
    lignes.push(`Matériels : ${detail} — total ${formaterNombrePj(totalHeuresPv(pv.engins))} h`);
  }

  if (pv.quantites.length > 0) {
    lignes.push("*Quantités réalisées*");
    for (const quantite of pv.quantites) {
      lignes.push(
        `• ${quantite.designation} : ${formaterNombrePj(quantite.quantite)}${quantite.unite ? ` ${quantite.unite}` : ""}`,
      );
    }
  }

  if (pv.incidents.length > 0) {
    lignes.push("*Incidents*");
    for (const incident of pv.incidents) {
      const duree = incident.duree_heures ? ` (${formaterNombrePj(incident.duree_heures)} h)` : "";
      lignes.push(
        `• ${libelleIncidentPj(incident.type)}${incident.description ? ` — ${incident.description}` : ""}${duree}`,
      );
    }
  }

  lignes.push(`Photos : ${pv.photos.length}`);

  return lignes.join("\n");
}
