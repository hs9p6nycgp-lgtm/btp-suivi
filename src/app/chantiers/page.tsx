"use client";

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

const STATUT_LABELS: Record<string, { fr: string; en: string; variant: "success" | "warning" | "danger" | "info" | "primary" }> = {
  en_preparation: { fr: "En préparation", en: "Preparation", variant: "info" },
  en_cours: { fr: "En cours", en: "In Progress", variant: "success" },
  suspendu: { fr: "Suspendu", en: "Suspended", variant: "warning" },
  receptionne_provisoirement: { fr: "Réceptionné prov.", en: "Provisional Acceptance", variant: "info" },
  cloture: { fr: "Clôturé", en: "Closed", variant: "danger" },
};

export default function ChantiersPage() {
  const router = useRouter();
  const langue = getLangue();
  const [chantiers, setChantiers] = useState<Chantier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

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
        .order("created_at", { ascending: false });
      setChantiers((data ?? []) as Chantier[]);
      setLoading(false);
    }
    load();
  }, [router]);

  const filtered = chantiers.filter((c) => {
    const q = search.trim().toLowerCase();
    if (q && !c.nom.toLowerCase().includes(q) && !(c.maitre_ouvrage ?? "").toLowerCase().includes(q)) return false;
    return true;
  });

  return (
    <main className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Chantiers</h1>
          <p className="text-sm text-slate-500">
            Gérez tous vos chantiers en cours et terminés.
          </p>
        </div>
        <Link
          href="/chantiers/nouveau"
          className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-white font-semibold hover:bg-orange-700 transition-all shadow-sm"
        >
          Nouveau chantier
        </Link>
      </div>

      {/* Recherche */}
      <div className="mb-6">
        <div className="relative">
          <svg
            className="w-4 h-4 text-slate-400 absolute left-3 top-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
            placeholder="Rechercher un chantier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4 p-4 rounded-xl bg-white border border-slate-200">
              <Skeleton className="w-10 h-10 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card variant="outlined" padding="lg" className="text-center">
          <p className="text-sm text-slate-500 mb-4">
            Aucun chantier ne correspond à votre recherche.
          </p>
          <Link
            href="/chantiers/nouveau"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-2 text-white font-semibold hover:bg-orange-700 transition-all"
          >
            Créer mon premier chantier
          </Link>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => {
            const s = STATUT_LABELS[c.statut] || STATUT_LABELS.en_preparation;
            return (
              <Link key={c.id} href={`/chantiers/${c.id}`} className="block">
                <Card
                  padding="none"
                  className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-all border-b border-slate-100 last:border-0 group"
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 text-lg">
                    {c.type === "route" ? "🛣️" : "🏢"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 text-sm group-hover:text-orange-600 transition-colors">
                      {c.nom}
                    </h3>
                    <p className="text-xs text-slate-500 truncate">
                      {c.maitre_ouvrage ??
                        (langue === "fr" ? "sans maître d'ouvrage" : "without project owner")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={s.variant}>{s[langue]}</Badge>
                    <span className="text-xs font-medium text-slate-700">
                      {Number(c.montant_marche || 0).toLocaleString(
                        langue === "fr" ? "fr-FR" : "en-US",
                      )} FCFA
                    </span>
                    <svg
                      className="w-4 h-4 text-slate-400 group-hover:text-slate-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
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