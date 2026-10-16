import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { validerBasePrix, type BasePrixRow } from "../basePrix";

function ligneValide(): BasePrixRow {
  return {
    code: "C-001",
    designation: "Ciment",
    unite: "m³",
    prix_unitaire: 450000,
    source: "Devis fournisseur X",
    date_source: "2026-09-15",
    date_validite: "2027-09-15",
    statut: "valide",
    categorie: "Béton",
    zone: null,
  };
}

describe("règles de validation des prix (exigence REF-04)", () => {
  it("accepte une ligne pourvue d'une source et d'une date", () => {
    assert.strictEqual(validerBasePrix(ligneValide()), null);
  });

  it("refuse une ligne sans source", () => {
    const ligne = { ...ligneValide(), source: null };
    assert.strictEqual(validerBasePrix(ligne), "la ligne est sans source");
  });

  it("refuse une ligne dont la date de source manque", () => {
    const ligne = { ...ligneValide(), date_source: null };
    assert.strictEqual(validerBasePrix(ligne), "la ligne est sans date de source");
  });

  it("refuse une source vide comme une source manquante", () => {
    const ligne = { ...ligneValide(), source: "" };
    assert.strictEqual(validerBasePrix(ligne), "la ligne est sans source");
  });
});
