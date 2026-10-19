// Chargement des notifications depuis Supabase et mise en forme lisible.
//
// Ce fichier fait le lien entre la base (cinq tables : alertes, non-conformités,
// chantiers, livraisons, seuils de stock) et le module pur
// `src/lib/notifications.ts` : il est donc côté navigateur, contrairement au
// module pur qui n'importe rien.

import { createClient } from "@/lib/supabase/client";
import { detailAlerte, libelleTypeAlerte, type LangueAlerte } from "@/lib/alertes";
import { cleMateriau } from "@/lib/stock/materiaux";
import { alertesStock, type EntreeStock, type SeuilStock } from "@/lib/stock/stock";
import {
  construireNotifications,
  construireHistorique,
  formatDateFR,
  type AlerteRow,
  type ChantierRow,
  type NonConformiteRow,
  type Notification,
  type StockRow,
  type Traitement,
} from "@/lib/notifications";

type LivraisonRow = {
  chantier_id: string;
  materiau: string;
  quantite: number;
  quantite_mise_en_oeuvre: number;
};

type SeuilRow = {
  chantier_id: string;
  materiau: string;
  seuil: number;
};

function formaterNombre(valeur: number | string): string {
  const nombre = Number(valeur);
  if (!Number.isFinite(nombre)) return String(valeur);
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(nombre);
}

/** Charge tous les problèmes à traiter, tous chantiers confondus. */
export async function chargerNotifications(): Promise<Notification[]> {
  const supabase = createClient();
  const maintenant = new Date();
  // Date du jour en heure locale (et non UTC) pour ne pas décaler les retards.
  const aujourdHui = [
    maintenant.getFullYear(),
    String(maintenant.getMonth() + 1).padStart(2, "0"),
    String(maintenant.getDate()).padStart(2, "0"),
  ].join("-");

  const [alertes, nonConformites, chantiers, livraisons, seuils] = await Promise.all([
    supabase
      .from("alertes")
      .select("id, chantier_id, type, valeur, seuil, statut, date_alerte")
      .eq("statut", "ouverte"),
    supabase
      .from("non_conformites")
      .select("id, chantier_id, description, gravite, statut, echeance, created_at")
      .in("statut", ["ouverte", "en_cours"]),
    supabase
      .from("chantiers")
      .select("id, nom, date_fin_prevue, avancement_pct, statut"),
    supabase
      .from("livraisons")
      .select("chantier_id, materiau, quantite, quantite_mise_en_oeuvre"),
    supabase
      .from("seuils_stock_chantier")
      .select("chantier_id, materiau, seuil"),
  ]);

  // Stock bas : mêmes règles que la page « Livraisons » d'un chantier
  // (quantité livrée - quantité mise en œuvre, comparée au seuil).
  const libelles = new Map<string, string>();
  const entrees: EntreeStock[] = [];
  for (const livraison of (livraisons.data ?? []) as LivraisonRow[]) {
    const cle = cleMateriau(livraison.materiau);
    const cleComplete = `${livraison.chantier_id}::${cle}`;
    if (!libelles.has(cleComplete)) libelles.set(cleComplete, livraison.materiau);
    entrees.push({
      chantier_id: livraison.chantier_id,
      cle,
      quantite: Number(livraison.quantite) || 0,
      mise_en_oeuvre: Number(livraison.quantite_mise_en_oeuvre) || 0,
    });
  }
  const seuilRows: SeuilStock[] = ((seuils.data ?? []) as SeuilRow[]).map((seuil) => ({
    chantier_id: seuil.chantier_id,
    cle: cleMateriau(seuil.materiau),
    seuil: Number(seuil.seuil) || 0,
  }));
  const stocks: StockRow[] = alertesStock(entrees, seuilRows).map((alerte) => ({
    ...alerte,
    libelle: libelles.get(`${alerte.chantier_id}::${alerte.cle}`) ?? alerte.cle,
  }));

  return construireNotifications({
    alertes: (alertes.data ?? []) as AlerteRow[],
    nonConformites: (nonConformites.data ?? []) as NonConformiteRow[],
    chantiers: (chantiers.data ?? []) as ChantierRow[],
    aujourdHui,
    stocks,
  });
}

/**
 * Historique des problèmes traités (non-conformités clôturées ou rejetées,
 * alertes acquittées ou clôturées) : la mémoire de la démarche qualité.
 */
export async function chargerHistorique(): Promise<Traitement[]> {
  const supabase = createClient();

  const [nonConformites, alertes, chantiers] = await Promise.all([
    supabase
      .from("non_conformites")
      .select("id, chantier_id, description, gravite, statut, action_corrective, date_cloture, created_at")
      .in("statut", ["cloturee", "rejetee"]),
    supabase
      .from("alertes")
      .select("id, chantier_id, type, valeur, seuil, statut, date_alerte")
      .neq("statut", "ouverte"),
    supabase.from("chantiers").select("id, nom"),
  ]);

  return construireHistorique({
    nonConformites: (nonConformites.data ?? []) as NonConformiteRow[],
    alertes: (alertes.data ?? []) as AlerteRow[],
    chantiers: (chantiers.data ?? []) as ChantierRow[],
  });
}

/** Titre lisible de la notification. */export function libelleNotification(notification: Notification, langue: LangueAlerte = "fr"): string {
  if (notification.categorie === "retard") {
    return langue === "fr" ? "Retard de planning" : "Schedule delay";
  }
  if (notification.categorie === "non_conformite") {
    return langue === "fr" ? "Non-conformité qualité" : "Quality non-conformity";
  }
  if (notification.categorie === "stock") {
    return langue === "fr" ? "Stock bas" : "Low stock";
  }
  return libelleTypeAlerte(notification.type, langue);
}

/** Phrase de détail affichée sous le titre. */
export function detailNotification(notification: Notification, langue: LangueAlerte = "fr"): string {
  if (notification.categorie === "alerte") {
    return detailAlerte(
      {
        type: notification.type,
        valeur: notification.valeur ?? 0,
        seuil: notification.seuil ?? 0,
      },
      langue,
    );
  }
  if (notification.categorie === "non_conformite") {
    const base = notification.description ?? "";
    if (notification.echeanceDepassee && notification.echeance) {
      return langue === "fr"
        ? `${base} · échéance dépassée le ${formatDateFR(notification.echeance)}`
        : `${base} · deadline passed on ${formatDateFR(notification.echeance)}`;
    }
    return base;
  }
  if (notification.categorie === "stock") {
    const stock = formaterNombre(notification.valeur ?? 0);
    const seuil = formaterNombre(notification.seuil ?? 0);
    const materiau = notification.description ?? "";
    return langue === "fr"
      ? `${materiau} · stock : ${stock} · seuil : ${seuil}`
      : `${materiau} · stock ${stock} · threshold ${seuil}`;
  }
  const avancement = Math.round(notification.avancementPct ?? 0);
  return langue === "fr"
    ? `Fin prévue le ${formatDateFR(notification.dateFinPrevue)} · avancement ${avancement} %`
    : `Due ${formatDateFR(notification.dateFinPrevue)} · progress ${avancement} %`;
}
