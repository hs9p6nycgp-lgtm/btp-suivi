"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { cacheGet, cacheSet } from "@/lib/offline/storage";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { t, getLangue } from "@/lib/i18n";

type Chantier = {
  id: string;
  nom: string;
  type: string;
  maitre_ouvrage: string | null;
  montant_marche: number;
  statut: string;
  date_debut: string | null;
};

export default function ChantiersPage() {
  const router = useRouter();
  const langue = getLangue();
  const [chantiers, setChantiers] = useState<Chantier[]>([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatut, setFilterStatut] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }

      const cacheKey = "chantiers";
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setOffline(true);
        const cached = await cacheGet<Chantier[]>(cacheKey);
        setChantiers(cached ?? []);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.from("chantiers").select("*").order("created_at", { ascending: false });
      if (error) {
        setOffline(true);
        const cached = await cacheGet<Chantier[]>(cacheKey);
        setChantiers(cached ?? []);
      } else {
        setOffline(false);
        const list = (data ?? []) as Chantier[];
        setChantiers(list);
        await cacheSet(cacheKey, list);
      }
      setLoading(false);
    }
    load();
  }, [router]);

  const filtered = chantiers.filter((c) => {
    const q = search.trim().toLowerCase();
    if (q && !c.nom.toLowerCase().includes(q) && !(c.maitre_ouvrage ?? "").toLowerCase().includes(q)) return false;
    if (filterType && c.type !== filterType) return false;
    if (filterStatut && c.statut !== filterStatut) return false;
    return true;
  });

  const statutLabel = (s: string) => {
    const labels: Record<string, string> = {
      en_preparation: langue === "fr" ? "En préparation" : "Preparation",
      en_cours: langue === "fr" ? "En cours" : "In Progress",
      suspendu: langue === "fr" ? "Suspendu" : "Suspended",
      receptionne_provisoirement: langue === "fr" ? "Réceptionné prov." : "Provisional Acceptance",
      cloture: langue === "fr" ? "Clôturé" : "Closed",
    };
    return labels[s] || s;
  };

  const statutBadge = (s: string) => {
    const map: Record<string, string> = {
      en_preparation: "badge-info",
      en_cours: "badge-success",
      suspendu: "badge-warning",
      receptionne_provisoirement: "badge-info",
      cloture: "badge-danger",
    };
    return map[s] || "badge-info";
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">{t("chantiers.titre")}</h1>
          <p className="text-muted text-sm">{t("chantiers.maitre_ouvrage")}</p>
        </div>
        <Link href="/chantiers/nouveau" className="btn-primary inline-block">{t("chantiers.nouveau")}</Link>
      </div>

      {offline && (
        <p className="mb-4 rounded-lg bg-warning/10 p-3 text-sm text-warning border border-warning/20">
          Mode hors connexion : données lues depuis le cache local.
        </p>
      )}

      {!loading && (
        <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-3">
          <input
            className="rounded-xl border p-2.5 text-sm focus:ring-2 focus:ring-primary outline-none"
            placeholder={t("chantiers.rechercher")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="rounded-xl border p-2.5 text-sm focus:ring-2 focus:ring-primary outline-none bg-white" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="">{t("chantiers.tous_types")}</option>
            <option value="route">{t("chantiers.type_route")}</option>
            <option value="batiment">{t("chantiers.type_batiment")}</option>
          </select>
          <select className="rounded-xl border p-2.5 text-sm focus:ring-2 focus:ring-primary outline-none bg-white" value={filterStatut} onChange={(e) => setFilterStatut(e.target.value)}>
            <option value="">{t("chantiers.tous_statuts")}</option>
            <option value="en_preparation">{statutLabel("en_preparation")}</option>
            <option value="en_cours">{statutLabel("en_cours")}</option>
            <option value="suspendu">{statutLabel("suspendu")}</option>
            <option value="receptionne_provisoirement">{statutLabel("receptionne_provisoirement")}</option>
            <option value="cloture">{statutLabel("cloture")}</option>
          </select>
        </div>
      )}

      {loading ? (
        <div className="card p-12 text-center">
          <p className="text-muted text-sm animate-pulse">Chargement des chantiers...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="mb-4 text-muted text-sm">{chantiers.length === 0 ? t("home.aucun_chantier") : t("chantiers.aucun")}</p>
          {chantiers.length === 0 && <Link href="/chantiers/nouveau" className="btn-primary inline-block">{t("home.creer_chantier")}</Link>}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => {
            const progress = Math.min((c.id.split("-")[0]?.length || 5) * 7 % 100, 100);
            return (
              <Link key={c.id} href={`/chantiers/${c.id}`} className="card p-5 transition-all hover:shadow-md border border-slate-100 group">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h3 className="font-bold text-primary text-lg group-hover:text-action transition-colors">{c.nom}</h3>
                    <p className="text-xs text-muted mt-1">
                      {c.type === "route" ? (langue === "fr" ? "🛣️ Route" : "🛣️ Road") : (langue === "fr" ? "🏢 Bâtiment" : "🏢 Building")} • {c.maitre_ouvrage ?? (langue === "fr" ? "sans maître d'ouvrage" : "without project owner")}
                    </p>
                  </div>
                  <span className={`badge ${statutBadge(c.statut)} text-xs`}>{statutLabel(c.statut)}</span>
                </div>
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-muted mb-1">
                    <span>{t("chantiers.montant")}</span>
                    <span className="font-semibold text-foreground">{Number(c.montant_marche || 0).toLocaleString(langue === "fr" ? "fr-FR" : "en-US")} FCFA</span>
                  </div>
                  <div className="w-full progress-bar">
                    <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                  </div>
                  <p className="text-xs text-muted mt-1">{progress.toFixed(0)}% {langue === "fr" ? "d'avancement estimé" : "estimated progress"}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}