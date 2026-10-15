"use client";

import { createClient } from "@/lib/supabase/client";
import { cacheGet, cacheSet } from "@/lib/offline/storage";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Journal = {
  id: string;
  chantier_id: string;
  date_journal: string;
  meteo: string | null;
  statut: "brouillon" | "valide";
  created_at: string;
};

export default function JournauxPage() {
  const params = useParams();
  const chantierId = String(params?.id ?? "");
  const router = useRouter();
  const [items, setItems] = useState<Journal[]>([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [meteo, setMeteo] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);

  async function load() {
    const cacheKey = `journaux_${chantierId}`;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setOffline(true);
      const cached = await cacheGet<Journal[]>(cacheKey);
      setItems(cached ?? []);
      return;
    }
    const supabase = createClient();
    const { data, error } = await supabase
      .from("journaux")
      .select("*")
      .eq("chantier_id", chantierId)
      .order("date_journal", { ascending: false });
    if (error) {
      setOffline(true);
      const cached = await cacheGet<Journal[]>(cacheKey);
      setItems(cached ?? []);
      setMessage(error.message);
    } else {
      setOffline(false);
      const list = (data ?? []) as Journal[];
      setItems(list);
      await cacheSet(cacheKey, list);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (chantierId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chantierId]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("journaux")
      .insert({ chantier_id: chantierId, date_journal: date, meteo: meteo || null, statut: "brouillon" })
      .select()
      .single();
    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    router.push(`/chantiers/${chantierId}/journaux/${data.id}`);
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8">
      <div className="mb-4">
        <Link href={`/chantiers/${chantierId}`} className="text-sm text-orange-600">
          &lt; Retour chantier
        </Link>
      </div>
      <h1 className="mb-6 text-2xl font-semibold">Journal de chantier</h1>

      {offline && (
        <p className="mb-4 rounded bg-warning/10 p-3 text-sm text-warning">
          Mode hors connexion : journaux lus depuis le cache local (lecture seule).
        </p>
      )}

      <section className="mb-8 card p-4">
        <h2 className="mb-3 text-lg font-medium">Nouveau journal</h2>
        <form onSubmit={handleCreate} className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <input className="rounded border p-2" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          <input className="rounded border p-2" placeholder="Meteo" value={meteo} onChange={(e) => setMeteo(e.target.value)} />
          <button type="submit" disabled={loading} className="rounded bg-orange-600 px-4 py-2 text-white disabled:opacity-50">
            {loading ? "Creation..." : "Creer le journal"}
          </button>
        </form>
        {message && <p className="mt-3 text-sm text-zinc-600">{message}</p>}
      </section>

      <section className="card p-4">
        <h2 className="mb-3 text-lg font-medium">Journaux existants</h2>
        <ul className="space-y-2">
          {items.map((j) => (
            <li key={j.id} className="flex items-center justify-between rounded border p-3">
              <div>
                <p className="font-medium">{new Date(j.date_journal).toLocaleDateString("fr-FR")}</p>
                <p className="text-sm text-zinc-600">
                  {j.meteo ?? "Meteo non renseignee"} - Statut : {j.statut}
                </p>
              </div>
              <Link href={`/chantiers/${chantierId}/journaux/${j.id}`} className="text-orange-600">
                Ouvrir
              </Link>
            </li>
          ))}
          {items.length === 0 && <li className="text-sm text-zinc-600">Aucun journal pour le moment.</li>}
        </ul>
      </section>
    </main>
  );
}