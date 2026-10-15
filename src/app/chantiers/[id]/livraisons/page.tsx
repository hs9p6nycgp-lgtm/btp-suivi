"use client";

import { createClient } from "@/lib/supabase/client";
import { cacheGet, cacheSet } from "@/lib/offline/storage";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type Livraison = {
  id: string;
  chantier_id: string;
  materiau: string;
  fournisseur: string | null;
  quantite: number;
  numero_bon: string | null;
  camion: string | null;
  photo_bon: string | null;
  date_livraison: string;
};

export default function LivraisonsPage() {
  const params = useParams();
  const chantierId = String(params?.id ?? "");

  const [items, setItems] = useState<Livraison[]>([]);
  const [materiau, setMateriau] = useState("");
  const [fournisseur, setFournisseur] = useState("");
  const [quantite, setQuantite] = useState("");
  const [numeroBon, setNumeroBon] = useState("");
  const [camion, setCamion] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);

  async function load() {
    const cacheKey = `livraisons_${chantierId}`;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setOffline(true);
      const cached = await cacheGet<Livraison[]>(cacheKey);
      setItems(cached ?? []);
      return;
    }
    const supabase = createClient();
    const { data, error } = await supabase
      .from("livraisons")
      .select("*")
      .eq("chantier_id", chantierId)
      .order("date_livraison", { ascending: false });
    if (error) {
      setOffline(true);
      const cached = await cacheGet<Livraison[]>(cacheKey);
      setItems(cached ?? []);
      setMessage(error.message);
    } else {
      setOffline(false);
      const list = (data ?? []) as Livraison[];
      setItems(list);
      await cacheSet(cacheKey, list);
    }
  }

  useEffect(() => {
    if (chantierId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chantierId]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const supabase = createClient();
    let photoPath: string | null = null;
    if (file) {
      photoPath = `livraisons/${chantierId}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage
        .from("chantiers-documents")
        .upload(photoPath, file);
      if (upErr) {
        setLoading(false);
        setMessage(`Televersement : ${upErr.message}`);
        return;
      }
    }

    const { error } = await supabase.from("livraisons").insert({
      chantier_id: chantierId,
      materiau,
      fournisseur: fournisseur || null,
      quantite: Number(quantite) || 0,
      numero_bon: numeroBon || null,
      camion: camion || null,
      photo_bon: photoPath,
      date_livraison: date,
    });

    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setMateriau("");
    setFournisseur("");
    setQuantite("");
    setNumeroBon("");
    setCamion("");
    setFile(null);
    setMessage("Livraison enregistree.");
    load();
  }

  async function handleRemove(id: string, photoPath: string | null) {
    const supabase = createClient();
    if (photoPath) await supabase.storage.from("chantiers-documents").remove([photoPath]);
    const { error } = await supabase.from("livraisons").delete().eq("id", id);
    if (error) {
      setMessage(error.message);
      return;
    }
    load();
  }

  // Recap par materiau
  const recap = items.reduce<Record<string, number>>((acc, it) => {
    acc[it.materiau] = (acc[it.materiau] ?? 0) + Number(it.quantite);
    return acc;
  }, {});

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="mb-4">
        <Link href={`/chantiers/${chantierId}`} className="text-sm text-orange-600">
          &lt; Retour chantier
        </Link>
      </div>
      <h1 className="mb-6 text-2xl font-semibold">Approvisionnements et livraisons</h1>

      {offline && (
        <p className="mb-4 rounded bg-warning/10 p-3 text-sm text-warning">
          Mode hors connexion : livraisons lues depuis le cache local (lecture seule).
        </p>
      )}

      <section className="mb-8 card p-4">
        <h2 className="mb-3 text-lg font-medium">Nouvelle livraison</h2>
        <form onSubmit={handleAdd} className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <input className="rounded border p-2" placeholder="Materiau *" value={materiau} onChange={(e) => setMateriau(e.target.value)} required />
          <input className="rounded border p-2" placeholder="Fournisseur" value={fournisseur} onChange={(e) => setFournisseur(e.target.value)} />
          <input className="rounded border p-2" type="number" step="0.01" placeholder="Quantite *" value={quantite} onChange={(e) => setQuantite(e.target.value)} required />
          <input className="rounded border p-2" placeholder="N° de bon" value={numeroBon} onChange={(e) => setNumeroBon(e.target.value)} />
          <input className="rounded border p-2" placeholder="Camion" value={camion} onChange={(e) => setCamion(e.target.value)} />
          <input className="rounded border p-2" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <input type="file" accept="image/*,.pdf" className="rounded border p-2" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <button type="submit" disabled={loading} className="rounded bg-orange-600 px-4 py-2 text-white disabled:opacity-50">
            {loading ? "Enregistrement..." : "Enregistrer"}
          </button>
        </form>
        {message && <p className="mt-3 text-sm text-zinc-600">{message}</p>}
      </section>

      <section className="mb-8 card p-4">
        <h2 className="mb-3 text-lg font-medium text-primary">Quantites livrees par materiau</h2>
        {Object.keys(recap).length === 0 ? (
          <p className="text-sm text-slate-600">Aucune livraison.</p>
        ) : (
          <div className="space-y-3">
            {Object.entries(recap).map(([mat, q]) => {
              const max = Math.max(...Object.values(recap), 1);
              const width = Math.round((q / max) * 100);
              return (
                <div key={mat}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{mat}</span>
                    <span className="font-semibold">{q.toFixed(2)}</span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full rounded-full bg-action" style={{ width: `${width}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="card p-4">
        <h2 className="mb-3 text-lg font-medium">Livraisons enregistrees</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="p-2">Date</th>
                <th className="p-2">Materiau</th>
                <th className="p-2">Quantite</th>
                <th className="p-2">Fournisseur</th>
                <th className="p-2">N° bon</th>
                <th className="p-2">Camion</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((l) => (
                <tr key={l.id} className="border-b">
                  <td className="p-2">{new Date(l.date_livraison).toLocaleDateString("fr-FR")}</td>
                  <td className="p-2">{l.materiau}</td>
                  <td className="p-2">{Number(l.quantite).toFixed(2)}</td>
                  <td className="p-2">{l.fournisseur ?? "-"}</td>
                  <td className="p-2">{l.numero_bon ?? "-"}</td>
                  <td className="p-2">{l.camion ?? "-"}</td>
                  <td className="p-2">
                    <button className="text-red-600" onClick={() => handleRemove(l.id, l.photo_bon)}>
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td className="p-2 text-zinc-600" colSpan={7}>
                    Aucune livraison.
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