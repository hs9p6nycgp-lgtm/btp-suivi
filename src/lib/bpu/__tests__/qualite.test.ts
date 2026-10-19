import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  cleDesignation,
  detecterAmbiguitesDevis,
  detecterDoublons,
  detecterEcarts,
  detecterQuasiDoublons,
  memeDesignation,
  resumeQualite,
  type LigneBpu,
} from "../qualite.ts";

function ligne(partial: Partial<LigneBpu> = {}): LigneBpu {
  return {
    id: "b1",
    code: null,
    designation: "Ciment CPJ 42,5 - sac 50kg",
    unite: "sac",
    prix_unitaire: 4500,
    source: "Fournisseur Abidjan",
    date_source: "2026-10-01",
    statut: "valide",
    ...partial,
  };
}

describe("qualité de la base de prix (T-LOG-40)", () => {
  describe("désignation normalisée", () => {
    it("reconnait deux écritures du même produit", () => {
      assert.strictEqual(memeDesignation("Ciment CPJ 42,5 - sac 50kg", "Ciment CPJ 42,5 (sac 50 kg)"), true);
      assert.strictEqual(memeDesignation("Enrobé à chaud", "Enrobe"), false);
      assert.strictEqual(cleDesignation("Latérite 0/15"), "laterite0 15");
    });
  });

  describe("doublons", () => {
    it("détecte deux lignes du même produit et de la même unité", () => {
      const groupes = detecterDoublons([
        ligne({ id: "1", prix_unitaire: 4500, unite: "sac" }),
        ligne({ id: "2", prix_unitaire: 4800, unite: "sac 50 kg", statut: "a_verifier" }),
      ]);
      assert.strictEqual(groupes.length, 1);
      assert.strictEqual(groupes[0].lignes.length, 2);
      // Écart de 300 sur 4 500 = 6,67 %
      assert.ok(Math.abs(groupes[0].ecartPct - 6.667) < 0.01);
    });

    it("regroupe les unités équivalentes (t et tonne)", () => {
      const groupes = detecterDoublons([
        ligne({ id: "1", designation: "Enrobé à chaud", unite: "t", prix_unitaire: 95000 }),
        ligne({ id: "2", designation: "Enrobé à chaud", unite: "tonne", prix_unitaire: 95000 }),
      ]);
      assert.strictEqual(groupes.length, 1);
      assert.strictEqual(groupes[0].lignes.length, 2);
    });

    it("conserve la ligne la plus complète", () => {
      const groupes = detecterDoublons([
        ligne({ id: "1", prix_unitaire: 4800, source: null, date_source: null, statut: "a_verifier" }),
        ligne({ id: "2", prix_unitaire: 4500, code: "CIM-01" }),
      ]);
      assert.strictEqual(groupes[0].ligneRetenue?.id, "2");
    });

    it("ignore les produits uniques", () => {
      assert.strictEqual(detecterDoublons([ligne()]).length, 0);
    });
  });

  describe("écarts de prix à arbitrer", () => {
    it("signale l'enrobé à 35 000 et 95 000 FCFA/t", () => {
      const ecarts = detecterEcarts([
        ligne({ id: "1", designation: "Enrobé à chaud", unite: "tonne", prix_unitaire: 35000, statut: "valide" }),
        ligne({ id: "2", designation: "Enrobé", unite: "t", prix_unitaire: 95000, statut: "a_verifier" }),
      ]);
      assert.strictEqual(ecarts.length, 1);
      // Écart de 60 000 sur 35 000 = 171 %
      assert.ok(Math.abs(ecarts[0].ecartPct - 171.4) < 0.1);
      assert.strictEqual(ecarts[0].prixMin, 35000);
      assert.strictEqual(ecarts[0].prixMax, 95000);
    });

    it("ne compare pas des prix dans des unités différentes", () => {
      const ecarts = detecterEcarts([
        ligne({ id: "1", designation: "Agglo plein 20cm", unite: "u", prix_unitaire: 800 }),
        ligne({ id: "2", designation: "Agglo plein 20 cm CPA 42,5", unite: "m2", prix_unitaire: 19428 }),
      ]);
      assert.strictEqual(ecarts.length, 0);
    });

    it("respecte le seuil d'écart", () => {
      const ecarts = detecterEcarts(
        [
          ligne({ id: "1", designation: "Sable", prix_unitaire: 40000 }),
          ligne({ id: "2", designation: "Sable", prix_unitaire: 41000 }),
        ],
        25,
      );
      assert.strictEqual(ecarts.length, 0);
    });
  });

  describe("quasi-doublons", () => {
    it("signale un même produit écrit avec des unités différentes", () => {
      const quasi = detecterQuasiDoublons([
        ligne({ id: "1", designation: "Ciment CPJ 42,5", unite: "t", prix_unitaire: 95000 }),
        ligne({ id: "2", designation: "Ciment CPJ 42,5", unite: "tonne", prix_unitaire: 95000 }),
      ]);
      assert.strictEqual(quasi.length, 1);
      assert.strictEqual(quasi[0].lignes.length, 2);
    });

    it("ignore deux lignes de même produit et même unité (déjà un doublon)", () => {
      const quasi = detecterQuasiDoublons([
        ligne({ id: "1", designation: "Enrobé à chaud", unite: "t", prix_unitaire: 95000 }),
        ligne({ id: "2", designation: "Enrobé à chaud", unite: "t", prix_unitaire: 95000 }),
      ]);
      assert.strictEqual(quasi.length, 0);
    });

    it("ne confond pas avec un écart de prix", () => {
      const quasi = detecterQuasiDoublons([
        ligne({ id: "1", designation: "Enrobé à chaud", unite: "t", prix_unitaire: 35000 }),
        ligne({ id: "2", designation: "Enrobé à chaud", unite: "tonne", prix_unitaire: 95000 }),
      ]);
      assert.strictEqual(quasi.length, 0);
    });
  });

  describe("ambiguïtés de devis", () => {
    it("signale une ligne de devis qui trouve plusieurs prix concurrents", () => {
      const ambiguites = detecterAmbiguitesDevis(
        [{ id: "route", lignes: [{ code: "R-01", designation: "Enrobé", keywords: ["enrobe"] }] }],
        [
          ligne({ id: "1", designation: "Enrobé à chaud", prix_unitaire: 35000 }),
          ligne({ id: "2", designation: "Enrobe", prix_unitaire: 95000 }),
        ],
      );
      assert.strictEqual(ambiguites.length, 1);
      assert.strictEqual(ambiguites[0].prixConcurrents, true);
      assert.strictEqual(ambiguites[0].correspondances.length, 2);
    });

    it("ne signale rien quand les prix concordent", () => {
      const ambiguites = detecterAmbiguitesDevis(
        [{ id: "route", lignes: [{ code: "R-01", designation: "Enrobé", keywords: ["enrobe"] }] }],
        [
          ligne({ id: "1", designation: "Enrobé à chaud", prix_unitaire: 95000 }),
          ligne({ id: "2", designation: "Enrobe", prix_unitaire: 95000 }),
        ],
      );
      assert.strictEqual(ambiguites.length, 1);
      assert.strictEqual(ambiguites[0].prixConcurrents, false);
    });
  });

  describe("résumé", () => {
    it("compte les doublons, les écarts et les lignes concernées", () => {
      const lignes = [
        ligne({ id: "1", designation: "Enrobé", unite: "t", prix_unitaire: 35000 }),
        ligne({ id: "2", designation: "Enrobé", unite: "tonne", prix_unitaire: 95000 }),
        ligne({ id: "3", designation: "Ciment", unite: "sac", prix_unitaire: 4500 }),
        ligne({ id: "4", designation: "Ciment", unite: "sac 50 kg", prix_unitaire: 4800 }),
      ];
      const resume = resumeQualite(detecterDoublons(lignes), detecterEcarts(lignes));
      assert.strictEqual(resume.doublons, 2);
      assert.strictEqual(resume.ecarts, 1);
      assert.strictEqual(resume.lignesConcernees, 4);
    });
  });
});
