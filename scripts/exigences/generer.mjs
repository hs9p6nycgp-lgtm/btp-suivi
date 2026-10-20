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

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = join(ICI, "..", "..");
const SOURCE = join(RACINE, "CAHIER_DES_CHARGES.md");
const SORTIE = join(RACINE, "src", "lib", "exigences.json");

const contenu = readFileSync(SOURCE, "utf8");
const lignes = contenu.split("\n");

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
    moduleCourant.exigences.push({
      code: ligneTableau[1],
      intitule: ligneTableau[2].trim().replace(/\s+/g, " "),
      priorite: ligneTableau[3],
    });
  }
}

const total = modules.reduce((somme, module) => somme + module.exigences.length, 0);
const parPriorite = { M: 0, S: 0, C: 0 };
for (const module of modules) {
  for (const exigence of module.exigences) parPriorite[exigence.priorite] += 1;
}

mkdirSync(dirname(SORTIE), { recursive: true });
writeFileSync(
  SORTIE,
  `${JSON.stringify(
    {
      genereDepuis: "CAHIER_DES_CHARGES.md",
      total,
      parPriorite,
      modules,
    },
    null,
    2,
  )}\n`,
  "utf8",
);

console.log(
  `✅ ${modules.length} modules, ${total} exigences (M : ${parPriorite.M}, S : ${parPriorite.S}, C : ${parPriorite.C}) → ${SORTIE}`,
);
