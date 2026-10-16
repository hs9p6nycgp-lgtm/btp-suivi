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

  describe("COU-04 : valeur acquise", () => {
    it("calcule tous les indicateurs de la valeur acquise", () => {
      const res = calculValeurAcquise(10000, 4000, 4500, 5000);
      // CV = EV - AC = 4500 - 5000 = -500
      // SV = EV - PV = 4500 - 4000 = 500
      // CPI = EV / AC = 4500 / 5000 = 0.9
      // SPI = EV / PV = 4500 / 4000 = 1.125
      assert.strictEqual(res.ecartCout, -500);
      assert.strictEqual(res.ecartDelai, 500);
      assert.strictEqual(res.indicePerformanceCout, 0.9);
      assert.strictEqual(res.indicePerformanceDelai, 1.125);
    });

    it("geres les divisions par zero", () => {
      const res = calculValeurAcquise(0, 0, 0, 0);
      assert.strictEqual(res.indicePerformanceCout, 0);
      assert.strictEqual(res.indicePerformanceDelai, 0);
    });
  });

  describe("MET-06 : avenants", () => {
    it("calcule l'impact d'un avenant sur le montant", () => {
      const res = impactAvenant(100, 150, 1000, 1200);
      // ancien = 100 * 1000 = 100000
      // nouveau = 150 * 1200 = 180000
      // ecart = 80000
      assert.strictEqual(res.ancienMontant, 100000);
      assert.strictEqual(res.nouveauMontant, 180000);
      assert.strictEqual(res.ecart, 80000);
    });

    it("geres un avenant sans impact", () => {
      const res = impactAvenant(100, 100, 1000, 1000);
      assert.strictEqual(res.ecart, 0);
    });
  });
});