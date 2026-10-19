// Chargement des notifications depuis Supabase et mise en forme lisible.
//
// Ce fichier fait le lien entre la base (trois tables) et le module pur
// `src/lib/notifications.ts` : il est donc côté navigateur, contrairement au
// module pur qui n'importe rien.

import { createClient } from "@/lib/supabase/client";
import { detailAlerte, libelleTypeAlerte, type LangueAlerte } from "@/lib/alertes";
import {
  construireNotifications,
  formatDateFR,
  type AlerteRow,
  type ChantierRow,
  type NonConformiteRow,
  type Notification,
} from "@/lib/notifications";

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

  const [alertes, nonConformites, chantiers] = await Promise.all([
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
  ]);

  return construireNotifications({
    alertes: (alertes.data ?? []) as AlerteRow[],
    nonConformites: (nonConformites.data ?? []) as NonConformiteRow[],
    chantiers: (chantiers.data ?? []) as ChantierRow[],
    aujourdHui,
  });
}

/** Titre lisible de la notification. */
export function libelleNotification(notification: Notification, langue: LangueAlerte = "fr"): string {
  if (notification.categorie === "retard") {
    return langue === "fr" ? "Retard de planning" : "Schedule delay";
  }
  if (notification.categorie === "non_conformite") {
    return langue === "fr" ? "Non-conformité qualité" : "Quality non-conformity";
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
    return notification.description ?? "";
  }
  const avancement = Math.round(notification.avancementPct ?? 0);
  return langue === "fr"
    ? `Fin prévue le ${formatDateFR(notification.dateFinPrevue)} · avancement ${avancement} %`
    : `Due ${formatDateFR(notification.dateFinPrevue)} · progress ${avancement} %`;
}
