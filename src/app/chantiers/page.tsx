"use client";

import { ArrowRight, Building2, LayoutGrid, Search, Table2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { getLangue } from "@/lib/i18n";
import { libelleTypeDetail } from "@/lib/chantiers/types";

type Chantier = {
  id: string;
  nom: string;
  type: string;
  type_detail: string | null;
  maitre_ouvrage: string | null;
  montant_marche: number;
  statut: string;
};

type TypeChantier = "route" | "batiment";
type StatutChantier = "en_preparation" | "en_cours" | "suspendu" | "receptionne_provisulement" | "cloture";

const STATUTS: StatutChantier[] = ["en_preparation", "en_cours", "suspendu", "receptionne_provisulement", "cloture"];

const STATUT_LABELS: Record<StatutChantier, { fr: string; en: string; variant: "success" | "warning" | "danger" | "info" | "primary" }> = {
  en_preparation: { fr: "En préparation", en: "Preparation", variant: "info" },
  en_cours: { fr: "En cours", en: "In Progress", variant: "success" },
  suspendu: { fr: "Suspendu", en: "Suspended", variant: "warning" },
  receptionne_provisulement: { fr: "Réceptionné prov.", en: "Provisional Acceptance", variant: "info" },
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

export default function ChantiersPage() {
  const router = useRouter();
  const langue = getLangue();
  const [chantiers, setChantiers] = useState<Chantier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtreType, setFiltreType] = useState<TypeChantier | "">("");
  const [filtreStatut, setFiltreStatut] = useState<StatutChantier | "">("");
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
      setChantiers((data ?? []) as Chantier[]);
      setLoading(false);
    }
    load();
  }, [router]);

  const filtrés = chantiers.filter((c) => {
    const q = search.trim().toLowerCase();
    if (q && !c.nom.toLowerCase().includes(q) && !(c.maitre_ouvrage ?? "").toLowerCase().includes(q)) {
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

  const libelleType = (type: string) => {
    const t = TYPE_LABELS[type as TypeChantier] ?? TYPE_LABELS.route;
    return langue === "fr" ? t.fr : t.en;
  };

  const libelleStatut = (statut: string) => {
    const s = STATUT_LABELS[statut as StatutChantier] ?? STATUT_LABELS.en_preparation;
    return langue === "fr" ? s.fr : s.en;
  };

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
      <div className="anim-fade-up anim-delay-2 mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            className="w-full rounded-xl border border-border/80 bg-surface py-2.5 pl-10 pr-4 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10"
            placeholder="Rechercher un chantier..."
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
        <Button
          variant="outline"
          onClick={() => {
            setSearch("");
            setFiltreType("");
            setFiltreStatut("");
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
      ) : filtrés.length === 0 ? (
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
          chantiers={filtrés}
          langue={langue}
          libelleStatut={libelleStatut}
          libelleType={libelleType}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtrés.map((c, index) => (
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
                        {c.type_detail ? ` · ${libelleTypeDetail(c.type_detail)}` : ""}
                      </p>
                    </div>
                  </div>
                  <Badge variant={STATUT_LABELS[c.statut as keyof typeof STATUT_LABELS]?.variant ?? "info"}>
                    {libelleStatut(c.statut)}
                  </Badge>
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
          ))}
        </div>
      )}
    </main>
  );
}

function TableauChantiers(props: {
  chantiers: Chantier[];
  langue: "fr" | "en";
  libelleStatut: (statut: string) => string;
  libelleType: (type: string) => string;
}) {
  const { chantiers, langue, libelleStatut, libelleType } = props;

  return (
    <div className="overflow-x-auto rounded-2xl border border-border/80 bg-surface shadow-soft">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/80 bg-surface-2 text-left">
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted">Chantier</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted">Type</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted">Maître d&apos;ouvrage</th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted">Montant (FCFA)</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted">Statut</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {chantiers.map((c) => {
            const s = STATUT_LABELS[c.statut as keyof typeof STATUT_LABELS] ?? STATUT_LABELS.en_preparation;
            return (
              <tr key={c.id} className="border-b border-border/60 transition last:border-0 hover:bg-surface-2/70">
                <td className="px-4 py-3 font-medium text-foreground">{c.nom}</td>
                <td className="px-4 py-3 text-muted">
                  <span className="block">{libelleType(c.type)}</span>
                  {c.type_detail ? (
                    <span className="block text-xs opacity-80">{libelleTypeDetail(c.type_detail)}</span>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-muted">{c.maitre_ouvrage ?? "—"}</td>
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