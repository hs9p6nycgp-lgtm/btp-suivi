import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  STATUTS_RECEPTION,
  estStatutReception,
  libelleStatutChantier,
  receptionAutorisee,
} from "../statuts.ts";

describe("statuts du chantier (RG-05)", () => {
  it("traduit les statuts en français", () => {
    assert.equal(libelleStatutChantier("en_cours"), "En cours");
    assert.equal(libelleStatutChantier("receptionne_provisoirement"), "Réceptionné provisoirement");
    assert.equal(libelleStatutChantier("inconnu"), "Inconnu");
  });

  it("reconnaît les statuts de réception", () => {
    assert.equal(estStatutReception("cloture"), true);
    assert.equal(estStatutReception("receptionne_provisoirement"), true);
    assert.equal(estStatutReception("en_cours"), false);
    assert.deepEqual(STATUTS_RECEPTION, ["receptionne_provisoirement", "cloture"]);
  });

  it("refuse la réception tant qu'une non-conformité est ouverte (RG-05)", () => {
    const refus = receptionAutorisee("receptionne_provisoirement", 2);
    assert.equal(refus.ok, false);
    assert.ok(refus.raison?.includes("2 non-conformités"));
    assert.ok(refus.raison?.includes("clôturez"));

    const une = receptionAutorisee("cloture", 1);
    assert.equal(une.ok, false);
    assert.ok(une.raison?.startsWith("1 non-conformité"));
  });

  it("autorise la réception quand tout est clôturé", () => {
    const controle = receptionAutorisee("receptionne_provisoirement", 0);
    assert.equal(controle.ok, true);
    assert.equal(controle.raison, null);
  });

  it("laisse passer les autres changements de statut", () => {
    assert.equal(receptionAutorisee("en_cours", 5).ok, true);
    assert.equal(receptionAutorisee("suspendu", 5).ok, true);
    assert.equal(receptionAutorisee("en_preparation", 5).ok, true);
  });
});
