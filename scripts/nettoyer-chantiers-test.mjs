// Nettoyage de chantiers de test (et de toutes leurs donnees liees) via l'API REST (cle service).
// ⚠️ ATTENTION : Cette commande utilise la SUPABASE_SERVICE_ROLE_KEY qui donne
// un accès complet à la base de données, en contournant le RLS.
// Assurez-vous que .env.local est dans .gitignore (déjà le cas) et ne la commite jamais.
// Utilisez cette commande uniquement dans des environnements de confiance.
//----------------------------------------------------------------------------
// Utilisation (depuis la racine du projet) :
//   node scripts/nettoyer-chantiers-test.mjs --id <uuid> [--id <uuid> ...]             -> analyse seule
//   node scripts/nettoyer-chantiers-test.mjs --id <uuid> ... --supprimer               -> analyse + sauvegarde + suppression
//
// Lecture seule par defaut. Avant toute suppression, une sauvegarde JSON complete
// (chantier + toutes ses donnees liees) est ecrite dans CHANTIERS_SAUVEGARDE_DIR
// (ou dans le dossier temporaire systeme).
//
// La suppression du chantier est faite en un seul appel REST : les tables liees
// sont supprimees automatiquement (contraintes on delete cascade des migrations).
//
// Exécuté le 18/10/2026 : « Chantier Test Abidjan » + « B » (tous deux vides).

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const SUPPRIMER = process.argv.includes("--supprimer");

// --- Identifiants de chantiers a nettoyer (--id uuid, repetable)
const IDS = [];
for (let i = 0; i < process.argv.length; i += 1) {
  if (process.argv[i] === "--id" && process.argv[i + 1]) IDS.push(process.argv[i + 1]);
}
if (IDS.length === 0) {
  console.error("Aucun identifiant fourni. Exemple :");
  console.error("  node scripts/nettoyer-chantiers-test.mjs --id 00000000-0000-0000-0000-000000000000");
  process.exit(1);
}
const listeIds = IDS.join(",");

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

const DOSSIER_SAUVEGARDE = process.env.CHANTIERS_SAUVEGARDE_DIR ?? os.tmpdir();

async function lire(chemin) {
  const r = await fetch(`${URL}/rest/v1/${chemin}`, { headers });
  if (!r.ok) throw new Error(`Lecture ${chemin} impossible : HTTP ${r.status} ${await r.text()}`);
  return r.json();
}

// Tables reliees directement au chantier (on delete cascade)
const TABLES_DIRECTES = [
  "postes_dqe",
  "quantites_realisees",
  "alertes",
  "chantier_utilisateurs",
  "intervenants_chantier",
  "sections_chantier",
  "documents_chantier",
  "parametres_metre",
  "journaux",
  "livraisons",
  "taches_planning",
  "dependances_planning",
  "depenses_reelles",
  "plans_controle",
  "essais_qualite",
  "non_conformites",
  "epreuves_beton",
  "devis_fournisseurs",
];

// ------------------------------------------------------------------
// 1. Lecture du chantier et de ses donnees liees
// ------------------------------------------------------------------
console.log(`Chantiers cibles : ${IDS.join(", ")}`);
const chantiers = await lire(`chantiers?select=*&id=in.(${listeIds})`);
if (chantiers.length === 0) {
  console.error("Aucun chantier trouve avec ces identifiants. Rien a faire.");
  process.exit(1);
}

const donnees = { chantiers };
const resume = [];

for (const table of TABLES_DIRECTES) {
  const lignes = await lire(`${table}?select=*&chantier_id=in.(${listeIds})`);
  if (lignes.length > 0) {
    donnees[table] = lignes;
    resume.push(`${table} : ${lignes.length}`);
  }
}

// Sous-tables du journal
const journaux = donnees.journaux ?? [];
if (journaux.length > 0) {
  const idsJournaux = journaux.map((j) => j.id).join(",");
  for (const table of ["journal_effectifs", "journal_engins", "incidents_journal", "photos_journal"]) {
    const lignes = await lire(`${table}?select=*&journal_id=in.(${idsJournaux})`);
    if (lignes.length > 0) {
      donnees[table] = lignes;
      resume.push(`${table} : ${lignes.length}`);
    }
  }
}

// Sous-tables des non-conformites
const nonConformites = donnees.non_conformites ?? [];
if (nonConformites.length > 0) {
  const idsNc = nonConformites.map((n) => n.id).join(",");
  for (const table of ["photos_non_conformite"]) {
    const lignes = await lire(`${table}?select=*&non_conformite_id=in.(${idsNc})`);
    if (lignes.length > 0) {
      donnees[table] = lignes;
      resume.push(`${table} : ${lignes.length}`);
    }
  }
}

// ------------------------------------------------------------------
// 2. Rapport
// ------------------------------------------------------------------
for (const c of chantiers) {
  console.log(`- "${c.nom}" (${c.id}) — type=${c.type}, statut=${c.statut}, proprio=${c.proprietaire_id ?? "NULL"}, cree=${c.created_at}`);
}
if (resume.length === 0) {
  console.log("Donnees liees : aucune (chantiers vides).");
} else {
  console.log("Donnees liees a sauvegarder : " + resume.join(" | "));
}

const fichiersStockage = [
  ...(donnees.documents_chantier ?? []).map((d) => `documents/${d.chemin ?? "?"}`),
  ...(donnees.photos_journal ?? []).map((p) => `photos/${p.chemin ?? "?"}`),
];
if (fichiersStockage.length > 0) {
  console.log(`Fichiers de stockage lies (a supprimer separement) : ${fichiersStockage.length}`);
  for (const f of fichiersStockage) console.log(`  - ${f}`);
}

if (!SUPPRIMER) {
  console.log("Analyse seule : aucune suppression effectuee (relancer avec --supprimer).");
  process.exit(0);
}

// ------------------------------------------------------------------
// 3. Sauvegarde puis suppression
// ------------------------------------------------------------------
const horodatage = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const fichierSauvegarde = path.join(DOSSIER_SAUVEGARDE, `chantiers_sauvegarde_${horodatage}.json`);
fs.writeFileSync(fichierSauvegarde, JSON.stringify(donnees, null, 1));
console.log(`Sauvegarde ecrite : ${fichierSauvegarde}`);

const suppression = await fetch(`${URL}/rest/v1/chantiers?id=in.(${listeIds})`, {
  method: "DELETE",
  headers: { ...headers, Prefer: "return=representation" },
});
if (!suppression.ok) {
  console.error(`Suppression impossible : HTTP ${suppression.status} ${await suppression.text()}`);
  process.exit(1);
}
const supprimes = await suppression.json();
console.log(`Suppression effectuee : ${supprimes.length} chantier(s) supprime(s).`);

const restants = await lire(`chantiers?select=id&id=in.(${listeIds})`);
console.log(restants.length === 0 ? "Verification : plus aucun chantier cible en base. OK." : `ATTENTION : ${restants.length} chantier(s) encore present(s).`);
