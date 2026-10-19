"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CalendarClock,
  ChevronRight,
  Download,
  History,
  Info,
  Package,
  ShieldAlert,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/toast";
import { PageHeader } from "@/components/ui/PageHeader";
import { BandeauDonneesCachees } from "@/components/ui/BandeauDonneesCachees";
import { createClient } from "@/lib/supabase/client";
import { chargerAvecCache } from "@/lib/offline/cacheDonnees";
import {
  chargerHistorique,
  chargerNotifications,
  detailNotification,
  libelleNotification,
} from "@/lib/notificationsSource";
import { nomFichierCsv, versCsv } from "@/lib/export/csv";
import {
  compteParGravite,
  formatDateFR,
  type CategorieNotification,
  type Gravite,
  type Notification,
  type Traitement,
} from "@/lib/notifications";

// Centre d'alertes : le point d'entrée unique pour tout ce qui bloque sur les
// chantiers — dépassements de budget, écarts de quantité, non-conformités
// qualité et retards de planning.

type Filtre = "toutes" | CategorieNotification;

const COULEURS: Record<Gravite, { texte: string; fond: string; pastille: string }> = {
  critique: {
    texte: "text-rose-600 dark:text-rose-300",
    fond: "border-l-rose-500",
    pastille: "bg-rose-500/10 text-rose-600 dark:text-rose-300",
  },
  attention: {
    texte: "text-amber-600 dark:text-amber-300",
    fond: "border-l-amber-500",
    pastille: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
  },
  info: {
    texte: "text-sky-600 dark:text-sky-300",
    fond: "border-l-sky-500",
    pastille: "bg-sky-500/10 text-sky-600 dark:text-sky-300",
  },
};

const FILTRES: Array<{ cle: Filtre; libelle: string }> = [
  { cle: "toutes", libelle: "Toutes" },
  { cle: "alerte", libelle: "Alertes" },
  { cle: "non_conformite", libelle: "Non-conformités" },
  { cle: "retard", libelle: "Retards" },
  { cle: "stock", libelle: "Stocks" },
];

function iconeNotification(notification: Notification) {
  if (notification.categorie === "non_conformite") return <ShieldAlert className="h-4 w-4" />;
  if (notification.categorie === "retard") return <CalendarClock className="h-4 w-4" />;
  if (notification.categorie === "stock") return <Package className="h-4 w-4" />;
  if (notification.gravite === "info") return <Info className="h-4 w-4" />;
  return <AlertTriangle className="h-4 w-4" />;
}

