import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { dureePlanningGenere, liensChaine, tachesDepuisDevis } from "../planification.ts";

describe("planning créé depuis un devis", () => {
  it("transforme les durées indicatives en tâches datées", () => {
    const taches = tachesDepuisDevis(
      [
        { nom: "Décapage", jours: 11 },
        { nom: "Couche de base", jours: 17 },
        { nom: "Compactage", jours: 14 },
      ],
      "2026-11-02",
    );
    assert.equal(taches.length, 3);
    assert.equal(taches[0].date_prevue_debut, "2026-11-02");
    assert.equal(taches[0].date_prevue_fin, "2026-11-13");
    assert.equal(taches[1].date_prevue_debut, "2026-11-13");
    assert.equal(taches[2].date_prevue_debut, "2026-11-30");
    assert.equal(dureePlanningGenere(taches), 42);
  });

  it("enchaîne les tâches sans interruption", () => {
    const taches = tachesDepuisDevis(
      [
        { nom: "A", jours: 5 },
        { nom: "B", jours: 5 },
      ],
      "2026-11-02",
    );
    assert.equal(taches[0].date_prevue_fin, taches[1].date_prevue_debut);
  });

  it("garantit une durée minimale d'un jour", () => {
    const taches = tachesDepuisDevis([{ nom: "Réception", jours: 0 }], "2026-11-02");
    assert.equal(taches[0].duree_jours, 1);
  });

  it("fonctionne sans date de départ (J0 relatif)", () => {
    const taches = tachesDepuisDevis([{ nom: "A", jours: 3 }], null);
    assert.equal(taches[0].date_prevue_debut, null);
    assert.equal(taches[0].date_prevue_fin, null);
  });

  it("produit les liens de la chaîne", () => {
    assert.deepEqual(liensChaine(4), [
      { predecesseur: 0, successeur: 1 },
      { predecesseur: 1, successeur: 2 },
      { predecesseur: 2, successeur: 3 },
    ]);
    assert.deepEqual(liensChaine(1), []);
    assert.deepEqual(liensChaine(0), []);
  });
});
