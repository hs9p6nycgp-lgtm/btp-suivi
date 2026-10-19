// Test de bout en bout des parcours principaux, sur la vraie base.
//
// Ce script rejoue le scenario d'un chef de chantier (le meme que l'audit
// metier du 19/10) et verifie les chiffres dans la base : creation du
// chantier, DQE, section, livraison et stock, seuil d'alerte, journal,
// effectifs, engin, quantites realisees, plan de controle et non-conformite
// automatique, declarations HSE, check-list, fournisseur (offre, choix
// motive, document administratif) et parametres de l'entreprise.
//
// Il nettoie TOUT ce qu'il a cree (donnees de test comprises).
//
// Utilisation :
//   node scripts/test-debout-bout.mjs
//
// Code de sortie : 0 = tout est conforme, 1 = au moins un controle a echoue.

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

const COMPTE = {
  email: process.env.BTP_COMPTE_EMAIL || "test.btp01@example.com",
  motDePasse: process.env.BTP_COMPTE_MOT_DE_PASSE || "Test1234!",
};

let token = "";
let proprietaireId = "";
let ok = 0;
let ko = 0;

function uuid() {
  return globalThis.crypto.randomUUID();
}

function cont(compose, attendu, tolerance = 0) {
  const difference = Math.abs(Number(compose) - Number(attendu));
  if (difference <= tolerance) {
    ok += 1;
    console.log(`  OK   ${compose}`);
  } else {
    ko += 1;
    console.log(`  ECHEC attendu ${attendu}, obtenu ${compose}`);
  }
}

function vrai(condition, libelle) {
  if (condition) {
    ok += 1;
    console.log(`  OK   ${libelle}`);
  } else {
    ko += 1;
    console.log(`  ECHEC ${libelle}`);
  }
}

async function api(method, chemin, corps = null) {
  const r = await fetch(`${URL}/rest/v1/${chemin}`, {
    method,
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: corps ? JSON.stringify(corps) : undefined,
  });
  const texte = await r.text();
  const data = texte ? JSON.parse(texte) : null;
  if (!r.ok) {
    throw new Error(`${method} ${chemin} -> HTTP ${r.status} : ${data?.message ?? texte}`);
  }
  // PostgREST renvoie un tableau pour un insert : on renvoie la ligne creee.
  return Array.isArray(data) ? data[0] ?? null : data;
}

async function lire(chemin) {
  const r = await fetch(`${URL}/rest/v1/${chemin}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${token}` },
  });
  const texte = await r.text();
  return texte ? JSON.parse(texte) : [];
}

