import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { verifierConformiteQualite } from "../epreuves.ts";

describe("contrôle qualité - vérification de conformité (RG-04)", () => {
  describe("vérification d'épaisseur", () => {
    it("doit marquer conforme quand l'épaisseur est dans les limites", () => {
      const tol = { epaisseur: { min: 10, max: 20 } } as const;
      const result = verifierConformiteQualite(15, 15, tol);
      assert.strictEqual(result.conform, true);
      assert.strictEqual(result.ecart, 0);
    });

    it("doit détecter non-conformitéépaisseur trop faible", () => {
      const tol = { epaisseur: { min: 10, max: 20 } } as const;
      const result = verifierConformiteQualite(8, 15, tol);
      assert.strictEqual(result.conform, false);
      assert.strictEqual(result.ecart, -7);
      assert.ok(result.message.includes("Non-conformité"));
    });

    it("doit détecter non-conformitéépaisseur trop épaisse", () => {
      const tol = { epaisseur: { min: 10, max: 20 } } as const;
      const result = verifierConformiteQualite(25, 15, tol);
      assert.strictEqual(result.conform, false);
      assert.strictEqual(result.ecart, 10);
      assert.ok(result.message.includes("Non-conformité"));
    });
  });

  it("doit gérer la résistance du béton", () => {
    const tol = { resistance_concrete: { min: 20, max: 30 } } as const;
    const result = verifierConformiteQualite(25, 25, tol);
    assert.strictEqual(result.conform, true);

    const resultFaible = verifierConformiteQualite(18, 25, tol);
    assert.strictEqual(resultFaible.conform, false);

    const resultFort = verifierConformiteQualite(35, 25, tol);
    assert.strictEqual(resultFort.conform, false);
  });

  it("doit gérer la mise en œuvre (slump)", () => {
    const tol = { mise_en_oeuvre: { min: 50, max: 100 } } as const;
    const result = verifierConformiteQualite(75, 75, tol);
    assert.strictEqual(result.conform, true);

    const resultSec = verifierConformiteQualite(40, 75, tol);
    assert.strictEqual(resultSec.conform, false);
  });

  describe("bord de tolérance", () => {
    it("doit être conforme aux limites exactes", () => {
      const tol = { epaisseur: { min: 10, max: 20 } } as const;
      const resultEp = verifierConformiteQualite(20, 15, tol);
      assert.strictEqual(resultEp.conform, true); // max inclus

      const resultInf = verifierConformiteQualite(10, 15, tol);
      assert.strictEqual(resultInf.conform, true); // min inclus
    });
  });
});