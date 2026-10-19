// Verification de l'isolation des donnees entre deux comptes (BUG-009).
//
// Le script fait un test de bout en bout, sans laisser de trace :
//   1. connexion des deux comptes de test ;
//   2. le compte A cree un chantier de test ;
//   3. on verifie que A le voit et que le compte B ne le voit PAS ;
//   4. on verifie qu'aucun chantier sans proprietaire n'est visible ;
//   5. le compte A saisit des donnees dans les tables enfants (section, poste
//      DQE, tache de planning, journal, effectifs, quantite, alerte, document,
//      intervenant, point d'avancement) : la base doit accepter l'ecriture ;
//   6. le compte B ne doit voir aucune de ces lignes ;
//   7. le compte A supprime le chantier de test ; on verifie qu'il ne reste
//      aucune ligne de test.
//
// Utilisation :
//   node scripts/verifier-isolation.mjs
// (les variables NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY
//  sont lues depuis .env.local, ou depuis l'environnement)
//
// Code de sortie : 0 = isolation correcte, 1 = fuite detectee.

import fs from "node:fs";
import path from "node:path";

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
  process.exit(1);
}

const COMPTES = [
  { label: "A", email: "test.btp01@example.com", motDePasse: "Test1234!" },
  { label: "B", email: "user.b@example.com", motDePasse: "Test1234!" },
];

