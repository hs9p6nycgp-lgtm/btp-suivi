"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

type Row = {
  id: string;
  chantier_id: string;
  nom: string;
  pk_debut: number | null;
  pk_fin: number | null;
  niveau: string | null;
  lot: string | null;
  type_ouvrage: string | null;
};

export default function ChantierSections({
  chantierId,
  initialItems,
}: {
  chantierId: string;
  initialItems: Row[];
}) {
  const [items, setItems] = useState<Row[]>(initialItems);
  const [nom, setNom] = useState("");
  const [pkDebut, setPkDebut] = useState("");
  const [pkFin, setPkFin] = useState("");
  const [niveau, setNiveau] = useState("");
  const [lot, setLot] = useState("");
  const [typeOuvrage, setTypeOuvrage] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("sections_chantier")
      .insert({
        chantier_id: chantierId,
        nom,
        pk_debut: pkDebut ? Number(pkDebut) : null,
        pk_fin: pkFin ? Number(pkFin) : null,
        niveau: niveau || null,
        lot: lot || null,
        type_ouvrage: typeOuvrage || null,
      })
      .select()
      .single();
    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setItems((prev) => [...prev, data as Row]);
    setNom("");
    setPkDebut("");
    setPkFin("");
    setNiveau("");
    setLot("");
    setTypeOuvrage("");
    setMessage("Section ajoutee.");
  }

  async function handleRemove(id: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from("sections_chantier")
      .delete()
      .eq("id", id);
    if (error) {
      setMessage(error.message);
      return;
    }
    setItems((prev) => prev.filter((s) => s.id !== id));
  }

  return (
    <section className="mb-8 card p-4">
      <h2 className="mb-3 text-lg font-medium">Sections, PK, niveaux et lots</h2>
      <form onSubmit={handleAdd} className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <input className="rounded border p-2" placeholder="Nom *" value={nom} onChange={(e) => setNom(e.target.value)} required />
        <input className="rounded border p-2" placeholder="PK debut" value={pkDebut} onChange={(e) => setPkDebut(e.target.value)} />
        <input className="rounded border p-2" placeholder="PK fin" value={pkFin} onChange={(e) => setPkFin(e.target.value)} />
        <input className="rounded border p-2" placeholder="Niveau" value={niveau} onChange={(e) => setNiveau(e.target.value)} />
        <input className="rounded border p-2" placeholder="Lot" value={lot} onChange={(e) => setLot(e.target.value)} />
        <input className="rounded border p-2" placeholder="Type d'ouvrage" value={typeOuvrage} onChange={(e) => setTypeOuvrage(e.target.value)} />
        <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
          {loading ? "Ajout..." : "Ajouter"}
        </button>
      </form>
      {message && <p className="mb-3 text-sm text-zinc-600">{message}</p>}
      <ul className="space-y-2">
        {items.map((s) => (
          <li key={s.id} className="flex items-center justify-between rounded border p-2 text-sm">
            <span>
              {s.nom}
              {s.pk_debut !== null && s.pk_fin !== null ? ` - PK ${s.pk_debut} a ${s.pk_fin}` : ""}
              {s.niveau ? ` - niveau ${s.niveau}` : ""}
              {s.lot ? ` - lot ${s.lot}` : ""}
              {s.type_ouvrage ? ` - ${s.type_ouvrage}` : ""}
            </span>
            <button type="button" className="text-red-600" onClick={() => handleRemove(s.id)}>
              Supprimer
            </button>
          </li>
        ))}
        {items.length === 0 && <li className="text-sm text-zinc-600">Aucune section.</li>}
      </ul>
    </section>
  );
}