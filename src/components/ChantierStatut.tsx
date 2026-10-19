"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { Card } from "@/components/ui/Card";

const STATUTS = [
  { value: "en_preparation", label: "En préparation" },
  { value: "en_cours", label: "En cours" },
  { value: "suspendu", label: "Suspendu" },
  { value: "receptionne_provisoirement", label: "Réceptionné prov." },
  { value: "cloture", label: "Clôturé" },
];

export default function ChantierStatut({
  chantierId,
  statutInitial,
}: {
  chantierId: string;
  statutInitial: string;
}) {
  const [statut, setStatut] = useState(statutInitial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleChange(next: string) {
    setSaving(true);
    setMessage(null);
    setStatut(next);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("chantiers")
      .update({ statut: next })
      .eq("id", chantierId)
      .eq("proprietaire_id", user?.id ?? "");
    setSaving(false);
    if (error) {
      setMessage(error.message);
      setStatut(statutInitial);
      return;
    }
    setMessage("Statut mis à jour.");
  }

  return (
    <Card className="mb-8">
      <h2 className="mb-4 flex items-center gap-2.5 text-lg font-bold text-foreground">
        <span className="h-5 w-1.5 rounded-full bg-gradient-to-b from-action to-action-strong" aria-hidden />
        Statut du chantier
      </h2>
      <div className="flex flex-wrap items-center gap-3">
        <select
          className="rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10"
          value={statut}
          onChange={(e) => handleChange(e.target.value)}
          disabled={saving}
        >
          {STATUTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        {saving && <p className="text-sm text-muted">Enregistrement...</p>}
        {message && <p className="text-sm text-muted">{message}</p>}
      </div>
    </Card>
  );
}