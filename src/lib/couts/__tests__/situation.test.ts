import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  alertesSituation,
  calculerSituation,
  LIBELLES_STATUT,
  prochainNumero,
  situationModifiable,
  totalDecompteAnterieur,
  valorisationCumulee,
  type LigneValorisationSituation,
  type Situation,
} from "../situation.ts";

const postes: LigneValorisationSituation[] = [
  {
    posteDqeId: "p1",
    code: "CIM-01",
    designation: "Ciment CPJ 42,5",
    unite: "sac",
    quantiteMarche: 200,
    quantiteRealisee: 0,
    prixUnitaire: 4500,
  },
  {
    posteDqeId: "p2",
    code: "ENR-01",
    designation: "Enrobe a chaud",
    unite: "t",
    quantiteMarche: 100,
    quantiteRealisee: 0,
    prixUnitaire: 95000,
  },
];

describe("situations de paiement (décomptes)", () => {
  describe("valorisation cumulée", () => {
    it("additionne les quantités réalisées jusqu'à la date", () => {
      const resultat = valorisationCumulee(
        postes,
        [
          { posteDqeId: "p1", quantite: 50, date: "2026-10-05" },
          { posteDqeId: "p1", quantite: 20, date: "2026-10-20" },
          { posteDqeId: "p2", quantite: 10, date: "2026-10-10" },
        ],
        "2026-10-31",
      );
      // 70 sacs × 4 500 + 10 t × 95 000
      assert.strictEqual(resultat.montant, 70 * 4500 + 10 * 95000);
      assert.strictEqual(resultat.lignes.length, 2);
    });

    it("separe le cumul anterieur de la periode en cumulant deux fois", () => {
      const quantites = [
        { posteDqeId: "p1", quantite: 50, date: "2026-09-30" },
        { posteDqeId: "p1", quantite: 20, date: "2026-10-20" },
      ];
      // Cumul avant la periode (jusqu'au 30/09)
      const avant = valorisationCumulee(postes, quantites, "2026-09-30");
      // Cumul a la fin de la periode (jusqu'au 31/10)
      const fin = valorisationCumulee(postes, quantites, "2026-10-31");
      assert.strictEqual(avant.montant, 50 * 4500);
      assert.strictEqual(fin.montant, 70 * 4500);
      // La valeur de la periode est la difference
      assert.strictEqual(fin.montant - avant.montant, 20 * 4500);
    });

    it("calcule l'avancement de chaque poste", () => {
      const resultat = valorisationCumulee(
        postes,
        [{ posteDqeId: "p1", quantite: 50, date: "2026-10-05" }],
        "2026-10-31",
      );
      assert.strictEqual(resultat.lignes[0].avancementPct, 25);
      assert.strictEqual(resultat.lignes[0].montantMarche, 200 * 4500);
    });
  });

  describe("calcul de la situation", () => {
    it("déduit les décomptes antérieurs du montant brut", () => {
      const calcul = calculerSituation({
        cumulAvant: 0,
        cumulPeriode: 10_000_000,
        decompteAnterieur: 4_000_000,
        acomptes: 0,
        tauxRetenue: 10,
        montantMarche: 50_000_000,
      });
      assert.strictEqual(calcul.cumulTotal, 10_000_000);
      assert.strictEqual(calcul.montantBrut, 6_000_000);
      assert.strictEqual(calcul.retenue, 600_000);
      assert.strictEqual(calcul.netAPayer, 5_400_000);
      assert.strictEqual(calcul.resteDuMarche, 40_000_000);
      assert.strictEqual(calcul.progressionPct, 20);
    });

    it("déduit les acomptes du net à payer", () => {
      const calcul = calculerSituation({
        cumulAvant: 0,
        cumulPeriode: 10_000_000,
        decompteAnterieur: 0,
        acomptes: 2_000_000,
        tauxRetenue: 0,
        montantMarche: 50_000_000,
      });
      assert.strictEqual(calcul.netAPayer, 8_000_000);
    });

    it("ne descend jamais sous zéro", () => {
      const calcul = calculerSituation({
        cumulAvant: 0,
        cumulPeriode: 1_000_000,
        decompteAnterieur: 5_000_000,
        acomptes: 0,
        tauxRetenue: 10,
        montantMarche: 10_000_000,
      });
      assert.strictEqual(calcul.montantBrut, 0);
      assert.strictEqual(calcul.netAPayer, 0);
    });
  });

  describe("numérotation et statuts", () => {
    it("propose le numéro suivant", () => {
      assert.strictEqual(prochainNumero([]), "SIT-001");
      assert.strictEqual(prochainNumero([{ numero: "SIT-001" }, { numero: "SIT-007" }]), "SIT-008");
    });

    it("traduit les statuts", () => {
      assert.strictEqual(LIBELLES_STATUT.soumise.fr, "Soumise");
      assert.strictEqual(LIBELLES_STATUT.paye.fr, "Payée");
    });

    it("n autorise la modification que des situations non soldees", () => {
      assert.strictEqual(situationModifiable({ statut: "brouillon" }), true);
      assert.strictEqual(situationModifiable({ statut: "soumise" }), true);
      assert.strictEqual(situationModifiable({ statut: "acceptee" }), false);
      assert.strictEqual(situationModifiable({ statut: "paye" }), false);
    });

    it("cumule les decomptes anterieurs selon leur statut", () => {
      const situations = [
        { statut: "acceptee" as const, montant_brut: 1000 },
        { statut: "paye" as const, montant_brut: 2000 },
        { statut: "rejetee" as const, montant_brut: 5000 },
        { statut: "brouillon" as const, montant_brut: 7000 },
      ];
      assert.strictEqual(totalDecompteAnterieur(situations), 3000);
    });
  });

  describe("points de vigilance", () => {
    it("signale une periode incoherent", () => {
      const alertes = alertesSituation(
        {
          numero: "SIT-001",
          periode_debut: "2026-10-31",
          periode_fin: "2026-10-01",
          cumul_periode: 100,
          taux_retenue: 10,
          statut: "brouillon",
        },
        [],
        1000,
        100,
      );
      assert.ok(alertes.some((a) => a.niveau === "bloquant"));
    });

    it("signale une retenue excessive et un cumul superieur au marche", () => {
      const alertes = alertesSituation(
        {
          numero: "SIT-002",
          periode_debut: "2026-10-01",
          periode_fin: "2026-10-31",
          cumul_periode: 5000,
          taux_retenue: 15,
          statut: "brouillon",
        },
        [],
        1000,
        5000,
      );
      assert.ok(alertes.some((a) => a.message.includes("Retenue de garantie")));
      assert.ok(alertes.some((a) => a.message.includes("dépasse le montant du marché")));
    });

    it("signale un chevauchement de periodes", () => {
      const alertes = alertesSituation(
        {
          numero: "SIT-003",
          periode_debut: "2026-10-01",
          periode_fin: "2026-10-31",
          cumul_periode: 100,
          taux_retenue: 10,
          statut: "brouillon",
        },
        [{ numero: "SIT-002", periode_debut: "2026-10-15", periode_fin: "2026-11-15" }],
        1000,
        100,
      );
      assert.ok(alertes.some((a) => a.message.includes("chevauche")));
    });
  });
});
