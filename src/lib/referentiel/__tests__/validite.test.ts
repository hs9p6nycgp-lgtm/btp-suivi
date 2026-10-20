import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { etatValiditePrix } from "../validite.ts";

const reference = new Date(2026, 9, 19); // 19/10/2026

describe("validité d'un prix unitaire (REF-04, REF-09)", () => {
  it("accepte un prix sourcé et récent", () => {
    const etat = etatValiditePrix(
      { source: "Marché SODECI 2026", date_source: "2026-09-01", date_validite: "2026-12-31", statut: "valide" },
      reference,
    );
    assert.equal(etat.etat, "sourcé");
    assert.equal(etat.source, "Marché SODECI 2026");
    assert.equal(etat.dateReference, "2026-12-31");
  });

  it("signale un prix sans source ni date", () => {
    const etat = etatValiditePrix({ statut: "valide" }, reference);
    assert.equal(etat.etat, "sans_source");
    assert.ok(etat.libelle.includes("REF-04"));
  });

  it("signale un prix encore marqué à vérifier", () => {
    const etat = etatValiditePrix(
      { source: "Estimation marché ivoirien", date_source: "2026-10-01", statut: "a_verifier" },
      reference,
    );
    assert.equal(etat.etat, "a_verifier");
  });

  it("demande de revalider un prix de plus de six mois", () => {
    const etat = etatValiditePrix(
      { source: " mercuriale 2025", date_source: "2026-01-10", statut: "valide" },
      reference,
    );
    assert.equal(etat.etat, "a_revalider");
    assert.ok(etat.libelle.includes("REF-09"));
    assert.ok((etat.ageJours ?? 0) > 180);
  });

  it("utilise la date de source quand il n'y a pas de date de validité", () => {
    const etat = etatValiditePrix(
      { source: "Facture 2026", date_source: "2026-10-01", statut: "valide" },
      reference,
    );
    assert.equal(etat.etat, "sourcé");
    assert.equal(etat.dateReference, "2026-10-01");
  });
});
