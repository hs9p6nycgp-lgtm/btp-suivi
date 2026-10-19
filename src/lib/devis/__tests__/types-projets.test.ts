// Verifie la correspondance entre les 100 types de chantier (CHA-01)
// et les modeles de devis detailles (src/lib/devis/types-projets.ts).

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  TEMPLATE_PAR_TYPE_DE_CHANTIER,
  templatePourTypeDeChantier,
  typesPourTemplate,
} from "../types-projets.ts";
import { templates } from "../templates.ts";
import { TYPES_DETAILLES } from "../../chantiers/types.ts";

describe("types de chantier -> modeles de devis", () => {
  it("les 100 types de chantier ont chacun un modele de devis", () => {
    assert.equal(TYPES_DETAILLES.length, 100);
    for (const t of TYPES_DETAILLES) {
      const id = templatePourTypeDeChantier(t.value);
      assert.ok(id, `pas de modele de devis pour ${t.value}`);
    }
  });

  it("la table de correspondance ne contient que des types connus", () => {
    const connus = new Set(TYPES_DETAILLES.map((t) => t.value));
    for (const value of Object.keys(TEMPLATE_PAR_TYPE_DE_CHANTIER)) {
      assert.ok(connus.has(value), `type inconnu dans la table : ${value}`);
    }
  });

  it("chaque correspondance pointe vers un modele de devis existant", () => {
    const ids = new Set(templates.map((t) => t.id));
    for (const [type, id] of Object.entries(TEMPLATE_PAR_TYPE_DE_CHANTIER)) {
      assert.ok(ids.has(id), `${type} -> ${id} n'existe pas`);
    }
  });

  it("chaque modele de devis est atteignable depuis au moins un type", () => {
    for (const t of templates) {
      assert.ok(
        typesPourTemplate(t.id).length > 0,
        `modele de devis jamais propose : ${t.id}`,
      );
    }
  });

  it("un type inconnu renvoie null (pas de plantage)", () => {
    assert.equal(templatePourTypeDeChantier("type_inexistant"), null);
    assert.equal(templatePourTypeDeChantier(""), null);
  });
});
