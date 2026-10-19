// Tests de la modélisation 3D des devis (src/lib/devis/model3d.ts).
// Vérifient : couverture des 15 modèles, géométrie saine, dimensions clés,
// détails de chantier (poteaux, chaînages, coffrage, marquage, etc.) et
// couleurs standardisées (une couleur fixe par type d'élément, tous projets).

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { COULEURS_ELEMENTS, modele3dDevis, templatesAvecModele3d } from "../model3d.ts";
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
        assert.equal(el.couleur, COULEURS_ELEMENTS[el.materiau], `${el.id} : couleur non standardisée`);
        for (const v of [...el.taille, ...el.position]) assert.ok(Number.isFinite(v));
        for (const v of el.taille) assert.ok(v >= 0.01, `${el.id} : taille ${v} < 0,01 m`);
        if (el.rotation) assert.equal(el.rotation.length, 3);
      }
      for (const v of [...m.dimensions, ...m.centre]) assert.ok(Number.isFinite(v));
      for (const v of m.dimensions) assert.ok(v > 0, `${t.id} : encombrement ${v} <= 0`);
    }
  });

  it("couleurs standardisées : un même élément garde la même couleur dans tous les projets", () => {
    const mur = modelePour("mur-agglos");
    const poteaux = modelePour("poteaux-beton-arme");
    const poutres = modelePour("poutres-chaine");
    const couleurPoteau = elementParId(mur, "poteau-1").couleur;
    assert.equal(elementParId(poteaux, "poteau-1").couleur, couleurPoteau);
    assert.equal(elementParId(poutres, "poteau-angle-1").couleur, couleurPoteau);

    const couleurChaine = elementParId(mur, "chainage-haut").couleur;
    assert.equal(elementParId(poutres, "chaine-1").couleur, couleurChaine);
    assert.equal(elementParId(modelePour("plancher-poutrelles"), "rive-avant").couleur, couleurChaine);

    const couleurFondation = elementParId(modelePour("fondations-semelles"), "semelle-1").couleur;
    assert.equal(elementParId(poteaux, "amorce-1").couleur, couleurFondation);
    assert.equal(
      elementParId(modelePour("poutres-chaine", { longueur: "3" }), "appui-gauche").couleur,
      couleurFondation,
    );
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

  it("mur : poteaux apparents et chaînages haut / bas", () => {
    const m = modelePour("mur-agglos");
    const poteaux = m.elements.filter((e) => e.id.startsWith("poteau-"));
    assert.equal(poteaux.length, 4); // extrémités + tous les ~3,5 m
    for (const p of poteaux) assert.ok(p.taille[2] > 0.15, `${p.id} : poteau non apparent`);
    const haut = elementParId(m, "chainage-haut");
    const bas = elementParId(m, "chainage-bas");
    assert.ok(haut.position[1] > 2, "chaînage haut trop bas");
    assert.ok(bas.position[1] < 0.2, "chaînage bas trop haut");
    assert.equal(haut.couleur, bas.couleur);
  });

  it("dalle : épaisseur conservée et coffrage de rive périphérique", () => {
    const m = modelePour("dalle-beton");
    assert.deepEqual(elementParId(m, "dalle").taille, [10, 0.12, 5]);
    const coffrages = m.elements.filter((e) => e.id.startsWith("coffrage-"));
    assert.equal(coffrages.length, 4);
    for (const c of coffrages) assert.equal(c.couleur, COULEURS_ELEMENTS.coffrage);
  });

  it("peinture : panneau de 2,8 m de haut dont la surface vaut la surface saisie", () => {
    const m = modelePour("peinture");
    const el = elementParId(m, "panneau");
    assert.equal(el.taille[1], 2.8);
    assert.equal(Math.round(el.taille[0] * 2.8), 100);
    assert.ok(elementParId(m, "plinthe"), "plinthes manquantes");
    assert.ok(elementParId(m, "porte"), "porte manquante");
    assert.equal(m.elements.filter((e) => e.id.startsWith("fenetre-")).length, 2);
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

  it("semelles : amorces de poteaux et longrines de liaison", () => {
    const m = modelePour("fondations-semelles");
    const amorces = m.elements.filter((e) => e.id.startsWith("amorce-poteau-"));
    assert.equal(amorces.length, 4);
    const longrines = m.elements.filter((e) => e.id.startsWith("longrine-"));
    assert.equal(longrines.length, 4); // 2 dans chaque sens pour une grille 2 x 2
    for (const l of longrines) assert.equal(l.couleur, COULEURS_ELEMENTS.longrine);
  });

  it("charpente : versants inclinés, faîtière, sablières et pannes", () => {
    const m = modelePour("charpente-toiture");
    const versants = m.elements.filter((e) => e.id.startsWith("versant-"));
    assert.equal(versants.length, 2);
    for (const el of versants) {
      assert.ok(el.rotation && el.rotation[0] !== 0, "versant sans pente");
    }
    const cote = Math.sqrt(120);
    assert.ok(Math.abs(m.dimensions[0] - cote) < 0.01, `emprise X ${m.dimensions[0]} au lieu de ${cote}`);
    const montee = Math.tan((25 * Math.PI) / 180) * (cote / 2);
    assert.ok(m.dimensions[1] > montee && m.dimensions[1] < montee + 0.3);
    assert.ok(elementParId(m, "faitiere").position[1] > montee);
    assert.equal(m.elements.filter((e) => e.id.startsWith("sabliere-")).length, 2);
    assert.equal(m.elements.filter((e) => e.id.startsWith("panne-")).length, 2);
  });

  it("pieux : cylindres verticaux sous le niveau du sol + têtes émergeantes", () => {
    const m = modelePour("fondations-profondes");
    const pieux = m.elements.filter((e) => e.id.startsWith("pieu-"));
    assert.equal(pieux.length, 6);
    for (const el of pieux) {
      assert.equal(el.forme, "cylindre");
      assert.ok(el.position[1] < 0, `pieu ${el.id} au-dessus du sol`);
    }
    const tetes = m.elements.filter((e) => e.id.startsWith("tete-pieu-"));
    assert.equal(tetes.length, 6);
    for (const t of tetes) assert.ok(t.position[1] > 0, `tête ${t.id} sous le sol`);
  });

  it("poteaux : nombre et section conservés + amorces béton", () => {
    const m = modelePour("poteaux-beton-arme");
    const poteaux = m.elements.filter((e) => e.id.startsWith("poteau-"));
    assert.equal(poteaux.length, 8);
    assert.deepEqual(poteaux[0].taille, [0.2, 3, 0.2]);
    assert.equal(m.elements.filter((e) => e.id.startsWith("amorce-")).length, 8);
  });

  it("poutres et chaînages : cadre fermé de longueur totale conservée", () => {
    const m = modelePour("poutres-chaine");
    const chaines = m.elements.filter((e) => e.id.startsWith("chaine-"));
    assert.equal(chaines.length, 8); // ceintures basse et haute
    for (const el of chaines) {
      assert.equal(Math.max(...el.taille), 10, `longueur ${Math.max(...el.taille)} au lieu de 10`);
    }
    assert.equal(m.elements.filter((e) => e.id.startsWith("poteau-angle-")).length, 4);
  });

  it("plancher : poutrelles réparties + dalle de compression + rives", () => {
    const m = modelePour("plancher-poutrelles");
    const poutrelles = m.elements.filter((e) => e.id.startsWith("poutrelle-"));
    assert.equal(poutrelles.length, 10); // ceil(5 / 0,6) + 1
    const table = elementParId(m, "table");
    for (const p of poutrelles) assert.ok(table.position[1] > p.position[1]);
    // La première et la dernière poutrelle sont aux bords de la dalle.
    assert.equal(poutrelles[0].position[2], -2.5);
    assert.equal(poutrelles[9].position[2], 2.5);
    assert.equal(m.elements.filter((e) => e.id.startsWith("rive-")).length, 4);
  });

  it("revêtement de sol : plinthes sur tout le pourtour", () => {
    const m = modelePour("finition-revetement-sol");
    const plinthes = m.elements.filter((e) => e.id.startsWith("plinthe-"));
    assert.equal(plinthes.length, 4);
    assert.ok(elementParId(m, "sol"));
  });

  it("terrassement : couche L x l x e + accotements", () => {
    const m = modelePour("terrassement-route");
    assert.deepEqual(elementParId(m, "couche").taille, [100, 0.25, 7]);
    assert.equal(m.elements.filter((e) => e.id.startsWith("accotement-")).length, 2);
  });

  it("chaussée : enrobé empilé sur la couche de base + marquage axial", () => {
    const m = modelePour("chaussee-bitume");
    const base = elementParId(m, "base");
    const roul = elementParId(m, "roulement");
    assert.deepEqual(base.taille, [100, 0.25, 7]);
    assert.deepEqual(roul.taille, [100, 0.05, 7]);
    assert.ok(roul.position[1] > base.position[1]);
    const marquages = m.elements.filter((e) => e.id.startsWith("marquage-"));
    assert.equal(marquages.length, 12); // 100 m / 8 m
    for (const d of marquages) {
      assert.ok(d.position[1] > roul.position[1], "marquage sous l'enrobé");
      assert.equal(d.couleur, COULEURS_ELEMENTS.marquage);
    }
    assert.equal(m.elements.filter((e) => e.id.startsWith("accotement-")).length, 2);
  });

  it("assainissement : conduite couchée sur lit de pose et regards sous le sol", () => {
    const m = modelePour("assainissement-fouille");
    const conduite = elementParId(m, "conduite");
    assert.deepEqual(conduite.rotation, [0, 0, 90]);
    assert.equal(conduite.taille[1], 50); // longueur de la conduite
    const lit = elementParId(m, "lit-pose");
    assert.ok(lit.position[1] < conduite.position[1], "lit de pose au-dessus de la conduite");
    const regards = m.elements.filter((e) => e.id.startsWith("regard-"));
    assert.equal(regards.length, 3);
    for (const r of regards) assert.ok(r.position[1] < 0);
    // Premier et dernier regard aux extrémités de la fouille.
    assert.equal(regards[0].position[0], -25);
    assert.equal(regards[2].position[0], 25);
  });

  it("remblai : L x l x e + talus latéraux", () => {
    const m = modelePour("remblai-apport");
    assert.deepEqual(elementParId(m, "remblai").taille, [50, 0.3, 6]);
    const talus = m.elements.filter((e) => e.id.startsWith("talus-"));
    assert.equal(talus.length, 2);
    for (const t of talus) assert.ok(t.rotation && Math.abs(t.rotation[0]) === 35);
  });

  it("voirie : bordures, caniveaux, trottoir et regards répartis", () => {
    const m = modelePour("voirie-bordures-caniveaux");
    assert.deepEqual(elementParId(m, "bordures").taille, [100, 0.25, 0.15]);
    assert.deepEqual(elementParId(m, "caniveaux").taille, [100, 0.4, 0.3]);
    assert.ok(elementParId(m, "trottoir"), "trottoir manquant");
    assert.ok(elementParId(m, "chaussee"), "chaussée manquante");
    assert.equal(m.elements.filter((e) => e.id.startsWith("regard-")).length, 4);
  });
});
