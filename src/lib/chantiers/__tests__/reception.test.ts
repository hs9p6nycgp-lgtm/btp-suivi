import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  bilanFinancier,
  bilanQuantites,
  bilanQualite,
  pointsBloquantsReception,
} from "../reception.ts";

describe("rapport de réception", () => {
  it("établit le bilan des quantités poste par poste", () => {
    const bilan = bilanQuantites(
      [
        { id: "p1", code: "A1", designation: "Décapage", unite: "m²", quantite_marche: 8000, prix_unitaire: 500 },
        { id: "p2", designation: "Enrobé", unite: "t", quantite_marche: 966, prix_unitaire: 95000 },
      ],
      [{ poste_dqe_id: "p1", quantite: 8400 }],
    );
    assert.equal(bilan.lignes.length, 2);
    assert.equal(bilan.lignes[0].quantiteRealisee, 8400);
    assert.equal(bilan.lignes[0].avancementPct, 105);
    assert.equal(bilan.lignes[0].ecartQuantitePct, 5);
    assert.equal(bilan.montantMarche, 8000 * 500 + 966 * 95000);
    assert.equal(bilan.montantRealise, 8400 * 500);
    assert.equal(bilan.postesNonSoldes, 1);
  });

  it("calcule le bilan financier et la marge", () => {
    const bilan = bilanFinancier({
      montantMarche: 250000000,
      valorisationTravaux: 934000.4,
      depensesReelles: 170000,
    });
    assert.equal(bilan.valorisationTravaux, 934000);
    assert.equal(bilan.depensesReelles, 170000);
    assert.equal(bilan.marge, 764000);
    assert.equal(bilan.tauxConsommationPct, 0.1);
  });

  it("établit le bilan qualité et liste les réserves à lever", () => {
    const bilan = bilanQualite(
      [{ conforme: true }, { conforme: false }, { conforme: true }],
      [
        {
          id: "nc1",
          description: "Épaisseur hors tolérance",
          gravite: "critique",
          statut: "ouverte",
          action_corrective: "Reprise de la couche",
          echeance: "2026-10-30",
        },
        {
          id: "nc2",
          description: "Épaisseur dujoint",
          gravite: "mineure",
          statut: "cloturee",
        },
      ],
    );
    assert.equal(bilan.nbEssais, 3);
    assert.equal(bilan.nbConformes, 2);
    assert.equal(bilan.tauxConformitePct, 66.7);
    assert.equal(bilan.ncOuvertes, 1);
    assert.equal(bilan.ncCloturees, 1);
    assert.equal(bilan.reserves.length, 1);
    assert.ok(bilan.reserves[0].action?.includes("Reprise"));
  });

  it("liste les points bloquant la réception", () => {
    const bilanQuantites = {
      lignes: [],
      montantMarche: 1000,
      montantRealise: 500,
      avancementGlobalPct: 50,
      postesNonSoldes: 2,
    };
    const bilanQualite = {
      nbEssais: 2,
      nbConformes: 2,
      tauxConformitePct: 100,
      nbNonConformites: 1,
      ncOuvertes: 1,
      ncCloturees: 0,
      reserves: [
        { id: "nc1", description: "Réserve de nivellement", gravite: "majeure", action: null, echeance: null },
      ],
    };
    const points = pointsBloquantsReception({ bilanQuantites, bilanQualite, accidentsAvecArret: 1 });
    assert.equal(points.receptable, false);
    assert.equal(points.bloquants.length, 3);
    assert.equal(points.reserves.length, 1);

    const clean = pointsBloquantsReception({
      bilanQuantites: { ...bilanQuantites, postesNonSoldes: 0 },
      bilanQualite: { ...bilanQualite, ncOuvertes: 0, reserves: [] },
      accidentsAvecArret: 0,
    });
    assert.equal(clean.receptable, true);
    assert.deepEqual(clean.bloquants, []);
  });
});