export default function AlertesPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [historique, setHistorique] = useState<Traitement[]>([]);
  const [chargement, setChargement] = useState(true);
  const [chargementHistorique, setChargementHistorique] = useState(false);
  const [onglet, setOnglet] = useState<"a_traiter" | "traites">("a_traiter");
  const [filtre, setFiltre] = useState<Filtre>("toutes");
  const [horsLigne, setHorsLigne] = useState(false);
  const [dateCache, setDateCache] = useState<number | null>(null);

  useEffect(() => {
    let actif = true;
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        // Copie locale : hors connexion, les dernières alertes connues restent
        // consultables (la copie est propre à chaque compte).
        const resultat = await chargerAvecCache<Notification[]>(
          `alertes:${user?.id ?? "anonyme"}`,
          () => chargerNotifications(),
        );
        if (!actif) return;
        setNotifications(resultat.donnees);
        setHorsLigne(resultat.horsLigne);
        setDateCache(resultat.horodatage);
      } catch {
        if (actif) setNotifications([]);
      } finally {
        if (actif) setChargement(false);
      }
    })();
    return () => {
      actif = false;
    };
  }, []);

  const compte = useMemo(() => compteParGravite(notifications), [notifications]);
  const visibles = useMemo(
    () => (filtre === "toutes" ? notifications : notifications.filter((n) => n.categorie === filtre)),
    [notifications, filtre],
  );

  // Onglet « traités » : l'historique se charge à la demande.
  useEffect(() => {
    if (onglet !== "traites" || historique.length > 0 || chargementHistorique) return;
    let actif = true;
    setChargementHistorique(true);
    (async () => {
      try {
        const liste = await chargerHistorique();
        if (actif) setHistorique(liste);
      } catch {
        if (actif) setHistorique([]);
      } finally {
        if (actif) setChargementHistorique(false);
      }
    })();
    return () => {
      actif = false;
    };
  }, [onglet, historique.length, chargementHistorique]);

  /** Export de la liste affichée (format CSV, lisible dans Excel). */
  function exporterCsv() {
    const entetes = ["Type", "Chantier", "Gravité", "Détail", "Date"];
    const lignes =
      onglet === "a_traiter"
        ? visibles.map((notification) => [
            libelleNotification(notification),
            notification.chantierNom,
            notification.gravite,
            detailNotification(notification),
            formatDateFR(notification.date),
          ])
        : historique.map((traitement) => [
            traitement.titre,
            traitement.chantierNom,
            "traité",
            traitement.detail,
            formatDateFR(traitement.date),
          ]);

    const contenu = versCsv(entetes, lignes);
    const blob = new Blob([contenu], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const lien = document.createElement("a");
    lien.href = url;
    lien.download = nomFichierCsv(onglet === "a_traiter" ? "alertes" : "alertes-traitees");
    document.body.appendChild(lien);
    lien.click();
    document.body.removeChild(lien);
    URL.revokeObjectURL(url);
    toast("Fichier CSV téléchargé.", "succes");
  }

  return (
    <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
      <PageHeader
        eyebrow="Pilotage"
        title="Centre d'alertes"
        description="Tout ce qui demande votre attention, sur tous vos chantiers."
        icon={<Bell className="h-5 w-5" />}
      />

      {horsLigne && <BandeauDonneesCachees horodatage={dateCache} />}

      {/* Onglets et export */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-xl border border-border/80 bg-surface p-1">
          <button
            type="button"
            onClick={() => setOnglet("a_traiter")}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
              onglet === "a_traiter"
                ? "bg-primary text-white shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            À traiter ({notifications.length})
          </button>
          <button
            type="button"
            onClick={() => setOnglet("traites")}
            className={`inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
              onglet === "traites"
                ? "bg-primary text-white shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            <History className="mr-1.5 h-3.5 w-3.5" />
            Traités
          </button>
        </div>
        <Button size="sm" variant="secondary" onClick={exporterCsv} className="ml-auto">
          <Download className="mr-1.5 h-4 w-4" /> Exporter (CSV)
        </Button>
      </div>

      {onglet === "traites" ? (
        /* Onglet « traités » : ce qui a déjà été traité et quand. */
        chargementHistorique ? (
          <div className="space-y-3">
            {[0, 1, 2].map((index) => (
              <div
                key={index}
                className="h-16 animate-pulse rounded-2xl border border-border/70 bg-surface"
              />
            ))}
          </div>
        ) : historique.length === 0 ? (
          <Card className="text-center">
            <History className="mx-auto h-8 w-8 text-muted" />
            <p className="mt-2 font-semibold text-foreground">Aucun problème traité</p>
            <p className="mt-1 text-sm text-muted">
              Les non-conformités clôturées et les alertes acquittées apparaîtront ici.
            </p>
          </Card>
        ) : (
          <ul className="space-y-2">
            {historique.map((traitement) => (
              <li key={traitement.id}>
                <Link
                  href={traitement.lien}
                  className="group flex items-start gap-3 rounded-2xl border border-l-4 border-l-slate-300 border-border/70 bg-surface p-4 shadow-sm transition hover:shadow-md"
                >
                  <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-500/10 text-muted">
                    {traitement.categorie === "non_conformite" ? (
                      <ShieldAlert className="h-4 w-4" />
                    ) : (
                      <History className="h-4 w-4" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-foreground">
                      {traitement.titre}
                    </span>
                    <span className="mt-0.5 block text-sm text-muted">
                      {traitement.chantierNom}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted">
                      {traitement.detail}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    {traitement.date && (
                      <span className="hidden text-xs text-muted sm:inline">
                        {formatDateFR(traitement.date)}
                      </span>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted transition group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )
      ) : (
        <>
      {/* Résumé par gravité */}
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Card padding="sm" className="border-l-4 border-l-rose-500">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Critiques</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{compte.critique}</p>
        </Card>
        <Card padding="sm" className="border-l-4 border-l-amber-500">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">À traiter</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{compte.attention}</p>
        </Card>
        <Card padding="sm" className="border-l-4 border-l-sky-500">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Informations</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{compte.info}</p>
        </Card>
      </div>

      {/* Filtres */}
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTRES.map((entree) => {
          const total =
            entree.cle === "toutes"
              ? notifications.length
              : notifications.filter((notification) => notification.categorie === entree.cle).length;
          const actif = filtre === entree.cle;
          return (
            <button
              key={entree.cle}
              type="button"
              onClick={() => setFiltre(entree.cle)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                actif
                  ? "border-primary bg-primary text-white"
                  : "border-border/80 bg-surface text-muted hover:border-primary/40 hover:text-foreground"
              }`}
            >
              {entree.libelle} ({total})
            </button>
          );
        })}
      </div>

      {/* Liste */}
      {chargement ? (
        <div className="space-y-3">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="h-20 animate-pulse rounded-2xl border border-border/70 bg-surface"
            />
          ))}
        </div>
      ) : visibles.length === 0 ? (
        <Card className="text-center">
          <Bell className="mx-auto h-8 w-8 text-muted" />
          <p className="mt-2 font-semibold text-foreground">Aucune alerte en cours</p>
          <p className="mt-1 text-sm text-muted">
            Rien à traiter pour le moment : budgets, qualité et planning sont sous contrôle.
          </p>
        </Card>
      ) : (
        <ul className="space-y-2">
          {visibles.map((notification) => {
            const couleur = COULEURS[notification.gravite];
            return (
              <li key={notification.id}>
                <Link
                  href={notification.lien}
                  className={`group flex items-start gap-3 rounded-2xl border border-l-4 border-border/70 bg-surface p-4 shadow-sm transition hover:shadow-md ${couleur.fond}`}
                >
                  <span
                    className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ${couleur.pastille}`}
                  >
                    {iconeNotification(notification)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-foreground">
                      {libelleNotification(notification)}
                    </span>
                    <span className="mt-0.5 block text-sm text-muted">
                      {notification.chantierNom}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted">
                      {detailNotification(notification)}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    {notification.date && (
                      <span className="hidden text-xs text-muted sm:inline">
                        {formatDateFR(notification.date)}
                      </span>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted transition group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
        </>
      )}
    </main>
  );
}
