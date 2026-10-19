// Repartition des ressources d'un planning (audit metier du 19/10/2026, §2 :
// « pas d'affectation d'equipe/engin aux taches »). Logique pure, testable.

export type TacheAvecRessources = {
  nom?: string | null;
  duree_jours?: number | null;
  equipe?: string | null;
  engins?: string | null;
};

export type ChargeEquipe = {
  equipe: string;
  jours: number;
  nombreTaches: number;
};

export const EQUIPE_NON_AFFECTEE = "Non affectée";

/** Libelle lisible des ressources d'une tache. */
export function formaterRessources(tache: {
  equipe?: string | null;
  engins?: string | null;
}): string {
  const equipe = String(tache.equipe ?? "").trim();
  const engins = String(tache.engins ?? "").trim();
  const parts: string[] = [];
  if (equipe) parts.push(equipe);
  if (engins) parts.push(engins);
  return parts.length > 0 ? parts.join(" · ") : "—";
}

/** Charge de travail (en jours) par equipe, de la plus chargee a la moins chargee. */
export function repartitionCharge(taches: TacheAvecRessources[]): ChargeEquipe[] {
  const map = new Map<string, ChargeEquipe>();
  for (const tache of taches ?? []) {
    const equipe = String(tache.equipe ?? "").trim() || EQUIPE_NON_AFFECTEE;
    const jours = Math.max(0, Math.round(Number(tache.duree_jours) || 0));
    const ligne = map.get(equipe) ?? { equipe, jours: 0, nombreTaches: 0 };
    ligne.jours += jours;
    ligne.nombreTaches += 1;
    map.set(equipe, ligne);
  }
  return [...map.values()].sort((a, b) => b.jours - a.jours || a.equipe.localeCompare(b.equipe, "fr"));
}

/** Jours de planning sans equipe affectee (charge non attribuee). */
export function joursSansEquipe(taches: TacheAvecRessources[]): number {
  return (taches ?? [])
    .filter((t) => !String(t.equipe ?? "").trim())
    .reduce((s, t) => s + Math.max(0, Math.round(Number(t.duree_jours) || 0)), 0);
}
