// Filtres du referentiel de prix, prix par zone et alerte de peremption.
//
//   REF-07 : recherche et filtrage par categorie, fournisseur, ville et date
//             de mise a jour.
//   REF-08 : prix par zone geographique, avec coefficient de transport.
//   REF-09 : alerte lorsqu'un prix n'a pas ete mis a jour depuis plus de
//             6 mois.
//
// Module pur : tout est testable sans base de donnees.

import { estPrixObsolete } from "./prix.ts";
import { prixPourZone, type ZonePrix } from "./zones.ts";

/** Une ligne du referentiel (champs utilises par les filtres). */
export type LigneFiltrable = {
  id: string;
  code: string | null;
  designation: string;
  categorie: string | null;
  unite: string;
  prix_unitaire: number;
  source: string | null;
  date_source: string | null;
  date_validite: string | null;
  statut: "valide" | "a_verifier";
  zone: string | null;
};

export type FiltresPrix = {
  /** Texte libre : designation ou code. */
  recherche?: string;
  categorie?: string | null;
  /** Fournisseur = champ « source » du prix. */
  fournisseur?: string | null;
  /** Ville = champ « zone » du prix. */
  ville?: string | null;
  /** Date de mise a jour minimale (AAAA-MM-JJ). */
  dateMin?: string | null;
  /** Date de mise a jour maximale (AAAA-MM-JJ). */
  dateMax?: string | null;
  /** Ne garder que les prix dont la date de source est anterieure au seuil. */
  perimes?: boolean;
  /** Seuil de peremption, en mois (6 par defaut, REF-09). */
  seuilMoisPeremption?: number;
};

function dansIntervalle(date: string | null, min: string | null, max: string | null): boolean {
  if (!min && !max) return true;
  if (!date) return false;
  if (min && date < min) return false;
  if (max && date > max) return false;
  return true;
}

/** Applique les filtres REF-07 a une liste de prix. */
export function filtrerPrix(lignes: LigneFiltrable[], filtres: FiltresPrix = {}): LigneFiltrable[] {
  const q = (filtres.recherche ?? "").trim().toLowerCase();
  return lignes.filter((p) => {
    if (q) {
      const dansTexte =
        p.designation.toLowerCase().includes(q) ||
        (p.code ?? "").toLowerCase().includes(q) ||
        (p.source ?? "").toLowerCase().includes(q);
      if (!dansTexte) return false;
    }
    if (filtres.categorie && p.categorie !== filtres.categorie) return false;
    if (filtres.fournisseur && p.source !== filtres.fournisseur) return false;
    if (filtres.ville && p.zone !== filtres.ville) return false;
    if (!dansIntervalle(p.date_source, filtres.dateMin ?? null, filtres.dateMax ?? null)) return false;
    if (filtres.perimes && !estPrixObsolete(p.date_source, new Date(), filtres.seuilMoisPeremption ?? 6)) {
      return false;
    }
    return true;
  });
}

/**
 * Coefficients de transport par zone (REF-08). Valeurs indicatives pour la
 * Cote d'Ivoire : le cout de transport est plus eleve hors du district
 * d'Abidjan. L'utilisateur peut les corriger dans son chantier.
 */
export function zonesParDefaut(): ZonePrix[] {
  return [
    { zone: "Abidjan", coefficientTransport: 1 },
    { zone: "Yamoussoukro", coefficientTransport: 1.1 },
    { zone: "Bouaké", coefficientTransport: 1.1 },
    { zone: "Korhogo", coefficientTransport: 1.12 },
    { zone: "San-Pédro", coefficientTransport: 1.15 },
    { zone: "Daloa", coefficientTransport: 1.18 },
    { zone: "Man", coefficientTransport: 1.2 },
  ];
}

/** Prix d'une ligne ajuste a une zone donnee (REF-08). */
export function prixParZone(
  ligne: LigneFiltrable,
  zone: string | null,
  zones: ZonePrix[] = zonesParDefaut(),
): number {
  return prixPourZone(ligne.prix_unitaire, zones, zone);
}

export type AlertePeremption = {
  id: string;
  designation: string;
  dateSource: string | null;
  /** Anciennete de la mise a jour, en jours. */
  ageJours: number;
  message: string;
};

/** Anciennete d'une mise a jour, en jours (null si la date est absente). */
export function ageMiseAJour(dateSource: string | null, reference: Date = new Date()): number | null {
  if (!dateSource) return null;
  const d = new Date(`${dateSource}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const ref = new Date(reference);
  ref.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((ref.getTime() - d.getTime()) / 86400000));
}

/**
 * REF-09 : prix dont la date de source depasse le seuil (6 mois par defaut).
 * L'alerte invite a reverifier le prix aupres du fournisseur.
 */
export function alertesPeremption(
  lignes: LigneFiltrable[],
  seuilMois = 6,
  reference: Date = new Date(),
): AlertePeremption[] {
  const alertes: AlertePeremption[] = [];
  for (const ligne of lignes) {
    if (!estPrixObsolete(ligne.date_source, reference, seuilMois)) continue;
    const age = ageMiseAJour(ligne.date_source, reference);
    alertes.push({
      id: ligne.id,
      designation: ligne.designation,
      dateSource: ligne.date_source,
      ageJours: age ?? 0,
      message: ligne.date_source
        ? `Derniere mise a jour : ${ligne.date_source} (${age ?? 0} jours)`
        : "Aucune date de source : prix a verifier aupres du fournisseur",
    });
  }
  return alertes.sort((a, b) => b.ageJours - a.ageJours);
}

/** Valeurs distinctes d'un champ, pour alimenter les listes de filtres. */
export function valeursDistinctes(
  lignes: LigneFiltrable[],
  champ: "categorie" | "source" | "zone",
): string[] {
  const valeurs = new Set<string>();
  for (const ligne of lignes) {
    const v = ligne[champ];
    if (v && String(v).trim()) valeurs.add(String(v).trim());
  }
  return [...valeurs].sort((a, b) => a.localeCompare(b, "fr"));
}
