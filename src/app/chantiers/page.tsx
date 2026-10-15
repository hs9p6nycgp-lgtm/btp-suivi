"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cacheGet, cacheSet } from "@/lib/offline/storage";
import { useEffect, useState } from "react";

type Chantier = {
  id: string;
  nom: string;
  type: string;
  maitre_ouvrage: string | null;
  statut: string;
};

export default function ChantiersPage() {
  const router = useRouter();
  const [chantiers, setChantiers] = useState<Chantier[]>([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatut, setFilterStatut] = useState("");

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

      // Hors ligne : lire le cache local
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setOffline(true);
        const cached = await cacheGet<Chantier[]>("chantiers");
        setChantiers(cached ?? []);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("chantiers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        setOffline(true);
        const cached = await cacheGet<Chantier[]>("chantiers");
        setChantiers(cached ?? []);
      } else {
        const list = (data ?? []) as Chantier[];
        setChantiers(list);
        await cacheSet("chantiers", list);
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

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Chantiers</h1>
        <Link
          href="/chantiers/nouveau"
          className="btn-primary inline-block"
        >
          Nouveau chantier
        </Link>
      </div>

      {offline && (
        <p className="mb-4 rounded bg-warning/10 p-3 text-sm text-warning">
          Mode hors connexion : données lues depuis le cache local.
        </p>
      )}

      {!loading && (
        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <input
            className="rounded border p-2"
            placeholder="Rechercher un chantier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="rounded border p-2" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="">Tous les types</option>
            <option value="route">Route</option>
            <option value="batiment">Batiment</option>
          </select>
          <select className="rounded border p-2" value={filterStatut} onChange={(e) => setFilterStatut(e.target.value)}>
            <option value="">Tous les statuts</option>
            <option value="en_preparation">En preparation</option>
            <option value="en_cours">En cours</option>
            <option value="suspendu">Suspendu</option>
            <option value="receptionne_provisoirement">Receptionne provisoirement</option>
            <option value="cloture">Cloture</option>
          </select>
        </div>
      )}

      {loading ? (
        <p>Chargement...</p>
      ) : filtered.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="mb-3 text-slate-600">
            {chantiers.length === 0 ? "Aucun chantier pour le moment." : "Aucun chantier ne correspond aux filtres."}
          </p>
          {chantiers.length === 0 && (
            <Link href="/chantiers/nouveau" className="btn-primary inline-block">
              Creer mon premier chantier
            </Link>
          )}
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((c) => (
            <li key={c.id} className="card p-4 transition-shadow hover:shadow-md">
              <Link href={`/chantiers/${c.id}`} className="font-medium text-primary">
                {c.nom}
              </Link>
              <p className="text-sm text-slate-600">
                {c.type === "route" ? "Route" : "Batiment"} -{" "}
                {c.maitre_ouvrage ?? "sans maitre d'ouvrage"} - Statut : {c.statut}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}