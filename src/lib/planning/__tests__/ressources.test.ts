import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  EQUIPE_NON_AFFECTEE,
  formaterRessources,
  joursSansEquipe,
  repartitionCharge,
} from "../ressources.ts";

describe("ressources du planning", () => {
  it("compose le libellé des ressources d'une tâche", () => {
    assert.equal(
      formaterRessources({ equipe: "Terrassiers", engins: "1 pelleteuse" }),
      "Terrassiers · 1 pelleteuse",
    );
    assert.equal(formaterRessources({ equipe: "Terrassiers" }), "Terrassiers");
    assert.equal(formaterRessources({}), "—");
  });

  it("répartit la charge de travail par équipe", () => {
    const charge = repartitionCharge([
      { equipe: "Terrassiers", duree_jours: 10 },
      { equipe: "Terrassiers", duree_jours: 12 },
      { equipe: "Maçons", duree_jours: 20 },
    ]);
    assert.equal(charge.length, 2);
    assert.equal(charge[0].equipe, "Terrassiers");
    assert.equal(charge[0].jours, 22);
    assert.equal(charge[0].nombreTaches, 2);
    assert.equal(charge[1].equipe, "Maçons");
    assert.equal(charge[1].jours, 20);
    assert.equal(charge[1].nombreTaches, 1);
  });

  it("regroupe les tâches sans équipe affectée", () => {
    const charge = repartitionCharge([
      { nom: "A", duree_jours: 5 },
      { equipe: "  ", duree_jours: 3 },
    ]);
    assert.equal(charge.length, 1);
    assert.equal(charge[0].equipe, EQUIPE_NON_AFFECTEE);
    assert.equal(charge[0].jours, 8);
    assert.equal(joursSansEquipe([
      { duree_jours: 5 },
      { equipe: "Terrassiers", duree_jours: 10 },
    ]), 5);
  });

  it("renvoie une liste vide sans tâche", () => {
    assert.deepEqual(repartitionCharge([]), []);
    assert.equal(joursSansEquipe([]), 0);
  });
});
