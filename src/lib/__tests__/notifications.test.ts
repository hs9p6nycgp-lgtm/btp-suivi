// Tests du regroupement des alertes (src/lib/notifications.ts).

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  compteParGravite,
  construireNotifications,
  estEnRetard,
  formatDateFR,
  graviteAlerte,
  graviteNonConformite,
  lienAlerte,
  type AlerteRow,
  type ChantierRow,
  type NonConformiteRow,
} from "../notifications.ts";

const chantier: ChantierRow = {
  id: "c1",
  nom: "Route de Yopougon",
  date_fin_prevue: "2026-12-31",
  avancement_pct: 20,
  statut: "en_cours",
};

const alerte: AlerteRow = {
  id: "a1",
  chantier_id: "c1",
  type: "budget",
  valeur: 12,
  seuil: 5,
  statut: "ouverte",
  date_alerte: "2026-10-01",
};

const nonConformite: NonConformiteRow = {
  id: "n1",
  chantier_id: "c1",
  description: "Béton non conforme sur poteaux",
  gravite: "majeure",
  statut: "ouverte",
  created_at: "2026-10-02",
};

describe("gravité", () => {
  it("classe les alertes HSE en critique et le stock bas à traiter", () => {
    assert.equal(graviteAlerte("hse"), "critique");
    assert.equal(graviteAlerte("budget"), "attention");
    assert.equal(graviteAlerte("stock"), "attention");
    assert.equal(graviteAlerte("type_inconnu"), "info");
  });

  it("classe les non-conformités selon leur gravité", () => {
    assert.equal(graviteNonConformite("critique"), "critique");
    assert.equal(graviteNonConformite("majeure"), "attention");
    assert.equal(graviteNonConformite("mineure"), "info");
  });
});

describe("lienAlerte", () => {
  it("envoie vers l'écran où le problème se traite", () => {
    assert.equal(lienAlerte("stock", "c1"), "/chantiers/c1/livraisons");
    assert.equal(lienAlerte("budget", "c1"), "/chantiers/c1/couts");
    assert.equal(lienAlerte("quantite", "c1"), "/chantiers/c1/couts");
    assert.equal(lienAlerte("delai", "c1"), "/chantiers/c1/planning");
    assert.equal(lienAlerte("qualite", "c1"), "/chantiers/c1/qualite");
    assert.equal(lienAlerte("hse", "c1"), "/chantiers/c1");
  });
});

describe("formatDateFR", () => {
  it("affiche les dates au format JJ/MM/AAAA", () => {
    assert.equal(formatDateFR("2026-10-19"), "19/10/2026");
    assert.equal(formatDateFR("2026-01-05T08:30:00Z"), "05/01/2026");
  });

  it("reste vide sans date exploitable", () => {
    assert.equal(formatDateFR(null), "");
    assert.equal(formatDateFR(""), "");
  });
});

describe("estEnRetard", () => {
  it("signale un chantier dont la fin prévue est dépassée", () => {
    assert.equal(estEnRetard({ ...chantier, date_fin_prevue: "2026-10-01" }, "2026-10-19"), true);
  });

  it("ne signale pas un chantier dans les délais, terminé ou clôturé", () => {
    assert.equal(estEnRetard(chantier, "2026-10-19"), false);
    assert.equal(estEnRetard({ ...chantier, date_fin_prevue: "2026-10-01", avancement_pct: 100 }, "2026-10-19"), false);
    assert.equal(
      estEnRetard({ ...chantier, date_fin_prevue: "2026-10-01", statut: "cloture" }, "2026-10-19"),
      false,
    );
    assert.equal(estEnRetard({ ...chantier, date_fin_prevue: null }, "2026-10-19"), false);
  });
});

