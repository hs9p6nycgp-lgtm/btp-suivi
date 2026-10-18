"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

type Row = {
  id: string;
  chantier_id: string;
  nom: string;
  fonction: string | null;
  telephone: string | null;
  email: string | null;
};

export default function ChantierIntervenants({
  chantierId,
  initialItems,
}: {
  chantierId: string;
  initialItems: Row[];
}) {
  const [items, setItems] = useState<Row[]>(initialItems);
  const [nom, setNom] = useState("");
  const [fonction, setFonction] = useState("");
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("intervenants_chantier")
      .insert({ chantier_id: chantierId, nom, fonction: fonction || null, telephone: telephone || null, email: email || null })
      .select()
      .single();
    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setItems((prev) => [...prev, data as Row]);
    setNom("");
    setFonction("");
    setTelephone("");
    setEmail("");
    setMessage("Intervenant ajoute.");
  }

  async function handleRemove(id: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from("intervenants_chantier")
      .delete()
      .eq("id", id);
    if (error) {
      setMessage(error.message);
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  return (
    <section className="mb-8 card p-4">
      <h2 className="mb-3 text-lg font-medium">Intervenants du chantier</h2>
      <form onSubmit={handleAdd} className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
        <input className="rounded border p-2" placeholder="Nom" value={nom} onChange={(e) => setNom(e.target.value)} required />
        <input className="rounded border p-2" placeholder="Fonction" value={fonction} onChange={(e) => setFonction(e.target.value)} />
        <input className="rounded border p-2" placeholder="Telephone" value={telephone} onChange={(e) => setTelephone(e.target.value)} />
        <input className="rounded border p-2" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
        <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
          {loading ? "Ajout..." : "Ajouter"}
        </button>
      </form>
      {message && <p className="mb-3 text-sm text-zinc-600">{message}</p>}
      <ul className="space-y-2">
        {items.map((i) => (
          <li key={i.id} className="flex items-center justify-between rounded border p-2 text-sm">
            <span>
              {i.nom}
              {i.fonction ? ` - ${i.fonction}` : ""}
              {i.telephone ? ` - ${i.telephone}` : ""}
              {i.email ? ` - ${i.email}` : ""}
            </span>
            <button type="button" className="text-red-600" onClick={() => handleRemove(i.id)}>
              Retirer
            </button>
          </li>
        ))}
        {items.length === 0 && <li className="text-sm text-zinc-600">Aucun intervenant.</li>}
      </ul>
    </section>
  );
}