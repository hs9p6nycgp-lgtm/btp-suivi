// Tests de la modélisation 3D des devis (src/lib/devis/model3d.ts).
// Vérifient : couverture des 15 modèles, géométrie saine, dimensions clés.

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { modele3dDevis, templatesAvecModele3d } from "../model3d.ts";
import { templates } from "../templates.ts";

function entreesDefaut(t: (typeof templates)[number]): Record<string, string> {
  return Object.fromEntries(t.inputs.map((e) => [e.id, e.default]));
}

function modelePour(id: string, entrees?: Record<string, string>) {
  const t = templates.find((x) => x.id === id);
  assert.ok(t, `modèle de devis introuvable : ${id}`);
  const m = modele3dDevis(t, entrees ?? entreesDefaut(t));
  assert.ok(m, `pas de modèle 3D pour ${id}`);
  return m;
}

function elementParId(m: ReturnType<typeof modelePour>, id: string) {
  const el = m.elements.find((e) => e.id === id);
  assert.ok(el, `élément introuvable : ${id}`);
  return el;
}

describe("modele3dDevis", () => {
  it("les 15 modèles de devis ont une représentation 3D", () => {
    assert.equal(templatesAvecModele3d().length, templates.length);
    for (const t of templates) {
      const m = modele3dDevis(t, entreesDefaut(t));
      assert.ok(m, `modèle 3D manquant pour ${t.id}`);
      assert.ok(m.elements.length >= 1, `aucun élément 3D pour ${t.id}`);
      assert.ok(m.resume.length > 0, `résumé vide pour ${t.id}`);
      assert.equal(m.templateId, t.id);
      assert.equal(m.nom, t.nom);
    }
  });

  it("géométrie saine : tailles positives, positions et dimensions finies", () => {
    for (const t of templates) {
      const m = modele3dDevis(t, entreesDefaut(t));
      assert.ok(m);
      for (const el of m.elements) {
        assert.ok(el.forme === "boite" || el.forme === "cylindre");
        assert.match(el.couleur, /^#[0-9a-f]{6}$/i);
        for (const v of [...el.taille, ...el.position]) assert.ok(Number.isFinite(v));
        for (const v of el.taille) assert.ok(v >= 0.01, `${el.id} : taille ${v} < 0,01 m`);
        if (el.rotation) assert.equal(el.rotation.length, 3);
      }
      for (const v of [...m.dimensions, ...m.centre]) assert.ok(Number.isFinite(v));
      for (const v of m.dimensions) assert.ok(v > 0, `${t.id} : encombrement ${v} <= 0`);
    }
  });

  it("modèle inconnu : renvoie null", () => {
    assert.equal(modele3dDevis({ id: "inexistant", nom: "X" }, {}), null);
  });

  it("entrées à zéro : pas de géométrie dégénérée", () => {
    const t = templates.find((x) => x.id === "mur-agglos");
    assert.ok(t);
    const m = modele3dDevis(t, { longueur: "0", hauteur: "0", epaisseur: "0" });
    assert.ok(m);
    for (const el of m.elements) for (const v of el.taille) assert.ok(v >= 0.01);
  });

  it("mur : boîte aux dimensions saisies, posée au sol", () => {
    const m = modelePour("mur-agglos");
    const el = elementParId(m, "mur");
    assert.deepEqual(el.taille, [10, 2.8, 0.15]);
    assert.equal(el.position[1], 1.4);
  });

  it("dalle : épaisseur conservée", () => {
    const m = modelePour("dalle-beton");
    assert.deepEqual(elementParId(m, "dalle").taille, [10, 0.12, 5]);
  });

  it("peinture : panneau de 2,8 m de haut dont la surface vaut la surface saisie", () => {
    const m = modelePour("peinture");
    const el = elementParId(m, "panneau");
    assert.equal(el.taille[1], 2.8);
    assert.equal(Math.round(el.taille[0] * 2.8), 100);
  });

  it("semelles : une propreté sous chaque semelle", () => {
    const m = modelePour("fondations-semelles");
    assert.equal(m.elements.filter((e) => e.id.startsWith("semelle-")).length, 4);
    assert.equal(m.elements.filter((e) => e.id.startsWith("proprete-")).length, 4);
    for (let k = 1; k <= 4; k++) {
      const proprete = elementParId(m, `proprete-${k}`);
      const semelle = elementParId(m, `semelle-${k}`);
      assert.ok(proprete.position[1] < semelle.position[1]);
      assert.ok(proprete.taille[0] > semelle.taille[0]);
    }
  });

  it("charpente : deux versants inclinés, faîtage cohérent avec la pente", () => {
    const m = modelePour("charpente-toiture");
    assert.equal(m.elements.length, 2);
    for (const el of m.elements) {
      assert.ok(el.rotation && el.rotation[0] !== 0, "versant sans pente");
    }
    const cote = Math.sqrt(120);
    assert.ok(Math.abs(m.dimensions[0] - cote) < 0.01, `emprise X ${m.dimensions[0]} au lieu de ${cote}`);
    const montee = Math.tan((25 * Math.PI) / 180) * (cote / 2);
    assert.ok(m.dimensions[1] > montee && m.dimensions[1] < montee + 0.3);
  });

  it("pieux : cylindres verticaux sous le niveau du sol", () => {
    const m = modelePour("fondations-profondes");
    assert.equal(m.elements.length, 6);
    for (const el of m.elements) {
      assert.equal(el.forme, "cylindre");
      assert.ok(el.position[1] < 0, `pieu ${el.id} au-dessus du sol`);
    }
  });

  it("poteaux : nombre et section conservés", () => {
    const m = modelePour("poteaux-beton-arme");
    assert.equal(m.elements.length, 8);
    assert.deepEqual(m.elements[0].taille, [0.2, 3, 0.2]);
  });

  it("poutres et chaînages : cadre fermé de longueur totale conservée", () => {
    const m = modelePour("poutres-chaine");
    assert.equal(m.elements.length, 4);
    for (const el of m.elements) {
      assert.equal(Math.max(...el.taille), 10, `longueur ${Math.max(...el.taille)} au lieu de 10`);
    }
  });

  it("plancher : poutrelles réparties + dalle de compression au-dessus", () => {
    const m = modelePour("plancher-poutrelles");
    const poutrelles = m.elements.filter((e) => e.id.startsWith("poutrelle-"));
    assert.equal(poutrelles.length, 10); // ceil(5 / 0,6) + 1
    const table = elementParId(m, "table");
    for (const p of poutrelles) assert.ok(table.position[1] > p.position[1]);
    // La première et la dernière poutrelle sont aux bords de la dalle.
    assert.equal(poutrelles[0].position[2], -2.5);
    assert.equal(poutrelles[9].position[2], 2.5);
  });

  it("terrassement : couche L x l x e", () => {
    const m = modelePour("terrassement-route");
    assert.deepEqual(elementParId(m, "couche").taille, [100, 0.25, 7]);
  });

  it("chaussée : enrobé de roulement empilé sur la couche de base", () => {
    const m = modelePour("chaussee-bitume");
    const base = elementParId(m, "base");
    const roul = elementParId(m, "roulement");
    assert.deepEqual(base.taille, [100, 0.25, 7]);
    assert.deepEqual(roul.taille, [100, 0.05, 7]);
    assert.ok(roul.position[1] > base.position[1]);
  });

  it("assainissement : conduite couchée et regards sous le sol", () => {
    const m = modelePour("assainissement-fouille");
    const conduite = elementParId(m, "conduite");
    assert.deepEqual(conduite.rotation, [0, 0, 90]);
    assert.equal(conduite.taille[1], 50); // longueur de la conduite
    const regards = m.elements.filter((e) => e.id.startsWith("regard-"));
    assert.equal(regards.length, 3);
    for (const r of regards) assert.ok(r.position[1] < 0);
    // Premier et dernier regard aux extrémités de la fouille.
    assert.equal(regards[0].position[0], -25);
    assert.equal(regards[2].position[0], 25);
  });

  it("remblai : L x l x e", () => {
    const m = modelePour("remblai-apport");
    assert.deepEqual(elementParId(m, "remblai").taille, [50, 0.3, 6]);
  });

  it("voirie : bordures le long des caniveaux + regards répartis", () => {
    const m = modelePour("voirie-bordures-caniveaux");
    assert.deepEqual(elementParId(m, "bordures").taille, [100, 0.25, 0.15]);
    assert.deepEqual(elementParId(m, "caniveaux").taille, [100, 0.4, 0.3]);
    assert.equal(m.elements.filter((e) => e.id.startsWith("regard-")).length, 4);
  });
});