function headers(token) {
  return { apikey: KEY, Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

async function lireJson(r) {
  const texte = await r.text();
  if (!texte) return null;
  try {
    return JSON.parse(texte);
  } catch {
    return null;
  }
}

async function connecter(email, motDePasse) {
  const r = await fetch(`${URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: motDePasse }),
  });
  const data = await lireJson(r);
  if (!r.ok || !data?.access_token) {
    return { erreur: data?.error_description || data?.msg || `HTTP ${r.status}` };
  }
  return { token: data.access_token, id: data.user?.id, email: data.user?.email };
}

async function listerChantiers(token) {
  const r = await fetch(`${URL}/rest/v1/chantiers?select=id,nom,proprietaire_id&order=created_at`, {
    headers: headers(token),
  });
  const data = await lireJson(r);
  if (!r.ok) return { erreur: data?.message || `HTTP ${r.status}` };
  return { chantiers: data ?? [] };
}

// L'identifiant est genere ici, comme le fait l'application : la politique
// d'isolation refuse de renvoyer la ligne inserée (« insert ... returning »),
// on n'en a donc pas besoin pour verifier l'isolation.
function creerId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function creerChantier(token, proprietaireId, nom, id) {
  const r = await fetch(`${URL}/rest/v1/chantiers`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({
      id,
      nom,
      type: "route",
      montant_marche: 0,
      statut: "en_preparation",
      proprietaire_id: proprietaireId,
    }),
  });
  if (!r.ok) {
    const data = await lireJson(r);
    return { erreur: data?.message || data?.error || `HTTP ${r.status}` };
  }
  return { chantier: { id } };
}

async function supprimerChantier(token, id) {
  const r = await fetch(`${URL}/rest/v1/chantiers?id=eq.${id}`, {
    method: "DELETE",
    headers: headers(token),
  });
  return r.ok;
}

// --- Connexion des deux comptes ------------------------------------------------

const comptes = [];
for (const c of COMPTES) {
  const session = await connecter(c.email, c.motDePasse);
  if (session.erreur) {
    console.error(`Connexion impossible pour le compte ${c.label} (${c.email}) : ${session.erreur}`);
    process.exit(1);
  }
  comptes.push({ ...c, ...session });
}
const [A, B] = comptes;

// --- Test : A cree un chantier, B ne doit pas le voir -------------------------

const nomTest = `TEST isolation automatique ${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}`;
const idTest = creerId();
const creation = await creerChantier(A.token, A.id, nomTest, idTest);
if (creation.erreur) {
  console.error(`Creation du chantier de test impossible : ${creation.erreur}`);
  process.exit(1);
}

let fuite = false;
console.log("=== TEST D'ISOLATION (chantier de test cree par le compte A) ===\n");

const listeA = await listerChantiers(A.token);
const listeB = await listerChantiers(B.token);
if (listeA.erreur || listeB.erreur) {
  console.error(`Lecture impossible : ${listeA.erreur ?? listeB.erreur}`);
  await supprimerChantier(A.token, idTest);
  process.exit(1);
}

const AVoit = listeA.chantiers.some((c) => c.id === idTest);
const BVoit = listeB.chantiers.some((c) => c.id === idTest);

console.log(`Compte A (${A.email}) voit le chantier de test : ${AVoit ? "OUI" : "NON"}  ${AVoit ? "OK" : "ANOMALIE"}`);
console.log(`Compte B (${B.email}) voit le chantier de test : ${BVoit ? "OUI" : "NON"}  ${BVoit ? "FUITE !" : "OK"}`);
if (!AVoit) fuite = true;
if (BVoit) fuite = true;

// Chantier sans proprietaire visible par un compte = fuite
for (const [r, liste] of [[A, listeA], [B, listeB]]) {
  const sansProprio = liste.chantiers.filter((c) => !c.proprietaire_id);
  if (sansProprio.length > 0) {
    fuite = true;
    console.log(`FUITE : ${sansProprio.length} chantier(s) sans propriétaire visibles par le compte ${r.label}.`);
  }
}

// Chaque compte ne doit voir que ses propres chantiers
for (const [r, liste] of [[A, listeA], [B, listeB]]) {
  const intrus = liste.chantiers.filter((c) => c.proprietaire_id && c.proprietaire_id !== r.id);
  if (intrus.length > 0) {
    fuite = true;
    console.log(`FUITE : le compte ${r.label} voit ${intrus.length} chantier(s) appartenant a un autre compte.`);
  }
}

// --- Test des tables enfants (saisie terrain) ---------------------------------
// Le compte A remplit son chantier ; la base doit accepter l'ecriture et le
// compte B ne doit rien voir. C'est ce que fait l'application au quotidien.

const idSection = creerId();
const idPoste = creerId();
const idTache = creerId();
const idJournal = creerId();
const aujourdhui = new Date().toISOString().slice(0, 10);

const insertions = [
  ["sections_chantier", { id: idSection, chantier_id: idTest, nom: "Section test" }],
  ["postes_dqe", { id: idPoste, chantier_id: idTest, designation: "Poste test", unite: "u" }],
  ["taches_planning", { id: idTache, chantier_id: idTest, nom: "Tache test" }],
  ["journaux", { id: idJournal, chantier_id: idTest, date_journal: aujourdhui, statut: "brouillon" }],
  ["journal_effectifs", { id: creerId(), journal_id: idJournal, corps_metier: "Test", nombre: 1 }],
  ["quantites_realisees", { id: creerId(), chantier_id: idTest, poste_dqe_id: idPoste, quantite: 1 }],
  ["alertes", { id: creerId(), chantier_id: idTest, poste_dqe_id: idPoste, valeur: 1, seuil: 2 }],
  ["documents_chantier", { id: creerId(), chantier_id: idTest, nom: "Doc test", type: "plan", chemin: "/documents/test.pdf" }],
  ["intervenants_chantier", { id: creerId(), chantier_id: idTest, nom: "Intervenant test" }],
  ["avancements_chantier", { id: creerId(), chantier_id: idTest, section_id: idSection, date_point: aujourdhui, avancement_pct: 10 }],
];

// [table, colonne de rattachement, valeur attendue]
const tablesAVerifier = [
  ["sections_chantier", "chantier_id", idTest],
  ["postes_dqe", "chantier_id", idTest],
  ["taches_planning", "chantier_id", idTest],
  ["journaux", "chantier_id", idTest],
  ["journal_effectifs", "journal_id", idJournal],
  ["quantites_realisees", "chantier_id", idTest],
  ["alertes", "chantier_id", idTest],
  ["documents_chantier", "chantier_id", idTest],
  ["intervenants_chantier", "chantier_id", idTest],
  ["avancements_chantier", "chantier_id", idTest],
];

console.log("\n=== TEST DES TABLES ENFANTS (saisie terrain) ===\n");

const ecrituresKo = [];
let erreurTest = false;
for (const [table, ligne] of insertions) {
  const r = await fetch(`${URL}/rest/v1/${table}`, {
    method: "POST",
    headers: { ...headers(A.token), Prefer: "return=representation" },
    body: JSON.stringify(ligne),
  });
  if (r.ok) {
    console.log(`Ecriture du compte A dans ${table.padEnd(23)} : OK`);
  } else {
    const d = await lireJson(r);
    const detail = d?.message ? " : " + d.message : "";
    ecrituresKo.push(`${table} (HTTP ${r.status}${detail})`);
    console.log(`Ecriture du compte A dans ${table.padEnd(23)} : REFUSEE (HTTP ${r.status})${detail}`);
  }
}
if (ecrituresKo.length > 0) {
  // Un refus 401/403 vient de la politique de securite (anomalie reelle) ;
  // toute autre erreur vient des donnees de test elles-memes (a completer).
  const refusPolitique = ecrituresKo.filter((e) => e.includes("HTTP 403") || e.includes("HTTP 401"));
  if (refusPolitique.length > 0) fuite = true;
  else erreurTest = true;
  console.log(
    "\n" +
      (refusPolitique.length > 0
        ? "ANOMALIE (politique de securite)"
        : "TEST INCOMPLET (donnees de test)") +
      " : " +
      ecrituresKo.join(" ; "),
  );
}

console.log("");
for (const [table, colonne, valeur] of tablesAVerifier) {
  const r = await fetch(`${URL}/rest/v1/${table}?select=id&${colonne}=eq.${valeur}`, { headers: headers(B.token) });
  const d = await lireJson(r);
  const visible = Array.isArray(d) ? d.length : 0;
  console.log(`Lecture par le compte B dans ${table.padEnd(23)} : ${visible === 0 ? "rien (OK)" : visible + " ligne(s) VISIBLE -> FUITE"}`);
  if (visible > 0) fuite = true;
}

// --- Nettoyage ----------------------------------------------------------------

const supprime = await supprimerChantier(A.token, idTest);
console.log(`\nChantier de test ${supprime ? "supprime" : "NON SUPPRIME (a nettoyer manuellement)"} (${idTest}).`);

// Aucune ligne de test ne doit subsister (les suppressions sont en cascade).
let residu = 0;
for (const [table, colonne, valeur] of tablesAVerifier) {
  const r = await fetch(`${URL}/rest/v1/${table}?select=id&${colonne}=eq.${valeur}`, { headers: headers(A.token) });
  const d = await lireJson(r);
  if (Array.isArray(d) && d.length > 0) {
    residu += d.length;
    console.log(`RESIDU : ${d.length} ligne(s) encore presente(s) dans ${table}.`);
  }
}
if (residu > 0) {
  fuite = true;
  console.log("ANOMALIE : des lignes de test subsistent dans la base.");
} else {
  console.log("Aucune ligne de test ne subsiste (nettoyage complet).");
}

console.log("\n=== RESULTAT ===");
if (fuite) {
  console.log("Isolation NON fonctionnelle : reappliquer supabase/APPLIQUER_ISOLATION.sql dans Supabase.");
  process.exit(1);
}
if (erreurTest) {
  console.log("Test incomplet : certaines donnees de test n'ont pas pu etre ecrites (voir ci-dessus) — aucune fuite detectee.");
  process.exit(1);
}
console.log("Isolation VERIFIEE : chaque compte ne voit que ses propres chantiers (saisie terrain comprise).");
