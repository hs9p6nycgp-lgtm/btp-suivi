// Suivi des points de controle d'un plan de controle qualite (QUA-01 /
// QUA-02) : pour chaque parametre du plan, les essais realises, le taux de
// conformite et l'etat (jamais controle, conforme, partiel, non conforme).
//
// Logique pure, testable.

import { normaliserParametre } from "./plansControle.ts";

export type PlanPourSuivi = { parametre: string; unite?: string | null };
export type EssaiPourSuivi = { type_controle: string; conforme: boolean; date_controle: string };

export type SuiviParametre = {
  parametre: string;
  unite: string;
  nbEssais: number;
  nbConformes: number;
  tauxConformitePct: number | null;
  dernierEssai: string | null;
  etat: "jamais_controle" | "conforme" | "partiel" | "non_conforme";
};

export type SuiviPointsControle = {
  parametres: SuiviParametre[];
  nbParametres: number;
  jamaisControls: number;
  conformes: number;
  nonConformes: number;
  tauxConformiteGlobalPct: number | null;
};

/** Suivi de chaque parametre du plan au regard des essais saisis. */
export function suiviPointsControle(
  plans: PlanPourSuivi[],
  essais: EssaiPourSuivi[],
): SuiviPointsControle {
  const essaisParParametre = new Map<string, EssaiPourSuivi[]>();
  for (const essai of essais ?? []) {
    const cle = normaliserParametre(essai.type_controle);
    if (!cle) continue;
    const liste = essaisParParametre.get(cle) ?? [];
    liste.push(essai);
    essaisParParametre.set(cle, liste);
  }

  const parametres: SuiviParametre[] = (plans ?? []).map((plan) => {
    const nom = String(plan.parametre ?? "").trim();
    const liste = essaisParParametre.get(normaliserParametre(nom)) ?? [];
    const nbEssais = liste.length;
    const nbConformes = liste.filter((e) => e.conforme).length;
    const dates = liste.map((e) => e.date_controle).filter(Boolean).sort();
    const dernierEssai = dates.length > 0 ? dates[dates.length - 1] : null;

    let etat: SuiviParametre["etat"];
    if (nbEssais === 0) etat = "jamais_controle";
    else if (nbConformes === nbEssais) etat = "conforme";
    else {
      const dernier = liste.find((e) => e.date_controle === dernierEssai);
      etat = dernier && !dernier.conforme ? "non_conforme" : "partiel";
    }

    return {
      parametre: nom,
      unite: String(plan.unite ?? "").trim(),
      nbEssais,
      nbConformes,
      tauxConformitePct: nbEssais > 0 ? Math.round((nbConformes / nbEssais) * 1000) / 10 : null,
      dernierEssai,
      etat,
    };
  });

  const nbEssaisTotal = parametres.reduce((s, p) => s + p.nbEssais, 0);
  const nbConformesTotal = parametres.reduce((s, p) => s + p.nbConformes, 0);

  return {
    parametres,
    nbParametres: parametres.length,
    jamaisControls: parametres.filter((p) => p.etat === "jamais_controle").length,
    conformes: parametres.filter((p) => p.etat === "conforme").length,
    nonConformes: parametres.filter((p) => p.etat === "non_conforme").length,
    tauxConformiteGlobalPct:
      nbEssaisTotal > 0 ? Math.round((nbConformesTotal / nbEssaisTotal) * 1000) / 10 : null,
  };
}
