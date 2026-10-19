import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  alertesDocuments,
  classerFournisseur,
  historiqueLivraisons,
  joursRestants,
  noteGlobale,
  noteMoyenneFournisseur,
  type DocumentFournisseur,
  type EvaluationFournisseur,
} from "../evaluation.ts";

function evaluation(partial: Partial<EvaluationFournisseur> = {}): EvaluationFournisseur {
  return {
    id: "e1",
    fournisseur_id: "f1",
    respect_delais: 4,
    conformite_livraisons: 5,
    ecarts_prix: 3,
    note_globale: null,
    commentaire: null,
    date_evaluation: "2026-10-01",
    ...partial,
  };
}

function document(partial: Partial<DocumentFournisseur> = {}): DocumentFournisseur {
  return {
    id: "d1",
    fournisseur_id: "f1",
    type: "assurance",
    libelle: "Assurance responsabilité civile",
    date_echeance: "2026-11-01",
    chemin: null,
    ...partial,
  };
}

describe("évaluation et documents des fournisseurs (FOU-05, FOU-06, FOU-07)", () => {
  describe("FOU-06 : évaluation", () => {
    it("calcule la note globale sur 5", () => {
      assert.strictEqual(noteGlobale(evaluation()), 4);
      assert.strictEqual(noteGlobale(evaluation({ respect_delais: 5, conformite_livraisons: 5, ecarts_prix: 4 })), 4.67);
    });

    it("ignore les critères non renseignés", () => {
      assert.strictEqual(noteGlobale(evaluation({ conformite_livraisons: null, ecarts_prix: null })), 4);
    });

    it("renvoie null sans aucun critère", () => {
      assert.strictEqual(
        noteGlobale(evaluation({ respect_delais: null, conformite_livraisons: null, ecarts_prix: null })),
        null,
      );
    });

    it("classe le fournisseur d'après sa note moyenne", () => {
      assert.strictEqual(classerFournisseur(4.7), "excellent");
      assert.strictEqual(classerFournisseur(4), "bon");
      assert.strictEqual(classerFournisseur(3), "moyen");
      assert.strictEqual(classerFournisseur(2), "a_surveiller");
      assert.strictEqual(classerFournisseur(null), null);
    });

    it("calcule la note moyenne d'un fournisseur", () => {
      const moyenne = noteMoyenneFournisseur([
        evaluation({ id: "1", note_globale: 4 }),
        evaluation({ id: "2", note_globale: 5 }),
      ]);
      assert.strictEqual(moyenne, 4.5);
    });
  });

  describe("FOU-07 : documents administratifs", () => {
    const reference = new Date("2026-10-19T00:00:00");

    it("compte les jours restants", () => {
      assert.strictEqual(joursRestants("2026-10-29", reference), 10);
      assert.strictEqual(joursRestants("2026-10-01", reference), -18);
      assert.strictEqual(joursRestants(null, reference), null);
    });

    it("alerte un document qui expire dans moins de 30 jours", () => {
      const alertes = alertesDocuments([document({ date_echeance: "2026-10-25" })], reference);
      assert.strictEqual(alertes.length, 1);
      assert.strictEqual(alertes[0].niveau, "bientot");
    });

    it("alerte un document expiré", () => {
      const alertes = alertesDocuments([document({ date_echeance: "2026-09-30" })], reference);
      assert.strictEqual(alertes.length, 1);
      assert.strictEqual(alertes[0].niveau, "expire");
    });

    it("ne signale pas un document valide", () => {
      const alertes = alertesDocuments([document({ date_echeance: "2027-06-01" })], reference);
      assert.strictEqual(alertes.length, 0);
    });
  });

  describe("FOU-05 : historique des livraisons", () => {
    it("regroupe les livraisons par fournisseur", () => {
      const historique = historiqueLivraisons([
        { fournisseur: "SODECI", quantite: 10, date_livraison: "2026-10-01" },
        { fournisseur: "SODECI", quantite: 5, date_livraison: "2026-10-15" },
        { fournisseur: "BETON CI", quantite: 20, date_livraison: "2026-09-20" },
        { fournisseur: null, quantite: 3, date_livraison: "2026-10-02" },
      ]);
      assert.strictEqual(historique.length, 2);
      const sod = historique.find((h) => h.fournisseur === "SODECI");
      assert.strictEqual(sod?.nombre, 2);
      assert.strictEqual(sod?.quantite, 15);
      assert.strictEqual(sod?.derniereLivraison, "2026-10-15");
    });
  });
});
