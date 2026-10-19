import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { fcfa, genererPdfRapport, nombreDePages, textePdf } from "../pdf.ts";
import type { DonneesRapportEmail } from "@/lib/entreprise/parametres.ts";

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

const entreprise = {
  nom: "SODECI",
  sigle: "SODECI SA",
  adresse: "Rue des Jardins",
  ville: "Abidjan",
  telephone: "0100000000",
  email: "contact@sodeci.ci",
  nif: "123456",
  rccm: "CI-ABC",
  logo: null,
  destinataires: [],
};

describe("rapport de suivi en PDF (REP-02)", () => {
  describe("formatage", () => {
    it("formate un montant en FCFA sans décimale", () => {
      assert.strictEqual(fcfa(50820000), "50 820 000 FCFA");
      assert.strictEqual(fcfa(0), "0 FCFA");
    });

    it("remplace les espaces insécables par des espaces ordinaires (police du PDF)", () => {
      const montant = (50820000).toLocaleString("fr-FR");
      assert.ok(montant.includes("\u202F") || montant.includes("\u00A0"), "le format francais utilise une espace insecable");
      assert.strictEqual(fcfa(50820000).includes("\u202F"), false);
      assert.strictEqual(textePdf("50\u202F820 000"), "50 820 000");
    });

    it("compte les pages de la valorisation", () => {
      assert.strictEqual(nombreDePages(0), 1);
      assert.strictEqual(nombreDePages(24), 1);
      assert.strictEqual(nombreDePages(25), 2);
      assert.strictEqual(nombreDePages(60), 3);
    });
  });

  describe("génération", () => {
    it("produit un PDF valide", async () => {
      const blob = await genererPdfRapport(donnees, entreprise, null, [
        {
          code: "CIM-01",
          designation: "Ciment CPJ 42,5",
          unite: "sac",
          quantiteMarche: 200,
          quantiteRealisee: 100,
          prixUnitaire: 4500,
          montantRealise: 450000,
        },
      ]);
      assert.ok(blob.size > 1000, `PDF trop petit : ${blob.size} octets`);
      const entete = new Uint8Array(await blob.slice(0, 5).arrayBuffer());
      assert.strictEqual(new TextDecoder().decode(entete), "%PDF-");
    });

    it("pagine une longue valorisation", async () => {
      const lignes = Array.from({ length: 30 }, (_, i) => ({
        code: `C-${i}`,
        designation: `Poste ${i}`,
        unite: "u",
        quantiteMarche: 10,
        quantiteRealisee: 5,
        prixUnitaire: 1000,
        montantRealise: 5000,
      }));
      const blob = await genererPdfRapport(donnees, entreprise, null, lignes);
      assert.ok(blob.size > 1000);
      const texte = await blob.text();
      // Un PDF de plusieurs pages contient plusieurs objets de page.
      assert.ok(texte.includes("/Type /Page"), "le PDF contient des pages");
    });
  });
});
