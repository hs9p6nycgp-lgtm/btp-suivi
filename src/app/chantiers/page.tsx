"use client";

import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Calculator,
  CalendarClock,
  LayoutGrid,
  Search,
  ShieldAlert,
  Table2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatCard } from "@/components/ui/StatCard";
import { getLangue } from "@/lib/i18n";
import { libelleTypeDetail } from "@/lib/chantiers/types";
import {
  avancementMoyenSections,
  etatEcheance,
  joursRestants,
  type EtatEcheance,
} from "@/lib/chantiers/complet";

type Chantier = {
  id: string;
  nom: string;
  type: string;
  type_detail: string | null;
  maitre_ouvrage: string | null;
  ville?: string | null;
  montant_marche: number;
  date_fin_prevue: string | null;
  statut: string;
};

// Suivi condensé d'un chantier pour la liste (avancement + délai + alertes)
type SuiviLigne = {
  avancement: number | null;
  jours: number | null;
  echeance: EtatEcheance;
  alertes: number;
  nonConformites: number;
};

type TypeChantier = "route" | "batiment";
// Valeurs alignées sur la contrainte de la base (supabase/migrations/0001_v0_schema.sql).
type StatutChantier = "en_preparation" | "en_cours" | "suspendu" | "receptionne_provisoirement" | "cloture";

const STATUTS: StatutChantier[] = ["en_preparation", "en_cours", "suspendu", "receptionne_provisoirement", "cloture"];

const STATUT_LABELS: Record<StatutChantier, { fr: string; en: string; variant: "success" | "warning" | "danger" | "info" | "primary" }> = {
  en_preparation: { fr: "En préparation", en: "Preparation", variant: "info" },
  en_cours: { fr: "En cours", en: "In Progress", variant: "success" },
  suspendu: { fr: "Suspendu", en: "Suspended", variant: "warning" },
  receptionne_provisoirement: { fr: "Réceptionné prov.", en: "Provisional Acceptance", variant: "info" },
  cloture: { fr: "Clôturé", en: "Closed", variant: "danger" },
};

const TYPE_LABELS: Record<TypeChantier, { fr: string; en: string }> = {
  route: { fr: "Route", en: "Road" },
  batiment: { fr: "Bâtiment", en: "Building" },
};

// Décalages d'animation pour l'apparition en cascade des cartes
const DELAIS_ANIM = [
  "anim-delay-1",
  "anim-delay-2",
  "anim-delay-3",
  "anim-delay-4",
  "anim-delay-5",
  "anim-delay-6",
];

// Pastille d'échéance : rouge si dépassée, orange si proche, vert sinon
function classeEcheance(echeance: EtatEcheance): string {
  if (echeance === "depasse") return "border border-rose-500/40 bg-rose-500/10 text-foreground";
  if (echeance === "proche") return "border border-amber-500/40 bg-amber-500/10 text-foreground";
  return "border border-emerald-500/40 bg-emerald-500/10 text-foreground";
}

function TexteEcheance({ ligne, langue }: { ligne: SuiviLigne; langue: "fr" | "en" }) {
  if (ligne.echeance === "inconnu" || ligne.echeance === "cloture" || ligne.jours === null) {
    return <span className="text-xs text-muted">—</span>;
  }
  if (ligne.echeance === "depasse") {
    const retard = Math.abs(ligne.jours);
    return (
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${classeEcheance(ligne.echeance)}`}>
        <CalendarClock className="h-3 w-3" />
        {langue === "fr" ? `Retard de ${retard} j` : `${retard} d late`}
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${classeEcheance(ligne.echeance)}`}>
      <CalendarClock className="h-3 w-3" />
      {langue === "fr" ? `${ligne.jours} j restants` : `${ligne.jours} d left`}
    </span>
  );
}

