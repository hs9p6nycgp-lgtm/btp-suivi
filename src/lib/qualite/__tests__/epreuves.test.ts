import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  AGES_CONTROLE,
  calculerRappelsEpreuves,
  dateControlePrevue,
  epreuvesAEchancier,
} from "../epreuves";

describe("rappels d'eprouvettes beton (QUA-04)", () => {
  describe("date de controle prevue", () => {
    it("calcule la date a 7 jours", () => {
      assert.strictEqual(dateControlePrevue("2026-10-01", 7), "2026-10-08");
    });

    it("calcule la date a 28 jours", () => {
      assert.strictEqual(dateControlePrevue("2026-10-01", 28), "2026-10-29");
    });

    it("renvoie null pour une date invalide", () => {
      assert.strictEqual(dateControlePrevue("", 7), null);
    });
  });

  describe("calcul des rappels", () => {
    it("genere 3 rappels par eprouvette (7, 14, 28 j)", () => {
      const rappels = calculerRappelsEpreuves([
        { id: "e1", date_coulage: "2026-10-01" },
      ]);
      assert.strictEqual(rappels.length, 3);
      assert.deepStrictEqual(rappels.map((r) => r.ageJours), [...AGES_CONTROLE]);
    });

    it("marque en retard si la date est passee", () => {
      const rappels = calculerRappelsEpreuves(
        [{ id: "e1", date_coulage: "2026-01-01" }],
        new Date("2026-10-16T00:00:00"),
      );
      assert.ok(rappels.every((r) => r.enRetard));
    });
  });

  describe("epreuves a echeancier", () => {
    it("filtre les controles a venir dans X jours", () => {
      const rappels = [
        { epreuveId: "e1", dateCoulage: "2026-01-01", ageJours: 7, dateControlePrevue: "2026-10-18", joursRestants: 2, enRetard: false },
        { epreuveId: "e2", dateCoulage: "2026-01-01", ageJours: 14, dateControlePrevue: "2026-10-25", joursRestants: 9, enRetard: false },
        { epreuveId: "e3", dateCoulage: "2026-01-01", ageJours: 28, dateControlePrevue: "2026-10-10", joursRestants: -6, enRetard: true },
      ];
      const aVenir = epreuvesAEchancier(rappels, 5);
      assert.strictEqual(aVenir.length, 1);
      assert.strictEqual(aVenir[0].epreuveId, "e1");
    });
  });
});