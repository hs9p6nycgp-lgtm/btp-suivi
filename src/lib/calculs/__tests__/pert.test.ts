import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  calculPert,
  tachesCritiques,
  datePrevueFin,
} from "../pert.ts";

describe("calcul PERT et chemin critique (PLA-02)", () => {
  const taches = [
    { id: "A", duree: 3, predecesseurs: [] },
    { id: "B", duree: 2, predecesseurs: ["A"] },
    { id: "C", duree: 4, predecesseurs: ["A"] },
    { id: "D", duree: 2, predecesseurs: ["B", "C"] },
  ];

  it("calcule les dates au plus tot", () => {
    // A: debut 0 ; B: debut 3 ; C: debut 3 ; D: debut max(3+2, 3+4)=7
    const res = calculPert(taches, 9);
    const map = new Map(res.map((r) => [r.id, r]));
    assert.strictEqual(map.get("A")!.dateAuPlusTot, 0);
    assert.strictEqual(map.get("B")!.dateAuPlusTot, 3);
    assert.strictEqual(map.get("C")!.dateAuPlusTot, 3);
    assert.strictEqual(map.get("D")!.dateAuPlusTot, 7);
  });

  it("calcule les dates au plus tard", () => {
    // D: LS = 9-2 = 7 ; C: LS = 7-4 = 3 ; B: LS = 7-2 = 5 ; A: LS = min(5,3)-3 = 0
    const res = calculPert(taches, 9);
    const map = new Map(res.map((r) => [r.id, r]));
    assert.strictEqual(map.get("A")!.dateAuPlusTard, 0);
    assert.strictEqual(map.get("B")!.dateAuPlusTard, 5);
    assert.strictEqual(map.get("C")!.dateAuPlusTard, 3);
    assert.strictEqual(map.get("D")!.dateAuPlusTard, 7);
  });

  it("calcule les marges totales", () => {
    // A: 0-0=0 ; B: 5-3=2 ; C: 3-3=0 ; D: 7-7=0
    const res = calculPert(taches, 9);
    const map = new Map(res.map((r) => [r.id, r]));
    assert.strictEqual(map.get("A")!.margeTotale, 0);
    assert.strictEqual(map.get("B")!.margeTotale, 2);
    assert.strictEqual(map.get("C")!.margeTotale, 0);
    assert.strictEqual(map.get("D")!.margeTotale, 0);
  });

  it("identifie les taches critiques", () => {
    const res = calculPert(taches, 9);
    const critiques = tachesCritiques(res);
    assert.deepStrictEqual(critiques.sort(), ["A", "C", "D"]);
  });

  it("calcule la date prevue de fin", () => {
    assert.strictEqual(datePrevueFin("2026-10-01", 5), "2026-10-06");
    assert.strictEqual(datePrevueFin(null, 5), null);
  });
});