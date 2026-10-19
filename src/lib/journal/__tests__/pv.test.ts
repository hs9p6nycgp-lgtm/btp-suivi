// Tests du résumé de journal (src/lib/journal/pv.ts).

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  formaterDatePj,
  formaterNombrePj,
  libelleIncidentPj,
  resumerJournalPv,
  totalEffectifPv,
  totalHeuresPv,
  type JournalPv,
} from "../pv.ts";

const pv: JournalPv = {
  chantierNom: "Route de Yopougon",
  maitreOuvrage: "District d'Abidjan",
  entreprise: "SOTRA LOG",
  numeroMarche: "MKT-2026-014",
  dateJournal: "2026-10-19",
  meteo: "Pluie le matin",
  observations: "Franchissement du carrefour perturbé",
  effectifs: [
    { corps_metier: "Chef de chantier", nombre: 1 },
    { corps_metier: "Manœuvres", nombre: 6 },
  ],
  engins: [
    { type_engin: "Chargeuse", immatriculation: "CI-1234", heures_marche: 7.5, quantite_produite: 120 },
    { type_engin: "Camion benne", immatriculation: null, heures_marche: 4, quantite_produite: null },
  ],
  incidents: [{ type: "intemperie", description: "Pluie battante", duree_heures: 2 }],
  quantites: [
    { designation: "Terrassement général", unite: "m³", quantite: 320 },
    { designation: "Fourniture de latérite", unite: "m³", quantite: 145.5 },
  ],
  photos: [{ legende: "Franchissement" }, { legende: null }],
};

describe("formaterDatePj", () => {
  it("affiche la date au format JJ/MM/AAAA", () => {
    assert.equal(formaterDatePj("2026-10-19"), "19/10/2026");
    assert.equal(formaterDatePj("2026-01-05T10:00:00Z"), "05/01/2026");
  });

  it("reste lisible sans date", () => {
    assert.equal(formaterDatePj(null), "-");
    assert.equal(formaterDatePj(""), "-");
  });
});

describe("formaterNombrePj", () => {
  it("n'affiche pas de zéros inutiles", () => {
    assert.equal(formaterNombrePj(4), "4");
    assert.equal(formaterNombrePj(145.5), "145,5");
  });
});

describe("totaux", () => {
  it("additionne l'effectif présent", () => {
    assert.equal(totalEffectifPv(pv.effectifs), 7);
  });

  it("additionne les heures de marche", () => {
    assert.equal(totalHeuresPv(pv.engins), 11.5);
  });
});

describe("libelleIncidentPv", () => {
  it("traduit les types d'incident", () => {
    assert.equal(libelleIncidentPj("panne"), "Panne");
    assert.equal(libelleIncidentPj("intemperie"), "Intempérie");
    assert.equal(libelleIncidentPj("type_inconnu"), "Autre incident");
  });
});

describe("resumerJournalPv", () => {
  const texte = resumerJournalPv(pv);

  it("commence par le chantier et la date", () => {
    assert.ok(texte.startsWith("*Journal de chantier — Route de Yopougon"));
    assert.ok(texte.includes("Date : 19/10/2026"));
  });

  it("reprend la météo et les observations", () => {
    assert.ok(texte.includes("Météo : Pluie le matin"));
    assert.ok(texte.includes("Observations : Franchissement du carrefour perturbé"));
  });

  it("donne l'effectif total et le détail par corps métier", () => {
    assert.ok(texte.includes("Effectif : 7 personne(s)"));
    assert.ok(texte.includes("Manœuvres 6"));
  });

  it("donne les matériels et le total des heures", () => {
    assert.ok(texte.includes("Chargeuse (CI-1234) 7,5 h"));
    assert.ok(texte.includes("total 11,5 h"));
  });

  it("liste les quantités et les incidents", () => {
    assert.ok(texte.includes("*Quantités réalisées*"));
    assert.ok(texte.includes("• Terrassement général : 320 m³"));
    assert.ok(texte.includes("• Intempérie — Pluie battante (2 h)"));
  });

  it("indique le nombre de photos", () => {
    assert.ok(texte.includes("Photos : 2"));
  });

  it("omet les sections vides", () => {
    const vide = resumerJournalPv({
      ...pv,
      meteo: null,
      observations: null,
      effectifs: [],
      engins: [],
      incidents: [],
      quantites: [],
      photos: [],
    });
    assert.equal(vide.includes("Météo"), false);
    assert.equal(vide.includes("*Quantités réalisées*"), false);
    assert.ok(vide.includes("Photos : 0"));
  });
});
