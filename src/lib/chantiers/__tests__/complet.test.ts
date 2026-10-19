import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  analyserPK,
  avancementMoyenSections,
  detailSection,
  estNomChantierSimilaire,
  etatEcheance,
  formaterMetres,
  formaterPK,
  joursRestants,
  libelleTypeDocument,
  longueurSection,
  normaliserTelephone,
  tailleLisible,
} from "../complet.ts";

describe("chantiers : suivi complet (CHA-01, CHA-02, CHA-03)", () => {
  describe("CHA-02 : PK et sections", () => {
    it("formate une distance en PK lisible", () => {
      assert.strictEqual(formaterPK(0), "PK 0+000");
      assert.strictEqual(formaterPK(250), "PK 0+250");
      assert.strictEqual(formaterPK(2500), "PK 2+500");
      assert.strictEqual(formaterPK(12345), "PK 12+345");
      assert.strictEqual(formaterPK(null), null);
    });

    it("lit les PK saisis dans tous les formats courants", () => {
      assert.strictEqual(analyserPK("2+500"), 2500);
      assert.strictEqual(analyserPK("PK 2+500"), 2500);
      assert.strictEqual(analyserPK("0+250"), 250);
      assert.strictEqual(analyserPK("2+500,5"), 2500.5);
      assert.strictEqual(analyserPK("2500"), 2500);
      assert.strictEqual(analyserPK("2 500"), 2500);
      assert.strictEqual(analyserPK("abc"), null);
      assert.strictEqual(analyserPK(""), null);
    });

    it("calcule la longueur d'une section", () => {
      assert.strictEqual(longueurSection(0, 2500), 2500);
      assert.strictEqual(longueurSection(1000, 1000), null);
      assert.strictEqual(longueurSection(2000, 1000), null);
      assert.strictEqual(longueurSection(null, 1000), null);
    });

    it("affiche les distances en metres ou kilometres", () => {
      assert.strictEqual(formaterMetres(450), "450 m");
      assert.strictEqual(formaterMetres(2500), "2,5 km");
      assert.strictEqual(formaterMetres(12000), "12 km");
      assert.strictEqual(formaterMetres(null), null);
    });

    it("resume une section route ou batiment", () => {
      assert.strictEqual(
        detailSection({ pk_debut: 0, pk_fin: 2500 }),
        "PK 0+000 → PK 2+500 · 2,5 km",
      );
      assert.strictEqual(detailSection({ niveau: "R+1", lot: "Gros œuvre" }), "R+1 · Gros œuvre");
      assert.strictEqual(detailSection({}), "Sans détail");
    });
  });

  describe("suivi : avancement et echeances", () => {
    it("pondere l'avancement par la longueur quand les PK sont renseignes", () => {
      const avancement = avancementMoyenSections([
        { avancement_pct: 100, pk_debut: 0, pk_fin: 3000 },
        { avancement_pct: 0, pk_debut: 3000, pk_fin: 4000 },
      ]);
      assert.strictEqual(avancement, 75);
    });

    it("fait la moyenne simple sans PK (batiment)", () => {
      const avancement = avancementMoyenSections([
        { avancement_pct: 50 },
        { avancement_pct: 80 },
      ]);
      assert.strictEqual(avancement, 65);
    });

    it("renvoie null sans section", () => {
      assert.strictEqual(avancementMoyenSections([]), null);
    });

    it("calcule les jours restants", () => {
      const reference = new Date("2026-10-19T09:00:00");
      assert.strictEqual(joursRestants("2026-10-29", reference), 10);
      assert.strictEqual(joursRestants("2026-10-14", reference), -5);
      assert.strictEqual(joursRestants(null, reference), null);
    });

    it("classe l'echeance du chantier", () => {
      const reference = new Date("2026-10-19T09:00:00");
      assert.strictEqual(etatEcheance("2026-10-29", "en_cours", reference), "proche");
      assert.strictEqual(etatEcheance("2026-10-14", "en_cours", reference), "depasse");
      assert.strictEqual(etatEcheance("2027-06-01", "en_cours", reference), "normal");
      assert.strictEqual(etatEcheance("2026-10-14", "cloture", reference), "cloture");
      assert.strictEqual(etatEcheance(null, "en_cours", reference), "inconnu");
    });
  });

  describe("CHA-01 : intervenants", () => {
    it("normalise un numero ivoirien pour le lien telephone", () => {
      assert.strictEqual(normaliserTelephone("07 07 12 34 56"), "+2250707123456");
      assert.strictEqual(normaliserTelephone("+225 07 07 12 34 56"), "+2250707123456");
      assert.strictEqual(normaliserTelephone("00225 0707123456"), "+2250707123456");
      assert.strictEqual(normaliserTelephone("225 27 22 40 00 00"), "+2252722400000");
      assert.strictEqual(normaliserTelephone(""), null);
      assert.strictEqual(normaliserTelephone("abc"), null);
    });

    it("detecte deux noms de chantier identiques", () => {
      assert.strictEqual(estNomChantierSimilaire("Route Bingerville", "route  bingerville !"), true);
      assert.strictEqual(estNomChantierSimilaire("Route Bingerville", "Route Abidjan"), false);
    });
  });

  describe("CHA-03 : documents", () => {
    it("traduit le type de document", () => {
      assert.strictEqual(libelleTypeDocument("plan"), "Plan");
      assert.strictEqual(libelleTypeDocument("ordre_service"), "Ordre de service");
      assert.strictEqual(libelleTypeDocument("inconnu"), "Autre");
      assert.strictEqual(libelleTypeDocument(null), "Autre");
    });

    it("affiche une taille de fichier lisible", () => {
      assert.strictEqual(tailleLisible(512), "512 o");
      assert.strictEqual(tailleLisible(348160), "340 Ko");
      assert.strictEqual(tailleLisible(1258291), "1,2 Mo");
      assert.strictEqual(tailleLisible(null), "—");
    });
  });
});
