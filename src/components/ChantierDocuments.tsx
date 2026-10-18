"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

type Row = {
  id: string;
  chantier_id: string;
  nom: string;
  type: "plan" | "marche" | "ordre_service" | "pv" | "autre";
  chemin: string;
  uploaded_by: string | null;
  created_at: string;
};

export default function ChantierDocuments({
  chantierId,
  initialItems,
}: {
  chantierId: string;
  initialItems: Row[];
}) {
  const [items, setItems] = useState<Row[]>(initialItems);
  const [nom, setNom] = useState("");
  const [type, setType] = useState<Row["type"]>("autre");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setMessage("Veuillez choisir un fichier.");
      return;
    }
    setLoading(true);
    setMessage(null);
    const supabase = createClient();
    const path = `${chantierId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("chantiers-documents")
      .upload(path, file, { upsert: false });

    if (uploadError) {
      setLoading(false);
      setMessage(`Erreur de televersement : ${uploadError.message}`);
      return;
    }

    const { data, error } = await supabase
      .from("documents_chantier")
      .insert({ chantier_id: chantierId, nom: nom || file.name, type, chemin: path })
      .select()
      .single();

    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setItems((prev) => [...prev, data as Row]);
    setNom("");
    setFile(null);
    setMessage("Document ajoute.");
  }

  async function handleRemove(item: Row) {
    const supabase = createClient();
    await supabase.storage.from("chantiers-documents").remove([item.chemin]);
    const { error } = await supabase
      .from("documents_chantier")
      .delete()
      .eq("id", item.id);
    if (error) {
      setMessage(error.message);
      return;
    }
    setItems((prev) => prev.filter((d) => d.id !== item.id));
  }

  return (
    <section className="mb-8 card p-4">
      <h2 className="mb-3 text-lg font-medium">Documents du chantier</h2>
      <form onSubmit={handleUpload} className="mb-4 space-y-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <input className="rounded border p-2" placeholder="Nom du document" value={nom} onChange={(e) => setNom(e.target.value)} />
          <select className="rounded border p-2" value={type} onChange={(e) => setType(e.target.value as Row["type"])}>
            <option value="plan">Plan</option>
            <option value="marche">Marche</option>
            <option value="ordre_service">Ordre de service</option>
            <option value="pv">PV</option>
            <option value="autre">Autre</option>
          </select>
          <input type="file" className="rounded border p-2" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </div>
        <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
          {loading ? "Televersement..." : "Televerser"}
        </button>
      </form>
      {message && <p className="mb-3 text-sm text-zinc-600">{message}</p>}
      <ul className="space-y-2">
        {items.map((d) => (
          <li key={d.id} className="flex items-center justify-between rounded border p-2 text-sm">
            <span>
              {d.nom} ({d.type}) - {d.chemin}
            </span>
            <button type="button" className="text-red-600" onClick={() => handleRemove(d)}>
              Supprimer
            </button>
          </li>
        ))}
        {items.length === 0 && <li className="text-sm text-zinc-600">Aucun document.</li>}
      </ul>
    </section>
  );
}