import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  choisirOffre,
  comparerOffres,
  grouperParPoste,
  memesUnites,
  messageDemandeDevis,
  objetDemandeDevis,
  offrePerimee,
  propagationVersBasePrix,
  type OffreFournisseur,
} from "../conditions.ts";

function offre(partial: Partial<OffreFournisseur> = {}): OffreFournisseur {
  return {
    id: "o1",
    fournisseurId: "f1",
    fournisseurNom: "SODECI",
    poste: "Ciment",
    unite: "sac",
    prixUnitaire: 4800,
    delaiLivraisonJours: 7,
    conditions: "Livraison gratuite",
    dateDevis: "2026-10-01",
    choisi: false,
    motifChoix: null,
    ...partial,
  };
}

describe("conditions tarifaires des fournisseurs (FOU-03, FOU-04)", () => {
  describe("comparaison des offres d'un poste", () => {
    const offres = [
      offre({ id: "o1", fournisseurNom: "SODECI", prixUnitaire: 4800, delaiLivraisonJours: 10 }),
      offre({ id: "o2", fournisseurNom: "BETON CI", prixUnitaire: 4500, delaiLivraisonJours: 3 }),
      offre({ id: "o3", fournisseurNom: "LATIERES", prixUnitaire: 5000, delaiLivraisonJours: 5 }),
    ];

    it("classe les offres par prix croissant", () => {
      const comparaison = comparerOffres(offres);
      assert.deepStrictEqual(
        comparaison.offres.map((o) => o.fournisseurNom),
        ["BETON CI", "SODECI", "LATIERES"],
      );
    });

    it("designe la meilleure offre", () => {
      const comparaison = comparerOffres(offres);
      assert.strictEqual(comparaison.meilleureOffre?.fournisseurNom, "BETON CI");
    });

    it("designe l'offre la plus rapide", () => {
      const comparaison = comparerOffres(offres);
      assert.strictEqual(comparaison.offreLaPlusRapide?.fournisseurNom, "BETON CI");
    });

    it("calcule l'ecart de prix en pourcentage", () => {
      const comparaison = comparerOffres(offres);
      // (5000 - 4500) / 4500 = 11,11 %
      assert.ok(Math.abs(comparaison.ecartPourcent - 11.111) < 0.01);
    });

    it("ne compare que les offres de meme unite", () => {
      const comparaison = comparerOffres([
        offre({ id: "a", unite: "sac", prixUnitaire: 4800 }),
        offre({ id: "b", unite: "tonne", prixUnitaire: 40000 }),
      ]);
      assert.strictEqual(comparaison.offresComparables, 2);
      assert.strictEqual(memesUnites(offre({ unite: "sac" }), offre({ unite: "tonne" })), false);
      assert.strictEqual(memesUnites(offre({ unite: "sac" }), offre({ unite: "sac" })), true);
    });
  });

  describe("regroupement par poste", () => {
    it("repartit les offres par poste", () => {
      const groupes = grouperParPoste([
        offre({ id: "a", poste: "Ciment" }),
        offre({ id: "b", poste: "ciment" }),
        offre({ id: "c", poste: "Sable" }),
      ]);
      assert.strictEqual(groupes.length, 2);
      const ciment = groupes.find((g) => g.poste.toLowerCase() === "ciment");
      assert.ok(ciment);
      assert.strictEqual(ciment!.offres.length, 2);
    });
  });

  describe("choix motive (FOU-04)", () => {
    const offres = [
      offre({ id: "o1", prixUnitaire: 4800 }),
      offre({ id: "o2", prixUnitaire: 4500, choisi: true, motifChoix: "Moins cher" }),
    ];

    it("exige un motif", () => {
      const resultat = choisirOffre(offres, "o1", "   ");
      assert.ok(resultat.erreur);
      assert.match(resultat.erreur!, /motive/i);
    });

    it("refuse une offre inconnue", () => {
      const resultat = choisirOffre(offres, "inconnu", "delai plus court");
      assert.ok(resultat.erreur);
    });

    it("enregistre le choix et son motif, decoche les autres du meme poste", () => {
      const resultat = choisirOffre(offres, "o1", "delai plus court");
      assert.strictEqual(resultat.erreur, null);
      const choisie = resultat.offres.find((o) => o.id === "o1");
      const autre = resultat.offres.find((o) => o.id === "o2");
      assert.strictEqual(choisie?.choisi, true);
      assert.strictEqual(choisie?.motifChoix, "delai plus court");
      assert.strictEqual(autre?.choisi, false);
    });
  });

  describe("validite d'une offre", () => {
    it("signale une offre perimee", () => {
      const reference = new Date("2026-10-20T00:00:00");
      // Offre du 01/09 valable 30 jours : echue le 01/10 -> perimee
      assert.strictEqual(offrePerimee("2026-09-01", 30, reference), true);
      // Offre du 15/10 valable 30 jours : encore valable
      assert.strictEqual(offrePerimee("2026-10-15", 30, reference), false);
      assert.strictEqual(offrePerimee("2026-01-01", null, reference), false);
    });
  });

  describe("FOU-08 : demande de devis", () => {
    it("prépare un message complet", () => {
      const message = messageDemandeDevis({
        fournisseur: "SODECI",
        chantier: "Route de Yamoussoukro",
        poste: "Ciment CPJ 42,5",
        quantite: 200,
        unite: "sac",
        delaiSouhaiteJours: 7,
        dateReponse: "2026-10-25",
      });
      assert.match(message, /Bonjour SODECI/);
      assert.match(message, /Route de Yamoussoukro/);
      assert.match(message, /Ciment CPJ 42,5/);
      assert.match(message, /200 sac/);
      assert.match(message, /7 jour/);
      assert.match(message, /2026-10-25/);
    });

    it("indique les informations à préciser quand elles manquent", () => {
      const message = messageDemandeDevis({
        fournisseur: "BETON CI",
        chantier: "Dalle",
        poste: "Béton C30/37",
        quantite: null,
        unite: null,
        delaiSouhaiteJours: null,
        dateReponse: null,
      });
      assert.match(message, /à préciser/);
    });

    it("construit un objet lisible", () => {
      assert.strictEqual(
        objetDemandeDevis("Route de Yamoussoukro", "Ciment"),
        "Demande de devis — Route de Yamoussoukro — Ciment",
      );
    });
  });

  describe("propagation du prix retenu vers la base de prix", () => {
    it("porte la source et la date du devis (REF-04)", () => {
      const propagation = propagationVersBasePrix(
        offre({ fournisseurNom: "SODECI", prixUnitaire: 4800, dateDevis: "2026-10-01", motifChoix: "meilleur delai" }),
      );
      assert.strictEqual(propagation.prix_unitaire, 4800);
      assert.strictEqual(propagation.date_source, "2026-10-01");
      assert.match(propagation.source, /SODECI/);
      assert.match(propagation.source, /2026-10-01/);
      assert.match(propagation.motif, /meilleur delai/);
    });
  });
});
