import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  TYPES_DETAILLES,
  estTypeDetailValide,
  groupesTypesDetailles,
  libelleTypeDetail,
  typesDetaillesPour,
} from "../types.ts";

describe("types de chantier detailles (CHA-01)", () => {
  it("propose des sous-types pour route et batiment", () => {
    assert.ok(typesDetaillesPour("route").length >= 3);
    assert.ok(typesDetaillesPour("batiment").length >= 3);
  });

  it("propose 100 sous-types : 50 route + 50 batiment", () => {
    assert.strictEqual(TYPES_DETAILLES.length, 100);
    assert.strictEqual(typesDetaillesPour("route").length, 50);
    assert.strictEqual(typesDetaillesPour("batiment").length, 50);
  });

  it("chaque sous-type est range dans une categorie", () => {
    for (const t of TYPES_DETAILLES) {
      assert.ok(t.categorie && t.categorie.length > 0, `categorie manquante : ${t.value}`);
    }
    const groupes = groupesTypesDetailles("route");
    assert.ok(groupes.length >= 3, "pas assez de categories pour route");
    const total = groupes.reduce((somme, g) => somme + g.types.length, 0);
    assert.strictEqual(total, 50);
  });

  it("n'a pas de valeur en double", () => {
    const valeurs = TYPES_DETAILLES.map((t) => t.value);
    assert.strictEqual(new Set(valeurs).size, valeurs.length);
  });

  it("valide un sous-type seulement pour son type parent", () => {
    assert.ok(estTypeDetailValide("route", "terrassement"));
    assert.ok(estTypeDetailValide("batiment", "gros_oeuvre"));
    assert.ok(!estTypeDetailValide("batiment", "terrassement"));
    assert.ok(!estTypeDetailValide("route", "gros_oeuvre"));
    // champ optionnel : null / vide toujours accepte
    assert.ok(estTypeDetailValide("route", null));
    assert.ok(estTypeDetailValide("batiment", ""));
  });

  it("affiche le libelle d'un sous-type", () => {
    assert.strictEqual(libelleTypeDetail("gros_oeuvre"), "Gros œuvre / ossature");
    assert.strictEqual(libelleTypeDetail("inconnu"), "inconnu");
    assert.strictEqual(libelleTypeDetail(null), "");
  });
});
