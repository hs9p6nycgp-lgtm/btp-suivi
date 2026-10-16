"use client";

import { Building2, LayoutGrid, Search, Table2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { getLangue } from "@/lib/i18n";

type Chantier = {
  id: string;
  nom: string;
  type: string;
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
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">Chantiers</h1>
          <p className="text-sm text-muted">
            Gérez tous vos chantiers en cours et terminés.
          </p>
        </div>
        <Button onClick={() => router.push("/chantiers/nouveau")} size="lg">
          Nouveau chantier
        </Button>
      </div>

      {/* Bascule vue en cartes / tableau */}
      <div className="mb-6 flex items-center gap-2">
        <Button
          variant={vueTableau ? "secondary" : "primary"}
          size="sm"
          onClick={() => setVueTableau(false)}
        >
          <LayoutGrid className="h-4 w-4" />
          Vue en cartes
        </Button>
        <Button
          variant={vueTableau ? "primary" : "secondary"}
          size="sm"
          onClick={() => setVueTableau(true)}
        >
          <Table2 className="h-4 w-4" />
          Vue en tableau
        </Button>
      </div>

      {/* Recherche et filtres */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            className="w-full rounded-xl border border-border bg-surface py-2.5 pl-10 pr-4 text-sm text-foreground outline-none transition focus:border-primary dark:bg-slate-800 dark:text-slate-200"
            placeholder="Rechercher un chantier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary dark:bg-slate-800 dark:text-slate-200"
          value={filtreType}
          onChange={(e) => setFiltreType(e.target.value as TypeChantier | "")}
        >
          <option value="">{langue === "fr" ? "Tous les types" : "All types"}</option>
          <option value="route">{libelleType("route")}</option>
          <option value="batiment">{libelleType("batiment")}</option>
        </select>
        <select
          className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary dark:bg-slate-800 dark:text-slate-200"
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
          variant="secondary"
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
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4 rounded-xl border border-border bg-surface p-4">
              <Skeleton className="w-10 h-10 rounded-lg" />
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
          <p className="mb-4 text-sm text-muted">Aucun chantier ne correspond aux filtres.</p>
          <Link
            href="/chantiers/nouveau"
            className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-white font-semibold"
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
          {filtrés.map((c) => (
            <Link key={c.id} href={`/chantiers/${c.id}`} className="block group">
              <Card padding="lg" className="hover:border-primary/40 transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
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
                      </p>
                    </div>
                  </div>
                  <Badge variant={STATUT_LABELS[c.statut as keyof typeof STATUT_LABELS]?.variant ?? "info"}>
                    {libelleStatut(c.statut)}
                  </Badge>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                  <span className="text-sm font-semibold text-foreground">
                    {Number(c.montant_marche || 0).toLocaleString(langue === "fr" ? "fr-FR" : "en-US")} FCFA
                  </span>
                  <span className="text-xs font-medium text-muted">
                    {c.type === "route" ? libelleType("route") : libelleType("batiment")}
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
    <div className="overflow-x-auto rounded-xl border border-border bg-surface">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-slate-50 text-left dark:bg-slate-800">
            <th className="p-3 font-semibold text-muted">Chantier</th>
            <th className="p-3 font-semibold text-muted">Type</th>
            <th className="p-3 font-semibold text-muted">Maître d&apos;ouvrage</th>
            <th className="p-3 text-right font-semibold text-muted">Montant (FCFA)</th>
            <th className="p-3 font-semibold text-muted">Statut</th>
            <th className="p-3" />
          </tr>
        </thead>
        <tbody>
          {chantiers.map((c) => {
            const s = STATUT_LABELS[c.statut as keyof typeof STATUT_LABELS] ?? STATUT_LABELS.en_preparation;
            return (
              <tr key={c.id} className="border-b border-border last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <td className="p-3 font-medium text-foreground">{c.nom}</td>
                <td className="p-3 text-muted">{libelleType(c.type)}</td>
                <td className="p-3 text-muted">{c.maitre_ouvrage ?? "—"}</td>
                <td className="p-3 text-right font-mono text-foreground">
                  {Number(c.montant_marche || 0).toLocaleString(langue === "fr" ? "fr-FR" : "en-US")}
                </td>
                <td className="p-3">
                  <Badge variant={s.variant}>{libelleStatut(c.statut)}</Badge>
                </td>
                <td className="p-3 text-right">
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