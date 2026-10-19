// Liens entre taches du planning (PLA-01) : dependances fin-debut, detection
// de cycle, enchainement des dates prevues et chaine critique.
// Logique pure, testable, utilisee par l'ecran Planning.
// Le calcul ES/EF/LS/LF et des marges reste celui de src/lib/calculs/pert.ts.

import { calculPert, tachesCritiques } from "../calculs/pert.ts";

export type TachePlanning = {
  id: string;
  nom: string;
  duree_jours: number;
};

export type DependancePlanning = {
  tache_predecesseur_id: string;
  tache_successeur_id: string;
  type_dependance?: string | null;
  decalage_jours?: number | null;
};

export type ResultatLien = { ok: boolean; raison: string | null };

export type DatePrevue = {
  debut: string | null;
  fin: string | null;
  jourDebut: number;
  jourFin: number;
};

/** Predecesseurs de chaque tache (dependances fin-debut). */
export function predecesseursParTache(
  dependances: DependancePlanning[],
): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const d of dependances) {
    const liste = map.get(d.tache_successeur_id) ?? [];
    liste.push(d.tache_predecesseur_id);
    map.set(d.tache_successeur_id, liste);
  }
  return map;
}

/** Successeurs de chaque tache (dependances fin-debut). */
export function successeursParTache(
  dependances: DependancePlanning[],
): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const d of dependances) {
    const liste = map.get(d.tache_predecesseur_id) ?? [];
    liste.push(d.tache_successeur_id);
    map.set(d.tache_predecesseur_id, liste);
  }
  return map;
}

/**
 * Vrai si le lien predecesseur -> successeur creerait un cycle.
 * Un cycle existe quand le successeur peut deja atteindre le predecesseur.
 */
export function detecterCycle(
  dependances: DependancePlanning[],
  predecesseurId: string,
  successeurId: string,
): boolean {
  if (predecesseurId === successeurId) return true;
  const successeurs = successeursParTache(dependances);
  const pile = [successeurId];
  const vus = new Set<string>();
  while (pile.length > 0) {
    const courant = pile.pop() as string;
    if (courant === predecesseurId) return true;
    if (vus.has(courant)) continue;
    vus.add(courant);
    for (const suivant of successeurs.get(courant) ?? []) pile.push(suivant);
  }
  return false;
}

/** Verifie qu'un lien peut etre enregistre entre deux taches. */
export function verifierLien(
  taches: TachePlanning[],
  dependances: DependancePlanning[],
  predecesseurId: string,
  successeurId: string,
): ResultatLien {
  if (!predecesseurId || !successeurId) {
    return { ok: false, raison: "Choisissez la tâche précédente et la tâche suivante." };
  }
  if (predecesseurId === successeurId) {
    return { ok: false, raison: "Une tâche ne peut pas dépendre d'elle-même." };
  }
  const ids = new Set(taches.map((t) => t.id));
  if (!ids.has(predecesseurId) || !ids.has(successeurId)) {
    return { ok: false, raison: "Tâche introuvable dans ce planning." };
  }
  if (
    dependances.some(
      (d) =>
        d.tache_predecesseur_id === predecesseurId &&
        d.tache_successeur_id === successeurId,
    )
  ) {
    return { ok: false, raison: "Ce lien existe déjà." };
  }
  if (detecterCycle(dependances, predecesseurId, successeurId)) {
    return {
      ok: false,
      raison: "Ce lien créerait un cycle : les deux tâches ne peuvent pas dépendre l'une de l'autre.",
    };
  }
  return { ok: true, raison: null };
}

/** Ajoute un nombre de jours a une date (format AAAA-MM-JJ). */
export function ajouterJours(date: string | null | undefined, jours: number): string | null {
  if (!date) return null;
  const d = new Date(`${String(date).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + Math.round(jours));
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const j = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${j}`;
}

/** Resultat PERT brut (ES, LS, marge) pour chaque tache. */
export function resultatsPert(
  taches: TachePlanning[],
  dependances: DependancePlanning[],
) {
  const predecesseurs = predecesseursParTache(dependances);
  return calculPert(
    taches.map((t) => ({
      id: t.id,
      duree: t.duree_jours ?? 0,
      predecesseurs: predecesseurs.get(t.id) ?? [],
    })),
  );
}

/**
 * Dates prevues de chaque tache, deduites des dependances.
 * J0 = date de depart du planning ; une tache demarre a la fin de sa
 * precedente (dependance fin-debut).
 */
export function datesPrevues(
  taches: TachePlanning[],
  dependances: DependancePlanning[],
  dateDebut: string | null | undefined,
): Map<string, DatePrevue> {
  const resultats = resultatsPert(taches, dependances);
  const parId = new Map(resultats.map((r) => [r.id, r]));
  const map = new Map<string, DatePrevue>();
  for (const t of taches) {
    const es = parId.get(t.id)?.dateAuPlusTot ?? 0;
    const ef = es + (t.duree_jours ?? 0);
    map.set(t.id, {
      debut: ajouterJours(dateDebut, es),
      fin: ajouterJours(dateDebut, ef),
      jourDebut: es,
      jourFin: ef,
    });
  }
  return map;
}

/** Duree totale du planning en jours (fin du chemin le plus long). */
export function dureePlanning(
  taches: TachePlanning[],
  dependances: DependancePlanning[],
): number {
  const dates = datesPrevues(taches, dependances, null);
  let max = 0;
  for (const d of dates.values()) max = Math.max(max, d.jourFin);
  return max;
}

/** Chaine critique : taches critiques classees par date de debut. */
export function chaineCritique(
  taches: TachePlanning[],
  dependances: DependancePlanning[],
): TachePlanning[] {
  if (taches.length === 0) return [];
  const critiques = new Set(tachesCritiques(resultatsPert(taches, dependances)));
  const dates = datesPrevues(taches, dependances, null);
  return taches
    .filter((t) => critiques.has(t.id))
    .sort((a, b) => (dates.get(a.id)?.jourDebut ?? 0) - (dates.get(b.id)?.jourDebut ?? 0));
}

/** Libelle lisible d'un lien : « Decapage → Foundation ». */
export function libelleLien(
  taches: TachePlanning[],
  dependance: DependancePlanning,
): string {
  const nom = (id: string) => taches.find((t) => t.id === id)?.nom ?? "Tâche supprimée";
  return `${nom(dependance.tache_predecesseur_id)} → ${nom(dependance.tache_successeur_id)}`;
}
