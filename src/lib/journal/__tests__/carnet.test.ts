import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  cumulEffectifs,
  cumulEngins,
  cumulIncidents,
  formaterJour,
  formaterJourComplet,
  nombreJoursPeriode,
} from "../carnet.ts";

describe("carnet de chantier", () => {
  it("cumule les effectifs par corps de métier", () => {
    const cumules = cumulEffectifs([
      { corps_metier: "Terrassiers", nombre: 5 },
      { corps_metier: "Terrassiers", nombre: 3 },
      { corps_metier: "Maçons", nombre: 4 },
    ]);
    assert.equal(cumules.total, 12);
    assert.equal(cumules.parCorpsMetier.length, 2);
    assert.equal(cumules.parCorpsMetier[0].corpsMetier, "Terrassiers");
    assert.equal(cumules.parCorpsMetier[0].nombre, 8);
  });

  it("cumule les heures de marche par type d'engin", () => {
    const cumules = cumulEngins([
      { type_engin: "Pelleteuse", heures_marche: 8 },
      { type_engin: "Pelleteuse", heures_marche: 6 },
      { type_engin: "Camion", heures_marche: 5 },
    ]);
    assert.equal(cumules.heuresMarche, 19);
    assert.equal(cumules.parType[0].typeEngin, "Pelleteuse");
    assert.equal(cumules.parType[0].heures, 14);
    assert.equal(cumules.parType[0].nombre, 2);
  });

  it("cumule les incidents et les heures d'arrêt", () => {
    const cumules = cumulIncidents([
      { type: "panne", duree_heures: 2.5 },
      { type: "intemperie", duree_heures: 4 },
    ]);
    assert.equal(cumules.nombre, 2);
    assert.equal(cumules.heuresArret, 6.5);
  });

  it("écrit la date en toutes lettres", () => {
    assert.equal(formaterJourComplet("2026-10-19"), "lundi 19 octobre 2026");
    assert.equal(formaterJourComplet("2026-10-01"), "jeudi 1 octobre 2026");
    assert.equal(formaterJour("2026-10-19"), "19/10/2026");
    assert.equal(formaterJour(null), "—");
  });

  it("compte les jours de la période", () => {
    assert.equal(nombreJoursPeriode("2026-10-01", "2026-10-31"), 31);
    assert.equal(nombreJoursPeriode("2026-10-19", "2026-10-19"), 1);
    assert.equal(nombreJoursPeriode("2026-10-31", "2026-10-01"), 0);
    assert.equal(nombreJoursPeriode(null, "2026-10-01"), 0);
  });
});
