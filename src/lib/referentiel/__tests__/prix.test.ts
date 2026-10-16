import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  construireEntreeHistorique,
  estPrixObsolete,
  lignesAffecteesParMiseAJour,
} from "../prix";

describe("referentiel de prix (REF-03, REF-06, REF-09)", () => {
  describe("REF-09 : prix obsolete", () => {
    it("considere obsolete un prix sans date", () => {
      assert.strictEqual(estPrixObsolete(null), true);
    });

    it("considere obsolete un prix de plus de 6 mois", () => {
      const reference = new Date("2026-10-16T00:00:00");
      assert.strictEqual(estPrixObsolete("2026-01-01", reference), true);
    });

    it("considere a jour un prix recent", () => {
      const reference = new Date("2026-10-16T00:00:00");
      assert.strictEqual(estPrixObsolete("2026-09-01", reference), false);
    });

    it("respecte un seuil personnalise", () => {
      const reference = new Date("2026-10-16T00:00:00");
      assert.strictEqual(estPrixObsolete("2026-08-01", reference, 1), true);
      assert.strictEqual(estPrixObsolete("2026-08-01", reference, 4), false);
    });
  });

  describe("REF-03 : historique des prix", () => {
    it("construit une entree si le prix change", () => {
      const entree = construireEntreeHistorique("p1", 1000, 1200, "admin", "mise a jour");
      assert.ok(entree);
      assert.strictEqual(entree!.ancien_prix, 1000);
      assert.strictEqual(entree!.nouveau_prix, 1200);
    });

    it("renvoie null si le prix est identique", () => {
      assert.strictEqual(construireEntreeHistorique("p1", 1000, 1000, "admin", null), null);
    });
  });

  describe("REF-06 : lignes affectees par une mise a jour", () => {
    it("trouve les lignes par code identique", () => {
      const lignes = [
        { id: "a", code: "CIM-01", designation: "Ciment" },
        { id: "b", code: "SAB-01", designation: "Sable" },
      ];
      const affectees = lignesAffecteesParMiseAJour("CIM-01", "Ciment", lignes);
      assert.strictEqual(affectees.length, 1);
      assert.strictEqual(affectees[0].id, "a");
    });

    it("trouve les lignes par designation si le code differe", () => {
      const lignes = [
        { id: "a", code: null, designation: "Ciment" },
        { id: "b", code: null, designation: "Sable" },
      ];
      const affectees = lignesAffecteesParMiseAJour(null, "Ciment", lignes);
      assert.strictEqual(affectees.length, 1);
      assert.strictEqual(affectees[0].id, "a");
    });

    it("renvoie vide si aucune correspondance", () => {
      const lignes = [{ id: "a", code: "X", designation: "Y" }];
      assert.strictEqual(lignesAffecteesParMiseAJour("Z", "W", lignes).length, 0);
    });
  });
});