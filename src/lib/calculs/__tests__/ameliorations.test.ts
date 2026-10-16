import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  nombreRotations,
  projectionCoutFinal,
  serieCumulative,
  stockTheorique,
  calculValeurAcquise,
  impactAvenant,
} from "../metre";
import { exporterReferentielCSV } from "../../referentiel/prix";

describe("ameliorations (priorite S)", () => {
  describe("MET-05 : nombre de rotations", () => {
    it("arrondit au superieur", () => {
      assert.strictEqual(nombreRotations(121, 15), 9);
      assert.strictEqual(nombreRotations(120, 15), 8);
    });
  });

  describe("PLA-05 : courbe en S", () => {
    it("calcule la serie cumulative", () => {
      assert.deepStrictEqual(serieCumulative([10, 20, 30]), [10, 30, 60]);
      assert.deepStrictEqual(serieCumulative([]), []);
    });
  });

  describe("COU-05 : projection du cout final", () => {
    it("calcule EAC = AC + (BAC - EV)", () => {
      assert.strictEqual(projectionCoutFinal(10000, 4000, 5000), 11000);
    });
  });

  describe("APP-03 : stock theorique", () => {
    it("soustrait les sorties des entrees", () => {
      assert.strictEqual(stockTheorique(100, 30), 70);
    });
  });

  describe("REF-05 : export CSV", () => {
    it("produit un CSV avec en-tete", () => {
      const csv = exporterReferentielCSV([
        {
          id: "1",
          code: "CIM-01",
          designation: "Ciment",
          categorie: "Materiaux de base",
          unite: "sac",
          prix_unitaire: 4500,
          source: "Guide",
          date_source: "2026-06-01",
          date_validite: "2027-06-01",
          statut: "valide",
          zone: "Abidjan",
        },
      ]);
      assert.ok(csv.startsWith("code;designation;categorie;unite;prix_unitaire;source;date_source;date_validite;statut;zone"));
      assert.ok(csv.includes("CIM-01;Ciment"));
    });
  });
});