// Tests des libellés d'alertes (src/lib/alertes.ts).

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { detailAlerte, libelleStatutAlerte, libelleTypeAlerte } from "../alertes.ts";

describe("libelleTypeAlerte", () => {
  it("traduit les types connus en français", () => {
    assert.equal(libelleTypeAlerte("quantite"), "Écart de quantité");
    assert.equal(libelleTypeAlerte("ecart_quantite"), "Écart de quantité");
    assert.equal(libelleTypeAlerte("budget"), "Dépassement de budget");
    assert.equal(libelleTypeAlerte("hse"), "Alerte sécurité (HSE)");
    assert.equal(libelleTypeAlerte("eprouvette"), "Échéance éprouvette béton");
  });

  it("traduit en anglais", () => {
    assert.equal(libelleTypeAlerte("quantite", "en"), "Quantity difference");
    assert.equal(libelleTypeAlerte("budget", "en"), "Budget overrun");
  });

  it("nettoie un type inconnu au lieu d'afficher la valeur brute", () => {
    assert.equal(libelleTypeAlerte("machin_bizarre"), "Machin bizarre");
  });
});

describe("libelleStatutAlerte", () => {
  it("traduit les statuts connus", () => {
    assert.equal(libelleStatutAlerte("ouverte"), "Ouverte");
    assert.equal(libelleStatutAlerte("acquittee"), "Acquittée");
    assert.equal(libelleStatutAlerte("cloturee"), "Clôturée");
    assert.equal(libelleStatutAlerte("ouverte", "en"), "Open");
  });

  it("nettoie un statut inconnu", () => {
    assert.equal(libelleStatutAlerte("en_attente"), "En attente");
  });
});

describe("detailAlerte", () => {
  it("formate un écart de quantité en pourcentage (français)", () => {
    assert.equal(
      detailAlerte({ type: "quantite", valeur: 12.5, seuil: 10 }),
      "Écart : +12,5 % · seuil : 10 %",
    );
    assert.equal(detailAlerte({ type: "quantite", valeur: -8, seuil: 10 }), "Écart : -8 % · seuil : 10 %");
  });

  it("formate un écart budgétaire en pourcentage", () => {
    assert.equal(detailAlerte({ type: "budget", valeur: 7.25, seuil: 5 }), "Écart : +7,3 % · seuil : 5 %");
  });

  it("formate en anglais", () => {
    assert.equal(
      detailAlerte({ type: "quantite", valeur: 12.5, seuil: 10 }, "en"),
      "Deviation: +12.5% · threshold: 10%",
    );
  });

  it("retombe sur un format générique pour un type inconnu", () => {
    assert.equal(detailAlerte({ type: "stock", valeur: 5, seuil: 2 }), "Valeur : 5 · seuil : 2");
  });
});
