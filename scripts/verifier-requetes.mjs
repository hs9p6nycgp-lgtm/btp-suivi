
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

/** Extrait les cles de premier niveau d'un objet litteral (accolades equilibrees). */
function clesObjet(source, debut) {
  const ouvre = source.indexOf("{", debut);
  if (ouvre < 0) return [];
  let niveau = 0;
  let fin = -1;
  for (let i = ouvre; i < source.length; i++) {
    const c = source[i];
    if (c === "{") niveau += 1;
    else if (c === "}") {
      niveau -= 1;
      if (niveau === 0) {
        fin = i;
        break;
      }
    }
  }
  if (fin < 0) return [];
  const corps = source.slice(ouvre + 1, fin);
  const cles = [];
  let profondeur = 0;
  let debutCle = -1;
  for (let i = 0; i < corps.length; i++) {
    const c = corps[i];
    if ("{[(".includes(c)) profondeur += 1;
    else if ("}])".includes(c)) profondeur -= 1;
    else if (c === ":" && profondeur === 0 && debutCle >= 0) {
      const nom = corps.slice(debutCle, i).trim().replace(/^["'`]|[,"'`]$/g, "");
      if (/^[a-z_][a-z0-9_]*$/i.test(nom)) cles.push(nom);
      debutCle = -1;
    } else if (c === "," && profondeur === 0) {
      debutCle = -1;
    } else if (debutCle < 0 && /[a-z_]/i.test(c)) {
      debutCle = i;
    } else if (debutCle >= 0 && !/[a-z0-9_]/i.test(c) && c !== " ") {
      debutCle = -1;
    }
  }
  return cles;
}

const requetes = new Map(); // cle "table|cols" -> { table, cols, sources: [] }
const ajouterRequete = (table, cols, source) => {
  if (cols.length === 0) return;
  const cle = `${table}|${cols.join(",")}`;
  if (!requetes.has(cle)) requetes.set(cle, { table, cols, sources: [] });
  requetes.get(cle).sources.push(source);
};

for (const f of fichiers) {
  const texte = fs.readFileSync(f, "utf8");
  const lignes = texte.split("\n");
  lignes.forEach((ligne, i) => {
    const m = ligne.match(/from\(\s*["'`]([a-z_]+)["'`]\s*\)/);
    if (!m) return;
    const table = m[1];
    const source = `${path.relative(process.cwd(), f)}:${i + 1}`;
    // le select est sur la meme ligne ou sur les 3 suivantes
    const fenetre = lignes.slice(i, i + 4).join(" ");
    const s = fenetre.match(/\.select\(\s*["'`]([^"'`]+)["'`]/);
    if (s) {
      ajouterRequete(
        table,
        s[1].split(",").map((c) => c.trim()).filter(Boolean),
        source,
      );
    }
    // les ecritures (insert / update) portent leurs colonnes dans l'objet
    for (const methode of ["insert", "update", "upsert"]) {
      const idx = fenetre.search(new RegExp(`\\.${methode}\\s*\\(`));
      if (idx < 0) continue;
      const apres = fenetre.slice(idx);
      const debutObjet = apres.indexOf("{");
      if (debutObjet < 0) continue;
      // le payload doit etre un objet litteral : sinon ses colonnes sont
      // assemblees plus haut (variable) et ne sont pas verifiables ici.
      const avantObjet = apres.slice(0, debutObjet);
      const derniereParenthese = avantObjet.lastIndexOf("(");
      if (derniereParenthese < 0) continue;
      const argument = avantObjet.slice(derniereParenthese + 1).trim();
      if (argument !== "") continue;
      ajouterRequete(table, clesObjet(apres, debutObjet), source);
    }
  });
}

// 2) Verification contre la base
const problemes = [];
let verifiees = 0;
for (const { table, cols, sources } of requetes.values()) {
  const r = await fetchRobuste(`${URL}/rest/v1/${table}?select=${encodeURIComponent(cols.join(","))}&limit=0`, { headers: entetes });
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
