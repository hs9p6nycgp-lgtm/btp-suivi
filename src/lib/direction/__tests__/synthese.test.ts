import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  classerChantiers,
  etatChantier,
  lignesDirection,
  syntheseGlobale,
  utilisationEngins,
  type ChantierDirection,
} from "../synthese.ts";

function chantier(partiel: Partial<ChantierDirection> = {}): ChantierDirection {
  return {
    id: "c1",
    nom: "Chantier A",
    type: "route",
    statut: "en_cours",
    latitude: 5.3,
    longitude: -4.0,
    montantMarche: 100000000,
    dateFinPrevue: "2026-12-31",
    avancementPct: 50,
    valorisationTravaux: 20000000,
    depensesReelles: 18000000,
    alertesOuvertes: 0,
    nonConformitesOuvertes: 0,
    ecartDelaiJours: 0,
    ...partiel,
  };
}

describe("tableau de bord de direction (§6.2)", () => {
  it("attribue le code couleur selon le retard, les non-conformités et les écarts", () => {
    assert.equal(
      etatChantier({ ecartDelaiJours: 5, alertesOuvertes: 0, nonConformitesOuvertes: 0, ecartBudgetairePct: 0 }),
      "rouge",
    );
    assert.equal(
      etatChantier({ ecartDelaiJours: 0, alertesOuvertes: 0, nonConformitesOuvertes: 2, ecartBudgetairePct: 0 }),
      "rouge",
    );
    assert.equal(
      etatChantier({ ecartDelaiJours: 0, alertesOuvertes: 1, nonConformitesOuvertes: 0, ecartBudgetairePct: 0 }),
      "orange",
    );
    assert.equal(
      etatChantier({ ecartDelaiJours: 0, alertesOuvertes: 0, nonConformitesOuvertes: 0, ecartBudgetairePct: 25 }),
      "orange",
    );
    assert.equal(
      etatChantier({ ecartDelaiJours: 0, alertesOuvertes: 0, nonConformitesOuvertes: 0, ecartBudgetairePct: 2 }),
      "vert",
    );
  });

  it("calcule l'écart budgétaire et le reste à réaliser", () => {
    const lignes = lignesDirection([chantier()]);
    assert.equal(lignes[0].ecartBudgetaire, 2000000);
    assert.equal(lignes[0].resteARealiser, 80000000);
    assert.equal(lignes[0].etat, "vert");
  });

  it("classe les chantiers selon le critère choisi", () => {
    const lignes = lignesDirection([
      chantier({ id: "a", nom: "A", ecartDelaiJours: 0, valorisationTravaux: 30000000, depensesReelles: 10000000, avancementPct: 80 }),
      chantier({ id: "b", nom: "B", ecartDelaiJours: 12, valorisationTravaux: 20000000, depensesReelles: 19000000, avancementPct: 20 }),
    ]);
    assert.deepEqual(classerChantiers(lignes, "delai").map((c) => c.nom), ["B", "A"]);
    assert.deepEqual(classerChantiers(lignes, "cout").map((c) => c.nom), ["A", "B"]);
    assert.deepEqual(classerChantiers(lignes, "avancement").map((c) => c.nom), ["B", "A"]);
  });

  it("cumulе le chiffre d'affaires, le reste à réaliser et la marge", () => {
    const lignes = lignesDirection([
      chantier({ id: "a", montantMarche: 100000000, valorisationTravaux: 20000000, depensesReelles: 18000000 }),
      chantier({ id: "b", montantMarche: 50000000, valorisationTravaux: 10000000, depensesReelles: 12000 }),
    ]);
    const synthese = syntheseGlobale(lignes);
    assert.equal(synthese.nbChantiers, 2);
    assert.equal(synthese.montantMarcheTotal, 150000000);
    assert.equal(synthese.chiffreAffairesRealise, 30000000);
    assert.equal(synthese.resteARealiserTotal, 120000000);
    assert.equal(synthese.depensesReellesTotal, 18012000);
    assert.equal(synthese.margeTotale, 11988000);
    assert.equal(synthese.tauxRealisationPct, 20);
  });

  it("répartit l'utilisation des engins entre chantiers", () => {
    const engins = utilisationEngins([
      { type_engin: "Pelleteuse", heures_marche: 8, chantier: "Chantier A" },
      { type_engin: "Pelleteuse", heures_marche: 6, chantier: "Chantier B" },
      { type_engin: "Camion", heures_marche: 4, chantier: "Chantier A" },
    ]);
    assert.equal(engins.length, 2);
    assert.equal(engins[0].typeEngin, "Pelleteuse");
    assert.equal(engins[0].heuresMarche, 14);
    assert.equal(engins[0].chantiers, 2);
    assert.equal(engins[0].parChantier[0].chantier, "Chantier A");
    assert.equal(engins[1].heuresMarche, 4);
  });
});
