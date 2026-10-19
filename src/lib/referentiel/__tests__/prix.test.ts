import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { LigneImportReferentiel, LigneReferentiel } from "../prix.ts";
import {
  analyserImportReferentiel,
  construireEntreeHistorique,
  estPrixObsolete,
  exporterReferentielCSV,
  lignesAffecteesParMiseAJour,
  nombreDepuis,
  normaliserDate,
  preparerApplicationImport,
} from "../prix.ts";

describe("referentiel de prix (REF-03, REF-06, REF-09)", () => {
  describe("REF-09 : prix obsolete", () => {
    it("considere obsolete un prix sans date", () => {
      assert.strictEqual(estPrixObsolete(null), true);
    });

    it("considere obsolete un prix de plus de 6 mois", () => {
      const reference = new Date("2026-10-16T00:00:00");
      assert.strictEqual(estPrixObsolete("2026-01-01", reference), true);
    });

    it("considere a jour un prix recent", () => {
      const reference = new Date("2026-10-16T00:00:00");
      assert.strictEqual(estPrixObsolete("2026-09-01", reference), false);
    });

    it("respecte un seuil personnalise", () => {
      const reference = new Date("2026-10-16T00:00:00");
      assert.strictEqual(estPrixObsolete("2026-08-01", reference, 1), true);
      assert.strictEqual(estPrixObsolete("2026-08-01", reference, 4), false);
    });
  });

  describe("REF-03 : historique des prix", () => {
    it("construit une entree si le prix change", () => {
      const entree = construireEntreeHistorique("p1", 1000, 1200, "admin", "mise a jour");
      assert.ok(entree);
      assert.strictEqual(entree!.ancien_prix, 1000);
      assert.strictEqual(entree!.nouveau_prix, 1200);
    });

    it("renvoie null si le prix est identique", () => {
      assert.strictEqual(construireEntreeHistorique("p1", 1000, 1000, "admin", null), null);
    });
  });

  describe("REF-06 : lignes affectees par une mise a jour", () => {
    it("trouve les lignes par code identique", () => {
      const lignes = [
        { id: "a", code: "CIM-01", designation: "Ciment" },
        { id: "b", code: "SAB-01", designation: "Sable" },
      ];
      const affectees = lignesAffecteesParMiseAJour("CIM-01", "Ciment", lignes);
      assert.strictEqual(affectees.length, 1);
      assert.strictEqual(affectees[0].id, "a");
    });

    it("trouve les lignes par designation si le code differe", () => {
      const lignes = [
        { id: "a", code: null, designation: "Ciment" },
        { id: "b", code: null, designation: "Sable" },
      ];
      const affectees = lignesAffecteesParMiseAJour(null, "Ciment", lignes);
      assert.strictEqual(affectees.length, 1);
      assert.strictEqual(affectees[0].id, "a");
    });

    it("renvoie vide si aucune correspondance", () => {
      const lignes = [{ id: "a", code: "X", designation: "Y" }];
      assert.strictEqual(lignesAffecteesParMiseAJour("Z", "W", lignes).length, 0);
    });
  });

  describe("REF-05 : export CSV du référentiel", () => {
    it("produit un CSV avec en-tete et lignes correctes", () => {
      const lignes = [
        {
          id: "1" as string,
          code: "CIM-01" as string | null,
          designation: "Ciment",
          categorie: "Materiaux de base" as string | null,
          unite: "sac",
          prix_unitaire: 4500,
          source: "Guide" as string | null,
          date_source: "2026-06-01" as string | null,
          date_validite: "2027-06-01" as string | null,
          statut: "valide" as "valide" | "a_verifier",
          zone: "Abidjan" as string | null,
        } as LigneReferentiel,
        {
          id: "2",
          code: "SAB-02",
          designation: "Sable",
          categorie: "Materiaux de base",
          unite: "m3",
          prix_unitaire: 2800,
          source: "Catalogue",
          date_source: "2026-05-01",
          date_validite: "2026-12-31",
          statut: "valide" as "valide" | "a_verifier",
          zone: "Yopougon",
        },
      ];
      const csv = exporterReferentielCSV(lignes);
      assert.ok(csv.startsWith("code;designation;categorie;unite;prix_unitaire;source;date_source;date_validite;statut;zone"));
      assert.ok(csv.includes("CIM-01;Ciment;Materiaux de base;sac;4500;Guide;2026-06-01;2027-06-01;valide;Abidjan"));
      assert.ok(csv.includes("SAB-02;Sable;Materiaux de base;m3;2800;Catalogue;2026-05-01;2026-12-31;valide;Yopougon"));
    });

    it("produit un CSV vide si pas de lignes", () => {
      assert.strictEqual(exporterReferentielCSV([]), "");
    });

    it("produit un CSV avec seulement des codes nuls", () => {
      const lignes = [
        {
          id: "1",
          code: null,
          designation: "Ciment sans code",
          categorie: null,
          unite: "sac",
          prix_unitaire: 5000,
          source: null,
          date_source: null,
          date_validite: null,
          statut: "a_verifier" as const,
          zone: null,
        },
      ];
      const csv = exporterReferentielCSV(lignes);
      assert.ok(csv.startsWith("code;designation;categorie;unite;prix_unitaire;source;date_source;date_validite;statut;zone"));
      assert.ok(csv.includes("Ciment sans code"));
      assert.ok(csv.includes("5000"));
      assert.ok(csv.includes("a_verifier"));
    });
  });

  describe("REF-05 : import Excel / CSV", () => {
    it("normalise les dates (AAAA-MM-JJ, JJ/MM/AAAA, serie Excel, objet date)", () => {
      assert.strictEqual(normaliserDate("2026-06-01"), "2026-06-01");
      assert.strictEqual(normaliserDate("2026-6-1"), "2026-06-01");
      assert.strictEqual(normaliserDate("01/06/2026"), "2026-06-01");
      assert.strictEqual(normaliserDate("1/6/2026"), "2026-06-01");
      assert.strictEqual(normaliserDate("01-06-26"), "2026-06-01");
      assert.strictEqual(normaliserDate("2026-06-01 00:00:00"), "2026-06-01");
      assert.strictEqual(normaliserDate(46174), "2026-06-01");
      assert.strictEqual(normaliserDate(new Date(Date.UTC(2026, 5, 1))), "2026-06-01");
    });

    it("refuse les dates illisibles ou impossibles", () => {
      assert.strictEqual(normaliserDate(""), null);
      assert.strictEqual(normaliserDate(null), null);
      assert.strictEqual(normaliserDate("31/02/2026"), null);
      assert.strictEqual(normaliserDate("pas une date"), null);
    });

    it("lit les prix avec espaces et separateurs", () => {
      assert.strictEqual(nombreDepuis("4 500"), 4500);
      assert.strictEqual(nombreDepuis("2,800"), 2800);
      assert.strictEqual(nombreDepuis("1.450"), 1450);
      assert.strictEqual(nombreDepuis("0,15"), 0.15);
      assert.strictEqual(nombreDepuis(4500), 4500);
    });

    it("analyse un fichier complet et normalise les valeurs", () => {
      const lignes = [
        {
          code: "CIM-01",
          designation: "Ciment CPJ 35",
          categorie: "Liants",
          unite: "sac",
          prix_unitaire: "4 500",
          source: "Guide",
          date_source: "01/06/2026",
          date_validite: "",
          statut: "valide",
          zone: "Abidjan",
        },
        {
          code: "",
          designation: "Sable lave",
          categorie: "Granulats",
          unite: "m3",
          prix_unitaire: "2,800",
          source: "Catalogue",
          date_source: "12/05/2026",
          date_validite: "31/12/2026",
          statut: "à vérifier",
          zone: "",
        },
      ];
      const { lignes: valides, rejets } = analyserImportReferentiel(lignes);
      assert.strictEqual(rejets.length, 0);
      assert.strictEqual(valides.length, 2);
      assert.strictEqual(valides[0].prix_unitaire, 4500);
      assert.strictEqual(valides[0].date_source, "2026-06-01");
      assert.strictEqual(valides[0].date_validite, null);
      assert.strictEqual(valides[1].prix_unitaire, 2800);
      assert.strictEqual(valides[1].code, null);
      assert.strictEqual(valides[1].statut, "a_verifier");
      assert.strictEqual(valides[1].date_validite, "2026-12-31");
    });

    it("rejette une ligne sans source ou sans date (regle du cahier des charges)", () => {
      const { lignes: valides, rejets } = analyserImportReferentiel([
        { designation: "Ciment", unite: "sac", prix_unitaire: 4500, source: "", date_source: "2026-06-01" },
        { designation: "Sable", unite: "m3", prix_unitaire: 2800, source: "Guide", date_source: "" },
      ]);
      assert.strictEqual(valides.length, 0);
      assert.strictEqual(rejets.length, 2);
      assert.strictEqual(rejets[0].ligne, 2);
      assert.strictEqual(rejets[1].ligne, 3);
      // Le message vient bien du point de repere unique `validerBasePrix` (BUG-006).
      assert.match(rejets[0].raison, /sans source/i);
      assert.match(rejets[1].raison, /sans date de source/i);
      assert.match(rejets[0].raison, /source et une date/i);
    });

    it("refuse un fichier sans colonnes obligatoires", () => {
      const { lignes: valides, rejets } = analyserImportReferentiel([{ foo: "bar" }]);
      assert.strictEqual(valides.length, 0);
      assert.ok(rejets.length >= 1);
    });

    it("prepare les ecritures : creation, mise a jour, ligne inchangee", () => {
      const existants: LigneReferentiel[] = [
        {
          id: "p1",
          code: "CIM-01",
          designation: "Ciment CPJ 35",
          categorie: "Liants",
          unite: "sac",
          prix_unitaire: 4500,
          source: "Guide",
          date_source: "2026-06-01",
          date_validite: null,
          statut: "valide",
          zone: "Abidjan",
        },
        {
          id: "p2",
          code: null,
          designation: "Sable lave",
          categorie: "Granulats",
          unite: "m3",
          prix_unitaire: 2800,
          source: "Catalogue",
          date_source: "2026-05-12",
          date_validite: "2026-12-31",
          statut: "a_verifier",
          zone: null,
        },
      ];
      const lignes: LigneImportReferentiel[] = [
        // identique a p1 -> inchangee
        {
          code: "CIM-01",
          designation: "Ciment CPJ 35",
          categorie: "Liants",
          unite: "sac",
          prix_unitaire: 4500,
          source: "Guide",
          date_source: "2026-06-01",
          date_validite: null,
          statut: "valide",
          zone: "Abidjan",
        },
        // meme code (minuscules) mais libelle et prix differents -> mise a jour de p1
        {
          code: "cim-01",
          designation: "Ciment CPJ 35 (sac 50 kg)",
          categorie: "Liants",
          unite: "sac",
          prix_unitaire: 4800,
          source: "Guide 2026",
          date_source: "2026-09-01",
          date_validite: null,
          statut: "valide",
          zone: "Abidjan",
        },
        // pas de code, designation identique -> mise a jour de p2
        {
          code: null,
          designation: "Sable lave",
          categorie: "Granulats",
          unite: "m3",
          prix_unitaire: 3000,
          source: "Catalogue",
          date_source: "2026-05-12",
          date_validite: "2026-12-31",
          statut: "a_verifier",
          zone: null,
        },
        // inconnue -> creation
        {
          code: "GRA-01",
          designation: "Gravier 15/25",
          categorie: "Granulats",
          unite: "m3",
          prix_unitaire: 9500,
          source: "Catalogue",
          date_source: "2026-09-01",
          date_validite: null,
          statut: "valide",
          zone: null,
        },
      ];
      const app = preparerApplicationImport(existants, lignes);
      assert.strictEqual(app.inchanges, 1);
      assert.strictEqual(app.aMettreAJour.length, 2);
      assert.strictEqual(app.aMettreAJour[0].id, "p1");
      assert.strictEqual(app.aMettreAJour[0].ancienPrix, 4500);
      assert.strictEqual(app.aMettreAJour[1].id, "p2");
      assert.strictEqual(app.aMettreAJour[1].ancienPrix, 2800);
      assert.strictEqual(app.aInserer.length, 1);
      assert.strictEqual(app.aInserer[0].code, "GRA-01");
    });
  });
});