import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  arrondirFcfa,
  calculerLigne,
  calculerLignes,
  calculerTotauxDevis,
  formaterMontantFcfa,
  lignesDevisDepuisModele,
  numeroDevisAuto,
  totalDevis,
  validerDevis,
} from "../enregistrement.ts";

describe("enregistrement des devis (MET-02, MET-03)", () => {
  it("calcule le total d'une ligne", () => {
    const ligne = calculerLigne({ designation: " Enrobé ", unite: " t ", quantite: 12.5, prix_unitaire: 95000 });
    assert.equal(ligne.designation, "Enrobé");
    assert.equal(ligne.unite, "t");
    assert.equal(ligne.total, 1187500);
  });

  it("arrondit au franc (FCFA sans décimale)", () => {
    assert.equal(arrondirFcfa(1187500.4), 1187500);
    assert.equal(arrondirFcfa(1187500.6), 1187501);
    assert.equal(arrondirFcfa(Number.NaN), 0);
  });

  it("ignore les lignes vides et totalise le devis", () => {
    const lignes = calculerLignes([
      { designation: "Enrobé", unite: "t", quantite: 10, prix_unitaire: 95000 },
      { designation: "   ", unite: "t", quantite: 5, prix_unitaire: 1000 },
      { designation: "Gravier", unite: "m³", quantite: 100, prix_unitaire: 4500 },
    ]);
    assert.equal(lignes.length, 2);
    assert.equal(totalDevis(lignes), 1400000);
  });

  it("formate un montant en FCFA sans décimale", () => {
    // La séparatrice de milliers française est une espace insécable.
    assert.equal(formaterMontantFcfa(230120800).replace(/\s/g, " "), "230 120 800 FCFA");
    assert.equal(formaterMontantFcfa(1187500.6).replace(/\s/g, " "), "1 187 501 FCFA");
  });

  it("contrôle la saisie avant enregistrement", () => {
    const lignes = calculerLignes([
      { designation: "Enrobé", unite: "t", quantite: 10, prix_unitaire: 95000 },
    ]);
    const valide = validerDevis({ client: "SODECI", numero: "DEV-001", date_devis: "2026-10-19", lignes });
    assert.equal(valide.ok, true);
    assert.deepEqual(valide.erreurs, []);

    const vide = validerDevis({ client: " ", numero: "", date_devis: "", lignes: [] });
    assert.equal(vide.ok, false);
    assert.equal(vide.erreurs.length, 4);

    const quantiteNulle = validerDevis({
      client: "SODECI",
      numero: "DEV-001",
      date_devis: "2026-10-19",
      lignes: calculerLignes([{ designation: "Enrobé", unite: "t", quantite: 0, prix_unitaire: 95000 }]),
    });
    assert.equal(quantiteNulle.ok, false);
    assert.ok(quantiteNulle.erreurs.some((e) => e.includes("quantité")));
  });

  it("propose un numéro de devis automatique", () => {
    assert.equal(numeroDevisAuto([]), "DEV-001");
    assert.equal(numeroDevisAuto(["DEV-001", "DEV-009"]), "DEV-010");
    assert.equal(numeroDevisAuto(["Devis A"]), "DEV-001");
  });

  it("reprend les lignes du modèle de calcul avec les prix choisis", () => {
    const modele = {
      lignes: [
        { code: "A", designation: "Enrobé", unite: "t", quantite: () => 10 },
        { code: "B", designation: "Gravier", unite: "m³", quantite: () => 20 },
      ],
    };
    const lignes = lignesDevisDepuisModele(modele, {}, { A: 95000, B: null });
    assert.equal(lignes.length, 2);
    assert.equal(lignes[0].quantite, 10);
    assert.equal(lignes[0].prix_unitaire, 95000);
    assert.equal(lignes[1].prix_unitaire, 0);
  });

  it("calcule les totaux avec remise et TVA", () => {
    const totaux = calculerTotauxDevis(
      [{ total: 100000000 }, { total: 96192800 }],
      5,
      18.25,
    );
    assert.equal(totaux.totalBrut, 196192800);
    assert.equal(totaux.remiseMontant, 9809640);
    assert.equal(totaux.totalHT, 186383160);
    assert.equal(totaux.tvaMontant, 34014927);
    assert.equal(totaux.totalTTC, 220398087);
  });

  it("ignore une remise ou une TVA négative", () => {
    const totaux = calculerTotauxDevis([{ total: 100000 }], -5, -10);
    assert.equal(totaux.remiseMontant, 0);
    assert.equal(totaux.tvaMontant, 0);
    assert.equal(totaux.totalTTC, 100000);
  });

  it("traite l'absence de remise ni de TVA", () => {
    const totaux = calculerTotauxDevis([{ total: 5000 }]);
    assert.equal(totaux.totalBrut, 5000);
    assert.equal(totaux.totalHT, 5000);
    assert.equal(totaux.totalTTC, 5000);
  });
});
