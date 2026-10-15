"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { cacheGet, cacheSet } from "@/lib/offline/storage";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import SignOutButton from "@/components/SignOutButton";

type Chantier = {
  id: string;
  nom: string;
  type: string;
  maitre_ouvrage: string | null;
  montant_marche: number;
  statut: string;
  seuil_ecart_pct: number;
};

export default function Home() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState("");
  const [chantiers, setChantiers] = useState<Chantier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      setUserEmail(user.email ?? "");

      const cacheKey = "chantiers";
      let list: Chantier[] = [];
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        list = (await cacheGet<Chantier[]>(cacheKey)) ?? [];
      } else {
        const { data } = await supabase.from("chantiers").select("*").order("created_at", { ascending: false });
        list = (data ?? []) as Chantier[];
        await cacheSet(cacheKey, list);
      }
      setChantiers(list);
      setLoading(false);
    }
    load();
  }, [router]);

  const totalMontant = chantiers.reduce((s, c) => s + Number(c.montant_marche || 0), 0);
  const enCours = chantiers.filter((c) => c.statut === "en_cours").length;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      {/* Hero */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary">Tableau de bord</h1>
            <p className="text-muted text-sm">{userEmail ? `Connecté en tant que ${userEmail}` : "Chargement..."}</p>
          </div>
          <SignOutButton />
        </div>
        <p className="mt-2 text-muted text-sm">
          Suivez vos chantiers, consultez votre bibliothèque de prix et établissez vos devis.
        </p>
      </div>

      {/* Stats cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted text-xs uppercase font-semibold tracking-wider">Chantiers</p>
              <p className="text-3xl font-bold text-primary">{chantiers.length}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-xl">🏗️</div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted text-xs uppercase font-semibold tracking-wider">En cours</p>
              <p className="text-3xl font-bold text-action">{enCours}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-action/10 flex items-center justify-center text-action text-xl">🚧</div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted text-xs uppercase font-semibold tracking-wider">Montant cumulé</p>
              <p className="text-3xl font-bold text-primary">{totalMontant.toLocaleString("fr-FR")} FCFA</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center text-success text-xl">💰</div>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="mb-8 grid grid-cols-1 gap-3 md:grid-cols-3">
        <Link href="/chantiers" className="card p-6 text-center hover:shadow-lg transition-all border border-slate-200 group">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4 text-white text-3xl group-hover:scale-110 transition-transform">🏗️</div>
          <p className="font-semibold text-primary text-lg">Chantiers</p>
          <p className="text-xs text-muted mt-1">Créer et suivre un chantier</p>
        </Link>
        <Link href="/bpu" className="card p-6 text-center hover:shadow-lg transition-all border border-slate-200 group">
          <div className="w-14 h-14 rounded-2xl bg-action flex items-center justify-center mx-auto mb-4 text-white text-3xl group-hover:scale-110 transition-transform">💰</div>
          <p className="font-semibold text-primary text-lg">BPU</p>
          <p className="text-xs text-muted mt-1">Bibliothèque de prix</p>
        </Link>
        <Link href="/calculateurs/devis" className="card p-6 text-center hover:shadow-lg transition-all border border-slate-200 group">
          <div className="w-14 h-14 rounded-2xl bg-success flex items-center justify-center mx-auto mb-4 text-white text-3xl group-hover:scale-110 transition-transform">📋</div>
          <p className="font-semibold text-primary text-lg">Assistant devis</p>
          <p className="text-xs text-muted mt-1">Recommandations + choix</p>
        </Link>
      </div>

      {/* Chantiers récents */}
      <section className="card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="section-title text-xl">Chantiers récents</h2>
          <Link href="/chantiers" className="text-sm text-action hover:underline font-semibold">Voir tout</Link>
        </div>
        {loading ? (
          <p className="text-muted">Chargement...</p>
        ) : chantiers.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-300 p-12 text-center bg-slate-50">
            <p className="mb-4 text-muted text-sm">Aucun chantier pour le moment.</p>
            <Link href="/chantiers/nouveau" className="btn-primary inline-block">Créer mon premier chantier</Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {chantiers.slice(0, 5).map((c, i) => {
              const progress = Math.min((i + 1) * 17 % 97, 95);
              return (
                <li key={c.id} className="card p-4 transition-all hover:shadow-md border border-slate-100">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <Link href={`/chantiers/${c.id}`} className="font-semibold text-primary text-lg hover:underline">
                        {c.nom}
                      </Link>
                      <p className="text-xs text-muted">{c.type === "route" ? "Route" : "Bâtiment"} - {c.maitre_ouvrage ?? "sans maître d'ouvrage"}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-baseline gap-1">
                        <span className="text-sm font-bold text-primary">{progress.toFixed(0)}%</span>
                        <span className="text-xs text-muted">avancement</span>
                      </div>
                      <div className="w-24 progress-bar">
                        <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}