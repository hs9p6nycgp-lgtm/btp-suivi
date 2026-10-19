// Module d'envoi d'email de journal de chantier
// Deux options d'envoi sont prévues : SendGrid (email) ou API SMS Orange CI.
// L'option utilisée est contrôlée par la variable d'environnement SEND_MODE.
//
// ⚠️ Nécessite la mise en place de clés d'API côté serveur (Vercel/Netlify Functions)
// ou en environnement de développement via .env.local.
//
// ===== Configuration =====
// Placer ces valeurs dans .env.local (ou dans les secrets Vercel) :
// SEND_MODE=sendgrid   |  SENDGRID_API_KEY=votre_cle_api
//                      |  SENDGRID_FROM_EMAIL=expéditeur@votre-domaine.com
// SEND_MODE=sms      |  SMS_API_KEY=votre_cle_API_Orange_CI
//                      |  SMS_FROM=whatsapp%40votre-numéro.ci  (format URL-encoded)
//                      |  SMS_TO=e-mail_ou_numéro_du_propriétaire
//
// ⚠️ L'envoi réel n'est pas déclenché dans ce fichier à la volée ; il sert de
// modèle appelable depuis une Serverless Function (ex: `/api/send-journal`).
// L'utilisateur déclche l'envoi depuis l'interface (case "Envoyer au propriétaire"
// sur la fiche de journal validée).

import * as crypto from "crypto";

/** Construit le corps de l'email/SMS à partir des données du journal. */
function construireCorpsJournal(journal) {
  const date = journal.created_at ? new Date(journal.created_at).toLocaleDateString("fr-FR") : "Date inconnue";
  const statut = journal.statut ?? "inconnu";
  const observations = journal.observations || "";
  const chantier = journal.chantier ? journal.chantier.nom : "inconnu";
  const montant = journal.montant_total !== undefined ? `${journal.montant_total.toLocaleString("fr-FR")} FCFA` : "Non défini";

  return `--- Rapport de journal de chantier ---

Chantier : ${chantier}
Date : ${date}
Statut : ${statut}
Observations : ${observations}
Montant total : ${montant}

--- Fin du rapport ---
`;
}

/** Génère un identifiant unique pour le journal (pour l'idempotence). */
function journalId(journal) {
  return `journal_${journal.chantier_id}_${journal.created_at}`;
}

/** hachage léger à des fins de débogage / déduplication. */
function hashMsg(msg) {
  return crypto.createHash("sha256").update(msg).digest("hex").slice(0, 16);
}

/** Retourne la configuration d'envoi selon la mode sélectionnée. */
function getConfig() {
  const mode = process.env.SEND_MODE ?? "none";
  switch (mode) {
    case "sendgrid":
      return {
        mode: "email",
        apiKey: process.env.SENDGRID_API_KEY,
        from: process.env.SENDGRID_FROM_EMAIL ?? "no-reply@btp-suivi.com",
      };
    case "sms":
      return {
        mode: "sms",
        apiKey: process.env.SMS_API_KEY,
        from: process.env.SMS_FROM, // ex: whatsapp%40+225xxxxxxxxxx
        to: process.env.SMS_TO,
      };
    default:
      return { mode: "none", reason: "Aucune configuration SEND_MODE détectée." };
  }
}

/** Sérialise les données du journal pour l'envoi (écourt les champs longs). */
function sanitizeJournal(journal) {
  return {
    id: journal.id,
    chantierId: journal.chantier_id,
    date: journal.created_at,
    statut: journal.statut,
    observations: journal.observations?.substring(0, 100) ?? "",
    montantTotal: journal.montant_total,
  };
}

export { construireCorpsJournal, journalId, hashMsg, getConfig, sanitizeJournal };