describe("construireNotifications", () => {
  it("regroupe alertes, non-conformités et retards", () => {
    const liste = construireNotifications({
      alertes: [alerte],
      nonConformites: [nonConformite],
      chantiers: [{ ...chantier, date_fin_prevue: "2026-10-01" }],
      aujourdHui: "2026-10-19",
    });

    assert.equal(liste.length, 3);
    assert.deepEqual(
      liste.map((notification) => notification.categorie).sort(),
      ["alerte", "non_conformite", "retard"],
    );
    assert.equal(liste.every((notification) => notification.chantierNom === "Route de Yopougon"), true);
  });

  it("ignore les alertes clôturées ou acquittées", () => {
    const liste = construireNotifications({
      alertes: [
        { ...alerte, statut: "cloturee" },
        { ...alerte, id: "a2", statut: "acquittee" },
      ],
      nonConformites: [],
      chantiers: [],
      aujourdHui: "2026-10-19",
    });
    assert.equal(liste.length, 0);
  });

  it("ignore les non-conformités clôturées ou rejetées", () => {
    const liste = construireNotifications({
      alertes: [],
      nonConformites: [
        { ...nonConformite, statut: "cloturee" },
        { ...nonConformite, id: "n2", statut: "rejetee" },
        { ...nonConformite, id: "n3", statut: "en_cours" },
      ],
      chantiers: [],
      aujourdHui: "2026-10-19",
    });
    assert.equal(liste.length, 1);
    assert.equal(liste[0].id, "nc-n3");
  });

  it("met en tête les problèmes critiques", () => {
    const liste = construireNotifications({
      alertes: [{ ...alerte, type: "hse" }],
      nonConformites: [],
      chantiers: [],
      aujourdHui: "2026-10-19",
    });
    assert.equal(liste[0].gravite, "critique");
  });

  it("ajoute les stocks bas au centre d'alertes", () => {    const liste = construireNotifications({
      alertes: [],
      nonConformites: [],
      chantiers: [chantier],
      aujourdHui: "2026-10-19",
      stocks: [
        { chantier_id: "c1", cle: "laterite", libelle: "Latérite", stock: 12, seuil: 20 },
      ],
    });
    assert.equal(liste.length, 1);
    assert.equal(liste[0].categorie, "stock");
    assert.equal(liste[0].type, "stock");
    assert.equal(liste[0].gravite, "attention");
    assert.equal(liste[0].lien, "/chantiers/c1/livraisons");
    assert.equal(liste[0].chantierNom, "Route de Yopougon");
    assert.equal(liste[0].description, "Latérite");
    assert.equal(liste[0].valeur, 12);
    assert.equal(liste[0].seuil, 20);
  });

  it("trie les plus récents d'abord à gravité égale", () => {
    const liste = construireNotifications({
      alertes: [
        { ...alerte, id: "a1", date_alerte: "2026-09-01" },
        { ...alerte, id: "a2", date_alerte: "2026-10-15" },
      ],
      nonConformites: [],
      chantiers: [],
      aujourdHui: "2026-10-19",
    });
    assert.deepEqual(
      liste.map((notification) => notification.id),
      ["alerte-a2", "alerte-a1"],
    );
  });

  it("remonte la gravité d'une non-conformité dont l'échéance est dépassée", () => {
    const liste = construireNotifications({
      alertes: [],
      nonConformites: [
        { ...nonConformite, id: "n1", gravite: "mineure", echeance: "2026-10-01" },
        { ...nonConformite, id: "n2", gravite: "mineure", echeance: "2026-12-01" },
        { ...nonConformite, id: "n3", gravite: "majeure", echeance: null },
      ],
      chantiers: [],
      aujourdHui: "2026-10-19",
    });
    const depassee = liste.find((notification) => notification.id === "nc-n1");
    const aVenir = liste.find((notification) => notification.id === "nc-n2");
    const majeure = liste.find((notification) => notification.id === "nc-n3");

    assert.equal(depassee?.echeanceDepassee, true);
    assert.equal(depassee?.gravite, "attention");
    assert.equal(aVenir?.echeanceDepassee, false);
    assert.equal(aVenir?.gravite, "info");
    assert.equal(majeure?.gravite, "attention");
  });

  it("compte les problèmes par gravité", () => {    const compte = compteParGravite([
      { id: "1", categorie: "alerte", type: "hse", gravite: "critique", chantierId: "c1", chantierNom: "C", lien: "/", date: "" },
      { id: "2", categorie: "alerte", type: "budget", gravite: "attention", chantierId: "c1", chantierNom: "C", lien: "/", date: "" },
      { id: "3", categorie: "alerte", type: "stock", gravite: "info", chantierId: "c1", chantierNom: "C", lien: "/", date: "" },
    ]);
    assert.deepEqual(compte, { critique: 1, attention: 1, info: 1 });
  });
});
