// Extraction des exigences du cahier des charges.
//
// Le cahier des charges (CAHIER_DES_CHARGES.md) liste, par module, les
// exigences avec un code (CHA-01, APP-04…), un intitulé et une priorité
// (M = indispensable, S = secondaire, C = complémentaire).
//
// Ce script en fait un fichier de données exploitable par l'application
// (page « Exigences ») : la couverture de la spécification est ainsi
// toujours à jour, sans ressaisie.
//
// Usage : node scripts/exigences/generer.mjs

import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = join(ICI, "..", "..");
const SOURCE = join(RACINE, "CAHIER_DES_CHARGES.md");
const SORTIE = join(RACINE, "src", "lib", "exigences.json");

/** Liste les fichiers source (TypeScript / JavaScript) du projet. */
function fichiersSource(dossier) {
  const liste = [];
  for (const entree of readdirSync(dossier)) {
    const chemin = join(dossier, entree);
    if (statSync(chemin).isDirectory()) {
      liste.push(...fichiersSource(chemin));
    } else if (/\.(ts|tsx|js|jsx|mjs)$/.test(entree)) {
      liste.push(chemin);
    }
  }
  return liste;
}

/** Recense les occurrences de chaque code (exigence ou règle) dans le code source. */
function occurrencesDansLeCode() {
  const occurrences = {};
  for (const fichier of fichiersSource(join(RACINE, "src"))) {
    const texte = readFileSync(fichier, "utf8");
    for (const code of texte.match(/\b[A-Z]{2,3}-\d{2}\b/g) ?? []) {
      if (!occurrences[code]) occurrences[code] = { total: 0, fichiers: [] };
      occurrences[code].total += 1;
      const chemin = relative(RACINE, fichier);
      if (!occurrences[code].fichiers.includes(chemin)) occurrences[code].fichiers.push(chemin);
    }
  }
  return occurrences;
}

const contenu = readFileSync(SOURCE, "utf8");
const lignes = contenu.split("\n");
const occurrences = occurrencesDansLeCode();

const modules = [];
let moduleCourant = null;

for (const ligne of lignes) {
  // « ## 4.2. Module Chantiers »
  const entete = /^##\s+4\.\d+\.\s+Module\s+(.+)$/.exec(ligne);
  if (entete) {
    moduleCourant = { nom: entete[1].trim(), exigences: [] };
    modules.push(moduleCourant);
    continue;
  }
  if (!moduleCourant) continue;

  // « | CHA-01   | Créer un chantier : … | M | »
  const ligneTableau = /^\|\s*([A-Z]{3}-\d{2})\s*\|(.+?)\|\s*([MSC])\s*\|\s*$/.exec(ligne);
  if (ligneTableau) {
    const code = ligneTableau[1];
    moduleCourant.exigences.push({
      code,
      intitule: ligneTableau[2].trim().replace(/\s+/g, " "),
      priorite: ligneTableau[3],
      references: occurrences[code]?.total ?? 0,
    });
  }
}

// --- Règles de gestion (section 5 du cahier des charges) ---------------------
//
// « -   RG-01 : une quantité réalisée ne peut être saisie que sur un poste… »
const regles = [];
for (const ligne of lignes) {
  const entete = /^-\s+(RG-\d{2})\s*:\s*(.+)$/.exec(ligne.trim());
  if (!entete) continue;
  const code = entete[1];
  const texte = [entete[2].trim()];
  // La règle peut se poursuivre sur les lignes suivantes (liste à puces).
  let index = lignes.indexOf(ligne) + 1;
  while (index < lignes.length) {
    const suite = lignes[index].trim();
    if (!suite || !suite.startsWith("-") || /^-\s+RG-\d{2}\s*:/.test(suite)) break;
    texte.push(suite.replace(/^-\s+/, ""));
    index += 1;
  }
  const fichiers = occurrences[code]?.fichiers ?? [];
  regles.push({
    code,
    texte: texte.join(" ").replace(/\s+/g, " "),
    references: occurrences[code]?.total ?? 0,
    fichiers,
    testee: fichiers.some((fichier) => fichier.includes("__tests__")),
  });
}

const total = modules.reduce((somme, module) => somme + module.exigences.length, 0);
const parPriorite = { M: 0, S: 0, C: 0 };
let reperees = 0;
for (const module of modules) {
  for (const exigence of module.exigences) {
    parPriorite[exigence.priorite] += 1;
    if (exigence.references > 0) reperees += 1;
  }
}

mkdirSync(dirname(SORTIE), { recursive: true });
writeFileSync(
  SORTIE,
  `${JSON.stringify(
    {
      genereDepuis: "CAHIER_DES_CHARGES.md",
      total,
      parPriorite,
      reperees,
      regles,
      modules,
    },
    null,
    2,
  )}\n`,
  "utf8",
);

console.log(
  `✅ ${modules.length} modules, ${total} exigences (M : ${parPriorite.M}, S : ${parPriorite.S}, C : ${parPriorite.C}), ` +
    `${reperees} repérées dans le code, ${regles.length} règles de gestion → ${SORTIE}`,
);
