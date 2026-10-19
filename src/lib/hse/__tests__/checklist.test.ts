import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  etatCompletementConforme,
  ITEMS_CHECKLIST,
  joursChecklistComplete,
  libelleEtatChecklist,
  pointsRestants,
  tauxConformiteChecklist,
  type EtatChecklist,
} from "../checklist.ts";

function etat(partial: Partial<EtatChecklist> = {}): EtatChecklist {
  return {
    chantier_id: "c1",
    date: "2026-10-19",
    epi: true,
    echauffement: true,
    signalisation: true,
    extincteur: true,
    commentaire: null,
    saisi_par: null,
    ...partial,
  };
}

describe("check-list HSE quotidienne (HSE-02)", () => {
  it("quatre points à vérifier chaque jour", () => {
    assert.strictEqual(ITEMS_CHECKLIST.length, 4);
  });

  it("détecte un état complet", () => {
    assert.strictEqual(etatCompletementConforme(etat()), true);
    assert.strictEqual(etatCompletementConforme(etat({ extincteur: false })), false);
  });

  it("liste les points restant à vérifier", () => {
    assert.deepStrictEqual(pointsRestants(etat({ signalisation: false })), ["signalisation"]);
    assert.deepStrictEqual(pointsRestants(null), ["epi", "echauffement", "signalisation", "extincteur"]);
  });

  it("calcule le taux de conformité sur la période", () => {
    const taux = tauxConformiteChecklist([
      etat({ date: "2026-10-18" }),
      etat({ date: "2026-10-19", extincteur: false }),
    ]);
    assert.strictEqual(taux.cases, 8);
    assert.strictEqual(taux.casesConformes, 7);
    assert.strictEqual(taux.taux, 88);
    assert.strictEqual(taux.joursEnregistres, 2);
    assert.strictEqual(taux.joursConformes, 1);
  });

  it("compte les jours consécutifs de check-list complète", () => {
    const etats = [
      etat({ date: "2026-10-19" }),
      etat({ date: "2026-10-18" }),
      etat({ date: "2026-10-17", epi: false }),
    ];
    assert.strictEqual(joursChecklistComplete(etats, new Date("2026-10-19T12:00:00")), 2);
  });

  it("donne un libellé lisible de l'état du jour", () => {
    assert.match(libelleEtatChecklist(null), /Aucune check-list/);
    assert.match(libelleEtatChecklist(etat()), /4\/4/);
    assert.match(libelleEtatChecklist(etat({ epi: false })), /Point d'EPI|Port d'EPI/);
  });
});