function PastillesSuivi({ ligne, langue }: { ligne: SuiviLigne; langue: "fr" | "en" }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <TexteEcheance ligne={ligne} langue={langue} />
      {ligne.alertes > 0 && (
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-foreground">
          <AlertTriangle className="h-3 w-3" />
          {ligne.alertes} {langue === "fr" ? (ligne.alertes > 1 ? "alertes" : "alerte") : "alerts"}
        </span>
      )}
      {ligne.nonConformites > 0 && (
        <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/40 bg-rose-500/10 px-2 py-0.5 text-[11px] font-semibold text-foreground">
          <ShieldAlert className="h-3 w-3" />
          {ligne.nonConformites} NC
        </span>
      )}
    </div>
  );
}

function BarreAvancement({ valeur }: { valeur: number }) {
  const borne = Math.min(100, Math.max(0, valeur));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
      <div
        className="h-full rounded-full bg-gradient-to-r from-action to-action-strong transition-all duration-500"
        style={{ width: `${borne}%` }}
      />
    </div>
  );
}

export default function ChantiersPage() {
  const router = useRouter();
  const langue = getLangue();
  const [chantiers, setChantiers] = useState<Chantier[]>([]);
  const [suivi, setSuivi] = useState<Record<string, SuiviLigne>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtreType, setFiltreType] = useState<TypeChantier | "">("");
  const [filtreStatut, setFiltreStatut] = useState<StatutChantier | "">("");
  const [tri, setTri] = useState<"recent" | "echeance" | "avancement" | "montant">("recent");
  const [vueTableau, setVueTableau] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }

      const { data } = await supabase
        .from("chantiers")
        .select("*")
        .eq("proprietaire_id", user.id)
        .order("created_at", { ascending: false });
      const liste = (data ?? []) as Chantier[];
      setChantiers(liste);
      setLoading(false);
      if (liste.length === 0) return;

      // Suivi de tout le portefeuille en trois requêtes groupées :
      // sections (avancement), alertes ouvertes, non-conformités ouvertes.
      const ids = liste.map((c) => c.id);
      const [sectionsRes, alertesRes, ncRes] = await Promise.all([
        supabase
          .from("sections_chantier")
          .select("chantier_id,avancement_pct,pk_debut,pk_fin")
          .in("chantier_id", ids),
        supabase.from("alertes").select("chantier_id").eq("statut", "ouverte").in("chantier_id", ids),
        supabase
          .from("non_conformites")
          .select("chantier_id")
          .in("statut", ["ouverte", "en_cours"])
          .in("chantier_id", ids),
      ]);

      const map: Record<string, SuiviLigne> = {};
      for (const c of liste) {
        map[c.id] = {
          avancement: null,
          jours: joursRestants(c.date_fin_prevue),
          echeance: etatEcheance(c.date_fin_prevue, c.statut),
          alertes: 0,
          nonConformites: 0,
        };
      }

      const parChantier = new Map<
        string,
        Array<{ avancement_pct?: number | null; pk_debut?: number | null; pk_fin?: number | null }>
      >();
      for (const section of (sectionsRes.data ?? []) as Array<{
        chantier_id: string;
        avancement_pct?: number | null;
        pk_debut?: number | null;
        pk_fin?: number | null;
      }>) {
        const listeSections = parChantier.get(section.chantier_id) ?? [];
        listeSections.push(section);
        parChantier.set(section.chantier_id, listeSections);
      }
      for (const [id, sections] of parChantier) {
        if (map[id]) map[id].avancement = avancementMoyenSections(sections);
      }
      for (const alerte of (alertesRes.data ?? []) as Array<{ chantier_id: string }>) {
        if (map[alerte.chantier_id]) map[alerte.chantier_id].alertes += 1;
      }
      for (const nc of (ncRes.data ?? []) as Array<{ chantier_id: string }>) {
        if (map[nc.chantier_id]) map[nc.chantier_id].nonConformites += 1;
      }
      setSuivi(map);
    }
    load();
  }, [router]);

  const filtrés = chantiers.filter((c) => {
    const q = search.trim().toLowerCase();
    if (
      q &&
      !c.nom.toLowerCase().includes(q) &&
      !(c.maitre_ouvrage ?? "").toLowerCase().includes(q) &&
      !(c.ville ?? "").toLowerCase().includes(q)
    ) {
      return false;
    }
    if (filtreType && c.type !== filtreType) {
      return false;
    }
    if (filtreStatut && c.statut !== filtreStatut) {
      return false;
    }
    return true;
  });

  // Tri du portefeuille : échéance la plus proche en tête, avancement ou montant décroissant.
  const filtrésTries = [...filtrés].sort((a, b) => {
    if (tri === "echeance") {
      const joursA = suivi[a.id]?.jours ?? null;
      const joursB = suivi[b.id]?.jours ?? null;
      if (joursA === null && joursB === null) return 0;
      if (joursA === null) return 1;
      if (joursB === null) return -1;
      return joursA - joursB;
    }
    if (tri === "avancement") {
      const avA = suivi[a.id]?.avancement ?? null;
      const avB = suivi[b.id]?.avancement ?? null;
      if (avA === null && avB === null) return 0;
      if (avA === null) return 1;
      if (avB === null) return -1;
      return avB - avA;
    }
    if (tri === "montant") {
      return Number(b.montant_marche || 0) - Number(a.montant_marche || 0);
    }
    return 0; // « récent » : ordre de chargement (création décroissante), tri stable
  });

  const libelleType = (type: string) => {
    const t = TYPE_LABELS[type as TypeChantier] ?? TYPE_LABELS.route;
    return langue === "fr" ? t.fr : t.en;
  };

  const libelleStatut = (statut: string) => {
    const s = STATUT_LABELS[statut as StatutChantier] ?? STATUT_LABELS.en_preparation;
    return langue === "fr" ? s.fr : s.en;
  };

  // Totaux du portefeuille pour le bandeau de chiffres clés
  const montantTotal = chantiers.reduce((total, c) => total + Number(c.montant_marche || 0), 0);
  const chantiersActifs = chantiers.filter((c) => c.statut === "en_cours").length;
  const alertesTotal = Object.values(suivi).reduce((total, s) => total + s.alertes, 0);
  const ncTotal = Object.values(suivi).reduce((total, s) => total + s.nonConformites, 0);

  return (
    <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
      <div className="anim-fade-up mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
            {langue === "fr" ? "Portefeuille" : "Portfolio"}
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">Chantiers</h1>
          <p className="mt-1 text-sm text-muted">
            Gérez tous vos chantiers en cours et terminés.
          </p>
        </div>
        <Button onClick={() => router.push("/chantiers/nouveau")} size="lg">
          Nouveau chantier
        </Button>
      </div>

      {/* Chiffres clés du portefeuille */}
      {!loading && chantiers.length > 0 && (
        <div className="anim-fade-up anim-delay-1 mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            className="h-full"
            title={langue === "fr" ? "Chantiers actifs" : "Active Sites"}
            value={chantiersActifs}
            subtitle={langue === "fr" ? `sur ${chantiers.length} au total` : `of ${chantiers.length} total`}
            icon={<Building2 className="h-5 w-5" />}
            color="blue"
          />
          <StatCard
            className="h-full"
            title={langue === "fr" ? "Montant du portefeuille" : "Portfolio Amount"}
            value={montantTotal.toLocaleString(langue === "fr" ? "fr-FR" : "en-US")}
            subtitle="FCFA"
            icon={<Calculator className="h-5 w-5" />}
            color="emerald"
          />
          <StatCard
            className="h-full"
            title={langue === "fr" ? "Alertes ouvertes" : "Open Alerts"}
            value={alertesTotal}
            subtitle={langue === "fr" ? "tous chantiers confondus" : "across all sites"}
            icon={<AlertTriangle className="h-5 w-5" />}
            color={alertesTotal > 0 ? "amber" : "emerald"}
          />
          <StatCard
            className="h-full"
            title={langue === "fr" ? "Non-conformités" : "Non-conformities"}
            value={ncTotal}
            subtitle={langue === "fr" ? "ouvertes ou en cours" : "open or in progress"}
            icon={<ShieldAlert className="h-5 w-5" />}
            color={ncTotal > 0 ? "rose" : "emerald"}
          />
        </div>
      )}

      {/* Bascule vue en cartes / tableau */}
      <div className="anim-fade-up anim-delay-1 mb-6 inline-flex items-center gap-1 rounded-xl border border-border/80 bg-surface p-1 shadow-soft">
        <button
          type="button"
          onClick={() => setVueTableau(false)}
          className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
            !vueTableau ? "bg-primary text-white shadow-sm" : "text-muted hover:text-foreground"
          }`}
        >
          <LayoutGrid className="h-4 w-4" />
          Vue en cartes
        </button>
        <button
          type="button"
          onClick={() => setVueTableau(true)}
          className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
            vueTableau ? "bg-primary text-white shadow-sm" : "text-muted hover:text-foreground"
          }`}
        >
          <Table2 className="h-4 w-4" />
          Vue en tableau
        </button>
      </div>

      {/* Recherche et filtres */}
      <div className="anim-fade-up anim-delay-2 mb-6 grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            className="w-full rounded-xl border border-border/80 bg-surface py-2.5 pl-10 pr-4 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10"
            placeholder="Rechercher un chantier, une ville..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10"
          value={filtreType}
          onChange={(e) => setFiltreType(e.target.value as TypeChantier | "")}
        >
          <option value="">{langue === "fr" ? "Tous les types" : "All types"}</option>
          <option value="route">{libelleType("route")}</option>
          <option value="batiment">{libelleType("batiment")}</option>
        </select>
        <select
          className="rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10"
          value={filtreStatut}
          onChange={(e) => setFiltreStatut(e.target.value as StatutChantier | "")}
        >
          <option value="">{langue === "fr" ? "Tous les statuts" : "All statuses"}</option>
          {STATUTS.map((statut) => (
            <option key={statut} value={statut}>
              {libelleStatut(statut)}
            </option>
          ))}
        </select>
        <select
          className="rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10"
          value={tri}
          onChange={(e) => setTri(e.target.value as "recent" | "echeance" | "avancement" | "montant")}
        >
          <option value="recent">{langue === "fr" ? "Tri : plus récents" : "Sort: newest"}</option>
          <option value="echeance">{langue === "fr" ? "Tri : échéance proche" : "Sort: nearest deadline"}</option>
          <option value="avancement">{langue === "fr" ? "Tri : avancement" : "Sort: progress"}</option>
          <option value="montant">{langue === "fr" ? "Tri : montant" : "Sort: amount"}</option>
        </select>
        <Button
          variant="outline"
          onClick={() => {
            setSearch("");
            setFiltreType("");
            setFiltreStatut("");
            setTri("recent");
          }}
        >
          Réinitialiser
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex gap-4 rounded-2xl border border-border/80 bg-surface p-5 shadow-soft">
              <Skeleton className="h-11 w-11 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : filtrésTries.length === 0 ? (
        <Card variant="outlined" padding="lg" className="text-center">
          <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-primary/5 text-primary">
            <Building2 className="h-6 w-6" />
          </span>
          <p className="mb-4 text-sm text-muted">Aucun chantier ne correspond aux filtres.</p>
          <Link
            href="/chantiers/nouveau"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-action to-action-strong px-5 py-2.5 font-semibold text-white shadow-lg shadow-action/30 transition hover:brightness-105 active:scale-[0.98]"
          >
            Créer mon premier chantier
          </Link>
        </Card>
      ) : vueTableau ? (
        <TableauChantiers
          chantiers={filtrésTries}
          suivi={suivi}
          langue={langue}
          libelleStatut={libelleStatut}
          libelleType={libelleType}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtrésTries.map((c, index) => {
            const ligne = suivi[c.id];
            return (
              <Link
                key={c.id}
                href={`/chantiers/${c.id}`}
                className={`group anim-fade-up block ${DELAIS_ANIM[index % DELAIS_ANIM.length]}`}
              >
                <Card padding="lg" className="hover-lift h-full hover:border-primary/40">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-deep text-white shadow-md shadow-primary/25 transition-transform duration-300 group-hover:scale-110">
                        {c.type === "route" ? (
                          <Building2 className="h-5 w-5" />
                        ) : (
                          <LayoutGrid className="h-5 w-5" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-bold text-foreground">{c.nom}</h3>
                        <p className="truncate text-xs text-muted">
                          {c.maitre_ouvrage ??
                            (langue === "fr" ? "sans maître d'ouvrage" : "without project owner")}
                          {c.ville ? ` · ${c.ville}` : ""}
                          {c.type_detail ? ` · ${libelleTypeDetail(c.type_detail)}` : ""}
                        </p>
                      </div>
                    </div>
                    <Badge variant={STATUT_LABELS[c.statut as keyof typeof STATUT_LABELS]?.variant ?? "info"}>
                      {libelleStatut(c.statut)}
                    </Badge>
                  </div>

                  {/* Suivi : avancement du découpage + échéance + alertes */}
                  <div className="mt-4 space-y-2.5">
                    {ligne && ligne.avancement !== null && (
                      <div>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="font-medium text-muted">
                            {langue === "fr" ? "Avancement" : "Progress"}
                          </span>
                          <span className="font-semibold tabular-nums text-foreground">
                            {String(ligne.avancement).replace(".", langue === "fr" ? "," : ".")} %
                          </span>
                        </div>
                        <BarreAvancement valeur={ligne.avancement} />
                      </div>
                    )}
                    {ligne && <PastillesSuivi ligne={ligne} langue={langue} />}
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-border/70 pt-3">
                    <span className="text-sm font-semibold tabular-nums text-foreground">
                      {Number(c.montant_marche || 0).toLocaleString(langue === "fr" ? "fr-FR" : "en-US")} FCFA
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-muted transition group-hover:text-action">
                      {c.type === "route" ? libelleType("route") : libelleType("batiment")}
                      <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}

function TableauChantiers(props: {
  chantiers: Chantier[];
  suivi: Record<string, SuiviLigne>;
  langue: "fr" | "en";
  libelleStatut: (statut: string) => string;
  libelleType: (type: string) => string;
}) {
  const { chantiers, suivi, langue, libelleStatut, libelleType } = props;

  return (
    <div className="overflow-x-auto rounded-2xl border border-border/80 bg-surface shadow-soft">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/80 bg-surface-2 text-left">
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted">Chantier</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted">Type</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted">
              {langue === "fr" ? "Avancement" : "Progress"}
            </th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted">
              {langue === "fr" ? "Échéance" : "Deadline"}
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted">Montant (FCFA)</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted">Statut</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {chantiers.map((c) => {
            const s = STATUT_LABELS[c.statut as keyof typeof STATUT_LABELS] ?? STATUT_LABELS.en_preparation;
            const ligne = suivi[c.id];
            return (
              <tr key={c.id} className="border-b border-border/60 transition last:border-0 hover:bg-surface-2/70">
                <td className="px-4 py-3 font-medium text-foreground">
                  <span className="block">{c.nom}</span>
                  {(c.ville || c.maitre_ouvrage) && (
                    <span className="block text-xs text-muted">
                      {[c.maitre_ouvrage, c.ville].filter(Boolean).join(" · ")}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted">
                  <span className="block">{libelleType(c.type)}</span>
                  {c.type_detail ? (
                    <span className="block text-xs opacity-80">{libelleTypeDetail(c.type_detail)}</span>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  {ligne && ligne.avancement !== null ? (
                    <div className="flex items-center gap-2">
                      <div className="w-20">
                        <BarreAvancement valeur={ligne.avancement} />
                      </div>
                      <span className="text-xs font-semibold tabular-nums text-foreground">
                        {String(ligne.avancement).replace(".", langue === "fr" ? "," : ".")} %
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {ligne ? <TexteEcheance ligne={ligne} langue={langue} /> : <span className="text-xs text-muted">—</span>}
                </td>
                <td className="px-4 py-3 text-right font-mono tabular-nums text-foreground">
                  {Number(c.montant_marche || 0).toLocaleString(langue === "fr" ? "fr-FR" : "en-US")}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={s.variant}>{libelleStatut(c.statut)}</Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/chantiers/${c.id}`}
                    className="text-sm font-semibold text-primary hover:underline"
                  >
                    Voir
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
