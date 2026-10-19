import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  clePoste,
  codePosteLibre,
  normaliserLibelle,
  preparerPostesDqe,
} from "../dqe.ts";

describe("alimentation du DQE depuis un devis", () => {
  it("compare les libellés sans tenir compte des accents ni de la casse", () => {
    assert.equal(normaliserLibelle("Enrobé à chaud"), "enrobe a chaud");
    assert.equal(clePoste("Enrobé à chaud", "t"), clePoste("enrobe a chaud", "T"));
    assert.notEqual(clePoste("Enrobé", "t"), clePoste("Enrobé", "m³"));
  });

  it("propose un code libre pour le DQE", () => {
    assert.equal(codePosteLibre([]), "DQE-01");
    assert.equal(codePosteLibre(["DQE-01", "DQE-07"]), "DQE-08");
    assert.equal(codePosteLibre(["A1", "B2"]), "DQE-01");
  });

  it("prépare les postes à créer depuis les lignes du devis", () => {
    const resultat = preparerPostesDqe(
      [
        { designation: "Décapage", unite: "m²", quantite: 8400, prix_unitaire: 467 },
        { designation: "Couche de base", unite: "m³", quantite: 2520, prix_unitaire: 18500 },
      ],
      [],
    );
    assert.equal(resultat.aEcrire.length, 2);
    assert.equal(resultat.aEcrire[0].code, "DQE-01");
    assert.equal(resultat.aEcrire[0].quantite_marche, 8400);
    assert.equal(resultat.aEcrire[0].prix_unitaire, 467);
    assert.equal(resultat.aEcrire[1].code, "DQE-02");
  });

  it("ne recrée pas un poste déjà présent au DQE", () => {
    const resultat = preparerPostesDqe(
      [{ designation: "Décapage", unite: "m²", quantite: 8400, prix_unitaire: 467 }],
      [{ id: "1", code: "DQE-01", designation: "décapage", unite: "M²", quantite_marche: 100, prix_unitaire: 500 }],
    );
    assert.equal(resultat.aEcrire.length, 0);
    assert.deepEqual(resultat.dejaPresents, ["Décapage"]);
  });

  it("écarte les lignes sans prix et celles sans quantité", () => {
    const resultat = preparerPostesDqe(
      [
        { designation: "Surface de chaussée", unite: "m²", quantite: 8400, prix_unitaire: 0 },
        { designation: "Marquage", unite: "m²", quantite: 0, prix_unitaire: 1500 },
      ],
      [],
    );
    assert.equal(resultat.aEcrire.length, 0);
    assert.deepEqual(resultat.sansPrix, ["Surface de chaussée"]);
    assert.deepEqual(resultat.sansQuantite, ["Marquage"]);
  });

  it("arrondit le prix unitaire au franc", () => {
    const resultat = preparerPostesDqe(
      [{ designation: "Enrobé", unite: "t", quantite: 966, prix_unitaire: 95000.6 }],
      [],
    );
    assert.equal(resultat.aEcrire[0].prix_unitaire, 95001);
  });
});
