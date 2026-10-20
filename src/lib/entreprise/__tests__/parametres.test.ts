import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  corpsRapport,
  erreurDestinataires,
  estEmailValide,
  htmlRapport,
  libelleTauxConformite,
  lienMailto,
  nomFichierRapport,
  objetRapport,
  parseDestinataires,
  type DonneesRapportEmail,
} from "../parametres.ts";

const donnees: DonneesRapportEmail = {
  chantier: "Route de Yamoussoukro",
  debut: "2026-10-01",
  fin: "2026-10-31",
  avancement: 42.35,
  montantMarche: 120000000,
  valorisation: 50820000,
  depenses: 42100000,
  marge: 8720000,
  nbJournaux: 28,
  nonConformitesOuvertes: 3,
  tauxConformite: 96.4,
  delai: "Retard de 5 jours",
};

describe("entreprise et envoi des rapports (REP-04, REP-05)", () => {
  describe("taux de conformité", () => {
    it("affiche le taux quand des essais ont été réalisés", () => {
      assert.strictEqual(libelleTauxConformite(96.4), "96,4 %");
    });

    it("indique « non applicable » quand aucun essai n'a été réalisé", () => {
      assert.strictEqual(libelleTauxConformite(null), "non applicable (aucun essai réalisé)");
      const corps = corpsRapport({ ...donnees, tauxConformite: null });
      assert.ok(corps.includes("non applicable"));
    });
  });
  describe("destinataires", () => {
    it("valide une adresse", () => {
      assert.strictEqual(estEmailValide("responsable@entreprise.ci"), true);
      assert.strictEqual(estEmailValide("pas-une-adresse"), false);
      assert.strictEqual(estEmailValide(""), false);
    });

    it("extrait les adresses d'une saisie libre", () => {
      const liste = parseDestinataires("a@entreprise.ci, b@entreprise.ci ; c@entreprise.ci");
      assert.deepStrictEqual(liste, ["a@entreprise.ci", "b@entreprise.ci", "c@entreprise.ci"]);
    });

    it("ignore les adresses invalides et les doublons", () => {
      const liste = parseDestinataires("A@entreprise.ci, a@entreprise.ci, invalide, b@entreprise.ci");
      assert.deepStrictEqual(liste, ["a@entreprise.ci", "b@entreprise.ci"]);
    });

    it("signale l'absence de destinataire valide", () => {
      assert.ok(erreurDestinataires([]));
      assert.strictEqual(erreurDestinataires(["a@entreprise.ci"]), null);
    });
  });

  describe("message", () => {
    it("construit un objet lisible", () => {
      assert.strictEqual(
        objetRapport(donnees),
        "Rapport de suivi — Route de Yamoussoukro (2026-10-01 au 2026-10-31)",
      );
    });

    it("met les chiffres clés dans le corps du message", () => {
      const corps = corpsRapport(donnees);
      assert.match(corps, /Route de Yamoussoukro/);
      assert.match(corps, /120\s?000\s?000 FCFA/);
      assert.match(corps, /8\s?720\s?000 FCFA/);
      assert.match(corps, /42,4 %/);
      assert.match(corps, /Retard de 5 jours/);
    });

    it("construit un lien mailto de secours", () => {
      const lien = lienMailto(["a@entreprise.ci"], objetRapport(donnees), corpsRapport(donnees));
      assert.match(lien, /^mailto:a@entreprise\.ci\?subject=/);
      assert.match(lien, /body=/);
    });
  });

  describe("fichier joint", () => {
    it("donne un nom de fichier exploitable", () => {
      assert.strictEqual(
        nomFichierRapport(donnees),
        "rapport_route-de-yamoussoukro_2026-10-01_2026-10-31.html",
      );
    });

    it("produit un document autonome avec le logo et les chiffres", () => {
      const html = htmlRapport(
        donnees,
        {
          nom: "SODECI",
          sigle: "SODECI SA",
          adresse: null,
          ville: null,
          telephone: null,
          email: "contact@sodeci.ci",
          nif: "123456",
          rccm: "CI-ABC",
          logo: null,
          destinataires: [],
        },
        "data:image/png;base64,LOGO",
        [{ code: "CIM-01", designation: "Ciment", quantiteMarche: 100, quantiteRealisee: 80, montantRealise: 360000 }],
      );
      assert.match(html, /<!doctype html>/i);
      assert.match(html, /data:image\/png;base64,LOGO/);
      assert.match(html, /SODECI SA/);
      assert.match(html, /42,4 %/);
      assert.match(html, /Ciment/);
      assert.match(html, /CI-ABC/);
    });
  });
});
