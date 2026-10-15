"use client";

import { createClient } from "@/lib/supabase/client";
import { cacheGet, cacheSet } from "@/lib/offline/storage";
import BasePrixImport from "@/components/BasePrixImport";
import { useEffect, useState } from "react";

type Row = {
  id: string;
  code: string | null;
  designation: string;
  unite: string;
  prix_unitaire: number;
  source: string | null;
  statut: "valide" | "a_verifier";
};

export default function BpuPage() {
  const [items, setItems] = useState<Row[]>([]);
  const [code, setCode] = useState("");
  const [designation, setDesignation] = useState("");
  const [unite, setUnite] = useState("");
  const [prix, setPrix] = useState("");
  const [source, setSource] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);

  async function load() {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setOffline(true);
      const cached = await cacheGet<Row[]>("bpu");
      setItems(cached ?? []);
      return;
    }
    const supabase = createClient();
    const { data, error } = await supabase
      .from("bpu_postes")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      setOffline(true);
      const cached = await cacheGet<Row[]>("bpu");
      setItems(cached ?? []);
      setMessage(error.message);
    } else {
      setOffline(false);
      const list = (data ?? []) as Row[];
      setItems(list);
      await cacheSet("bpu", list);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("bpu_postes")
      .insert({
        code: code || null,
        designation,
        unite,
        prix_unitaire: Number(prix) || 0,
        source: source || null,
        statut: source ? "valide" : "a_verifier",
      })
      .select()
      .single();
    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setItems((prev) => [data as Row, ...prev]);
    setCode("");
    setDesignation("");
    setUnite("");
    setPrix("");
    setSource("");
    setMessage("Poste BPU ajoute.");
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">Bibliotheque de prix (BPU)</h1>

      {offline && (
        <p className="mb-4 rounded bg-warning/10 p-3 text-sm text-warning">
          Mode hors connexion : BPU lu depuis le cache local (lecture seule).
        </p>
      )}

      <div className="mb-8">
        <BasePrixImport onImported={load} />
      </div>

      <section className="mb-8 card p-4">
        <h2 className="mb-3 text-lg font-medium">Ajouter un poste</h2>
        <form onSubmit={handleAdd} className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <input className="rounded border p-2" placeholder="Code" value={code} onChange={(e) => setCode(e.target.value)} />
          <input className="rounded border p-2" placeholder="Designation *" value={designation} onChange={(e) => setDesignation(e.target.value)} required />
          <input className="rounded border p-2" placeholder="Unite *" value={unite} onChange={(e) => setUnite(e.target.value)} required />
          <input className="rounded border p-2" placeholder="Prix unitaire (FCFA)" type="number" value={prix} onChange={(e) => setPrix(e.target.value)} />
          <input className="rounded border p-2" placeholder="Source" value={source} onChange={(e) => setSource(e.target.value)} />
          <button type="submit" disabled={loading} className="rounded bg-orange-600 px-4 py-2 text-white disabled:opacity-50">
            {loading ? "Ajout..." : "Ajouter"}
          </button>
        </form>
        {message && <p className="mt-3 text-sm text-zinc-600">{message}</p>}
        <p className="mt-2 text-xs text-zinc-500">
          Tout prix doit avoir une source et une date pour etre considere valide.
        </p>
      </section>

      <section className="card p-4">
        <h2 className="mb-3 text-lg font-medium">Postes enregistrés</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="p-2">Code</th>
                <th className="p-2">Designation</th>
                <th className="p-2">Unite</th>
                <th className="p-2">Prix unit. (FCFA)</th>
                <th className="p-2">Statut</th>
                <th className="p-2">Source</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className="border-b">
                  <td className="p-2">{p.code ?? "-"}</td>
                  <td className="p-2">{p.designation}</td>
                  <td className="p-2">{p.unite}</td>
                  <td className="p-2">{Number(p.prix_unitaire).toLocaleString("fr-FR")}</td>
                  <td className="p-2">{p.statut}</td>
                  <td className="p-2">{p.source ?? "-"}</td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td className="p-2 text-zinc-600" colSpan={6}>
                    Aucun poste BPU pour le moment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}