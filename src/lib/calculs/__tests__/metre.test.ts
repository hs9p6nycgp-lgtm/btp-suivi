import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  avancementFinancier,
  avancementPhysiqueGlobal,
  avancementPoste,
  arrondir2Decimales,
  ecartBudgetaire,
  ecartQuantite,
  indicePerformanceCoût,
  indicePerformanceDelai,
  joursEcartDelai,
  margeTotaleTache,
  nombreBennes,
  rendementEngin,
  ratioAcier,
  surfaceRectangle,
  tauxConformite,
  tauxDisponiteEngin,
  volumeBeton,
  volumeCouche,
  volumeFoisonne,
} from "../metre.ts";

describe("formules de la section 5 du cahier des charges", () => {
  describe("indicateur 5.1 - écart de quantité", () => {
    it("calcule le pourcentage d'écart", () => {
      assert.strictEqual(ecartQuantite(110, 100), 10);
      assert.strictEqual(ecartQuantite(90, 100), -10);
      assert.strictEqual(ecartQuantite(100, 100), 0);
    });

    it("retourne 0 quand la quantité prévue est nulle", () => {
      assert.strictEqual(ecartQuantite(50, 0), 0);
    });
  });

  describe("indicateur 5.2 - avancement physique global", () => {
    it("fait la moyenne pondérée des avancements", () => {
      const avancements = [
        { avancementPct: 50, montant: 1000 },
        { avancementPct: 100, montant: 3000 },
      ];
      // (50 × 1000 + 100 × 3000) / 4000 = 87,5
      assert.strictEqual(avancementPhysiqueGlobal(avancements, 4000), 87.5);
    });

    it("retourne 0 si le montant total est nul", () => {
      assert.strictEqual(avancementPhysiqueGlobal([], 0), 0);
    });
  });

  describe("indicateur 5.3 - avancement financier", () => {
    it("calcule le pourcentage réalisé", () => {
      assert.strictEqual(avancementFinancier(800, 1000), 80);
    });

    it("retourne 0 si le montant du marché est nul", () => {
      assert.strictEqual(avancementFinancier(500, 0), 0);
    });
  });

  describe("indicateur 5.4 - écart de délai", () => {
    it("compte les jours entre la fin prévue et la fin contractuelle", () => {
      // fin prévue le 31/12/2026, fin contractuelle le 20/12/2026 → 11 jours
      assert.strictEqual(joursEcartDelai("2026-12-31", "2026-12-20"), 11);
    });

    it("retourne 0 si une des dates manque", () => {
      assert.strictEqual(joursEcartDelai(null, "2026-12-20"), 0);
      assert.strictEqual(joursEcartDelai("2026-12-31", null), 0);
    });
  });

  describe("indicateur 5.5 - écart budgétaire", () => {
    it("calcule la différence entre le réel et le prévu", () => {
      assert.strictEqual(ecartBudgetaire(950, 1000), -50);
      assert.strictEqual(ecartBudgetaire(1050, 1000), 50);
    });
  });

  describe("indicateur 5.6 - rendement d'un engin", () => {
    it("divise la quantité produite par les heures de marche", () => {
      assert.strictEqual(rendementEngin(120, 1.5), 80);
    });
  });

  describe("indicateur 5.7 - taux de disponibilité", () => {
    it("calcule le rapport heures de marche sur heures prévues", () => {
      assert.strictEqual(tauxDisponiteEngin(90, 100), 90);
    });

    it("retourne 0 si rien n'était prévu", () => {
      assert.strictEqual(tauxDisponiteEngin(10, 0), 0);
    });
  });

  describe("indicateur 5.8 - taux de conformité qualité", () => {
    it("calcule le pourcentage de contrôles conformes", () => {
      assert.strictEqual(tauxConformite(8, 10), 80);
    });

    it("retourne 0 s'il n'y a aucun contrôle", () => {
      assert.strictEqual(tauxConformite(0, 0), 0);
    });
  });

  describe("indicateur 5.9 - marge totale d'une tâche (PERT)", () => {
    it("compte les jours entre la fin au plus tard et la fin au plus tôt", () => {
      assert.strictEqual(margeTotaleTache("2026-12-31", "2026-11-30"), 31);
    });

    it("retourne 0 si une des dates manque", () => {
      assert.strictEqual(margeTotaleTache(null, "2026-11-30"), 0);
      assert.strictEqual(margeTotaleTache("2026-12-31", null), 0);
    });
  });

  describe("indicateurs 5.10 et 5.11 - indices de performance", () => {
    it("calcule l'indice coût", () => {
      assert.strictEqual(indicePerformanceCoût(800, 1000), 0.8);
    });

    it("calcule l'indice du délai", () => {
      assert.strictEqual(indicePerformanceDelai(200, 250), 0.8);
    });
  });

  describe("fonctions déjà existantes (régression)", () => {
    it("calcule le volume d'une couche", () => {
      // 570,16 × 6 × 0,15 = 513,144 m³
      assert.strictEqual(volumeCouche(570.16, 6, 0.15), 513.144);
    });

    it("applique le coefficient de foisonnement", () => {
      assert.strictEqual(volumeFoisonne(100, 1.2), 120);
    });

    it("arrondit toujours à l'entier supérieur le nombre de bennes", () => {
      // 120 m³ / 15 m³ = 8 bennes
      assert.strictEqual(nombreBennes(120, 15), 8);
      // 121 m³ / 15 m³ = 8,07 → 9 bennes
      assert.strictEqual(nombreBennes(121, 15), 9);
    });

    it("calcule le volume de béton", () => {
      const total = volumeBeton([
        { longueur: 10, largeur: 5, hauteur: 0.2 },
        { longueur: 4, largeur: 3, hauteur: 0.3 },
      ]);
      assert.strictEqual(total, 10 + 3.6);
    });

    it("calcule le ratio d'acier", () => {
      assert.strictEqual(ratioAcier(5000, 1000), 5);
    });

    it("calcule la surface d'un rectangle", () => {
      assert.strictEqual(surfaceRectangle(10, 5), 50);
    });

    it("calcule l'avancement physique d'un poste", () => {
      assert.strictEqual(avancementPoste(50, 100), 50);
    });

    it("arrondit à deux décimales", () => {
      assert.strictEqual(arrondir2Decimales(1.13), 1.13);
    });
  });
});
