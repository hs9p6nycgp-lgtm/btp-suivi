import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  COULEURS_AVANCEMENT,
  construireSceneChantier,
  couleurAvancement,
  couleurOuvrage,
  libelleNiveau,
  niveauDepuisTexte,
  pasGrille,
  type SceneChantier,
  type SectionScene,
} from "../scene3d.ts";

const chantierRoute = {
  id: "c1",
  nom: "Voie test",
  type: "route",
  longueur: 4000,
  largeur: 7,
  hauteur: null,
};

const chantierBatiment = {
  id: "c2",
  nom: "Batiment test",
  type: "batiment",
  longueur: 20,
  largeur: 10,
  hauteur: 6,
};

function section(partiel: Partial<SectionScene>): SectionScene {
  return {
    id: partiel.id ?? "s1",
    nom: partiel.nom ?? "Section",
    pk_debut: partiel.pk_debut ?? null,
    pk_fin: partiel.pk_fin ?? null,
    niveau: partiel.niveau ?? null,
    lot: partiel.lot ?? null,
    type_ouvrage: partiel.type_ouvrage ?? null,
    longueur: partiel.longueur ?? null,
    largeur: partiel.largeur ?? null,
    hauteur: partiel.hauteur ?? null,
    couleur: partiel.couleur ?? null,
    avancement_pct: partiel.avancement_pct ?? null,
  };
}

function presque(obtenu: number, attendu: number, epsilon = 1e-6) {
  assert.ok(Math.abs(obtenu - attendu) <= epsilon, `${obtenu} != ${attendu}`);
}

function bandesRoute(scene: SceneChantier) {
  return scene.elements.filter((e) => e.opacite === 0.9);
}

function bandesNiveau(scene: SceneChantier) {
  const valeurs: string[] = Object.values(COULEURS_AVANCEMENT);
  return scene.elements.filter((e) => valeurs.includes(e.couleur) && e.taille[1] <= 0.1 && e.taille[0] > 1);
}

describe("couleurAvancement", () => {
  it("grise l'attente et le 0 %", () => {
    assert.equal(couleurAvancement(null), COULEURS_AVANCEMENT.attente);
    assert.equal(couleurAvancement(undefined), COULEURS_AVANCEMENT.attente);
    assert.equal(couleurAvancement(0), COULEURS_AVANCEMENT.attente);
  });
  it("orange les travaux en cours", () => {
    assert.equal(couleurAvancement(1), COULEURS_AVANCEMENT.enCours);
    assert.equal(couleurAvancement(45), COULEURS_AVANCEMENT.enCours);
    assert.equal(couleurAvancement(99.9), COULEURS_AVANCEMENT.enCours);
  });
  it("vert les travaux termines", () => {
    assert.equal(couleurAvancement(100), COULEURS_AVANCEMENT.termine);
    assert.equal(couleurAvancement(120), COULEURS_AVANCEMENT.termine);
  });
});

describe("niveauDepuisTexte", () => {
  it("lit RDC, sous-sol, R+n et etages", () => {
    assert.equal(niveauDepuisTexte("RDC"), 0);
    assert.equal(niveauDepuisTexte("Sous-sol"), -1);
    assert.equal(niveauDepuisTexte("Sous-sol 2"), -2);
    assert.equal(niveauDepuisTexte("sous sol 1"), -1);
    assert.equal(niveauDepuisTexte("SOUS-SOL"), -1);
    assert.equal(niveauDepuisTexte("R+3"), 3);
    assert.equal(niveauDepuisTexte("r+10"), 10);
    assert.equal(niveauDepuisTexte("Étage 2"), 2);
    assert.equal(niveauDepuisTexte("3"), 3);
  });
  it("renvoie null pour un niveau inconnu ou vide", () => {
    assert.equal(niveauDepuisTexte("Niveau inconnu"), null);
    assert.equal(niveauDepuisTexte(""), null);
    assert.equal(niveauDepuisTexte(null), null);
  });
});

describe("libelleNiveau", () => {
  it("nomme les niveaux", () => {
    assert.equal(libelleNiveau(-1), "Sous-sol");
    assert.equal(libelleNiveau(0), "RDC");
    assert.equal(libelleNiveau(4), "R+4");
  });
});

