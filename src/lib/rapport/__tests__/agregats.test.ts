import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  agregatJournaux,
  agregatNonConformites,
  comparaisonDelai,
  depensesParCategorie,
  formaterMontant,
  formaterPourcentage,
  libelleCategorieDepense,
  periodeParDefaut,
  totalDepenses,
  totalValorisation,
  valorisationPostes,
} from "../agregats.ts";

describe("agrégats du rapport (REP-01, REP-02)", () => {
  it("valorise les travaux poste par poste", () => {
    const lignes = valorisationPostes(
      [
        { id: "p1", code: "A1", designation: "Enrobé", unite: "t", quantite_marche: 100, prix_unitaire: 95000 },
        { id: "p2", designation: "Gravier", unite: "m³", quantite_marche: 50, prix_unitaire: 4500 },
      ],
      [{ poste_dqe_id: "p1", quantite: 40 }],
    );
    assert.equal(lignes.length, 2);
    assert.equal(lignes[0].montantMarche, 9500000);
    assert.equal(lignes[0].montantRealise, 3800000);
    assert.equal(lignes[0].avancement, 40);
    assert.equal(lignes[0].ecartQuantite, -60);
    assert.equal(lignes[1].quantiteRealisee, 0);
  });

  it("totalise la valorisation", () => {
    const lignes = valorisationPostes(
      [
        { id: "p1", designation: "Enrobé", unite: "t", quantite_marche: 100, prix_unitaire: 95000 },
        { id: "p2", designation: "Gravier", unite: "m³", quantite_marche: 50, prix_unitaire: 4500 },
      ],
      [{ poste_dqe_id: "p1", quantite: 40 }],
    );
    const totaux = totalValorisation(lignes);
    assert.equal(totaux.montantMarche, 9725000);
    assert.equal(totaux.montantRealise, 3800000);
  });

  it("additionne les quantités réalisées d'un même poste", () => {
    const lignes = valorisationPostes(
      [{ id: "p1", designation: "Enrobé", unite: "t", quantite_marche: 100, prix_unitaire: 1000 }],
      [
        { poste_dqe_id: "p1", quantite: 10 },
        { poste_dqe_id: "p1", quantite: 15 },
      ],
    );
    assert.equal(lignes[0].quantiteRealisee, 25);
    assert.equal(lignes[0].avancement, 25);
  });

  it("regroupe les dépenses réelles par catégorie", () => {
    const depenses = [
      { categorie: "materiaux", designation: "Ciment", montant_total: 500000 },
      { categorie: "materiaux", designation: "Gravier", montant_total: 300000 },
      { categorie: "engins", designation: "Chargeuse", montant_total: 1200000 },
    ];
    const parCategorie = depensesParCategorie(depenses);
    assert.equal(parCategorie.length, 2);
    assert.equal(parCategorie[0].categorie, "engins");
    assert.equal(parCategorie[0].total, 1200000);
    assert.equal(parCategorie[1].nombre, 2);
    assert.equal(totalDepenses(depenses), 2000000);
    assert.equal(libelleCategorieDepense("main_doeuvre"), "Main-d'œuvre");
  });

  it("compte les non-conformités par statut et par gravité", () => {
    const agregat = agregatNonConformites([
      { id: "1", gravite: "majeure", statut: "ouverte" },
      { id: "2", gravite: "majeure", statut: "cloturee" },
      { id: "3", gravite: "critique", statut: "ouverte" },
    ]);
    assert.equal(agregat.total, 3);
    assert.equal(agregat.ouvertes, 2);
    assert.equal(agregat.cloturees, 1);
    assert.deepEqual(agregat.parGravite.map((g) => [g.gravite, g.total]), [
      ["critique", 1],
      ["majeure", 2],
    ]);
  });

  it("agrège les journaux : effectifs, heures de marche, incidents, photos", () => {
    const agregat = agregatJournaux({
      journaux: [
        { id: "j1", date_journal: "2026-10-01", statut: "valide" },
        { id: "j2", date_journal: "2026-10-02", statut: "brouillon" },
      ],
      effectifs: [
        { journal_id: "j1", corps_metier: "Terrassiers", nombre: 5 },
        { journal_id: "j2", corps_metier: "Terrassiers", nombre: 3 },
      ],
      engins: [
        { journal_id: "j1", type_engin: "Chargeuse", heures_marche: 8, heures_prevues: 10 },
        { journal_id: "j2", type_engin: "Camion", heures_marche: 5, heures_prevues: 5 },
      ],
      incidents: [{ journal_id: "j1", type: "panne", duree_heures: 2.5 }],
      photos: [{ journal_id: "j1", chemin: "a.jpg" }],
    });
    assert.equal(agregat.nombreJournaux, 2);
    assert.equal(agregat.nombreValides, 1);
    assert.equal(agregat.effectifsCumules, 8);
    assert.equal(agregat.heuresMarche, 13);
    assert.equal(agregat.tauxDisponibilite, 86.7);
    assert.equal(agregat.nombreIncidents, 1);
    assert.equal(agregat.heuresIncident, 2.5);
    assert.equal(agregat.nombrePhotos, 1);
  });

  it("compare le délai à la fin contractuelle", () => {
    const enCours = comparaisonDelai("2026-11-30", "2026-10-20");
    assert.equal(enCours.etat, "en_cours");
    assert.equal(enCours.jours, 41);

    const retard = comparaisonDelai("2026-10-31", "2026-11-05", true);
    assert.equal(retard.etat, "retard");
    assert.equal(retard.jours, -5);

    const aJour = comparaisonDelai("2026-10-31", "2026-10-20", true);
    assert.equal(aJour.etat, "a_jour");

    assert.equal(comparaisonDelai(null, "2026-10-20").etat, "inconnu");
    assert.equal(comparaisonDelai("2026-10-31", null).etat, "inconnu");
  });

  it("formate un montant en FCFA sans décimale", () => {
    assert.equal(formaterMontant(2000000.4).replace(/\s/g, " "), "2 000 000 FCFA");
    assert.equal(formaterMontant(null), "0 FCFA");
  });

  it("formate un pourcentage à la française (virgule)", () => {
    assert.equal(formaterPourcentage(0.5), "0,5 %");
    assert.equal(formaterPourcentage(100), "100 %");
    assert.equal(formaterPourcentage(33.34), "33,3 %");
    assert.equal(formaterPourcentage(null), "—");
  });

  it("calcule les bornes de la période par défaut", () => {
    const reference = new Date(2026, 9, 19); // 19/10/2026
    assert.deepEqual(periodeParDefaut("journalier", reference), {
      debut: "2026-10-19",
      fin: "2026-10-19",
    });
    assert.deepEqual(periodeParDefaut("hebdomadaire", reference), {
      debut: "2026-10-13",
      fin: "2026-10-19",
    });
    assert.deepEqual(periodeParDefaut("mensuel", reference), {
      debut: "2026-10-01",
      fin: "2026-10-19",
    });
  });
});
