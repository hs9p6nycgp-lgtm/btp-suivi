import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  calculerNoteFournisseur,
  meilleurDevis,
  validerConditionsCommerciales,
  validerFournisseur,
} from "../fournisseur";

describe("module Fournisseurs (FOU-01, FOU-02, FOU-04, FOU-06)", () => {
  describe("FOU-01 : validation de la fiche", () => {
    it("accepte une fiche complete", () => {
      assert.strictEqual(validerFournisseur("ACME BTP", "materiaux"), null);
    });

    it("refuse une raison sociale vide", () => {
      assert.strictEqual(validerFournisseur("", "materiaux"), "la raison sociale est obligatoire");
    });

    it("refuse un type inconnu", () => {
      assert.strictEqual(validerFournisseur("ACME", "inconnu"), "le type de fournisseur est invalide");
    });
  });

  describe("FOU-02 : conditions commerciales", () => {
    it("accepte des conditions valides", () => {
      assert.strictEqual(validerConditionsCommerciales(30, 90), null);
    });

    it("refuse un delai negatif", () => {
      assert.strictEqual(validerConditionsCommerciales(-1, 90), "le delai de paiement ne peut pas etre negatif");
    });

    it("refuse une validite negative", () => {
      assert.strictEqual(validerConditionsCommerciales(30, -5), "la validite des prix ne peut pas etre negative");
    });

    it("accepte des valeurs nulles", () => {
      assert.strictEqual(validerConditionsCommerciales(null, null), null);
    });
  });

  describe("FOU-04 : comparaison de devis", () => {
    it("renvoie null si aucun devis", () => {
      assert.strictEqual(meilleurDevis([]), null);
    });

    it("choisit le devis le moins cher", () => {
      const devis = [
        { fournisseur: "A", prix_unitaire: 1000, delai_livraison_jours: 5, conditions: null },
        { fournisseur: "B", prix_unitaire: 800, delai_livraison_jours: 10, conditions: null },
      ];
      const res = meilleurDevis(devis);
      assert.ok(res);
      assert.strictEqual(res!.index, 1);
    });

    it("departage par le delai en cas d'egalite de prix", () => {
      const devis = [
        { fournisseur: "A", prix_unitaire: 1000, delai_livraison_jours: 10, conditions: null },
        { fournisseur: "B", prix_unitaire: 1000, delai_livraison_jours: 5, conditions: null },
      ];
      const res = meilleurDevis(devis);
      assert.ok(res);
      assert.strictEqual(res!.index, 1);
    });

    it("gere un seul devis", () => {
      const devis = [{ fournisseur: "A", prix_unitaire: 1000, delai_livraison_jours: 5, conditions: null }];
      const res = meilleurDevis(devis);
      assert.ok(res);
      assert.strictEqual(res!.index, 0);
    });
  });

  describe("FOU-06 : note fournisseur", () => {
    it("calcule la moyenne sur 5", () => {
      assert.strictEqual(
        calculerNoteFournisseur({ respect_delais: 4, conformite_livraisons: 5, ecarts_prix: 3 }),
        4,
      );
    });

    it("ignore les criteres non renseignes", () => {
      assert.strictEqual(
        calculerNoteFournisseur({ respect_delais: 4, conformite_livraisons: null, ecarts_prix: null }),
        4,
      );
    });

    it("renvoie 0 si aucun critere", () => {
      assert.strictEqual(
        calculerNoteFournisseur({ respect_delais: null, conformite_livraisons: null, ecarts_prix: null }),
        0,
      );
    });
  });
});