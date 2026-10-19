"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CalendarClock,
  ChevronRight,
  Info,
  Package,
  ShieldAlert,
  X,
} from "lucide-react";
import { t } from "@/lib/i18n";
import {
  chargerNotifications,
  detailNotification,
  libelleNotification,
} from "@/lib/notificationsSource";
import { type Gravite, type Notification } from "@/lib/notifications";

// Cloche de la barre du haut : compte les problèmes à traiter sur tous les
// chantiers (alertes, non-conformités, retards) et permet de les consulter
// sans quitter l'écran en cours.

const COULEURS: Record<Gravite, string> = {
  critique: "text-rose-600 dark:text-rose-300",
  attention: "text-amber-600 dark:text-amber-300",
  info: "text-sky-600 dark:text-sky-300",
};

function iconeNotification(notification: Notification) {
  if (notification.categorie === "non_conformite") return <ShieldAlert className="h-4 w-4" />;
  if (notification.categorie === "retard") return <CalendarClock className="h-4 w-4" />;
  if (notification.categorie === "stock") return <Package className="h-4 w-4" />;
  if (notification.gravite === "info") return <Info className="h-4 w-4" />;
  return <AlertTriangle className="h-4 w-4" />;
}

export default function AlertsBadge() {
  const [ouvert, setOuvert] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [chargement, setChargement] = useState(true);
  const conteneurRef = useRef<HTMLDivElement>(null);

  const charger = useCallback(async () => {
    try {
      setNotifications(await chargerNotifications());
    } catch {
      setNotifications([]);
    } finally {
      setChargement(false);
    }
  }, []);

  // Chargement au démarrage, puis rafraîchissement discret (toutes les 2 minutes
  // et au retour sur l'onglet) : le compteur reste juste sans surcharger le réseau.
  useEffect(() => {
    charger();
    const minuteur = window.setInterval(charger, 120000);
    const auRetour = () => {
      if (document.visibilityState === "visible") charger();
    };
    document.addEventListener("visibilitychange", auRetour);
    return () => {
      window.clearInterval(minuteur);
      document.removeEventListener("visibilitychange", auRetour);
    };
  }, [charger]);

  // Fermeture du panneau : clic dehors ou touche Échap.
  useEffect(() => {
    if (!ouvert) return;
    function surClic(evenement: MouseEvent) {
      if (
        conteneurRef.current &&
        evenement.target instanceof Node &&
        !conteneurRef.current.contains(evenement.target)
      ) {
        setOuvert(false);
      }
    }
    function surTouche(evenement: KeyboardEvent) {
      if (evenement.key === "Escape") setOuvert(false);
    }
    document.addEventListener("mousedown", surClic);
    document.addEventListener("keydown", surTouche);
    return () => {
      document.removeEventListener("mousedown", surClic);
      document.removeEventListener("keydown", surTouche);
    };
  }, [ouvert]);

  const nombre = notifications.length;
  const critiques = notifications.filter((notification) => notification.gravite === "critique").length;

  return (
    <div className="relative" ref={conteneurRef}>
      <button
        type="button"
        onClick={() => {
          setOuvert((etat) => !etat);
          if (!ouvert) charger();
        }}
        aria-haspopup="dialog"
        aria-expanded={ouvert}
        aria-label={t("topbar.alertes")}
        title={t("topbar.alertes")}
        className={`relative inline-flex h-10 w-10 items-center justify-center rounded-xl border transition ${
          critiques > 0
            ? "border-rose-600/20 bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300"
            : nombre > 0
              ? "border-amber-500/30 bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300"
              : "border-border/80 bg-surface-2 text-muted hover:text-foreground"
        }`}
      >
        <Bell className="h-5 w-5" />
        {nombre > 0 && (
          <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-gradient-to-br from-rose-500 to-rose-600 px-1 text-[10px] font-bold text-white shadow-md shadow-rose-500/40">
            {nombre > 99 ? "99+" : nombre}
          </span>
        )}
      </button>

      {ouvert && (
        <div
          role="dialog"
          aria-label="Alertes"
          className="anim-fade-up absolute right-0 top-full z-50 mt-2 w-[21rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-border bg-surface shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
            <p className="text-sm font-bold text-foreground">
              Alertes{" "}
              {nombre > 0 && (
                <span className="font-medium text-muted">({nombre})</span>
              )}
            </p>
            <button
              type="button"
              onClick={() => setOuvert(false)}
              aria-label="Fermer"
              className="rounded-lg p-1 text-muted transition hover:bg-slate-100 dark:hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {chargement && notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted">Chargement…</p>
            ) : notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted">
                Aucune alerte en cours. Tout va bien !
              </p>
            ) : (
              <ul>
                {notifications.slice(0, 20).map((notification) => (
                  <li key={notification.id}>
                    <Link
                      href={notification.lien}
                      onClick={() => setOuvert(false)}
                      className="flex items-start gap-3 px-4 py-3 transition hover:bg-slate-50 dark:hover:bg-white/5"
                    >
                      <span className={`mt-0.5 shrink-0 ${COULEURS[notification.gravite]}`}>
                        {iconeNotification(notification)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-foreground">
                          {libelleNotification(notification)}
                        </span>
                        <span className="block truncate text-xs text-muted">
                          {notification.chantierNom} · {detailNotification(notification)}
                        </span>
                      </span>
                      <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-border/70 px-4 py-2.5">
            <Link
              href="/alertes"
              onClick={() => setOuvert(false)}
              className="text-xs font-semibold text-primary hover:underline"
            >
              Voir toutes les alertes
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
