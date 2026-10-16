import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  lignesConcerneesParMiseAJour,
  nouveauMontantLigne,
} from "../propagation";

describe("propagation des prix (REF-06)", () => {
  const lignes = [
    { id: "a", code: "CIM-01", designation: "Ciment", prix_unitaire: 4500 },
    { id: "b", code: null, designation: "Sable", prix_unitaire: 6500 },
    { id: "c", code: "GRAV-01", designation: "Gravier", prix_unitaire: 6000 },
  ];

  it("trouve par code identique", () => {
    const res = lignesConcerneesParMiseAJour("CIM-01", "Ciment", lignes);
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0].id, "a");
  });

  it("trouve par designation si code null", () => {
    const res = lignesConcerneesParMiseAJour(null, "Sable", lignes);
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0].id, "b");
  });

  it("renvoie vide si aucune correspondance", () => {
    const res = lignesConcerneesParMiseAJour("ZZZ", "Inconnu", lignes);
    assert.strictEqual(res.length, 0);
  });

  it("calcule le nouveau montant", () => {
    assert.strictEqual(nouveauMontantLigne(10, 4500), 45000);
  });
});