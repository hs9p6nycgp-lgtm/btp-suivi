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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }
      setUserEmail(user.email ?? "");

      const cacheKey = "chantiers";
      let list: Chantier[] = [];
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        list = (await cacheGet<Chantier[]>(cacheKey)) ?? [];
      } else {
        const { data } = await supabase
          .from("chantiers")
          .select("*")
          .order("created_at", { ascending: false });
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
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Tableau de bord</h1>
          <p className="text-sm text-slate-600">
            {userEmail ? `Connecté en tant que ${userEmail}` : "Chargement..."}
          </p>
        </div>
        <SignOutButton />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="card p-5">
          <p className="text-sm text-slate-500">Chantiers</p>
          <p className="text-3xl font-bold text-primary">{chantiers.length}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-slate-500">En cours</p>
          <p className="text-3xl font-bold text-action">{enCours}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-slate-500">Montant cumulé</p>
          <p className="text-2xl font-bold text-primary">
            {totalMontant.toLocaleString("fr-FR")} FCFA
          </p>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-3 md:grid-cols-3">
        <Link href="/chantiers" className="card p-4 text-center hover:shadow-md transition-shadow">
          <p className="font-semibold text-primary">Chantiers</p>
          <p className="text-sm text-slate-500">Créer et suivre un chantier</p>
        </Link>
        <Link
          href="/bpu"
          className="card p-4 text-center hover:shadow-md transition-shadow"
        >
          <p className="font-semibold text-primary">BPU</p>
          <p className="text-sm text-slate-500">Importer Base_prix_CI_v2.xlsx</p>
        </Link>
        <Link
          href="/calculateurs/devis"
          className="card p-4 text-center hover:shadow-md transition-shadow"
        >
          <p className="font-semibold text-primary">Assistant devis</p>
          <p className="text-sm text-slate-500">Recommandations + choix</p>
        </Link>
      </div>

      <section className="card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-primary">Chantiers récents</h2>
          <Link href="/chantiers" className="text-sm text-action hover:underline">
            Voir tout
          </Link>
        </div>
        {loading ? (
          <p>Chargement...</p>
        ) : chantiers.length === 0 ? (
          <div className="rounded border border-dashed p-8 text-center">
            <p className="mb-3 text-slate-600">Aucun chantier pour le moment.</p>
            <Link href="/chantiers/nouveau" className="btn-primary inline-block">
              Créer mon premier chantier
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {chantiers.slice(0, 5).map((c) => (
              <li key={c.id} className="flex items-center justify-between rounded border p-3">
                <div>
                  <Link href={`/chantiers/${c.id}`} className="font-medium text-primary hover:underline">
                    {c.nom}
                  </Link>
                  <p className="text-sm text-slate-600">
                    {c.type === "route" ? "Route" : "Bâtiment"} - {c.maitre_ouvrage ?? "sans maître d'ouvrage"}
                  </p>
                </div>
                <span className="badge badge-info">{c.statut}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}