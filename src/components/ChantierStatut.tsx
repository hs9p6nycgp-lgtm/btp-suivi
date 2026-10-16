"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

const STATUTS = [
  { value: "en_preparation", label: "En preparation" },
  { value: "en_cours", label: "En cours" },
  { value: "suspendu", label: "Suspendu" },
  { value: "receptionne_provisoirement", label: "Receptionne provisoirement" },
  { value: "cloture", label: "Cloture" },
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
    setMessage("Statut mis a jour.");
  }

  return (
    <section className="mb-8 card p-4">
      <h2 className="mb-3 text-lg font-medium">Statut du chantier</h2>
      <div className="flex flex-wrap items-center gap-3">
        <select
          className="rounded border p-2"
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
        {saving && <p className="text-sm text-zinc-600">Enregistrement...</p>}
        {message && <p className="text-sm text-zinc-600">{message}</p>}
      </div>
    </section>
  );
}