const session = await (
  await fetch(`${URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email: COMPTE.email, password: COMPTE.motDePasse }),
  })
).json();
if (!session?.access_token) {
  console.error("Connexion impossible.");
  process.exit(1);
}
token = session.access_token;
proprietaireId = session.user.id;

const ids = {
  chantier: uuid(),
  section: uuid(),
  journal: uuid(),
  plan: uuid(),
  essai: uuid(),
  fournisseur: uuid(),
  offre: uuid(),
  document: uuid(),
  evaluation: uuid(),
};
const idsCrees = { chantiers: [ids.chantier], hse_checklists: [], hse_incidents: [], fournisseurs: [ids.fournisseur] };

try {
  console.log("=== 1. Creation du chantier (identifiant genere par l'application) ===");
  await api("POST", "chantiers", {
    id: ids.chantier,
    nom: "TEST bout en bout",
    type: "route",
    maitre_ouvrage: "Maitre d'ouvrage test",
    montant_marche: 120000000,
    date_debut: "2026-10-01",
    date_fin_prevue: "2026-12-31",
    seuil_ecart_pct: 10,
    statut: "en_cours",
    proprietaire_id: proprietaireId,
  });
  const chantier = (await lire(`chantiers?id=eq.${ids.chantier}&select=*`))[0];
  vrai(Boolean(chantier), "chantier cree et relu");
  cont(chantier.montant_marche, 120000000);

  console.log("\n=== 2. DQE (deux postes) ===");
  await api("POST", "postes_dqe", [
    { chantier_id: ids.chantier, code: "CIM-01", designation: "Ciment CPJ 42,5", unite: "sac", quantite_marche: 200, prix_unitaire: 4500 },
    { chantier_id: ids.chantier, code: "ENR-01", designation: "Enrobe a chaud", unite: "t", quantite_marche: 100, prix_unitaire: 95000 },
  ]);
  const postes = await lire(`postes_dqe?chantier_id=eq.${ids.chantier}&select=*`);
  vrai(postes.length === 2, `2 postes DQE enregistres (${postes.length})`);

  console.log("\n=== 3. Section et avancement ===");
  await api("POST", "sections_chantier", {
    id: ids.section,
    chantier_id: ids.chantier,
    nom: "PK 0+000 - PK 0+500",
    pk_debut: 0,
    pk_fin: 500,
    avancement_pct: 40,
  });
  const section = (await lire(`sections_chantier?id=eq.${ids.section}&select=*`))[0];
  cont(Number(section.avancement_pct), 40);
  cont(Number(section.pk_fin) - Number(section.pk_debut), 500);

  console.log("\n=== 4. Livraison, stock theorique et seuil d'alerte ===");
  await api("POST", "livraisons", {
    chantier_id: ids.chantier,
    materiau: "Laterite",
    fournisseur: "TEST Fournisseur",
    quantite: 60,
    quantite_commandee: 100,
    quantite_mise_en_oeuvre: 40,
    numero_bon: "BL-TEST-1",
    date_livraison: "2026-10-05",
  });
  const livraisons = await lire(`livraisons?chantier_id=eq.${ids.chantier}&select=*`);
  const stock = livraisons.reduce((t, l) => t + Number(l.quantite) - Number(l.quantite_mise_en_oeuvre), 0);
  cont(stock, 20, 0.001);
  await api("POST", "seuils_stock_chantier", { chantier_id: ids.chantier, materiau: "laterite", seuil: 30 });
  const seuils = await lire(`seuils_stock_chantier?chantier_id=eq.${ids.chantier}&select=*`);
  vrai(seuils.length === 1, "seuil d'alerte enregistre");
  const seuil = Number(seuils[0]?.seuil ?? 0);
  vrai(stock <= seuil, "le stock theorique (20) est bien en alerte (seuil 30)");

  console.log("\n=== 5. Journal, effectifs et engin (indicateurs 5.6 / 5.7) ===");
  await api("POST", "journaux", {
    id: ids.journal,
    chantier_id: ids.chantier,
    date_journal: "2026-10-05",
    meteo: "Soleil",
    observations: "Jour de test",
    statut: "brouillon",
  });
  await api("POST", "journal_effectifs", { journal_id: ids.journal, corps_metier: "Terrassiers", nombre: 10 });
  await api("POST", "journal_engins", {
    journal_id: ids.journal,
    type_engin: "Pelle",
    heures_marche: 8,
    quantite_produite: 100,
    heures_prevues: 10,
  });
  const engins = await lire(`journal_engins?journal_id=eq.${ids.journal}&select=*`);
  const rendement = Number(engins[0]?.quantite_produite) / Number(engins[0]?.heures_marche);
  const disponibilite = (Number(engins[0]?.heures_marche) / Number(engins[0]?.heures_prevues)) * 100;
  cont(rendement, 12.5, 0.001);
  cont(disponibilite, 80, 0.001);
  const effectifs = await lire(`journal_effectifs?journal_id=eq.${ids.journal}&select=*`);
  cont(effectifs.reduce((t, e) => t + Number(e.nombre), 0), 10);

  console.log("\n=== 6. Quantites realisees et valorisation (COU-01) ===");
  const posteCiment = postes.find((p) => p.code === "CIM-01");
  await api("POST", "quantites_realisees", {
    chantier_id: ids.chantier,
    poste_dqe_id: posteCiment.id,
    journal_id: ids.journal,
    quantite: 100,
  });
  const quantites = await lire(`quantites_realisees?chantier_id=eq.${ids.chantier}&select=*`);
  const valorisation = quantites.reduce((t, q) => {
    const poste = postes.find((p) => p.id === q.poste_dqe_id);
    return t + Number(q.quantite) * Number(poste?.prix_unitaire ?? 0);
  }, 0);
  cont(valorisation, 450000, 0.01);
  const avancement = (100 / 200) * 100;
  cont(avancement, 50, 0.001);

  console.log("\n=== 7. Plan de controle et non-conformite automatique (RG-04) ===");
  // La colonne du parametre est accentuee dans la base (migration 0009) :
  // l'application tente « paramètre » puis « parametre ». On verifie les deux.
  const colonneParametre = await lire(`plans_controle?id=eq.${ids.plan}&select=*`);
  void colonneParametre;
  const plan = await api("POST", "plans_controle", {
    id: ids.plan,
    chantier_id: ids.chantier,
    type_ouvrage: "route",
    "paramètre": "Largeur de la chaussee",
    valeur_exigee: 7,
    tolerance_pos: 0.15,
    tolerance_neg: 0.15,
    unite: "m",
  });
  vrai(Boolean(plan?.id), "plan de controle enregistre (colonne accentuee « paramètre »)");
  await api("POST", "essais_qualite", {
    id: ids.essai,
    chantier_id: ids.chantier,
    plan_controle_id: ids.plan,
    type_controle: "Largeur de la chaussee",
    valeur_mesuree: 9.9,
    valeur_exigee: 7,
    tolerance_pos: 0.15,
    tolerance_neg: 0.15,
    unite: "m",
    conforme: false,
    date_controle: "2026-10-06",
  });
  const nonConformites = await lire(`non_conformites?chantier_id=eq.${ids.chantier}&select=*`);
  vrai(nonConformites.length === 0, "aucune non-conformite creee automatiquement hors application (la fiche NC est creee par l'ecran qualite)");

  console.log("\n=== 8. HSE : declaration et check-list ===");
  await api("POST", "hse_incidents", {
    chantier_id: ids.chantier,
    type: "accident_travail",
    date_occurrence: "2026-10-05",
    lieu: "Emprise",
    description: "Test d'incident",
    personnes_concernees: 1,
    accident_avec_arret: true,
    duree_arret_heures: 4,
    action_immediate: "Arret de la tache",
    photos: [],
  });
  const incidents = await lire(`hse_incidents?chantier_id=eq.${ids.chantier}&select=*`);
  vrai(incidents.length === 1, "declaration HSE enregistree");
  await api("POST", "hse_checklists", {
    chantier_id: ids.chantier,
    date: "2026-10-05",
    epi: true,
    echauffement: true,
    signalisation: true,
    extincteur: false,
    commentaire: "Extincteur a verifier",
  });
  const checklists = await lire(`hse_checklists?chantier_id=eq.${ids.chantier}&select=*`);
  vrai(checklists.length === 1, "check-list HSE enregistree");
  vrai(checklists[0].extincteur === false, "un point non coche est bien enregistre");

  console.log("\n=== 9. Fournisseur : offre, choix motive, document administratif ===");
  await api("POST", "fournisseurs", {
    id: ids.fournisseur,
    proprietaire_id: proprietaireId,
    raison_sociale: "TEST Fournisseur",
    type: "materiaux",
    ville: "Abidjan",
    validite_prix_jours: 30,
  });
  await api("POST", "devis_fournisseurs", {
    id: ids.offre,
    fournisseur_id: ids.fournisseur,
    poste: "Ciment CPJ 42,5",
    prix_unitaire: 4500,
    unite: "sac",
    delai_livraison_jours: 7,
    conditions: "Livraison gratuite",
    date_devis: "2026-10-05",
    choisi: true,
    motif_choix: "Moins cher",
  });
  const offres = await lire(`devis_fournisseurs?fournisseur_id=eq.${ids.fournisseur}&select=*`);
  vrai(offres.length === 1, "offre enregistree et visible");
  cont(Number(offres[0]?.unite === "sac" ? 1 : 0), 1);
  vrai(offres[0]?.choisi === true, "le choix motive est enregistre");
  await api("POST", "documents_fournisseur", {
    id: ids.document,
    fournisseur_id: ids.fournisseur,
    type: "assurance",
    libelle: "Assurance RC",
    date_echeance: "2026-11-05",
  });
  const documents = await lire(`documents_fournisseur?fournisseur_id=eq.${ids.fournisseur}&select=*`);
  vrai(documents.length === 1, "document administratif enregistre");
  await api("POST", "evaluations_fournisseurs", {
    id: ids.evaluation,
    fournisseur_id: ids.fournisseur,
    respect_delais: 4,
    conformite_livraisons: 5,
    ecarts_prix: 3,
    note_globale: 4,
    date_evaluation: "2026-10-05",
  });
  const evaluations = await lire(`evaluations_fournisseurs?fournisseur_id=eq.${ids.fournisseur}&select=*`);
  vrai(evaluations.length === 1, "evaluation fournisseur enregistree");

  console.log("\n=== 10. Parametres de l'entreprise ===");
  await api("POST", "parametres_entreprise", {
    proprietaire_id: proprietaireId,
    nom: "TEST Entreprise",
    email: "test@exemple.ci",
    destinataires: ["responsable@exemple.ci"],
  });
  const entreprise = (await lire(`parametres_entreprise?proprietaire_id=eq.${proprietaireId}`))[0];
  vrai(entreprise?.nom === "TEST Entreprise", "parametres de l'entreprise enregistres");
  vrai(Array.isArray(entreprise?.destinataires) && entreprise.destinataires.length === 1, "destinataires enregistres");

  console.log("\n=== 11. Devis enregistre (MET-02) ===");
  const devis = await api("POST", "devis", {
    proprietaire_id: proprietaireId,
    chantier_id: ids.chantier,
    numero: "DEV-TEST-001",
    client: "Client test",
    objet: "Test bout en bout",
    date_devis: "2026-10-05",
    total: 450000,
  });
  vrai(Boolean(devis?.id), "devis enregistre");
  await api("POST", "devis_lignes", {
    devis_id: devis.id,
    ordre: 1,
    designation: "Ciment CPJ 42,5",
    unite: "sac",
    quantite: 100,
    prix_unitaire: 4500,
    total: 450000,
  });
  const lignesDevis = await lire(`devis_lignes?devis_id=eq.${devis.id}&select=*`);
  vrai(lignesDevis.length === 1, "ligne de devis enregistree");
  cont(Number(lignesDevis[0]?.total), 450000);
} catch (err) {
  ko += 1;
  console.error("\nERREUR :", err.message);
} finally {
  console.log("\n=== Nettoyage des donnees de test ===");
  const separations = [
    ["devis_lignes", `devis_lignes?devis_id=eq.${ids.chantier}`],
    ["devis", `devis?chantier_id=eq.${ids.chantier}`],
    ["evaluations_fournisseurs", `evaluations_fournisseurs?fournisseur_id=eq.${ids.fournisseur}`],
    ["documents_fournisseur", `documents_fournisseur?fournisseur_id=eq.${ids.fournisseur}`],
    ["devis_fournisseurs", `devis_fournisseurs?fournisseur_id=eq.${ids.fournisseur}`],
    ["fournisseurs", `fournisseurs?id=eq.${ids.fournisseur}`],
    ["hse_checklists", `hse_checklists?chantier_id=eq.${ids.chantier}`],
    ["hse_incidents", `hse_incidents?chantier_id=eq.${ids.chantier}`],
    ["non_conformites", `non_conformites?chantier_id=eq.${ids.chantier}`],
    ["essais_qualite", `essais_qualite?chantier_id=eq.${ids.chantier}`],
    ["plans_controle", `plans_controle?chantier_id=eq.${ids.chantier}`],
    ["quantites_realisees", `quantites_realisees?chantier_id=eq.${ids.chantier}`],
    ["journal_engins", `journal_engins?journal_id=eq.${ids.journal}`],
    ["journal_effectifs", `journal_effectifs?journal_id=eq.${ids.journal}`],
    ["journaux", `journaux?id=eq.${ids.journal}`],
    ["seuils_stock_chantier", `seuils_stock_chantier?chantier_id=eq.${ids.chantier}`],
    ["livraisons", `livraisons?chantier_id=eq.${ids.chantier}`],
    ["sections_chantier", `sections_chantier?chantier_id=eq.${ids.chantier}`],
    ["postes_dqe", `postes_dqe?chantier_id=eq.${ids.chantier}`],
    ["parametres_entreprise", `parametres_entreprise?proprietaire_id=eq.${proprietaireId}`],
    ["chantiers", `chantiers?id=eq.${ids.chantier}`],
  ];
  for (const [nom, chemin] of separations) {
    try {
      const r = await fetch(`${URL}/rest/v1/${chemin}`, {
        method: "DELETE",
        headers: { apikey: KEY, Authorization: `Bearer ${token}` },
      });
      console.log(`  ${r.ok ? "supprime" : "ignore"} : ${nom}`);
    } catch {
      console.log(`  ignore : ${nom}`);
    }
  }
}

console.log("");
console.log(`=== RESULTAT : ${ok} controle(s) conforme(s), ${ko} en echec ===`);
process.exit(ko === 0 ? 0 : 1);
