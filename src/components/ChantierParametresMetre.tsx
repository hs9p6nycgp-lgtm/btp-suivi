"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

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
    setMessage("Paramètres enregistrés.");
  }

  return (
    <Card className="mb-8">
      <h2 className="mb-4 flex items-center gap-2.5 text-lg font-bold text-foreground">
        <span className="h-5 w-1.5 rounded-full bg-gradient-to-b from-action to-action-strong" aria-hidden />
        Paramètres de calcul (mètre)
      </h2>
      <form onSubmit={handleSave} className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Coeff. foisonnement</label>
          <input className="w-full rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10" type="number" step="0.01" value={foisonnement} onChange={(e) => setFoisonnement(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Coeff. compactage</label>
          <input className="w-full rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10" type="number" step="0.01" value={compactage} onChange={(e) => setCompactage(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Coeff. pertes</label>
          <input className="w-full rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10" type="number" step="0.01" value={pertes} onChange={(e) => setPertes(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Capacité benne (m³)</label>
          <input className="w-full rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10" type="number" step="0.01" value={capacite} onChange={(e) => setCapacite(e.target.value)} />
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </form>
      {message && <p className="mt-3 text-sm text-muted">{message}</p>}
    </Card>
  );
}