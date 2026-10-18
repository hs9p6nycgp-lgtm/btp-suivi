import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { estConforme } from "../qualite.ts";

describe("conformité des essais (exigence QUA-02)", () => {
  it("accepte une mesure dans la fourchette de tolérance", () => {
    // exigée 15, tolérance positive 1 et négative 1 → borne [14, 16]
    assert.strictEqual(estConforme(15, 15, 1, 1), true);
    assert.strictEqual(estConforme(14, 15, 1, 1), true);
    assert.strictEqual(estConforme(16, 15, 1, 1), true);
  });

  it("refuse une mesure hors de la fourchette", () => {
    // mesurée 12 alors que l'exigence est 15 ± 1
    assert.strictEqual(estConforme(12, 15, 1, 1), false);
    assert.strictEqual(estConforme(17, 15, 1, 1), false);
  });

  it("retourne conforme avec aucune tolérance", () => {
    assert.strictEqual(estConforme(15, 15, 0, 0), true);
    assert.strictEqual(estConforme(15.01, 15, 0, 0), false);
  });
});
