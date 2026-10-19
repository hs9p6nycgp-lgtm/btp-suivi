import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  formaterDateExport,
  lignesAvancementsExport,
  lignesDepensesExport,
  lignesJournauxExport,
  lignesLivraisonsExport,
  lignesNonConformitesExport,
  lignesPhotosExport,
  lignesPostesDqeExport,
  lignesQuantitesExport,
  lignesSectionsExport,
  lignesTachesExport,
  libelleBooleen,
  libelleStatutJournal,
  libelleStatutNonConformite,
  libelleStatutTache,
  montantExport,
} from "../excel.ts";

describe("export Excel (REP-03)", () => {
  it("formate les dates en JJ/MM/AAAA", () => {
    assert.equal(formaterDateExport("2026-10-19"), "19/10/2026");
    assert.equal(formaterDateExport("2026-10-19T08:30:00Z"), "19/10/2026");
    assert.equal(formaterDateExport(null), "");
    assert.equal(formaterDateExport(""), "");
  });

  it("traduit les statuts en français", () => {
    assert.equal(libelleStatutTache("a_faire"), "À faire");
    assert.equal(libelleStatutTache("termine"), "Terminé");
    assert.equal(libelleStatutNonConformite("cloturee"), "Clôturée");
    assert.equal(libelleStatutJournal("valide"), "Validé");
    assert.equal(libelleStatutTache("inconnu"), "inconnu");
    assert.equal(libelleBooleen(true), "Oui");
    assert.equal(libelleBooleen(null), "Non");
  });

  it("arrondit les montants au franc", () => {
    assert.equal(montantExport(1234.6), 1235);
    assert.equal(montantExport(null), 0);
  });

  it("prépare les postes du DQE avec quantités et ligne de total", () => {
    const lignes = lignesPostesDqeExport(
      [
        { id: "p1", code: "A1", designation: "Enrobé", unite: "t", quantite_marche: 100, prix_unitaire: 95000 },
        { id: "p2", designation: "Gravier", unite: "m³", quantite_marche: 50, prix_unitaire: 4500 },
      ],
      [{ poste_dqe_id: "p1", quantite: 40 }],
    );
    assert.equal(lignes.length, 3);
    assert.equal(lignes[0]["Désignation"], "Enrobé");
    assert.equal(lignes[0]["Qté réalisée"], 40);
    assert.equal(lignes[0]["Montant valorisé"], 3800000);
    const total = lignes[lignes.length - 1];
    assert.equal(total["Désignation"], "TOTAL");
    assert.equal(total["Montant marché"], 9725000);
    assert.equal(total["Montant valorisé"], 3800000);
  });

  it("remplace les identifiants des postes par leur désignation", () => {
    const lignes = lignesQuantitesExport(
      [{ poste_dqe_id: "p1", quantite: 12, date_saisie: "2026-10-19" }],
      new Map([["p1", { designation: "Enrobé", unite: "t" }]]),
    );
    assert.equal(lignes[0]["Poste"], "Enrobé");
    assert.equal(lignes[0]["Date"], "19/10/2026");
    assert.equal(lignes[0]["Unité"], "t");
  });

  it("prépare les dépenses avec catégorie traduite et total", () => {
    const lignes = lignesDepensesExport([
      { categorie: "materiaux", designation: "Ciment", quantite: 10, unite: "sacs", prix_unitaire: 5000, montant_total: 50000, date_depense: "2026-10-19", reference: "B-12" },
      { categorie: "engins", designation: "Chargeuse", quantite: 1, unite: "j", prix_unitaire: 120000, montant_total: 120000, date_depense: "2026-10-20", reference: null },
    ]);
    assert.equal(lignes[0]["Catégorie"], "Matériaux");
    assert.equal(lignes[1]["Catégorie"], "Engins");
    assert.equal(lignes[2]["Catégorie"], "TOTAL");
    assert.equal(lignes[2]["Montant total"], 170000);
  });

  it("prépare le planning avec les statuts traduits", () => {
    const lignes = lignesTachesExport([
      { nom: "Décapage", duree_jours: 10, date_prevue_debut: "2026-10-19", date_prevue_fin: "2026-10-29", statut: "termine", est_jalon: false },
    ]);
    assert.equal(lignes[0]["Statut"], "Terminé");
    assert.equal(lignes[0]["Date début"], "19/10/2026");
    assert.equal(lignes[0]["Jalon"], "Non");
  });

  it("prépare le découpage avec les PK", () => {
    const lignes = lignesSectionsExport([
      { nom: "Section 1", pk_debut: 0, pk_fin: 2500, niveau: null, lot: null, avancement_pct: 50 },
    ]);
    assert.equal(lignes[0]["PK début"], "PK 0+000");
    assert.equal(lignes[0]["PK fin"], "PK 2+500");
    assert.equal(lignes[0]["Longueur (m)"], 2500);
  });

  it("agrège le détail des journaux", () => {
    const lignes = lignesJournauxExport({
      journaux: [{ id: "j1", date_journal: "2026-10-19", meteo: "Soleil", statut: "valide", observations: "Chantier advances" }],
      effectifs: [{ journal_id: "j1", corps_metier: "Terrassiers", nombre: 6 }],
      engins: [{ journal_id: "j1", type_engin: "Chargeuse", heures_marche: 8, heures_prevues: 10 }],
      incidents: [{ journal_id: "j1", type: "panne", duree_heures: 1.5 }],
      photos: [{ journal_id: "j1", chemin: "a.jpg" }],
    });
    assert.equal(lignes[0]["Effectif"], 6);
    assert.equal(lignes[0]["Heures de marche"], 8);
    assert.equal(lignes[0]["Heures prévues"], 10);
    assert.equal(lignes[0]["Incidents"], 1);
    assert.equal(lignes[0]["Heures d'arrêt"], 1.5);
    assert.equal(lignes[0]["Photos"], 1);
    assert.equal(lignes[0]["Statut"], "Validé");
  });

  it("prépare les livraisons et les photos", () => {
    const livraisons = lignesLivraisonsExport([
      { materiau: "Gravier", fournisseur: "SODECI", quantite: 20, quantite_commandee: 30, quantite_mise_en_oeuvre: 10, numero_bon: "B-1", camion: "AB-123", photo_bon: "bon.jpg", date_livraison: "2026-10-19" },
    ]);
    assert.equal(livraisons[0]["Qté commandée"], 30);
    assert.equal(livraisons[0]["Qté mise en œuvre"], 10);
    assert.equal(livraisons[0]["Date"], "19/10/2026");

    const photos = lignesPhotosExport([
      { created_at: "2026-10-19T10:00:00Z", legende: "Chaussée", chemin: "photo.jpg", latitude: 5.3, longitude: -4.0 },
    ]);
    assert.equal(photos[0]["Date"], "19/10/2026");
    assert.equal(photos[0]["Coordonnées"], "5.3, -4");
  });

  it("prépare les non-conformités et les points d'avancement", () => {
    const nc = lignesNonConformitesExport([
      { description: "Épaisseur hors tolérance", gravite: "majeure", statut: "ouverte", responsable: "Chef de chantier", created_at: "2026-10-19", date_cloture: null, echeance: "2026-10-30" },
    ]);
    assert.equal(nc[0]["Gravité"], "Majeure");
    assert.equal(nc[0]["Statut"], "Ouverte");
    assert.equal(nc[0]["Date clôture"], "");
    assert.equal(nc[0]["Échéance"], "30/10/2026");

    const points = lignesAvancementsExport([
      { date_point: "2026-10-19", avancement_pct: 35, commentaire: "Semaine 1" },
    ]);
    assert.equal(points[0]["Avancement %"], 35);
    assert.equal(points[0]["Date"], "19/10/2026");
  });
});
