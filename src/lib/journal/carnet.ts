// Carnet de chantier : compilation imprimable du journal quotidien
// (exigence JOU-01 a JOU-05 — meteo, effectifs, engins, incidents, photos,
// quantites et observations, jour par jour).
//
// Logique pure : cumuls et libelles. La mise en page est dans l'ecran.

export type EntreeEffectif = { corps_metier: string; nombre: number };
export type EntreeEngin = {
  type_engin: string;
  immatriculation?: string | null;
  heures_marche: number;
  quantite_produite?: number | null;
};
export type EntreeIncident = { type: string; description?: string | null; duree_heures: number };

export type EffectifsCumules = {
  total: number;
  parCorpsMetier: { corpsMetier: string; nombre: number }[];
};

export type EnginsCumules = {
  heuresMarche: number;
  parType: { typeEngin: string; heures: number; nombre: number }[];
};

export type IncidentsCumules = {
  nombre: number;
  heuresArret: number;
};

/** Effectifs cumules : total en personnes-jours et detail par corps de metier. */
export function cumulEffectifs(effectifs: EntreeEffectif[]): EffectifsCumules {
  const map = new Map<string, number>();
  for (const e of effectifs ?? []) {
    const corps = String(e.corps_metier ?? "").trim() || "Non précisé";
    map.set(corps, (map.get(corps) ?? 0) + (Number(e.nombre) || 0));
  }
  const parCorpsMetier = [...map.entries()]
    .map(([corpsMetier, nombre]) => ({ corpsMetier, nombre }))
    .sort((a, b) => b.nombre - a.nombre || a.corpsMetier.localeCompare(b.corpsMetier, "fr"));
  return {
    total: parCorpsMetier.reduce((s, c) => s + c.nombre, 0),
    parCorpsMetier,
  };
}

/** Heures de marche cumulees, par type d'engin. */
export function cumulEngins(engins: EntreeEngin[]): EnginsCumules {
  const map = new Map<string, { heures: number; nombre: number }>();
  for (const e of engins ?? []) {
    const type = String(e.type_engin ?? "").trim() || "Non précisé";
    const ligne = map.get(type) ?? { heures: 0, nombre: 0 };
    ligne.heures += Number(e.heures_marche) || 0;
    ligne.nombre += 1;
    map.set(type, ligne);
  }
  const parType = [...map.entries()]
    .map(([typeEngin, v]) => ({ typeEngin, heures: Math.round(v.heures * 100) / 100, nombre: v.nombre }))
    .sort((a, b) => b.heures - a.heures || a.typeEngin.localeCompare(b.typeEngin, "fr"));
  return {
    heuresMarche: Math.round(parType.reduce((s, t) => s + t.heures, 0) * 100) / 100,
    parType,
  };
}

/** Incidents cumules : nombre et heures d'arret. */
export function cumulIncidents(incidents: EntreeIncident[]): IncidentsCumules {
  return {
    nombre: (incidents ?? []).length,
    heuresArret:
      Math.round((incidents ?? []).reduce((s, i) => s + (Number(i.duree_heures) || 0), 0) * 100) / 100,
  };
}

const JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const MOIS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

/** Date en toutes lettres : « lundi 19 octobre 2026 ». */
export function formaterJourComplet(valeur: string | null | undefined): string {
  if (!valeur) return "";
  const [annee, mois, jour] = String(valeur).slice(0, 10).split("-");
  if (!annee || !mois || !jour) return String(valeur);
  const d = new Date(`${valeur.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return String(valeur);
  return `${JOURS[d.getDay()]} ${Number(jour)} ${MOIS[Number(mois) - 1]} ${annee}`;
}

/** Date courte au format JJ/MM/AAAA. */
export function formaterJour(valeur: string | null | undefined): string {
  if (!valeur) return "—";
  const [annee, mois, jour] = String(valeur).slice(0, 10).split("-");
  if (!annee || !mois || !jour) return String(valeur);
  return `${jour}/${mois}/${annee}`;
}

/** Nombre de jours de la periode (bornes comprises). */
export function nombreJoursPeriode(debut: string | null, fin: string | null): number {
  if (!debut || !fin) return 0;
  const d = new Date(`${debut}T00:00:00`).getTime();
  const f = new Date(`${fin}T00:00:00`).getTime();
  if (Number.isNaN(d) || Number.isNaN(f) || f < d) return 0;
  return Math.round((f - d) / 86400000) + 1;
}
