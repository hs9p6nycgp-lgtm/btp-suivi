import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  cleMateriau,
  planifierFusion,
  reconcilierMateriaux,
  suggestionsMateriaux,
} from "../materiaux.ts";

describe("identité des matériaux (APP-03, APP-04)", () => {
  describe("clé canonique", () => {
    it("normalise les écritures d'un même matériau", () => {
      assert.strictEqual(cleMateriau("Latérite"), "laterite");
      assert.strictEqual(cleMateriau("laterite"), "laterite");
      assert.strictEqual(cleMateriau("  LATÉRITE "), "laterite");
      assert.strictEqual(cleMateriau("LAT-01"), "lat-01");
      assert.strictEqual(cleMateriau("Ciment (sac 50 kg)"), "ciment-sac-50-kg");
    });

    it("renvoie une clé vide pour un matériau vide", () => {
      assert.strictEqual(cleMateriau(""), "");
      assert.strictEqual(cleMateriau(null), "");
    });
  });

  describe("réconciliation", () => {
    it("regroupe les écritures d'un même matériau", () => {
      const groupes = reconcilierMateriaux([
        { materiau: "Latérite" },
        { materiau: "laterite" },
        { materiau: "Latérite" },
        { materiau: "Sable" },
      ]);
      assert.strictEqual(groupes.length, 2);
      const laterite = groupes.find((g) => g.cle === "laterite");
      assert.ok(laterite);
      assert.strictEqual(laterite!.occurrences, 3);
      assert.strictEqual(laterite!.variantes.length, 2);
      // Le libelle affiché est l'écriture la plus fréquente.
      assert.strictEqual(laterite!.libelle, "Latérite");
    });

    it("ignore les matériaux vides", () => {
      const groupes = reconcilierMateriaux([{ materiau: "" }, { materiau: null }, { materiau: "Sable" }]);
      assert.strictEqual(groupes.length, 1);
      assert.strictEqual(groupes[0].cle, "sable");
    });
  });

  describe("suggestions de saisie", () => {
    it("propose le BPU, le DQE et les matériaux déjà livrés", () => {
      const suggestions = suggestionsMateriaux({
        bpu: ["Ciment", "Sable"],
        postes: ["Laterite", "Ciment"],
        livraisons: ["Gravier 0/15"],
      });
      const cles = suggestions.map((s) => s.cle);
      assert.ok(cles.includes("ciment"));
      assert.ok(cles.includes("laterite"));
      assert.ok(cles.includes("gravier-0-15"));
      // Pas de doublon pour le ciment (présent au BPU et au DQE).
      assert.strictEqual(cles.filter((c) => c === "ciment").length, 1);
    });

    it("donne la priorité au libellé du BPU", () => {
      const suggestions = suggestionsMateriaux({
        bpu: ["Ciment (sac 50 kg)"],
        postes: ["Ciment"],
      });
      const ciment = suggestions.find((s) => s.cle === "ciment-sac-50-kg");
      assert.ok(ciment);
      assert.strictEqual(ciment!.origine, "bpu");
    });
  });

  describe("fusion des doublons d'écriture", () => {
    it("prépare la réécriture sans supprimer de ligne", () => {
      const plan = planifierFusion(
        [
          { id: "1", materiau: "Latérite" },
          { id: "2", materiau: "laterite" },
          { id: "3", materiau: "Sable" },
        ],
        "laterite",
        "Latérite",
      );
      assert.strictEqual(plan.length, 1);
      assert.strictEqual(plan[0].id, "2");
      assert.strictEqual(plan[0].ancien, "laterite");
      assert.strictEqual(plan[0].nouveau, "Latérite");
    });
  });
});
