"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import BasePrixImport from "@/components/BasePrixImport";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { getLangue } from "@/lib/i18n";

type Row = {
  id: string;
  code: string | null;
  designation: string;
  unite: string;
  prix_unitaire: number;
  source: string | null;
  statut: "valide" | "a_verifier";
};

const STATUT_LABELS: Record<string, { fr: string; en: string }> = {
  valide: { fr: "Valide", en: "Valid" },
  a_verifier: { fr: "À vérifier", en: "To Verify" },
};

export default function BpuPage() {
  const langue = getLangue();
  const [items, setItems] = useState<Row[]>([]);
  const [code, setCode] = useState("");
  const [designation, setDesignation] = useState("");
  const [unite, setUnite] = useState("");
  const [prix, setPrix] = useState("");
  const [source, setSource] = useState("");
  const [search, setSearch] = useState("");
  const [filterStatut, setFilterStatut] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("bpu_postes")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) setMessage(error.message);
    else setItems((data ?? []) as Row[]);
  }

  useEffect(() => {
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
    setMessage(langue === "fr" ? "Poste BPU ajouté." : "BPU item added.");
  }

  async function handleRemove(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from("bpu_postes").delete().eq("id", id);
    if (error) {
      setMessage(error.message);
      return;
    }
    setItems((prev) => prev.filter((m) => m.id !== id));
  }

  const filtered = items.filter((p) => {
    const q = search.trim().toLowerCase();
    if (q && !p.designation.toLowerCase().includes(q) && !(p.code ?? "").toLowerCase().includes(q)) return false;
    if (filterStatut && p.statut !== filterStatut) return false;
    return true;
  });

  const totalPrix = filtered.reduce((s, p) => s + p.prix_unitaire, 0);
  const countValide = filtered.filter((p) => p.statut === "valide").length;

  return (
    <main className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bibliothèque de prix (BPU)</h1>
          <p className="text-sm text-slate-500">
            Gérez vos prix unitaires, matériaux et catégories de référence.
          </p>
        </div>
        <LinkBack />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCardMini title={langue === "fr" ? "Total items" : "Total items"} value={filtered.length} icon="📦" color="blue" />
        <StatCardMini title={langue === "fr" ? "Prix valides" : "Valid prices"} value={countValide} icon="✅" color="emerald" />
        <StatCardMini title={langue === "fr" ? "Prix total" : "Total price"} value={totalPrix.toLocaleString(langue === "fr" ? "fr-FR" : "en-US")} subtitle="FCFA" icon="💶" color="amber" />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <input
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
          placeholder={langue === "fr" ? "Rechercher..." : "Search..."}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all" value={filterStatut} onChange={(e) => setFilterStatut(e.target.value)}>
          <option value="">{langue === "fr" ? "Tous statuts" : "All statuses"}</option>
          <option value="valide">{langue === "fr" ? "Valide" : "Valid"}</option>
          <option value="a_verifier">{langue === "fr" ? "À vérifier" : "To verify"}</option>
        </select>
        <BasePrixImport onImported={load} />
      </div>

      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
        <form onSubmit={handleAdd} className="grid grid-cols-1 gap-3 md:grid-cols-6">
          <input
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
            placeholder="Code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <input
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
            placeholder={langue === "fr" ? "Désignation *" : "Designation *"}
            value={designation}
            onChange={(e) => setDesignation(e.target.value)}
            required
          />
          <input
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
            placeholder={langue === "fr" ? "Unité *" : "Unit *"}
            value={unite}
            onChange={(e) => setUnite(e.target.value)}
            required
          />
          <input
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
            type="number"
            placeholder={langue === "fr" ? "Prix (FCFA)" : "Price (FCFA)"}
            value={prix}
            onChange={(e) => setPrix(e.target.value)}
          />
          <input
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
            placeholder={langue === "fr" ? "Source" : "Source"}
            value={source}
            onChange={(e) => setSource(e.target.value)}
          />
          <button type="submit" disabled={loading} className="rounded-xl bg-orange-600 px-4 py-2.5 text-white font-semibold hover:bg-orange-700 disabled:opacity-50 transition-all shadow-sm hover:shadow-md">
            {loading ? (langue === "fr" ? "Ajout..." : "Adding...") : (langue === "fr" ? "Ajouter" : "Add")}
          </button>
        </form>
        {message && (
          <div className="mt-3 rounded-lg bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700">
            {message}
          </div>
        )}
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-slate-900">{filtered.length} {langue === "fr" ? "postes" : "items"}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left">
                <th className="p-3 font-semibold text-slate-500">Code</th>
                <th className="p-3 font-semibold text-slate-500">Designation</th>
                <th className="p-3 font-semibold text-slate-500 text-center">Unité</th>
                <th className="p-3 font-semibold text-slate-500 text-right">Prix (FCFA)</th>
                <th className="p-3 font-semibold text-slate-500">Statut</th>
                <th className="p-3 font-semibold text-slate-500 text-right">Source</th>
                <th className="p-3 font-semibold text-slate-500"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="p-3 text-sm text-slate-600">{p.code ?? "-"}</td>
                  <td className="p-3 text-sm font-medium text-slate-900">{p.designation}</td>
                  <td className="p-3 text-sm text-slate-600 text-center">{p.unite}</td>
                  <td className="p-3 text-sm text-right font-medium text-slate-900">{p.prix_unitaire.toLocaleString(langue === "fr" ? "fr-FR" : "en-US")}</td>
                  <td className="p-3 text-sm">
                    <Badge variant={p.statut === "valide" ? "success" : "warning"}>
                      {langue === "fr" ? STATUT_LABELS[p.statut].fr : STATUT_LABELS[p.statut].en}
                    </Badge>
                  </td>
                  <td className="p-3 text-sm text-slate-600 text-right">{p.source ?? "-"}</td>
                  <td className="p-3 text-right">
                    <button onClick={() => handleRemove(p.id)} className="text-rose-600 text-xs hover:underline font-medium">
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td className="p-6 text-center text-slate-500" colSpan={7}>
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

function LinkBack() {
  const langue = getLangue();
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-2 text-sm text-orange-600 font-semibold hover:underline transition-colors"
    >
      <span>←</span>
      {langue === "fr" ? "Retour tableau de bord" : "Back to dashboard"}
    </Link>
  );
}

function StatCardMini({ title, value, subtitle, icon, color }: { title: string; value: string | number; subtitle?: string; icon: string; color: string }) {
  const colorMap: Record<string, { bg: string; text: string }> = {
    blue: { bg: "bg-blue-50", text: "text-blue-600" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-600" },
    amber: { bg: "bg-amber-50", text: "text-amber-600" },
  };
  const c = colorMap[color] || colorMap.blue;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm border-b-2 border-transparent">
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${c.bg} ${c.text}`}>{icon}</div>
      </div>
      <p className="text-lg font-bold text-slate-900">{value}</p>
      {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
    </div>
  );
}