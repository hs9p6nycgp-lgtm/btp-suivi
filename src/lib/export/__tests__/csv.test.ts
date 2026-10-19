// Tests de l'export CSV (src/lib/export/csv.ts).

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { nomFichierCsv, versCsv } from "../csv.ts";

describe("versCsv", () => {
  it("sépare les colonnes par un point-virgule", () => {
    const csv = versCsv(["Chantier", "Type"], [["Route de Yopougon", "Budget"]]);
    assert.ok(csv.includes("Chantier;Type"));
    assert.ok(csv.includes("Route de Yopougon;Budget"));
  });

  it("échappe les guillemets et les séparateurs", () => {
    const csv = versCsv(["Observation"], [['Reprise "fond de fouille"; à revoir']]);
    assert.ok(csv.includes('"Reprise ""fond de fouille""; à revoir"'));
  });

  it("conserve les accents et ajoute le marqueur Excel", () => {
    const csv = versCsv(["Matériau"], [["Latérite"]]);
    assert.ok(csv.startsWith("﻿"));
    assert.ok(csv.includes("Latérite"));
  });

  it("traite les valeurs vides", () => {
    const csv = versCsv(["A", "B"], [[null, undefined]]);
    assert.ok(csv.includes(";"));
  });

  it("termine chaque ligne par un retour à la ligne", () => {
    const csv = versCsv(["A"], [["1"]]);
    assert.ok(csv.endsWith("\r\n"));
  });
});

describe("nomFichierCsv", () => {
  it("ajoute la date du jour", () => {
    assert.equal(nomFichierCsv("alertes", new Date(2026, 9, 19)), "alertes-2026-10-19.csv");
  });
});
