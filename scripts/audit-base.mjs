
/** Fetch avec reprises : le client HTTP de Node peut timeout de temps en temps. */
async function fetchRobuste(url, options = {}, tentatives = 4) {
  let err;
  for (let i = 0; i < tentatives; i++) {
    try {
      return await fetch(url, { ...options, signal: AbortSignal.timeout(25000) });
    } catch (e) {
      err = e;
      await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
    }
  }
  throw err;
}

// Audit de la base distante : verifie que toutes les tables et colonnes
// prevues par les migrations existent reellement dans le projet Supabase.
// Lecture seule (utilise la cle publique, aucun ecrit).
//
// Utilisation :
//   node scripts/audit-base.mjs
// (les variables NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY
//  sont lues depuis .env.local, ou depuis l'environnement)

import fs from "node:fs";
import path from "node:path";

// --- Chargement de .env.local si les variables ne sont pas dans l'environnement
function chargerEnvLocal() {
  const fichier = path.resolve(".env.local");
  if (!fs.existsSync(fichier)) return;
  const contenu = fs.readFileSync(fichier, "utf8");
  for (const ligne of contenu.split("\n")) {
    const m = ligne.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}
chargerEnvLocal();

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!URL || !KEY) {
  console.error("Variables manquantes : NEXT_PUBLIC_SUPABASE_URL et/ou NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  console.error("Elles doivent etre dans .env.local (ou dans l'environnement).");
  process.exit(1);
}

// Utilisation de la clé anonyme avec RLS actif.
// Note : certaines vérifications (notamment sur les tables sans policy RLS stricte)
// peuvent être limitées par rapport à la clé service.
const headers = { apikey: KEY, Authorization: `Bearer ${KEY}` };
const dir = "supabase/migrations";
const fichiers = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();

const tables = new Set();
const colonnes = [];

for (const f of fichiers) {
  const sql = fs.readFileSync(path.join(dir, f), "utf8");
  // create table [if not exists] nom
  for (const m of sql.matchAll(/create table\s+(?:if not exists\s+)?([a-z_]+)/gi)) {
    tables.add(m[1].toLowerCase());
  }
  // alter table nom ... add column [if not exists] colonne
  for (const bloc of sql.split(/alter table /i).slice(1)) {
    const tname = (bloc.match(/^\s*([a-z_]+)/i) || [])[1];
    if (!tname) continue;
    // s'arreter avant le prochain mot-cle majeur pour eviter les faux positifs
    const fin = bloc.search(/\n(create|drop|insert|update|delete|comment on|grant|revoke)\s/i);
    const zone = fin >= 0 ? bloc.slice(0, fin) : bloc;
    for (const c of zone.matchAll(/add column (?:if not exists )?([a-z_]+)/gi)) {
      colonnes.push({ table: tname.toLowerCase(), col: c[1].toLowerCase() });
    }
  }
}

const ignores = new Set(["buckets", "objects"]); // schemas storage : non verifiables ici

const manquantsT = [];
for (const t of [...tables].sort()) {
  if (ignores.has(t)) continue;
  const r = await fetchRobuste(`${URL}/rest/v1/${t}?select=*&limit=0`, { headers });
  if (r.status !== 200) manquantsT.push(t);
}

const manquantsC = new Set();
for (const { table, col } of colonnes) {
  const r = await fetchRobuste(`${URL}/rest/v1/${table}?select=${col}&limit=0`, { headers });
  if (r.status !== 200) manquantsC.add(`${table}.${col}`);
}

console.log("=== TABLES MANQUANTES EN BASE DISTANTE ===");
console.log(manquantsT.length ? manquantsT.map((t) => `- ${t}`).join("\n") : "(aucune)");
console.log("");
console.log("=== COLONNES MANQUANTES EN BASE DISTANTE ===");
console.log(manquantsC.size ? [...manquantsC].map((c) => `- ${c}`).join("\n") : "(aucune)");
console.log("");
console.log(`Resume : ${manquantsT.length} table(s) et ${manquantsC.size} colonne(s) manquante(s).`);

if (manquantsT.length || manquantsC.size) {
  console.log("");
  console.log("Base non a jour : appliquez les migrations correspondantes dans le SQL Editor de Supabase.");
  process.exit(1);
} else {
  console.log("Base a jour : toutes les migrations sont appliquees.");
}
