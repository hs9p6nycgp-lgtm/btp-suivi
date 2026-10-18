// Nettoyage des doublons de bpu_postes via l'API REST Supabase (cle service).
// Même règle que supabase/seed/nettoyer_doublons_bpu.sql :
//   garder la ligne LA PLUS ANCIENNE de chaque groupe
//   (designation, unite, prix_unitaire), ordre created_at asc puis id asc.
//
// Utilisation (depuis la racine du projet) :
//   node scripts/nettoyer-doublons-bpu.mjs               -> analyse seule (aucune suppression)
//   node scripts/nettoyer-doublons-bpu.mjs --supprimer   -> analyse + suppression + verification
//
// Lecture seule par defaut ; sauvegarde complete de la table avant toute suppression
// (fichier JSON dans le dossier temporaire systeme, ou dans BPU_SAUVEGARDE_DIR si defini).
//
// Exécuté le 18/10/2026 : 443 -> 289 lignes, 154 copies supprimées, 0 anomalie.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const SUPPRIMER = process.argv.includes("--supprimer");

// --- Chargement de .env.local
function chargerEnvLocal() {
  const fichier = path.resolve(".env.local");
  if (!fs.existsSync(fichier)) return;
  const contenu = fs.readFileSync(fichier, "utf8");
  for (const ligne of contenu.split("\n")) {
    const m = ligne.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
chargerEnvLocal();

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error("Variables manquantes : NEXT_PUBLIC_SUPABASE_URL et/ou SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
const headers = { apikey: KEY, Authorization: `Bearer ${KEY}` };

const DOSSIER_SAUVEGARDE = process.env.BPU_SAUVEGARDE_DIR ?? os.tmpdir();

async function lireTout() {
  const r = await fetch(`${URL}/rest/v1/bpu_postes?select=*&limit=5000`, { headers });
  if (!r.ok) throw new Error(`Lecture impossible : HTTP ${r.status} ${await r.text()}`);
  return r.json();
}

// ------------------------------------------------------------------
// 1. Lecture + sauvegarde complete
// ------------------------------------------------------------------
const toutes = await lireTout();
const horodatage = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const fichierSauvegarde = path.join(DOSSIER_SAUVEGARDE, `bpu_postes_sauvegarde_${horodatage}.json`);
fs.writeFileSync(fichierSauvegarde, JSON.stringify(toutes, null, 1));
console.log(`Sauvegarde complete : ${fichierSauvegarde} (${toutes.length} lignes)`);
console.log(`Avant : ${toutes.length} lignes.`);

// ------------------------------------------------------------------
// 2. Groupes de doublons (meme designation, meme unite, meme prix)
// ------------------------------------------------------------------
const groupes = new Map();
for (const x of toutes) {
  const cle = `${x.designation}|${x.unite}|${x.prix_unitaire}`;
  if (!groupes.has(cle)) groupes.set(cle, []);
  groupes.get(cle).push(x);
}

const tailleGroupes = new Map();
const anomalies = [];
const aSupprimer = [];
for (const lignes of groupes.values()) {
  if (lignes.length <= 1) continue;
  tailleGroupes.set(lignes.length, (tailleGroupes.get(lignes.length) ?? 0) + 1);
  lignes.sort((a, b) => {
    if (a.created_at !== b.created_at) return a.created_at < b.created_at ? -1 : 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
  const gardee = lignes[0];
  for (const ligne of lignes.slice(1)) {
    if ((ligne.code ?? "") !== (gardee.code ?? "") || (ligne.source ?? "") !== (gardee.source ?? "")) {
      anomalies.push({ gardee, ligne });
    }
    aSupprimer.push(ligne);
  }
}

console.log("");
console.log(`Combinaisons uniques : ${groupes.size}`);
console.log(`Groupes en double    : ${[...tailleGroupes.values()].reduce((s, n) => s + n, 0)}`);
console.log(`Tailles des groupes  : ${[...tailleGroupes.entries()].map(([t, n]) => `${n} groupe(s) de ${t}`).join(", ")}`);
console.log(`Copies a supprimer   : ${aSupprimer.length}`);

console.log("");
console.log(`Groupes avec un code ou une source differents entre les copies : ${anomalies.length}`);
for (const { gardee, ligne } of anomalies.slice(0, 10)) {
  console.log(`  - ${gardee.designation} (${gardee.unite}) : garde "${gardee.code}/${gardee.source}" / copie "${ligne.code}/${ligne.source}"`);
}

if (!SUPPRIMER) {
  console.log("");
  console.log("Analyse seule : aucune suppression effectuee (relancer avec --supprimer).");
  process.exit(0);
}

// ------------------------------------------------------------------
// 3. Suppression par lots (idempotent : peut etre relance sans risque)
// ------------------------------------------------------------------
console.log("");
console.log("Suppression des copies...");
const ids = aSupprimer.map((x) => x.id);
let supprimees = 0;
for (let i = 0; i < ids.length; i += 40) {
  const lot = ids.slice(i, i + 40);
  const r = await fetch(`${URL}/rest/v1/bpu_postes?id=in.(${lot.join(",")})`, {
    method: "DELETE",
    headers: { ...headers, Prefer: "return=minimal" },
  });
  if (r.status !== 204 && r.status !== 200) {
    throw new Error(`Suppression impossible : HTTP ${r.status} ${await r.text()}`);
  }
  supprimees += lot.length;
  console.log(`  ... ${supprimees}/${ids.length} copies supprimees`);
}

// ------------------------------------------------------------------
// 4. Verification finale
// ------------------------------------------------------------------
const apres = await lireTout();
const vus = new Map();
for (const x of apres) {
  const cle = `${x.designation}|${x.unite}|${x.prix_unitaire}`;
  vus.set(cle, (vus.get(cle) ?? 0) + 1);
}
const restants = [...vus.values()].filter((n) => n > 1).length;
console.log("");
console.log(`Apres : ${apres.length} lignes, ${vus.size} combinaisons uniques, ${restants} groupe(s) en double.`);

const supprimeesEncorePresentes = ids.filter((id) => apres.some((x) => x.id === id)).length;
console.log(`Copies encore presentes : ${supprimeesEncorePresentes}`);
if (restants !== 0 || supprimeesEncorePresentes !== 0) {
  console.error("ATTENTION : le nettoyage est incomplet.");
  process.exit(1);
}
console.log("Nettoyage reussi : aucun doublon restant.");
