"use client";

import { ArrowRight, Calculator, CalendarClock, Coins, FileText, Image as ImageIcon, PenLine, Ruler, TriangleAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import InviteInstallation from "@/components/InviteInstallation";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { getLangue } from "@/lib/i18n";
import { detailAlerte, libelleTypeAlerte } from "@/lib/alertes";
import { lireDernierChantier } from "@/lib/chantiers/dernier";
import { actionsDuJour } from "@/lib/journal/actionsDuJour";
import { urlsSignees } from "@/lib/photos/urls";

// recharts (≈ 100 Ko) n'est téléchargé que lorsque cette section est affichée.
const CourbePlanRealise = dynamic(() => import("@/components/accueil/CourbePlanRealise"), {
  loading: () => (
    <div className="space-y-4">
      <Skeleton variant="rect" height="14rem" />
      <Skeleton variant="rect" height="14rem" />
    </div>
  ),
});

type Chantier = {
  id: string;
  nom: string;
  type: string;
  maitre_ouvrage: string | null;
  montant_marche: number;
  date_debut: string | null;
  date_fin_prevue: string | null;
  statut: string;
  created_at: string;
};

type DepenseRealisee = {
  chantier_id: string;
  date_depense: string;
  montant_total: number;
};

type Alerte = {
  id: string;
  chantier_id: string;
  type: string;
  valeur: number;
  seuil: number;
  statut: string;
  date_alerte: string;
};

type PhotoJournal = {
  chemin: string;
  legende: string | null;
  created_at: string;
  /** URL signée temporaire pour afficher la photo (bucket privé). */
  url?: string | null;
};

const STATUT_LABELS: Record<string, { fr: string; en: string; color: "success" | "warning" | "danger" | "info" }> = {
  en_preparation: { fr: "En préparation", en: "Preparation", color: "info" },
  en_cours: { fr: "En cours", en: "In Progress", color: "success" },
  suspendu: { fr: "Suspendu", en: "Suspended", color: "warning" },
  receptionne_provisoirement: { fr: "Réceptionné prov.", en: "Provisional Acceptance", color: "info" },
  cloture: { fr: "Clôturé", en: "Closed", color: "danger" },
};

// Un point d'une mini-courbe : uniquement affiché
type PointeMini = { x: string; y: number };

function trierParDate(dateA: string, dateB: string) {
  return dateA < dateB ? -1 : dateA > dateB ? 1 : 0;
}

// Dates compactes des mini-courbes (règle du projet : JJ/MM, jamais d'ISO brut)
function dateCourte(iso: string) {
  const [annee, mois, jour] = (iso || "").split("-");
  return annee && mois && jour ? `${jour}/${mois}` : iso;
}

// Mois compact d'une clé « AAAA-MM » → « MM/AA »
function moisCourt(cle: string) {
  const [annee, mois] = (cle || "").split("-");
  return annee && mois ? `${mois}/${annee.slice(2)}` : cle;
}

// Mini-courbe 1 : activité, nombre cumulé de chantiers créés dans le temps
function activiteParCreation(chantiers: Chantier[]): PointeMini[] {
  const tries = chantiers.slice().sort((a, b) => trierParDate(a.created_at, b.created_at));
  let cumul = 0;
  return tries.map((chantier, index) => {
    cumul += 1;
    return { x: dateCourte(chantier.created_at), y: cumul };
  });
}

// Mini-courbe 2 : cumul du montant des chantiers en cours, dans le temps
function montantEnCours(chantiers: Chantier[]): PointeMini[] {
  const enCours = chantiers
    .filter((c) => c.statut === "en_cours")
    .sort((a, b) => trierParDate(a.created_at, b.created_at));
  let cumul = 0;
  return enCours.map((chantier) => {
    cumul += Number(chantier.montant_marche || 0);
    return { x: dateCourte(chantier.created_at), y: cumul };
  });
}

// Mini-courbe 3 : cumul du montant des chantiers clôturés, dans le temps
function montantClotures(chantiers: Chantier[]): PointeMini[] {
  const clotures = chantiers
    .filter((c) => c.statut === "cloture")
    .sort((a, b) => trierParDate(a.created_at, b.created_at));
  let cumul = 0;
  return clotures.map((chantier) => {
    cumul += Number(chantier.montant_marche || 0);
    return { x: dateCourte(chantier.created_at), y: cumul };
  });
}

// Mini-courbe 4 : montant cumulé par mois de création (FCFA)
function montantParMois(chantiers: Chantier[]): PointeMini[] {
  const parMois = new Map<string, number>();
  for (const chantier of chantiers) {
    const mois = (chantier.created_at || "").slice(0, 7);
    parMois.set(mois, (parMois.get(mois) ?? 0) + Number(chantier.montant_marche || 0));
  }
  const mois = [...parMois.keys()].sort();
  let cumul = 0;
  return mois.map((cle) => {
    cumul += parMois.get(cle) ?? 0;
    return { x: moisCourt(cle), y: cumul };
  });
}

// Mini-courbe 5 : cumul du nombre de chantiers en préparation
function chantiersEnPreparation(chantiers: Chantier[]): PointeMini[] {
  const enPreparation = chantiers
    .filter((c) => c.statut === "en_preparation")
    .sort((a, b) => trierParDate(a.created_at, b.created_at));
  let cumul = 0;
  return enPreparation.map((chantier) => {
    cumul += 1;
    return { x: dateCourte(chantier.created_at), y: cumul };
  });
}

type DonneesPlanRealisé = {
  planifiee: PointeMini[];
  realisee: PointeMini[];
};

// Valeur la plus récente en date x pour un rendu en escalier
type DonneesFusionnees = Array<{
  x: string;
  planifiee: number | null;
  realisee: number | null;
}>;

function valeurEn(uneSerie: PointeMini[], x: string): number | null {
  let valeur: number | null = null;
  for (const point of uneSerie) {
    if (point.x <= x) {
      valeur = point.y;
    } else {
      break;
    }
  }
  return valeur;
}

// Fusionne les deux séries pour les afficher sur un même axe
function fusionnerSeries(planifiee: PointeMini[], realisee: PointeMini[]): DonneesFusionnees {
  const axes = [
    ...new Set([...planifiee.map((point) => point.x), ...realisee.map((point) => point.x)]),
  ].sort();

  return axes.map((x) => ({
    x,
    planifiee: valeurEn(planifiee, x),
    realisee: valeurEn(realisee, x),
  }));
}

// S prévu / réalisé : la courbe « prévu » atteint 100 % à la date de fin prévue,
// la courbe « réalisé » suit le cumul des dépenses réelles datées.
// la courbe « réalisé » suit les dépenses réelles datées.
function planVersRealise(chantiers: Chantier[], depenses: DepenseRealisee[]): DonneesPlanRealisé {
  const terminaisons = chantiers
    .filter((c) => c.date_fin_prevue !== null)
    .map((c) => c.date_fin_prevue as string)
    .sort(trierParDate);

  const planifiee: PointeMini[] = [];
  if (terminaisons.length > 0) {
    const total = terminaisons.length;
    terminaisons.forEach((date, index) => {
      const progres = ((index + 1) / total) * 100;
      planifiee.push({ x: date, y: Math.round(progres * 10) / 10 });
    });
  }

  const realisee: PointeMini[] = [];
  const depensesTriees = depenses
    .slice()
    .sort((a, b) => trierParDate(a.date_depense, b.date_depense));
  let cumul = 0;
  for (const depense of depensesTriees) {
    cumul += depense.montant_total;
    realisee.push({ x: depense.date_depense, y: cumul });
  }

  return { planifiee, realisee };
}

export default function Home() {
  const router = useRouter();
  const langue = getLangue();
  const [chantiers, setChantiers] = useState<Chantier[]>([]);
  const [depenses, setDepenses] = useState<DepenseRealisee[]>([]);
  const [alertes, setAlertes] = useState<Alerte[]>([]);
  const [photos, setPhotos] = useState<PhotoJournal[]>([]);
  const [loading, setLoading] = useState(true);
  const [journauxAujourdhui, setJournauxAujourdhui] = useState<string[]>([]);
  const [nonConformitesOuvertes, setNonConformitesOuvertes] = useState<Record<string, number>>({});
  const [dernierChantier, setDernierChantier] = useState<string | null>(null);

  useEffect(() => {
    setDernierChantier(lireDernierChantier());
  }, []);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }

      const { data } = await supabase.from("chantiers").select("*").eq("proprietaire_id", user.id).order("created_at", { ascending: false });
      setChantiers((data ?? []) as Chantier[]);
      setLoading(false);
    }
    load();
  }, [router]);

  // Données d'affichage (lecture seule)
  useEffect(() => {
    let actif = true;
    async function loadSupplementaire() {
      const supabase = createClient();
      try {
        const depensesData = await supabase.from("depenses_reelles").select("chantier_id, date_depense, montant_total");
        if (!actif) return;
        setDepenses((depensesData.data ?? []) as DepenseRealisee[]);

        const alertesData = await supabase
          .from("alertes")
          .select("id, chantier_id, type, valeur, seuil, statut, date_alerte")
          .eq("statut", "ouverte");
        if (!actif) return;
        setAlertes((alertesData.data ?? []) as Alerte[]);

        // Journaux du jour : sert à la carte « À faire aujourd'hui »
        const maintenant = new Date();
        const dateJour = `${maintenant.getFullYear()}-${String(maintenant.getMonth() + 1).padStart(2, "0")}-${String(maintenant.getDate()).padStart(2, "0")}`;
        const journauxData = await supabase
          .from("journaux")
          .select("chantier_id")
          .eq("date_journal", dateJour);
        if (!actif) return;
        setJournauxAujourdhui((journauxData.data ?? []).map((j) => j.chantier_id as string));

        // Non-conformités encore ouvertes (celles « clôturées » ne comptent plus)
        const ncData = await supabase
          .from("non_conformites")
          .select("chantier_id, statut")
          .neq("statut", "cloturee");
        if (!actif) return;
        const ncParChantier: Record<string, number> = {};
        for (const nc of ncData.data ?? []) {
          const id = nc.chantier_id as string;
          ncParChantier[id] = (ncParChantier[id] ?? 0) + 1;
        }
        setNonConformitesOuvertes(ncParChantier);

        const photosData = await supabase
          .from("photos_journal")
          .select("chemin, legende, created_at")
          .order("created_at", { ascending: false })
          .limit(12);
        if (!actif) return;
        const liste = (photosData.data ?? []) as PhotoJournal[];
        if (liste.length === 0) {
          setPhotos([]);
          return;
        }
        // Le bucket est privé : URLs signées (outil commun de la Session 2)
        const tableUrls = await urlsSignees(liste.map((p) => p.chemin));
        if (!actif) return;
        setPhotos(liste.map((p) => ({ ...p, url: tableUrls.get(p.chemin) ?? null })));
      } catch {
        // Les données secondaires sont remplies à la volée ; on continue sans elles
      }
    }
    loadSupplementaire();
    return () => {
      actif = false;
    };
  }, []);

  const totalMontant = chantiers.reduce((s, c) => s + Number(c.montant_marche || 0), 0);
  const enCours = chantiers.filter((c) => c.statut === "en_cours").length;
  const clotures = chantiers.filter((c) => c.statut === "cloture").length;
  const enPreparation = chantiers.filter((c) => c.statut === "en_preparation").length;
  const terminePct = chantiers.length > 0 ? Math.round((clotures / chantiers.length) * 100) : 0;

  const nomDesChantiers = new Map(chantiers.map((c) => [c.id, c.nom]));

  // Alertes ouvertes par chantier (la requête ne charge déjà que les « ouverte »)
  const alertesParChantier = alertes.reduce<Record<string, number>>((acc, a) => {
    acc[a.chantier_id] = (acc[a.chantier_id] ?? 0) + 1;
    return acc;
  }, {});

  // « Quoi faire aujourd'hui ? » : calcul pur, sans requête (outil de la Session 2)
  const actionsJour = actionsDuJour({
    chantiers: chantiers.map((c) => ({ id: c.id, nom: c.nom, statut: c.statut })),
    chantiersAvecJournalAujourdhui: journauxAujourdhui,
    nonConformitesOuvertes,
    alertesOuvertes: alertesParChantier,
  });

  const { planifiee, realisee } = planVersRealise(chantiers, depenses);
  const donnees = fusionnerSeries(planifiee, realisee);

  const comparaison = chantiers
    .map((chantier) => {
      const realiseTotal = depenses
        .filter((d) => d.chantier_id === chantier.id)
        .reduce((s, d) => s + d.montant_total, 0);
      return {
        chantier,
        realiseTotal,
      };
    })
    .sort((a, b) => b.realiseTotal - a.realiseTotal);

  const libelleStatut = (statut: string) => {
    const s = STATUT_LABELS[statut] ?? STATUT_LABELS.en_preparation;
    return langue === "fr" ? s.fr : s.en;
  };

  return (
    <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
      {/* Bandeau d'en-tête */}
      <div className="anim-fade-up relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-primary-deep p-6 text-white shadow-xl shadow-primary/20 md:p-8">
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-40" aria-hidden />
        <div
          className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full bg-action/25 blur-3xl"
          aria-hidden
        />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/50">
              {langue === "fr" ? "Vue d'ensemble" : "Overview"}
            </p>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Tableau de bord</h1>
            <p className="mt-1 text-sm text-white/70">
              Vue d'ensemble de vos chantiers en cours et à venir.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={dernierChantier ? `/chantiers/${dernierChantier}/journaux` : "/chantiers"}
              className="inline-flex items-center gap-2 rounded-xl bg-action px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-action/30 transition hover:bg-action-strong"
            >
              <PenLine className="h-4 w-4" />
              {langue === "fr" ? "Saisie du jour" : "Daily entry"}
            </Link>
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold backdrop-blur">
              {chantiers.length}{" "}
              {langue === "fr"
                ? chantiers.length === 1
                  ? "chantier"
                  : "chantiers"
                : chantiers.length === 1
                  ? "site"
                  : "sites"}
            </span>
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold backdrop-blur">
              {enCours} {langue === "fr" ? "en cours" : "in progress"}
            </span>
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold backdrop-blur">
              {alertes.length} {langue === "fr" ? "alertes" : "alerts"}
            </span>
          </div>
        </div>
      </div>

      <InviteInstallation />

      {/* Cartes de chiffres clés */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          className="anim-fade-up anim-delay-1 h-full"
          title={langue === "fr" ? "Chantiers" : "Sites"}
          value={chantiers.length}
          icon={<CalendarClock className="h-5 w-5" />}
          color="blue"
          trend={{ value: `${chantiers.length}`, label: langue === "fr" ? "au total" : "total", positive: true }}
          miniPoints={activiteParCreation(chantiers)}
        />
        <StatCard
          className="anim-fade-up anim-delay-2 h-full"
          title={langue === "fr" ? "En cours" : "In progress"}
          value={enCours}
          icon={<Coins className="h-5 w-5" />}
          color="orange"
          trend={{ value: `${enCours}`, label: langue === "fr" ? "en cours" : "in progress", positive: true }}
          miniPoints={montantEnCours(chantiers)}
        />
        <StatCard
          className="anim-fade-up anim-delay-3 h-full"
          title={langue === "fr" ? "Clôturés" : "Closed"}
          value={clotures}
          icon={<FileText className="h-5 w-5" />}
          color="emerald"
          trend={{ value: terminePct.toString(), label: "% du total", positive: true }}
          miniPoints={montantClotures(chantiers)}
        />
        <StatCard
          className="anim-fade-up anim-delay-4 h-full"
          title={langue === "fr" ? "Montant total" : "Total amount"}
          value={totalMontant.toLocaleString(langue === "fr" ? "fr-FR" : "en-US")}
          subtitle="FCFA"
          icon={<Coins className="h-5 w-5" />}
          color="amber"
          miniPoints={montantParMois(chantiers)}
        />
        <StatCard
          className="anim-fade-up anim-delay-5 h-full"
          title={langue === "fr" ? "En préparation" : "In preparation"}
          value={enPreparation}
          icon={<CalendarClock className="h-5 w-5" />}
          color="slate"
          trend={{ value: `${enPreparation}`, label: langue === "fr" ? "à venir" : "planned", positive: true }}
          miniPoints={chantiersEnPreparation(chantiers)}
        />
      </div>

      {/* À faire aujourd'hui : les actions prioritaires, calculées sans requête */}
      <section className="anim-fade-up anim-delay-1 mb-6">
        <div className="mb-4">
          <h2 className="flex items-center gap-2.5 text-lg font-bold text-foreground">
            <span className="h-5 w-1.5 rounded-full bg-gradient-to-b from-action to-action-strong" aria-hidden />
            {langue === "fr" ? "À faire aujourd'hui" : "To do today"}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {langue === "fr"
              ? "Ce que l'application vous propose de traiter en priorité, chantier par chantier."
              : "What the app suggests you handle first, site by site."}
          </p>
        </div>
        {actionsJour.length === 0 ? (
          <Card padding="lg" className="text-center">
            <p className="text-sm font-semibold text-foreground">
              {langue === "fr" ? "Rien d'urgent aujourd'hui." : "Nothing urgent today."}
            </p>
            <p className="mt-0.5 text-xs text-muted">
              {langue === "fr"
                ? "Toutes les saisies du jour sont faites, aucune alerte ouverte."
                : "All daily entries are done, no open alert."}
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {actionsJour.slice(0, 6).map((action, index) => (
              <Link key={`${action.type}-${action.chantierId}-${index}`} href={action.lienHref} className="block">
                <Card padding="md" className="hover-lift flex items-center gap-4">
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-bold ${
                      action.priorite === 1
                        ? "bg-action/15 text-action-strong"
                        : action.priorite === 2
                          ? "bg-warning/15 text-warning"
                          : "bg-primary/10 text-primary"
                    }`}
                  >
                    {action.priorite}
                  </span>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">{action.libelle}</p>
                    <p className="text-sm text-muted">
                      {action.chantierNom} — {action.detail}
                    </p>
                  </div>
                  <span className="hidden shrink-0 items-center gap-1 text-xs font-semibold text-primary sm:inline-flex">
                    {action.type === "saisie_journal"
                      ? langue === "fr"
                        ? "Saisir"
                        : "Enter"
                      : langue === "fr"
                        ? "Ouvrir"
                        : "Open"}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Mes chantiers : montant du marché et dépenses engagées */}
      <section className="anim-fade-up anim-delay-2 mb-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2.5 text-lg font-bold text-foreground">
              <span className="h-5 w-1.5 rounded-full bg-gradient-to-b from-action to-action-strong" aria-hidden />
              {langue === "fr" ? "Mes chantiers" : "My sites"}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {langue === "fr"
                ? "Montant du marché et dépenses engagées. Touchez un chantier pour l'ouvrir."
                : "Contract amount and committed expenses. Tap a site to open it."}
            </p>
          </div>
          <Link href="/chantiers" className="shrink-0 text-sm font-semibold text-primary hover:underline">
            {langue === "fr" ? "Voir tout" : "View all"} →
          </Link>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-border/80 bg-surface shadow-soft">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/80 bg-surface-2 text-left">
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted">Chantier</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted">Montant marché (FCFA)</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted">Dépenses réelles (FCFA)</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted">Écart (FCFA)</th>
              </tr>
            </thead>
            <tbody>
              {comparaison.map(({ chantier, realiseTotal }) => {
                const ecart = realiseTotal - Number(chantier.montant_marche || 0);
                return (
                  <tr key={chantier.id} className="border-b border-border/60 transition last:border-0 hover:bg-surface-2/70">
                    <td className="px-4 py-3">
                      <Link href={`/chantiers/${chantier.id}`} className="font-medium text-foreground hover:text-primary-light">
                        {chantier.nom}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-foreground">
                      {Number(chantier.montant_marche || 0).toLocaleString(langue === "fr" ? "fr-FR" : "en-US")}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-foreground">
                      {realiseTotal.toLocaleString(langue === "fr" ? "fr-FR" : "en-US")}
                    </td>
                    <td className={`px-4 py-3 text-right font-mono tabular-nums ${ecart > 0 ? "text-danger" : "text-success"}`}>
                      {ecart > 0 ? "+" : ""}
                      {ecart.toLocaleString(langue === "fr" ? "fr-FR" : "en-US")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Alertes en cours : touchables pour ouvrir le chantier concerné */}
      <section className="anim-fade-up anim-delay-3 mb-6">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="flex items-center gap-2.5 text-lg font-bold text-foreground">
              <span className="h-5 w-1.5 rounded-full bg-gradient-to-b from-action to-action-strong" aria-hidden />
              {langue === "fr" ? "Alertes en cours" : "Open alerts"}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {langue === "fr"
                ? "Touchez une alerte pour ouvrir le chantier et corriger le problème."
                : "Tap an alert to open the site and fix the issue."}
            </p>
          </div>
        </div>
        {alertes.length === 0 ? (
          <Card padding="lg" className="text-center">
            <span className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-muted dark:bg-white/5">
              <TriangleAlert className="h-7 w-7" />
            </span>
            <p className="text-sm font-semibold text-foreground">Aucune alerte en cours.</p>
            <p className="mt-0.5 text-xs text-muted">Tout est sous contrôle.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {alertes.map((alerte) => {
              const chantier = nomDesChantiers.get(alerte.chantier_id);
              return (
                <Link key={alerte.id} href={`/chantiers/${alerte.chantier_id}`} className="block">
                  <Card padding="md" className="hover-lift flex items-start gap-4 border-l-4 border-l-warning">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300">
                      <TriangleAlert className="h-5 w-5" />
                    </span>
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">
                        {chantier ? `${chantier} — ` : ""}
                        {libelleTypeAlerte(alerte.type, langue === "fr" ? "fr" : "en")}
                      </p>
                      <p className="text-sm text-muted">{detailAlerte(alerte, langue === "fr" ? "fr" : "en")}</p>
                    </div>
                    <span className="shrink-0 self-center text-xs font-semibold text-primary">
                      {langue === "fr" ? "Ouvrir" : "Open"} →
                    </span>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Outils rapides */}
      <section className="anim-fade-up anim-delay-4 mb-6">
        <div className="mb-4">
          <h2 className="flex items-center gap-2.5 text-lg font-bold text-foreground">
            <span className="h-5 w-1.5 rounded-full bg-gradient-to-b from-action to-action-strong" aria-hidden />
            {langue === "fr" ? "Outils rapides" : "Quick tools"}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {langue === "fr"
              ? "Chiffrez un devis ou estimez un mur en quelques clics."
              : "Estimate a quotation or a wall in a few clicks."}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Link href="/calculateurs/devis" className="group block">
            <Card padding="lg" className="hover-lift flex h-full items-center gap-4 hover:border-action/40">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-action to-action-strong text-white shadow-md shadow-action/25 transition-transform duration-300 group-hover:scale-110">
                <Calculator className="h-6 w-6" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-foreground">
                  {langue === "fr" ? "Calcul de devis" : "Estimate calculator"}
                </span>
                <span className="mt-0.5 block text-xs text-muted">
                  {langue === "fr"
                    ? "Chiffrage guidé à partir des modèles d'ouvrages et des prix du BPU."
                    : "Guided pricing from job templates and bill-of-prices rates."}
                </span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted transition group-hover:translate-x-1 group-hover:text-action" />
            </Card>
          </Link>
          <Link href="/calculateurs/mur" className="group block">
            <Card padding="lg" className="hover-lift flex h-full items-center gap-4 hover:border-primary/40">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary-deep text-white shadow-md shadow-primary/25 transition-transform duration-300 group-hover:scale-110">
                <Ruler className="h-6 w-6" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-foreground">
                  {langue === "fr" ? "Calcul de murs" : "Wall calculator"}
                </span>
                <span className="mt-0.5 block text-xs text-muted">
                  {langue === "fr"
                    ? "Quantités d'agglos, de mortier et de main d'œuvre pour un mur en agglos."
                    : "Block, mortar and labour quantities for a block wall."}
                </span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted transition group-hover:translate-x-1 group-hover:text-action" />
            </Card>
          </Link>
        </div>
      </section>

      {/* Plan prévu / réalisé */}
      <section className="anim-fade-up anim-delay-5 mb-6">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="flex items-center gap-2.5 text-lg font-bold text-foreground">
              <span className="h-5 w-1.5 rounded-full bg-gradient-to-b from-action to-action-strong" aria-hidden />
              Plan prévu / réalisé
            </h2>
            <p className="mt-1 text-sm text-muted">Comparaison entre le planning prévu et les dépenses réelles.</p>
          </div>
        </div>
        <Card padding="lg">
          <CourbePlanRealise donnees={donnees} langue={langue} />
          <p className="mt-2 text-xs text-muted">
            {langue === "fr"
              ? "La courbe « prévu » atteint 100 % à la date de fin prévue, la « réalisé » suit les dépenses réelles."
              : "The « planned » curve reaches 100% at the planned end date, the « realized » curve tracks actual expenses."}
          </p>
        </Card>
      </section>

      {/* Galerie photos */}
      <section className="anim-fade-up anim-delay-5">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="flex items-center gap-2.5 text-lg font-bold text-foreground">
              <span className="h-5 w-1.5 rounded-full bg-gradient-to-b from-action to-action-strong" aria-hidden />
              Galerie photos
            </h2>
            <p className="mt-1 text-sm text-muted">Dernières photos saisies dans les journaux.</p>
          </div>
        </div>
        {photos.length === 0 ? (
          <Card padding="lg" className="text-center">
            <span className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-muted dark:bg-white/5">
              <ImageIcon className="h-7 w-7" />
            </span>
            <p className="text-sm font-semibold text-foreground">Aucune photo pour le moment.</p>
            <p className="mt-0.5 text-xs text-muted">Les photos des journaux apparaîtront ici.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {photos.map((photo) =>
              photo.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={photo.chemin}
                  src={photo.url}
                  alt={photo.legende ?? "Photo de chantier"}
                  loading="lazy"
                  className="h-40 w-full rounded-2xl border border-border/80 object-cover shadow-soft transition duration-500 hover:scale-[1.03] hover:shadow-soft-lg"
                />
              ) : (
                <div
                  key={photo.chemin}
                  className="grid h-40 w-full place-items-center rounded-2xl border border-dashed border-border/80 bg-surface-2 p-3 text-center text-xs text-muted"
                >
                  {langue === "fr" ? "Photo indisponible" : "Photo unavailable"}
                </div>
              ),
            )}
          </div>
        )}
      </section>
    </main>
  );
}
