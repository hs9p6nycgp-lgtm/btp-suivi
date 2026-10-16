"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import SignOutButton from "@/components/SignOutButton";
import { getLangue } from "@/lib/i18n";

type Chantier = {
  id: string;
  nom: string;
  type: string;
  maitre_ouvrage: string | null;
  montant_marche: number;
  statut: string;
};

const STATUT_LABELS: Record<string, { fr: string; en: string; color: "success" | "warning" | "danger" | "info" }> = {
  en_preparation: { fr: "En préparation", en: "Preparation", color: "info" },
  en_cours: { fr: "En cours", en: "In Progress", color: "success" },
  suspendu: { fr: "Suspendu", en: "Suspended", color: "warning" },
  receptionne_provisoirement: { fr: "Réceptionné prov.", en: "Provisional Acceptance", color: "info" },
  cloture: { fr: "Clôturé", en: "Closed", color: "danger" },
};

export default function Home() {
  const router = useRouter();
  const langue = getLangue();
  const [chantiers, setChantiers] = useState<Chantier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }

      const { data } = await supabase.from("chantiers").select("*").order("created_at", { ascending: false });
      setChantiers((data ?? []) as Chantier[]);
      setLoading(false);
    }
    load();
  }, [router]);

  const totalMontant = chantiers.reduce((s, c) => s + Number(c.montant_marche || 0), 0);
  const enCours = chantiers.filter((c) => c.statut === "en_cours").length;
  const clotures = chantiers.filter((c) => c.statut === "cloture").length;
  const terminePct = chantiers.length > 0 ? Math.round((clotures / chantiers.length) * 100) : 0;

  return (
    <main className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-6">
      {/* Hero */}
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Tableau de bord</h1>
            <p className="text-slate-500 text-sm">
              Vue d'ensemble de vos chantiers en cours et à venir.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <SignOutButton />
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Chantiers actifs"
          value={chantiers.length}
          icon="🏗️"
          color="blue"
          trend={{
            value: "+12%",
            label: "vs mois dernier",
            positive: true,
          }}
        />
        <StatCard
          title="En cours"
          value={enCours}
          icon="🚧"
          color="orange"
          trend={{
            value: "100%",
            label: "suivi en temps réel",
            positive: true,
          }}
        />
        <StatCard
          title="Clôturés"
          value={clotures}
          icon="✅"
          color="emerald"
          trend={{
            value: terminePct.toString(),
            label: "% du total",
            positive: true,
          }}
        />
        <StatCard
          title="Montant total"
          value={totalMontant.toLocaleString(langue === "fr" ? "fr-FR" : "en-US")}
          subtitle="FCFA"
          icon="💰"
          color="amber"
        />
      </div>

      {/* Quick actions */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Link href="/chantiers/nouveau" className="group">
          <Card variant="elevated" padding="lg" className="text-center hover:border-orange-500/50 transition-all cursor-pointer">
            <div className="w-12 h-12 rounded-2xl bg-orange-500 flex items-center justify-center mx-auto mb-4 text-white text-2xl group-hover:scale-110 transition-transform">
              ➕
            </div>
            <h3 className="font-bold text-slate-900">Nouveau chantier</h3>
            <p className="text-sm text-slate-500 mt-2">Créer et configurer un chantier</p>
          </Card>
        </Link>
        <Link href="/bpu" className="group">
          <Card variant="elevated" padding="lg" className="text-center hover:border-blue-500/50 transition-all cursor-pointer">
            <div className="w-12 h-12 rounded-2xl bg-blue-500 flex items-center justify-center mx-auto mb-4 text-white text-2xl group-hover:scale-110 transition-transform">
              💰
            </div>
            <h3 className="font-bold text-slate-900">Bibliothèque de prix</h3>
            <p className="text-sm text-slate-500 mt-2">Gérer vos prix unitaires et matériaux</p>
          </Card>
        </Link>
        <Link href="/calculateurs/devis" className="group">
          <Card variant="elevated" padding="lg" className="text-center hover:border-emerald-500/50 transition-all cursor-pointer">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center mx-auto mb-4 text-white text-2xl group-hover:scale-110 transition-transform">
              📋
            </div>
            <h3 className="font-bold text-slate-900">Assistant devis</h3>
            <p className="text-sm text-slate-500 mt-2">Estimer matériaux et planning</p>
          </Card>
        </Link>
      </div>

      {/* Chantiers récents */}
      <section className="mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Chantiers récents</h2>
            <p className="text-sm text-slate-500">
              {chantiers.length} chantier{chantiers.length > 1 ? "s" : ""} enregistré{chantiers.length > 1 ? "s" : ""}
            </p>
          </div>
          <Link href="/chantiers" className="text-sm font-semibold text-orange-600 hover:underline flex items-center gap-1">
            Voir tout →
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4 p-4 rounded-xl bg-white border border-slate-200">
                <Skeleton className="w-10 h-10 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : chantiers.length === 0 ? (
          <Card variant="outlined" padding="lg" className="text-center">
            <p className="text-sm text-slate-500 mb-4">Aucun chantier pour le moment.</p>
            <Link href="/chantiers/nouveau" className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-2 text-white font-semibold hover:bg-orange-700 transition-all">
              Créer mon premier chantier
            </Link>
          </Card>
        ) : (
          <div className="space-y-3">
            {chantiers.slice(0, 5).map((c) => {
              const s = STATUT_LABELS[c.statut] || STATUT_LABELS.en_preparation;
              return (
                <Link key={c.id} href={`/chantiers/${c.id}`} className="block">
                  <Card padding="none" className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 text-lg">
                      {c.type === "route" ? "🛣️" : "🏢"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-900 text-sm truncate">{c.nom}</h3>
                      <p className="text-xs text-slate-500 truncate">
                        {c.maitre_ouvrage ?? (langue === "fr" ? "sans maître d'ouvrage" : "without project owner")}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={s.color}>{s[langue]}</Badge>
                      <span className="text-xs font-medium text-slate-700">
                        {Number(c.montant_marche || 0).toLocaleString(langue === "fr" ? "fr-FR" : "en-US")} FCFA
                      </span>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}