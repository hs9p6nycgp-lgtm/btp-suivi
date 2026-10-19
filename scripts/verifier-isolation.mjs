// Verification de l'isolation des donnees entre deux comptes (BUG-009).
//
// Le script fait un test de bout en bout, sans laisser de trace :
//   1. connexion des deux comptes de test ;
//   2. le compte A cree un chantier de test ;
//   3. on verifie que A le voit et que le compte B ne le voit PAS ;
//   4. on verifie qu'aucun chantier sans proprietaire n'est visible ;
//   5. le compte A supprime le chantier de test.
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

// --- Nettoyage ----------------------------------------------------------------

const supprime = await supprimerChantier(A.token, idTest);
console.log(`\nChantier de test ${supprime ? "supprime" : "NON SUPPRIME (a nettoyer manuellement)"} (${idTest}).`);

console.log("\n=== RESULTAT ===");
if (fuite) {
  console.log("Isolation NON fonctionnelle : reappliquer supabase/APPLIQUER_ISOLATION.sql dans Supabase.");
  process.exit(1);
}
console.log("Isolation VERIFIEE : chaque compte ne voit que ses propres chantiers.");
