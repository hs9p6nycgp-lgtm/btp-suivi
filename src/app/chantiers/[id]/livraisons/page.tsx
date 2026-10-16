"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { getLangue } from "@/lib/i18n";

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
  const langue = getLangue();

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

  useEffect(() => {
    if (chantierId) load();
  }, [chantierId]);

  async function load() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("livraisons")
      .select("*")
      .eq("chantier_id", chantierId)
      .order("date_livraison", { ascending: false });
    if (error) return;
    setItems((data ?? []) as Livraison[]);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const supabase = createClient();
    let photoPath: string | null = null;
    if (file) {
      photoPath = `livraisons/${chantierId}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("chantiers-documents").upload(photoPath, file);
      if (upErr) {
        setLoading(false);
        setMessage(upErr.message);
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
    setMessage(langue === "fr" ? "Livraison enregistrée." : "Delivery recorded.");
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

  const recap = items.reduce<Record<string, number>>((acc, it) => {
    acc[it.materiau] = (acc[it.materiau] ?? 0) + Number(it.quantite);
    return acc;
  }, {});

  return (
    <main className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-6">
      <div className="mb-6 flex items-start justify-between">
        <Link href={`/chantiers/${chantierId}`} className="text-sm text-orange-600 hover:underline">
          ← Retour chantier
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Approvisionnements et livraisons</h1>
      </div>

      <Card variant="elevated" padding="lg">
        <h2 className="mb-4 text-lg font-bold text-slate-900">Nouvelle livraison</h2>
        <form onSubmit={handleAdd} className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Matériau *</label>
            <input className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none" value={materiau} onChange={(e) => setMateriau(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Fournisseur</label>
            <input className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none" value={fournisseur} onChange={(e) => setFournisseur(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Quantité *</label>
            <input className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none" type="number" step="0.01" value={quantite} onChange={(e) => setQuantite(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">N° de bon</label>
            <input className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none" value={numeroBon} onChange={(e) => setNumeroBon(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Camion</label>
            <input className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none" value={camion} onChange={(e) => setCamion(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
            <input className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Photo du bon</label>
            <input type="file" accept="image/*,.pdf" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
          <button type="submit" disabled={loading} className="rounded-xl bg-orange-600 px-4 py-3 text-white font-semibold hover:bg-orange-700 disabled:opacity-50 transition-all shadow-sm hover:shadow-md">
            {loading ? "Enregistrement..." : "Enregistrer"}
          </button>
        </form>
        {message && (
          <div className="mt-3 rounded-lg bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700">
            {message}
          </div>
        )}
      </Card>

      <section className="mt-8">
        <h2 className="mb-4 text-lg font-bold text-slate-900">Récapitulatif par matériau</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          {Object.entries(recap).map(([mat, q]) => (
            <div key={mat} className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{mat}</p>
              <div className="flex items-end gap-1 mt-1">
                <span className="text-2xl font-bold text-slate-900">{q.toFixed(2)}</span>
                <span className="text-sm text-slate-500">u</span>
              </div>
            </div>
          ))}
          {Object.keys(recap).length === 0 && (
            <div className="rounded-xl border-2 border-dashed border-slate-300 p-10 text-center bg-slate-50">
              <p className="text-sm text-slate-500">Aucune livraison.</p>
            </div>
          )}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="mb-4 text-lg font-bold text-slate-900">Livraisons enregistrées</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left">
                <th className="p-3 font-semibold text-slate-500">Date</th>
                <th className="p-3 font-semibold text-slate-500">Matériau</th>
                <th className="p-3 font-semibold text-slate-500 text-center">Quantité</th>
                <th className="p-3 font-semibold text-slate-500">Fournisseur</th>
                <th className="p-3 font-semibold text-slate-500 text-right">N° bon</th>
                <th className="p-3 font-semibold text-slate-500 text-right">Camion</th>
                <th className="p-3 font-semibold text-slate-500"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((l) => (
                <tr key={l.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="p-3 text-sm text-slate-600">{new Date(l.date_livraison).toLocaleDateString(langue === "fr" ? "fr-FR" : "en-US")}</td>
                  <td className="p-3 text-sm text-slate-900">{l.materiau}</td>
                  <td className="p-3 text-sm text-right text-slate-600">{Number(l.quantite).toFixed(2)}</td>
                  <td className="p-3 text-sm text-slate-600">{l.fournisseur ?? "-"}</td>
                  <td className="p-3 text-sm text-right text-slate-600">{l.numero_bon ?? "-"}</td>
                  <td className="p-3 text-sm text-right text-slate-600">{l.camion ?? "-"}</td>
                  <td className="p-3 text-right">
                    <button onClick={() => handleRemove(l.id, l.photo_bon)} className="text-rose-600 text-xs hover:underline font-medium">
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td className="p-6 text-center text-slate-500" colSpan={7}>
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