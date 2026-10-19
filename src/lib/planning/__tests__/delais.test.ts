import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { delaiTache, syntheseRetards } from "../delais.ts";

const reference = new Date(2026, 9, 19); // 19/10/2026

describe("retards du planning (PLA-04)", () => {
  it("signale une tâche non terminée dont la fin prévue est dépassée", () => {
    const delai = delaiTache(
      { statut: "en_cours", date_prevue_fin: "2026-10-15" },
      reference,
    );
    assert.equal(delai.etat, "en_retard");
    assert.equal(delai.retardJours, 4);
    assert.equal(delai.libelle, "En retard de 4 j");
  });

  it("annonce les jours restants d'une tâche dans les temps", () => {
    const delai = delaiTache(
      { statut: "a_faire", date_prevue_fin: "2026-10-25" },
      reference,
    );
    assert.equal(delai.etat, "a_lheure");
    assert.equal(delai.joursRestants, 6);
    assert.equal(delai.retardJours, 0);
  });

  it("calcule le retard d'une tâche terminée après sa date prévue", () => {
    const delai = delaiTache(
      { statut: "termine", date_prevue_fin: "2026-10-15", date_reelle_fin: "2026-10-20" },
      reference,
    );
    assert.equal(delai.etat, "termine_en_retard");
    assert.equal(delai.retardJours, 5);
    assert.equal(delai.libelle, "Terminée avec 5 j de retard");
  });

  it("valorise une tâche terminée en avance ou à l'heure", () => {
    const aLheure = delaiTache(
      { statut: "termine", date_prevue_fin: "2026-10-20", date_reelle_fin: "2026-10-20" },
      reference,
    );
    assert.equal(aLheure.etat, "termine_a_lheure");
    assert.equal(aLheure.libelle, "Terminée à l'heure");

    const enAvance = delaiTache(
      { statut: "termine", date_prevue_fin: "2026-10-20", date_reelle_fin: "2026-10-18" },
      reference,
    );
    assert.equal(enAvance.libelle, "Terminée 2 j avant");
  });

  it("gère les cas particuliers (annulée, sans date)", () => {
    assert.equal(delaiTache({ statut: "annule" }, reference).etat, "annule");
    assert.equal(delaiTache({ statut: "a_faire" }, reference).etat, "sans_date");
  });

  it("résume les retards du planning", () => {
    const synthese = syntheseRetards(
      [
        { statut: "en_cours", date_prevue_fin: "2026-10-15" },
        { statut: "a_faire", date_prevue_fin: "2026-10-25" },
        { statut: "termine", date_prevue_fin: "2026-10-15", date_reelle_fin: "2026-10-22" },
        { statut: "termine", date_prevue_fin: "2026-10-18", date_reelle_fin: "2026-10-18" },
      ],
      reference,
    );
    assert.equal(synthese.total, 4);
    assert.equal(synthese.terminees, 2);
    assert.equal(synthese.enRetard, 2);
    assert.equal(synthese.maxRetard, 7);
    assert.ok(synthese.libelle.includes("2 tâche(s) en retard"));
  });
});
