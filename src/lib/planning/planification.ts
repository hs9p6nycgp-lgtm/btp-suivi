// Creation d'un planning de chantier a partir des durees indicatives d'un
// devis (audit metier du 19/10/2026, §1 et §3 : les durees proposees par le
// devis ne servaient a rien). Logique pure, testable.
//
// Les taches sont enchainees : chacune demarre a la fin de la precedente,
// ce qui produit un vrai chemin critique (decapage -> remblai -> base -> ...).

import { ajouterJours } from "./liens.ts";

export type TacheIndicee = { nom: string; jours: number };

export type TachePlanifiee = {
  nom: string;
  duree_jours: number;
  date_prevue_debut: string | null;
  date_prevue_fin: string | null;
};

export type LienPlanifie = {
  predecesseur: number; // index dans la liste des taches creees
  successeur: number;
};

/**
 * Transforme les durees indicatives d'un devis en taches datees.
 * J0 = date de depart fournie ; les chaines se suivent sans interruption.
 */
export function tachesDepuisDevis(
  taches: TacheIndicee[],
  dateDebut: string | null,
): TachePlanifiee[] {
  let curseur = 0;
  return (taches ?? []).map((tache) => {
    const duree = Math.max(1, Math.round(Number(tache.jours) || 1));
    const debut = ajouterJours(dateDebut, curseur);
    const fin = ajouterJours(dateDebut, curseur + duree);
    curseur += duree;
    return {
      nom: String(tache.nom ?? "").trim() || "Tâche",
      duree_jours: duree,
      date_prevue_debut: debut,
      date_prevue_fin: fin,
    };
  });
}

/** Liens « fin → début » entre les taches creees (chaine continue). */
export function liensChaine(nombreTaches: number): LienPlanifie[] {
  const liens: LienPlanifie[] = [];
  for (let i = 1; i < nombreTaches; i++) {
    liens.push({ predecesseur: i - 1, successeur: i });
  }
  return liens;
}

/** Duree totale du planning genere (en jours). */
export function dureePlanningGenere(taches: TachePlanifiee[]): number {
  return taches.reduce((s, t) => s + t.duree_jours, 0);
}
