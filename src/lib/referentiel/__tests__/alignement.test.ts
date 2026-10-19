import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  entreeHistoriquePour,
  planifierAlignement,
  prixComplet,
  raisonPrixIncomplet,
  statutDuPrix,
  trierParPriorite,
  type LigneBpu,
  type LigneReferentiel,
} from "../alignement.ts";

function bpu(partial: Partial<LigneBpu> = {}): LigneBpu {
  return {
    id: "b1",
    code: "CIM-01",
    designation: "Ciment",
    unite: "sac",
    prix_unitaire: 4500,
    source: "Fournisseur Abidjan",
    date_source: "2026-10-01",
    date_validite: null,
    statut: "valide",
    ...partial,
  };
}

function ref(partial: Partial<LigneReferentiel> = {}): LigneReferentiel {
  return {
    id: "r1",
    code: "CIM-01",
    designation: "Ciment",
    categorie: "Ciment",
    unite: "sac",
    prix_unitaire: 4500,
    source: "Fournisseur Abidjan",
    date_source: "2026-10-01",
    date_validite: null,
    statut: "valide",
    zone: null,
    ...partial,
  };
}

describe("alignement base de prix / referentiel (REF-01, REF-03, REF-04)", () => {
  describe("REF-04 : source et date obligatoires", () => {
    it("considere un prix complet quand il a une source et une date", () => {
      assert.strictEqual(prixComplet({ source: "Fournisseur", date_source: "2026-10-01" }), true);
    });

    it("refuse un prix sans source ou sans date", () => {
      assert.strictEqual(prixComplet({ source: null, date_source: "2026-10-01" }), false);
      assert.strictEqual(prixComplet({ source: "Fournisseur", date_source: null }), false);
      assert.strictEqual(prixComplet({ source: "  ", date_source: "2026-10-01" }), false);
    });

    it("deduit le statut du prix", () => {
      assert.strictEqual(statutDuPrix({ source: "Fournisseur", date_source: "2026-10-01" }), "valide");
      assert.strictEqual(statutDuPrix({ source: "Fournisseur", date_source: null }), "a_verifier");
    });

    it("explique ce qui manque", () => {
      assert.strictEqual(raisonPrixIncomplet({ source: null, date_source: "2026-10-01" }), "Source manquante");
      assert.strictEqual(raisonPrixIncomplet({ source: "X", date_source: null }), "Date de source manquante");
      assert.strictEqual(raisonPrixIncomplet({ source: "X", date_source: "2026-10-01" }), null);
    });
  });

  describe("plan d'alignement", () => {
    it("cree les prix absents du referentiel", () => {
      const plan = planifierAlignement([bpu()], []);
      assert.strictEqual(plan.aCreer.length, 1);
      assert.strictEqual(plan.aMettreAJour.length, 0);
      assert.strictEqual(plan.inchanges, 0);
    });

    it("reconnait un prix deja identique", () => {
      const plan = planifierAlignement([bpu()], [ref()]);
      assert.strictEqual(plan.aCreer.length, 0);
      assert.strictEqual(plan.aMettreAJour.length, 0);
      assert.strictEqual(plan.inchanges, 1);
    });

    it("prepare la mise a jour et garde l'ancien prix (historique)", () => {
      const plan = planifierAlignement([bpu({ prix_unitaire: 5000 })], [ref({ prix_unitaire: 4500 })]);
      assert.strictEqual(plan.aMettreAJour.length, 1);
      assert.strictEqual(plan.aMettreAJour[0].ancienPrix, 4500);
      assert.strictEqual(plan.aMettreAJour[0].ligne.prix_unitaire, 5000);
    });

    it("reconnait par designation quand le code differe", () => {
      const plan = planifierAlignement(
        [bpu({ code: null, designation: "Ciment", prix_unitaire: 5000 })],
        [ref({ code: "AUTRE-99", designation: "Ciment", prix_unitaire: 4500 })],
      );
      assert.strictEqual(plan.aMettreAJour.length, 1);
      assert.strictEqual(plan.aMettreAJour[0].ancienPrix, 4500);
    });

    it("ne synchronise pas un prix sans source ni date", () => {
      const plan = planifierAlignement([bpu({ date_source: null })], []);
      assert.strictEqual(plan.aCreer.length, 0);
      assert.strictEqual(plan.nonSynchronisables.length, 1);
    });
  });

  describe("historique REF-03", () => {
    it("trace un changement de prix", () => {
      const entree = entreeHistoriquePour("r1", 4500, 5000, "Koffi", "Revision fournisseur");
      assert.ok(entree);
      assert.strictEqual(entree!.ancien_prix, 4500);
      assert.strictEqual(entree!.nouveau_prix, 5000);
      assert.strictEqual(entree!.referentiel_prix_id, "r1");
    });

    it("ne trace rien si le prix n'a pas change", () => {
      assert.strictEqual(entreeHistoriquePour("r1", 4500, 4500, "Koffi", null), null);
    });
  });

  describe("liste de travail", () => {
    it("classe d'abord les prix « a verifier », du plus cher au moins cher", () => {
      const lignes = [
        bpu({ id: "1", designation: "A", prix_unitaire: 100, statut: "a_verifier" }),
        bpu({ id: "2", designation: "B", prix_unitaire: 900, statut: "a_verifier" }),
        bpu({ id: "3", designation: "C", prix_unitaire: 5000, statut: "valide" }),
      ];
      const triees = trierParPriorite(lignes);
      assert.strictEqual(triees[0].designation, "B");
      assert.strictEqual(triees[1].designation, "A");
      assert.strictEqual(triees[2].designation, "C");
    });
  });
});
