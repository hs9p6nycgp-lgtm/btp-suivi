import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ageMiseAJour,
  alertesPeremption,
  filtrerPrix,
  prixParZone,
  valeursDistinctes,
  zonesParDefaut,
  type LigneFiltrable,
} from "../filtres.ts";

function prix(partial: Partial<LigneFiltrable> = {}): LigneFiltrable {
  return {
    id: "p1",
    code: "CIM-01",
    designation: "Ciment CPJ 42,5",
    categorie: "Ciment",
    unite: "sac",
    prix_unitaire: 4500,
    source: "Fournisseur Abidjan",
    date_source: "2026-10-01",
    date_validite: null,
    statut: "valide",
    zone: "Abidjan",
    ...partial,
  };
}

describe("filtres du référentiel de prix (REF-07, REF-08, REF-09)", () => {
  describe("REF-07 : filtres", () => {
    const lignes = [
      prix({ id: "1", code: "CIM-01", designation: "Ciment", categorie: "Ciment", source: "Fournisseur Abidjan", zone: "Abidjan", date_source: "2026-10-01" }),
      prix({ id: "2", code: "SAB-01", designation: "Sable", categorie: "Granulat", source: "Carrière Anyama", zone: "San-Pédro", date_source: "2026-01-15" }),
      prix({ id: "3", code: "GRA-01", designation: "Gravier", categorie: "Granulat", source: "Carrière Anyama", zone: null, date_source: null }),
    ];

    it("filtre par texte (désignation, code, source)", () => {
      assert.strictEqual(filtrerPrix(lignes, { recherche: "ciment" }).length, 1);
      assert.strictEqual(filtrerPrix(lignes, { recherche: "CIM-01" }).length, 1);
      assert.strictEqual(filtrerPrix(lignes, { recherche: "carrière" }).length, 2);
    });

    it("filtre par catégorie, fournisseur et ville", () => {
      assert.strictEqual(filtrerPrix(lignes, { categorie: "Granulat" }).length, 2);
      assert.strictEqual(filtrerPrix(lignes, { fournisseur: "Carrière Anyama" }).length, 2);
      assert.strictEqual(filtrerPrix(lignes, { ville: "Abidjan" }).length, 1);
    });

    it("filtre par date de mise à jour", () => {
      const resultat = filtrerPrix(lignes, { dateMin: "2026-06-01" });
      assert.strictEqual(resultat.length, 1);
      assert.strictEqual(resultat[0].id, "1");
    });

    it("liste les valeurs disponibles pour chaque filtre", () => {
      assert.deepStrictEqual(valeursDistinctes(lignes, "categorie"), ["Ciment", "Granulat"]);
      assert.deepStrictEqual(valeursDistinctes(lignes, "zone"), ["Abidjan", "San-Pédro"]);
      assert.strictEqual(valeursDistinctes(lignes, "source").length, 2);
    });
  });

  describe("REF-08 : prix par zone", () => {
    it("applique le coefficient de transport", () => {
      const zones = zonesParDefaut();
      assert.strictEqual(prixParZone(prix({ prix_unitaire: 100000 }), "Abidjan", zones), 100000);
      assert.strictEqual(prixParZone(prix({ prix_unitaire: 100000 }), "Yamoussoukro", zones), 110000);
      assert.strictEqual(prixParZone(prix({ prix_unitaire: 100000 }), "Man", zones), 120000);
    });

    it("laisse le prix inchangé pour une zone inconnue", () => {
      assert.strictEqual(prixParZone(prix({ prix_unitaire: 100000 }), "Inconnue"), 100000);
    });
  });

  describe("REF-09 : alerte de péremption", () => {
    it("signale un prix non mis à jour depuis plus de 6 mois", () => {
      const reference = new Date("2026-10-19T00:00:00");
      const alertes = alertesPeremption(
        [prix({ id: "1", date_source: "2026-01-15" }), prix({ id: "2", date_source: "2026-10-01" })],
        6,
        reference,
      );
      assert.strictEqual(alertes.length, 1);
      assert.strictEqual(alertes[0].id, "1");
      assert.ok(alertes[0].ageJours > 200);
    });

    it("signale un prix sans date de source", () => {
      const alertes = alertesPeremption([prix({ date_source: null })], 6, new Date("2026-10-19T00:00:00"));
      assert.strictEqual(alertes.length, 1);
      assert.match(alertes[0].message, /Aucune date de source/i);
    });

    it("permet de filtrer sur les prix périmés", () => {
      const lignes = [
        prix({ id: "1", date_source: "2026-01-15" }),
        prix({ id: "2", date_source: "2026-10-01" }),
      ];
      const perimes = filtrerPrix(lignes, { perimes: true });
      assert.strictEqual(perimes.length, 1);
      assert.strictEqual(perimes[0].id, "1");
    });

    it("calcule l'ancienneté d'une mise à jour", () => {
      assert.strictEqual(ageMiseAJour("2026-10-09", new Date("2026-10-19T00:00:00")), 10);
      assert.strictEqual(ageMiseAJour(null), null);
    });
  });
});
