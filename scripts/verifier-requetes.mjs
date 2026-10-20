// Verifie que chaque requete de l'application (table + colonnes demandees)
// correspond bien au schema reellement present en base.
// Une colonne inexistante fait echouer la requete entiere (erreur 400) et
// silenceusement vide le resultat : c'est ce controle qui l'attrape.
import fs from "node:fs";
import path from "node:path";

const RACINE = process.cwd();

function chargerEnvLocal() {
  for (const ligne of fs.readFileSync(path.resolve(".env.local"), "utf8").split("\n")) {
    const m = ligne.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
chargerEnvLocal();
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const entetes = { apikey: KEY, Authorization: `Bearer ${KEY}` };

// 1) Collecte des requetes dans le code source
const fichiers = [];
const parcourir = (d) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) parcourir(p);
    else if (/\.tsx?$/.test(e.name) && !e.name.includes(".test.")) fichiers.push(p);
  }
};
parcourir(path.resolve("src"));

const requetes = new Map(); // cle "table|cols" -> { table, cols, sources: [] }
for (const f of fichiers) {
  const texte = fs.readFileSync(f, "utf8");
  const lignes = texte.split("\n");
  lignes.forEach((ligne, i) => {
    const m = ligne.match(/from\(\s*["'`]([a-z_]+)["'`]\s*\)/);
    if (!m) return;
    const table = m[1];
    // le select est sur la meme ligne ou sur les 3 suivantes
    const fenetre = lignes.slice(i, i + 4).join(" ");
    const s = fenetre.match(/\.select\(\s*["'`]([^"'`]+)["'`]/);
    if (!s) return;
    const cols = s[1].split(",").map((c) => c.trim()).filter(Boolean);
    if (cols.length === 0) return;
    const cle = `${table}|${cols.join(",")}`;
    if (!requetes.has(cle)) requetes.set(cle, { table, cols, sources: [] });
    requetes.get(cle).sources.push(`${path.relative(process.cwd(), f)}:${i + 1}`);
  });
}

// 2) Verification contre la base
const problemes = [];
let verifiees = 0;
for (const { table, cols, sources } of requetes.values()) {
  const r = await fetch(`${URL}/rest/v1/${table}?select=${encodeURIComponent(cols.join(","))}&limit=0`, { headers: entetes });
  verifiees += 1;
  if (r.status !== 200) {
    const corps = await r.text();
    problemes.push({ table, cols, sources, code: r.status, message: corps.slice(0, 160) });
  }
}

console.log(`Requetes distinctes trouvees dans le code : ${requetes.size}`);
console.log(`Verifiees contre la base : ${verifiees}`);
console.log(`\n=== REQUETES INVALIDES (${problemes.length}) ===`);
if (problemes.length === 0) {
  console.log("Aucune : toutes les colonnes demandees existent en base.");
} else {
  for (const p of problemes) {
    console.log(`\n${p.table}.select("${p.cols.join(", ")}")  -> HTTP ${p.code}`);
    console.log(`   utilise dans : ${p.sources.slice(0, 4).join(", ")}${p.sources.length > 4 ? ` (+${p.sources.length - 4})` : ""}`);
    console.log(`   message : ${p.message}`);
  }
}
process.exit(problemes.length ? 1 : 0);
