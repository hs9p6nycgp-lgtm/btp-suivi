import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  arrondirFcfa,
  calculerDevisMur,
  calculerLigneMur,
  choisirQuantite,
  convertirQuantite,
  normaliserUnite,
  type PosteMur,
} from "../mur.ts";

describe("calculateur de murs (T-LOG-41)", () => {
  describe("unités", () => {
    it("normalise les unités du BPU", () => {
      assert.strictEqual(normaliserUnite("M3"), "m3");
      assert.strictEqual(normaliserUnite("m³"), "m3");
      assert.strictEqual(normaliserUnite("m²"), "m2");
      assert.strictEqual(normaliserUnite("sacs"), "sac");
      assert.strictEqual(normaliserUnite("Tonnes"), "t");
      assert.strictEqual(normaliserUnite("unité"), "u");
      assert.strictEqual(normaliserUnite("Kg"), "kg");
    });

    it("convertit les unités de même nature", () => {
      assert.strictEqual(convertirQuantite(100, "kg", "t"), 0.1);
      assert.strictEqual(convertirQuantite(1, "m3", "l"), 1000);
      assert.strictEqual(convertirQuantite(5, "m3", "m3"), 5);
    });

    it("refuse une conversion impossible", () => {
      assert.strictEqual(convertirQuantite(1, "m3", "m2"), null);
      assert.strictEqual(convertirQuantite(1, "kg", "m3"), null);
    });

    it("retient la quantité exprimée dans l'unité du prix", () => {
      const retenue = choisirQuantite(
        [
          { unite: "kg", valeur: 106.98 },
          { unite: "sac", valeur: 2.1396 },
        ],
        "sac",
      );
      assert.ok(retenue);
      assert.strictEqual(retenue!.quantite, 2.1396);
      assert.strictEqual(retenue!.unite, "sac");
      assert.strictEqual(retenue!.convertie, false);
    });
  });

  describe("ligne de devis", () => {
    const posteCiment: PosteMur = {
      cle: "ciment",
      libelle: "Ciment",
      quantites: [
        { unite: "kg", valeur: 106.98 },
        { unite: "sac", valeur: 2.1396 },
      ],
      prixUnitaire: 4800,
      unitePrix: "sac",
    };

    it("convertit la quantité dans l'unité du prix avant de multiplier", () => {
      const ligne = calculerLigneMur(posteCiment);
      assert.strictEqual(ligne.quantite, 2.1396);
      assert.strictEqual(ligne.unite, "sac");
      assert.strictEqual(ligne.total, 10270); // 2,1396 sac × 4 800
    });

    it("n'applique pas un prix quand les unités sont incompatibles", () => {
      const ligne = calculerLigneMur({ ...posteCiment, unitePrix: "m3" });
      assert.strictEqual(ligne.statut, "unite-incompatible");
      assert.strictEqual(ligne.total, null);
      assert.ok(ligne.message);
    });

    it("signale un poste sans prix", () => {
      const ligne = calculerLigneMur({ ...posteCiment, prixUnitaire: null });
      assert.strictEqual(ligne.statut, "sans-prix");
      assert.strictEqual(ligne.total, null);
    });

    it("arrondit les montants à l'entier (FCFA sans décimale)", () => {
      assert.strictEqual(arrondirFcfa(9662799.56), 9662800);
      assert.strictEqual(arrondirFcfa(1497.4), 1497);
    });
  });

  describe("fiche de recette — mur 20 × 3 m, épaisseur 0,20 m", () => {
    const resultat = calculerDevisMur({
      longueur: 20,
      hauteur: 3,
      epaisseur: 0.2,
      ouverturesPct: 5,
      pertesPct: 5,
      prix: { agglos: 500, ciment: 4800, sable: 25000 },
      unites: { agglos: "u", ciment: "sac", sable: "m3" },
    });

    it("les volumes sont exacts", () => {
      assert.strictEqual(resultat.surfaceBrute, 60);
      assert.strictEqual(resultat.surfaceNette, 57);
      assert.strictEqual(resultat.volumeMur, 11.4);
      assert.strictEqual(resultat.nbBlocs, 1497);
      assert.ok(Math.abs(resultat.volumeMortier - 0.38208) < 0.0001);
      assert.ok(Math.abs(resultat.cimentKg - 106.9824) < 0.01);
      assert.ok(Math.abs(resultat.sableM3 - 0.305664) < 0.0001);
    });

    it("le ciment est chiffré en sacs, pas en kilos (correction du total × 50)", () => {
      const ligne = resultat.lignes.find((l) => l.cle === "ciment");
      assert.ok(ligne);
      // 106,9824 kg = 2,139648 sac de 50 kg → 2,139648 × 4 800 = 10 270 FCFA.
      // (L'audit affichait 10 272 en arrondissant d'abord les kilos à 107.)
      assert.ok(Math.abs(ligne!.quantite! - 2.139648) < 1e-9);
      assert.strictEqual(ligne!.total, 10270);
    });

    it("les autres postes sont valorisés dans leur unité", () => {
      const agglo = resultat.lignes.find((l) => l.cle === "agglos");
      const sable = resultat.lignes.find((l) => l.cle === "sable");
      assert.strictEqual(agglo!.total, 1497 * 500);
      assert.strictEqual(sable!.total, Math.round(0.305664 * 25000));
    });

    it("le total est un entier, en FCFA", () => {
      assert.strictEqual(resultat.totalMateriaux, arrondirFcfa(resultat.totalMateriaux));
      assert.strictEqual(
        resultat.totalMateriaux,
        1497 * 500 + 10270 + Math.round(0.305664 * 25000),
      );
    });
  });

  describe("fiche de recette — mur de 400 m² (20 × 20 m)", () => {
    const resultat = calculerDevisMur({
      longueur: 20,
      hauteur: 20,
      epaisseur: 0.2,
      ouverturesPct: 5,
      pertesPct: 5,
      prix: { ciment: 4800 },
      unites: { ciment: "sac" },
    });

    it("le ciment vaut 69 458 FCFA (et non 3 472 896)", () => {
      const ligne = resultat.lignes.find((l) => l.cle === "ciment");
      assert.ok(ligne);
      assert.strictEqual(ligne!.total, 69458);
      assert.notStrictEqual(ligne!.total, 3472896);
    });
  });

  describe("autres unités de prix", () => {
    it("valorise un ciment au kilo sans conversion", () => {
      const resultat = calculerDevisMur({
        longueur: 20,
        hauteur: 3,
        epaisseur: 0.2,
        prix: { ciment: 800 },
        unites: { ciment: "kg" },
      });
      const ligne = resultat.lignes.find((l) => l.cle === "ciment");
      assert.ok(ligne);
      assert.strictEqual(ligne!.unite, "kg");
      assert.strictEqual(ligne!.total, Math.round(106.9824 * 800));
    });

    it("valorise un sable au tonneau", () => {
      const resultat = calculerDevisMur({
        longueur: 20,
        hauteur: 3,
        epaisseur: 0.2,
        prix: { sable: 20000 },
        unites: { sable: "t" },
      });
      const ligne = resultat.lignes.find((l) => l.cle === "sable");
      assert.ok(ligne);
      assert.strictEqual(ligne!.unite, "t");
      assert.strictEqual(ligne!.total, Math.round(0.305664 * 1.6 * 20000));
    });

    it("signale les postes non valorisables", () => {
      const resultat = calculerDevisMur({
        longueur: 20,
        hauteur: 3,
        epaisseur: 0.2,
        prix: { enduit: 5000 },
        unites: { enduit: "m3" },
      });
      assert.strictEqual(resultat.posteNonValorise, true);
      const ligne = resultat.lignes.find((l) => l.cle === "enduit");
      assert.strictEqual(ligne!.statut, "unite-incompatible");
    });
  });
});
