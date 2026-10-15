"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

export default function ChantierParametresMetre({
  chantierId,
}: {
  chantierId: string;
}) {
  const [foisonnement, setFoisonnement] = useState("1.2");
  const [compactage, setCompactage] = useState("1");
  const [pertes, setPertes] = useState("1");
  const [capacite, setCapacite] = useState("15");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("parametres_metre")
        .select("*")
        .eq("chantier_id", chantierId)
        .maybeSingle();
      if (data) {
        setFoisonnement(String(data.coefficient_foisonnement));
        setCompactage(String(data.coefficient_compactage));
        setPertes(String(data.coefficient_pertes));
        setCapacite(String(data.capacite_benne_m3));
      }
    }
    load();
  }, [chantierId]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const supabase = createClient();
    const { error } = await supabase.from("parametres_metre").upsert({
      chantier_id: chantierId,
      coefficient_foisonnement: Number(foisonnement),
      coefficient_compactage: Number(compactage),
      coefficient_pertes: Number(pertes),
      capacite_benne_m3: Number(capacite),
    });
    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage("Parametres enregistres.");
  }

  return (
    <section className="mb-8 card p-4">
      <h2 className="mb-3 text-lg font-medium">Parametres de calcul (metre)</h2>
      <form onSubmit={handleSave} className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <div>
          <label className="block text-sm font-medium">Coeff. foisonnement</label>
          <input className="w-full rounded border p-2" type="number" step="0.01" value={foisonnement} onChange={(e) => setFoisonnement(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium">Coeff. compactage</label>
          <input className="w-full rounded border p-2" type="number" step="0.01" value={compactage} onChange={(e) => setCompactage(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium">Coeff. pertes</label>
          <input className="w-full rounded border p-2" type="number" step="0.01" value={pertes} onChange={(e) => setPertes(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium">Capacite benne (m3)</label>
          <input className="w-full rounded border p-2" type="number" step="0.01" value={capacite} onChange={(e) => setCapacite(e.target.value)} />
        </div>
        <button type="submit" disabled={loading} className="rounded bg-orange-600 px-4 py-2 text-white disabled:opacity-50">
          {loading ? "Enregistrement..." : "Enregistrer"}
        </button>
      </form>
      {message && <p className="mt-3 text-sm text-zinc-600">{message}</p>}
    </section>
  );
}