describe("pasGrille", () => {
  it("adapte le pas a l'etendue", () => {
    assert.equal(pasGrille(4), 0.5);
    assert.equal(pasGrille(9), 0.5);
    assert.equal(pasGrille(30), 2);
    assert.equal(pasGrille(100), 5);
    assert.equal(pasGrille(5000), 200);
  });
});

describe("couleurOuvrage", () => {
  it("distingue les types d'ouvrage", () => {
    assert.equal(couleurOuvrage("mur"), "#b08d57");
    assert.equal(couleurOuvrage("dalle"), "#8d8577");
    assert.equal(couleurOuvrage("pilier"), "#5c5f66");
    assert.equal(couleurOuvrage("inconnu"), "#94a3b8");
  });
});

describe("construireSceneChantier", () => {
  it("renvoie null sans chantier", () => {
    assert.equal(construireSceneChantier(null, []), null);
  });

  it("route : place les sections selon leurs PK, a l'echelle reelle", () => {
    const scene = construireSceneChantier(chantierRoute, [
      section({ id: "a", nom: "Tronçon 1", pk_debut: 0, pk_fin: 2500, avancement_pct: 100 }),
      section({ id: "b", nom: "Tronçon 2", pk_debut: 2500, pk_fin: 4000, avancement_pct: 40 }),
    ]) as SceneChantier;

    assert.equal(scene.type, "route");
    assert.equal(scene.resume.pkDebut, 0);
    assert.equal(scene.resume.pkFin, 4000);
    assert.equal(scene.resume.longueur, 4000);
    assert.equal(scene.resume.largeur, 7);

    const bandes = bandesRoute(scene);
    assert.equal(bandes.length, 2);
    presque(bandes[0].taille[0], 2500);
    presque(bandes[0].position[0], -750);
    assert.equal(bandes[0].couleur, COULEURS_AVANCEMENT.termine);
    presque(bandes[1].taille[0], 1500);
    presque(bandes[1].position[0], 1250);
    assert.equal(bandes[1].couleur, COULEURS_AVANCEMENT.enCours);

    const textes = scene.etiquettes.map((e) => e.texte);
    assert.ok(textes.includes("PK 0+000"));
    assert.ok(textes.includes("PK 4+000"));
    assert.ok(textes.includes("Tronçon 1 · 100 %"));
    assert.ok(textes.includes("Tronçon 2 · 40 %"));
    assert.ok(scene.rayon >= 2000);
  });

  it("route : recale les sections quand les PK ne partent pas de zero", () => {
    const scene = construireSceneChantier(chantierRoute, [
      section({ id: "a", nom: "Tronçon 5", pk_debut: 5000, pk_fin: 5500, avancement_pct: 60 }),
    ]) as SceneChantier;

    assert.equal(scene.resume.longueur, 500);
    const bandes = bandesRoute(scene);
    assert.equal(bandes.length, 1);
    presque(bandes[0].position[0], 0);
    presque(bandes[0].taille[0], 500);
    assert.equal(bandes[0].couleur, COULEURS_AVANCEMENT.enCours);
    const textes = scene.etiquettes.map((e) => e.texte);
    assert.ok(textes.includes("PK 5+000"));
    assert.ok(textes.includes("PK 5+500"));
  });

  it("route : sans sections, la chaussee suit la longueur du chantier", () => {
    const scene = construireSceneChantier({ ...chantierRoute, longueur: 500, largeur: null }, []) as SceneChantier;
    assert.equal(scene.resume.longueur, 500);
    assert.equal(scene.resume.largeur, 7);
    assert.equal(bandesRoute(scene).length, 0);
    const revetement = scene.elements.find((e) => e.couleur === "#43464a");
    assert.ok(revetement, "revetement attendu");
    presque(revetement.taille[0], 500);
  });

  it("route : presente les elements sans PK en ouvrages annexes", () => {
    const scene = construireSceneChantier({ ...chantierRoute, longueur: 200 }, [
      section({ id: "x", nom: "Dalot", type_ouvrage: "dalle", longueur: 4, largeur: 3, hauteur: 2.5 }),
    ]) as SceneChantier;

    assert.equal(scene.resume.nbOuvragesAnnexes, 1);
    const dalot = scene.elements.find((e) => e.couleur === couleurOuvrage("dalle"));
    assert.ok(dalot, "dalot attendu");
    assert.ok(dalot.position[2] > 0, "le dalot est pose sur le cote de la route");
    presque(dalot.taille[0], 4);
    presque(dalot.taille[1], 2.5);
    const textes = scene.etiquettes.map((e) => e.texte);
    assert.ok(textes.includes("Dalot"));
    assert.ok(textes.includes("Ouvrages annexes"));
  });

  it("batiment : empile les niveaux RDC et R+1 avec bandes d'avancement", () => {
    const scene = construireSceneChantier(chantierBatiment, [
      section({ id: "a", nom: "Gros oeuvre", niveau: "RDC", lot: "Gros œuvre", avancement_pct: 100 }),
      section({ id: "b", nom: "Cloisons", niveau: "R+1", avancement_pct: 50 }),
    ]) as SceneChantier;

    assert.equal(scene.type, "batiment");
    assert.equal(scene.resume.nbNiveaux, 2);
    assert.equal(scene.resume.hauteur, 6);

    const bandes = bandesNiveau(scene);
    assert.equal(bandes.length, 2);
    assert.equal(bandes[0].couleur, COULEURS_AVANCEMENT.termine);
    presque(bandes[0].position[1], 0.235);
    assert.equal(bandes[1].couleur, COULEURS_AVANCEMENT.enCours);
    presque(bandes[1].position[1], 3.235);

    const textes = scene.etiquettes.map((e) => e.texte);
    assert.ok(textes.includes("RDC · Gros œuvre · 100 %"));
    assert.ok(textes.includes("R+1 · 50 %"));
  });

  it("batiment : gere un sous-sol sous le RDC", () => {
    const scene = construireSceneChantier(chantierBatiment, [
      section({ id: "a", nom: "Fondations", niveau: "Sous-sol", avancement_pct: 80 }),
      section({ id: "b", nom: "Ossature", niveau: "RDC", avancement_pct: 40 }),
    ]) as SceneChantier;

    assert.equal(scene.resume.nbNiveaux, 2);
    const textes = scene.etiquettes.map((e) => e.texte);
    assert.ok(textes.includes("Sous-sol · 80 %"));
    assert.ok(textes.includes("RDC · 40 %"));
  });

  it("batiment : estime les niveaux depuis la hauteur sans sections", () => {
    const scene = construireSceneChantier({ ...chantierBatiment, hauteur: 9 }, []) as SceneChantier;
    assert.equal(scene.resume.nbNiveaux, 3);
    const textes = scene.etiquettes.map((e) => e.texte);
    assert.ok(textes.includes("RDC"));
    assert.ok(textes.includes("R+1"));
    assert.ok(textes.includes("R+2"));
    const poteaux = scene.elements.filter((e) => e.couleur === "#5c5f66");
    assert.ok(poteaux.length >= 8, "au moins 4 poteaux par niveau");
  });

  it("batiment : pose les elements sans niveau en annexe a cote", () => {
    const scene = construireSceneChantier(chantierBatiment, [
      section({ id: "x", nom: "Mur cloture", type_ouvrage: "mur", longueur: 6, largeur: 0.3, hauteur: 2 }),
    ]) as SceneChantier;

    assert.equal(scene.resume.nbOuvragesAnnexes, 1);
    const mur = scene.elements.find((e) => e.couleur === couleurOuvrage("mur"));
    assert.ok(mur, "mur attendu");
    assert.ok(mur.position[0] > 10, "le mur est pose a droite du batiment");
    const textes = scene.etiquettes.map((e) => e.texte);
    assert.ok(textes.includes("Mur cloture"));
  });

  it("route : respecte une couleur personnalisee de section", () => {
    const scene = construireSceneChantier(chantierRoute, [
      section({ id: "a", nom: "CA1a", pk_debut: 0, pk_fin: 1200, avancement_pct: 30, couleur: "#123456" }),
    ]) as SceneChantier;
    const bandes = bandesRoute(scene);
    assert.equal(bandes[0].couleur, "#123456");
  });

  it("batiment : utilise les niveaux demandes (sous-sols, RDC, etages)", () => {
    const scene = construireSceneChantier(
      {
        ...chantierBatiment,
        hauteur: null,
        nb_sous_sols: 1,
        nb_etages: 3,
        hauteur_niveau: 3.5,
      },
      [],
    ) as SceneChantier;
    assert.equal(scene.resume.nbNiveaux, 5);
    assert.equal(scene.resume.hauteur, 17.5);
    const textes = scene.etiquettes.map((e) => e.texte);
    for (const attendu of ["Sous-sol", "RDC", "R+1", "R+2", "R+3"]) {
      assert.ok(textes.includes(attendu), `${attendu} attendu`);
    }
    // Sous-sol : le terrain forme un anneau (4 morceaux) autour de la fouille.
    const terrains = scene.elements.filter((e) => e.couleur === "#cbb491");
    assert.equal(terrains.length, 4);
  });

  it("batiment : trame de poteaux selon les travees demandees", () => {
    const scene = construireSceneChantier(
      {
        ...chantierBatiment,
        hauteur: null,
        nb_sous_sols: 0,
        nb_etages: 0,
        hauteur_niveau: 3,
        nb_travees_longueur: 4,
        nb_travees_largeur: 2,
      },
      [],
    ) as SceneChantier;
    assert.equal(scene.resume.nbNiveaux, 1);
    const poteaux = scene.elements.filter((e) => e.couleur === "#5c5f66");
    assert.equal(poteaux.length, (4 + 1) * (2 + 1));
    const poutres = scene.elements.filter((e) => e.couleur === "#6b6f76");
    assert.equal(poutres.length, 3 + 5);
  });

  it("batiment : structure en voiles sans poteaux", () => {
    const scene = construireSceneChantier(
      {
        ...chantierBatiment,
        hauteur: null,
        nb_etages: 1,
        hauteur_niveau: 3,
        type_structure: "voiles",
      },
      [],
    ) as SceneChantier;
    assert.equal(scene.elements.filter((e) => e.couleur === "#5c5f66").length, 0);
    // Deux murs porteurs interieurs par niveau, sur deux niveaux.
    const mursInternes = scene.elements.filter((e) => e.couleur === "#cfc7b8");
    assert.equal(mursInternes.length, 4);
  });

  it("batiment : toiture en tole a deux pans", () => {
    const scene = construireSceneChantier(
      {
        ...chantierBatiment,
        hauteur: null,
        nb_etages: 0,
        hauteur_niveau: 3,
        type_toiture: "tole",
      },
      [],
    ) as SceneChantier;
    const pans = scene.elements.filter((e) => e.couleur === "#b45309");
    assert.equal(pans.length, 2);
    assert.ok(pans.every((e) => e.rotation !== undefined));
    assert.notEqual(pans[0].rotation![0], pans[1].rotation![0]);
  });

  it("batiment : conserve un niveau decoupe hors du nombre demande", () => {
    const scene = construireSceneChantier(
      { ...chantierBatiment, hauteur: null, nb_sous_sols: 0, nb_etages: 1, hauteur_niveau: 3 },
      [section({ id: "a", nom: "Sous-sol technique", niveau: "Sous-sol", avancement_pct: 100 })],
    ) as SceneChantier;
    assert.equal(scene.resume.nbNiveaux, 3); // Sous-sol + RDC + R+1
    const textes = scene.etiquettes.map((e) => e.texte);
    assert.ok(textes.includes("Sous-sol · 100 %"));
  });

  it("route : nombre de voies, accotement et revetement", () => {
    const scene = construireSceneChantier(
      {
        ...chantierRoute,
        longueur: 1000,
        largeur: 14,
        nb_voies: 4,
        largeur_accotement: 1.5,
        type_revetement: "beton",
      },
      [],
    ) as SceneChantier;
    assert.equal(scene.resume.largeur, 14);
    const revetement = scene.elements.find((e) => e.position[1] === 0.57);
    assert.equal(revetement?.couleur, "#b8b2a7");
    // 4 voies : 3 lignes de separation (z = -3.5, 0, 3.5).
    const lignes = scene.elements.filter((e) => e.couleur === "#eef0f2");
    const zLignes = [...new Set(lignes.map((e) => Math.round(e.position[2] * 100) / 100))].sort(
      (a, b) => a - b,
    );
    assert.deepEqual(zLignes, [-3.5, 0, 3.5]);
    const accotements = scene.elements.filter((e) => e.couleur === "#b9915f");
    assert.equal(accotements.length, 2);
    presque(accotements[0].taille[2], 1.5);
  });

  it("route : deduit la largeur de chaussee du nombre de voies", () => {
    const scene = construireSceneChantier(
      { ...chantierRoute, longueur: 1000, largeur: null, nb_voies: 3 },
      [],
    ) as SceneChantier;
    assert.equal(scene.resume.largeur, 10.5);
  });
});
