// Tests du calcul « quoi faire aujourd'hui » (src/lib/journal/actionsDuJour.ts).

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { actionsDuJour, nombreSansSaisie, type DonneesDuJour } from "../actionsDuJour.ts";

function donnees(partiel: Partial<DonneesDuJour> = {}): DonneesDuJour {
  return {
    chantiers: [{ id: "a", nom: "Route Abidjan", statut: "en_cours" }],
    chantiersAvecJournalAujourdhui: [],
    ...partiel,
  };
}

describe("actionsDuJour", () => {
  it("propose la saisie du jour pour un chantier en cours sans fiche", () => {
    const actions = actionsDuJour(donnees());
    assert.equal(actions.length, 1);
    assert.equal(actions[0].type, "saisie_journal");
    assert.equal(actions[0].priorite, 1);
    assert.equal(actions[0].chantierNom, "Route Abidjan");
    assert.equal(actions[0].lienHref, "/chantiers/a/journaux");
  });

  it("ne propose rien si la fiche du jour existe déjà", () => {
    assert.deepEqual(actionsDuJour(donnees({ chantiersAvecJournalAujourdhui: ["a"] })), []);
  });

  it("ignore les chantiers qui ne sont pas en cours", () => {
    const actions = actionsDuJour(
      donnees({
        chantiers: [
          { id: "a", nom: "Fini", statut: "cloture" },
          { id: "b", nom: "Préparation", statut: "en_preparation" },
        ],
      }),
    );
    assert.deepEqual(actions, []);
  });

  it("ajoute les non-conformités et alertes ouvertes, avec leur nombre", () => {
    const actions = actionsDuJour(
      donnees({
        chantiersAvecJournalAujourdhui: ["a"],
        nonConformitesOuvertes: { a: 3 },
        alertesOuvertes: { a: 1 },
      }),
    );
    assert.equal(actions.length, 2);
    assert.equal(actions[0].type, "non_conformites");
    assert.equal(actions[0].priorite, 2);
    assert.equal(actions[0].nb, 3);
    assert.match(actions[0].detail, /3 non-conformités ouvertes/);
    assert.equal(actions[1].type, "alertes");
    assert.equal(actions[1].priorite, 3);
    assert.equal(actions[1].nb, 1);
    assert.match(actions[1].detail, /1 alerte ouverte/);
  });

  it("trie par priorité puis par nom de chantier", () => {
    const actions = actionsDuJour({
      chantiers: [
        { id: "b", nom: "Bouaké", statut: "en_cours" },
        { id: "a", nom: "Abidjan", statut: "en_cours" },
      ],
      chantiersAvecJournalAujourdhui: [],
      nonConformitesOuvertes: { a: 1 },
    });
    assert.deepEqual(
      actions.map((action) => action.type),
      ["saisie_journal", "saisie_journal", "non_conformites"],
    );
    assert.deepEqual(
      actions.map((action) => action.chantierNom),
      ["Abidjan", "Bouaké", "Abidjan"],
    );
  });
});

describe("nombreSansSaisie", () => {
  it("compte les chantiers en cours sans fiche du jour", () => {
    assert.equal(
      nombreSansSaisie({
        chantiers: [
          { id: "a", nom: "A", statut: "en_cours" },
          { id: "b", nom: "B", statut: "en_cours" },
          { id: "c", nom: "C", statut: "cloture" },
        ],
        chantiersAvecJournalAujourdhui: ["b"],
      }),
      1,
    );
  });
});
