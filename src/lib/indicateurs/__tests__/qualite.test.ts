// Tests des indicateurs qualité (src/lib/indicateurs/qualite.ts).

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { calculerIndicateursQualite } from "../qualite.ts";

describe("calculerIndicateursQualite", () => {
  it("compte les fiches ouvertes et traitées", () => {
    const indicateurs = calculerIndicateursQualite([
      { statut: "ouverte", created_at: "2026-10-01" },
      { statut: "en_cours", created_at: "2026-10-02" },
      { statut: "cloturee", created_at: "2026-10-01", date_cloture: "2026-10-05" },
      { statut: "rejetee", created_at: "2026-10-03" },
    ]);
    assert.equal(indicateurs.ouvertes, 2);
    assert.equal(indicateurs.traitees, 2);
    assert.equal(indicateurs.total, 4);
    assert.equal(indicateurs.tauxTraitement, 50);
  });

  it("calcule le délai moyen de clôture en jours", () => {
    const indicateurs = calculerIndicateursQualite([
      { statut: "cloturee", created_at: "2026-10-01", date_cloture: "2026-10-05" },
      { statut: "cloturee", created_at: "2026-10-01", date_cloture: "2026-10-07" },
    ]);
    assert.equal(indicateurs.delaiMoyenJours, 5);
  });

  it("ignore les fiches sans date exploitable", () => {
    const indicateurs = calculerIndicateursQualite([
      { statut: "cloturee" },
      { statut: "cloturee", created_at: "2026-10-01" },
    ]);
    assert.equal(indicateurs.traitees, 2);
    assert.equal(indicateurs.delaiMoyenJours, null);
  });

  it("reste cohérent sans aucune fiche", () => {
    const indicateurs = calculerIndicateursQualite([]);
    assert.equal(indicateurs.total, 0);
    assert.equal(indicateurs.tauxTraitement, 0);
    assert.equal(indicateurs.delaiMoyenJours, null);
  });

  it("compte 100 % de traitement quand tout est clôturé", () => {
    const indicateurs = calculerIndicateursQualite([
      { statut: "cloturee", created_at: "2026-10-01", date_cloture: "2026-10-02" },
    ]);
    assert.equal(indicateurs.tauxTraitement, 100);
  });
});
