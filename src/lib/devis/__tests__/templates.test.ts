import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { templates } from "../templates.ts";

function rendu(id: string, inputs: Record<string, string>) {
  const t = templates.find((x) => x.id === id)!;
  const defauts: Record<string, string> = Object.fromEntries(
    t.inputs.map((inp) => [inp.id, inp.default]),
  );
  return { t, i: { ...defauts, ...inputs } };
}

function qte(id: string, code: string, inputs: Record<string, string> = {}) {
  const { t, i } = rendu(id, inputs);
  const ligne = t.lignes.find((l) => l.code === code)!;
  return ligne.quantite(i);
}

describe("templates de devis - structure", () => {
  it("les identifiants de modeles sont uniques", () => {
    const ids = templates.map((t) => t.id);
    assert.strictEqual(new Set(ids).size, ids.length);
  });

  it("les codes de lignes sont uniques dans chaque modele", () => {
    for (const t of templates) {
      const codes = t.lignes.map((l) => l.code);
      assert.strictEqual(new Set(codes).size, codes.length, `doublon dans ${t.id}`);
    }
  });

  it("toutes les quantites sont finies et positives pour les valeurs par defaut", () => {
    for (const t of templates) {
      const i = Object.fromEntries(t.inputs.map((inp) => [inp.id, inp.default]));
      for (const ligne of t.lignes) {
        const q = ligne.quantite(i);
        assert.ok(Number.isFinite(q), `${t.id}/${ligne.code} non finie`);
        assert.ok(q >= 0, `${t.id}/${ligne.code} negative`);
      }
    }
  });

  it("chaque modele propose un planning non vide", () => {
    for (const t of templates) {
      const i = Object.fromEntries(t.inputs.map((inp) => [inp.id, inp.default]));
      const taches = t.taches(i);
      assert.ok(taches.length > 0, `${t.id} sans planning`);
      for (const tache of taches) {
        assert.ok(tache.jours >= 1, `${t.id}/${tache.nom} : duree < 1 jour`);
      }
    }
  });
});

describe("templates de devis - formules du cahier des charges (section 5)", () => {
  it("volume de couche = L x l x e", () => {
    // 100 x 7 x 0.25 = 175
    assert.strictEqual(qte("terrassement-route", "TERR-VOL"), 175);
  });

  it("volume foisonne = volume x coefficient", () => {
    // 175 x 1.2 = 210
    assert.strictEqual(qte("terrassement-route", "TERR-FOISON"), 210);
  });

  it("nombre de bennes = arrondi a l'entier superieur", () => {
    // 210 / 15 = 14 -> 14 ; avec capacite 13 : 210/13 = 16.15 -> 17
    assert.strictEqual(qte("terrassement-route", "TERR-BENNES"), 14);
    assert.strictEqual(qte("terrassement-route", "TERR-BENNES", { capacite_benne: "13" }), 17);
  });

  it("le nombre de bennes est toujours un entier", () => {
    for (const id of ["terrassement-route", "chaussee-bitume", "assainissement-fouille", "remblai-apport"]) {
      const q = qte(id, id === "chaussee-bitume" ? "CHAUSS-BENNES" : id === "assainissement-fouille" ? "ASS-BENNES" : id === "remblai-apport" ? "REM-BENNES" : "TERR-BENNES");
      assert.strictEqual(q, Math.ceil(q), `${id}: ${q} non entier`);
    }
  });

  it("volume de beton = L x l x e (dalle)", () => {
    // 10 x 5 x 0.12 = 6
    assert.strictEqual(qte("dalle-beton", "DALLE-BETON"), 6);
  });

  it("ratio d'acier = volume x ratio (dalle)", () => {
    // 6 x 80 = 480
    assert.strictEqual(qte("dalle-beton", "DALLE-ACIER"), 480);
  });

  it("rendement peinture = surface x couches / rendement", () => {
    // 100 x 2 / 10 = 20
    assert.strictEqual(qte("peinture", "PEINT-QTE"), 20);
  });

  it("volume de beton des pieux = nb x pi x (d/2)^2 x h", () => {
    // 6 x pi x 0.09 x 8 = 13.5716...
    const attendu = 6 * Math.PI * Math.pow(0.3, 2) * 8;
    assert.ok(Math.abs(qte("fondations-profondes", "PIEUX-VOL") - attendu) < 1e-9);
  });
});

describe("templates de devis - details", () => {
  it("mur : nombre de blocs avec pertes (surface / 0.08 x 1.05)", () => {
    // surface nette = 10 x 2.8 x 0.95 = 26.6 ; 26.6/0.08 x 1.05 = 349.125 -> 350
    assert.strictEqual(qte("mur-agglos", "MUR-BLOCS"), 350);
  });

  it("mur : enduit sur 2 faces par defaut", () => {
    // 26.6 x 2 = 53.2
    assert.ok(Math.abs(qte("mur-agglos", "MUR-ENDUIT") - 53.2) < 1e-9);
    // et sur 1 face
    assert.ok(Math.abs(qte("mur-agglos", "MUR-ENDUIT", { faces_enduites: "1" }) - 26.6) < 1e-9);
  });

  it("chaussee : enrobe en tonnes (volume x densite)", () => {
    // 100 x 7 x 0.05 x 2.3 = 80.5 t
    assert.ok(Math.abs(qte("chaussee-bitume", "CHAUSS-ENROBE") - 80.5) < 1e-9);
  });

  it("assainissement : remblai egal au volume de fouille", () => {
    // 50 x 0.8 x 1.2 = 48
    assert.strictEqual(qte("assainissement-fouille", "ASS-TERR"), 48);
    assert.strictEqual(qte("assainissement-fouille", "ASS-REMBLAI"), 48);
  });

  it("toutes les lignes avec mots-cles ont au moins un mot-cle", () => {
    for (const t of templates) {
      for (const l of t.lignes) {
        if (l.keywords.length > 0) {
          for (const k of l.keywords) {
            assert.ok(k.trim().length >= 2, `${t.id}/${l.code} : mot-cle trop court`);
          }
        }
      }
    }
  });
});
