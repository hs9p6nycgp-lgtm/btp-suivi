import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  calculJoursSansAccident,
  calculTauxFrequence,
} from "../hse";

describe("indicateurs HSE (HSE-03)", () => {
  describe("taux de frequence", () => {
    it("calcule le taux de frequence", () => {
      // 2 accidents, 500 000 heures -> (2 x 1 000 000) / 500 000 = 4
      assert.strictEqual(calculTauxFrequence(2, 500000), 4);
    });

    it("renvoie 0 si aucune heure travaillee", () => {
      assert.strictEqual(calculTauxFrequence(2, 0), 0);
    });
  });

  describe("jours sans accident", () => {
    it("calcule les jours depuis le dernier accident", () => {
      // accident le 01/10/2026, reference 16/10/2026 -> 15 jours
      assert.strictEqual(calculJoursSansAccident("2026-10-01", new Date("2026-10-16T00:00:00")), 15);
    });

    it("renvoie 0 si pas de date d'accident", () => {
      assert.strictEqual(calculJoursSansAccident(null), 0);
    });
  });
});