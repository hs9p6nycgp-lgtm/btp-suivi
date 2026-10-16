import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { filtrerReferentiel, trierReferentiel, type LigneReferentiel } from "../recherche";

const lignes = [
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
    statut: "valide" as const,
    zone: "Abidjan",
  },
  {
    id: "2",
    code: "SAB-01",
    designation: "Sable",
    categorie: "Materiaux de base",
    unite: "m3",
    prix_unitaire: 6500,
    source: "Guide",
    date_source: "2026-05-01",
    date_validite: "2027-05-01",
    statut: "valide" as const,
    zone: "Yamoussoukro",
  },
  {
    id: "3",
    code: "ACIER-01",
    designation: "Acier HA",
    categorie: "Acier",
    unite: "t",
    prix_unitaire: 950000,
    source: "Devis",
    date_source: "2026-07-01",
    date_validite: "2027-07-01",
    statut: "a_verifier" as const,
    zone: "Abidjan",
  } as LigneReferentiel,
] as LigneReferentiel[];

describe("recherche et filtrage referentiel (REF-07)", () => {
  it("filtre par categorie", () => {
    const res = filtrerReferentiel(lignes, { categorie: "Acier" });
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0].id, "3");
  });

  it("filtre par zone", () => {
    const res = filtrerReferentiel(lignes, { zone: "Yamoussoukro" });
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0].id, "2");
  });

  it("filtre par texte", () => {
    const res = filtrerReferentiel(lignes, { texte: "ciment" });
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0].id, "1");
  });

  it("filtre par date min", () => {
    const res = filtrerReferentiel(lignes, { dateMin: "2026-06-01" });
    assert.strictEqual(res.length, 2);
  });

  it("trie par prix ascendant", () => {
    const res = trierReferentiel(lignes, "prix_unitaire", "asc");
    assert.strictEqual(res[0].id, "1");
    assert.strictEqual(res[2].id, "3");
  });
});