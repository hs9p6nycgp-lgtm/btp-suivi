import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { materiauxEnAlerte, verifierStockBas } from "../stock";

describe("alertes de stock bas (APP-04)", () => {
  it("detecte un stock bas", () => {
    const a = verifierStockBas("Ciment", 100, 80, 30); // stock = 20 <= 30
    assert.strictEqual(a.enAlerte, true);
    assert.strictEqual(a.stockTheorique, 20);
  });

  it("ne detecte pas d'alerte si stock au-dessus du seuil", () => {
    const a = verifierStockBas("Sable", 500, 100, 30); // stock = 400 > 30
    assert.strictEqual(a.enAlerte, false);
  });

  it("filtre les materiaux en alerte", () => {
    const alertes = [
      { materiau: "A", stockTheorique: 10, seuilAlerte: 30, enAlerte: true },
      { materiau: "B", stockTheorique: 100, seuilAlerte: 30, enAlerte: false },
      { materiau: "C", stockTheorique: 5, seuilAlerte: 30, enAlerte: true },
    ];
    const enAlerte = materiauxEnAlerte(alertes);
    assert.strictEqual(enAlerte.length, 2);
    assert.strictEqual(enAlerte[0].materiau, "A");
    assert.strictEqual(enAlerte[1].materiau, "C");
  });
});