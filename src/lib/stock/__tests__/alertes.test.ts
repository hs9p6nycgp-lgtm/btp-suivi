// Tests des alertes de stock multi-chantiers (src/lib/stock/stock.ts).

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  alertesStock,
  stocksTheoriques,
  type EntreeStock,
  type SeuilStock,
} from "../stock.ts";

const entrees: EntreeStock[] = [
  { chantier_id: "c1", cle: "laterite", quantite: 100, mise_en_oeuvre: 60 },
  { chantier_id: "c1", cle: "sable", quantite: 20, mise_en_oeuvre: 20 },
  { chantier_id: "c2", cle: "laterite", quantite: 10, mise_en_oeuvre: 0 },
];

const seuils: SeuilStock[] = [
  { chantier_id: "c1", cle: "laterite", seuil: 30 },
  { chantier_id: "c1", cle: "sable", seuil: 10 },
  { chantier_id: "c2", cle: "laterite", seuil: 25 },
];

describe("stocksTheoriques", () => {
  it("calcule le stock par chantier et par matériau", () => {
    const stocks = stocksTheoriques(entrees);
    assert.equal(stocks.get("c1::laterite"), 40);
    assert.equal(stocks.get("c1::sable"), 0);
    assert.equal(stocks.get("c2::laterite"), 10);
  });

  it("additionne plusieurs écritures du même matériau", () => {
    const stocks = stocksTheoriques([
      { chantier_id: "c1", cle: "gravier", quantite: 10, mise_en_oeuvre: 2 },
      { chantier_id: "c1", cle: "gravier", quantite: 5, mise_en_oeuvre: 1 },
    ]);
    assert.equal(stocks.get("c1::gravier"), 12);
  });

  it("ne mélange pas deux chantiers pour le même matériau", () => {
    const stocks = stocksTheoriques(entrees);
    assert.equal(stocks.get("c1::laterite"), 40);
    assert.equal(stocks.get("c2::laterite"), 10);
  });
});

describe("alertesStock", () => {
  it("signale les matériaux sous le seuil", () => {
    const alertes = alertesStock(entrees, seuils);
    const cles = alertes.map((alerte) => `${alerte.chantier_id}::${alerte.cle}`);
    assert.deepEqual(cles.sort(), ["c1::sable", "c2::laterite"]);
  });

  it("ne signale pas un matériau bien approvisionné", () => {
    const alertes = alertesStock(entrees, seuils);
    assert.equal(
      alertes.some((alerte) => alerte.chantier_id === "c1" && alerte.cle === "laterite"),
      false,
    );
  });

  it("ignore les matériaux sans seuil défini (seuil à 0)", () => {
    const alertes = alertesStock(entrees, [
      { chantier_id: "c1", cle: "laterite", seuil: 0 },
    ]);
    assert.equal(alertes.length, 0);
  });

  it("signale un materiau avec un seuil defini mais jamais livre", () => {
    const alertes = alertesStock([], [{ chantier_id: "c1", cle: "ciment", seuil: 5 }]);
    assert.equal(alertes.length, 1);
    assert.equal(alertes[0].stock, 0);
    assert.equal(alertes[0].seuil, 5);
  });

  it("renseigne le stock et le seuil de l'alerte", () => {
    const alertes = alertesStock(entrees, seuils);
    const alerte = alertes.find((a) => a.chantier_id === "c1" && a.cle === "sable");
    assert.equal(alerte?.stock, 0);
    assert.equal(alerte?.seuil, 10);
  });
});
