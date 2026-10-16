"use client";

import { BookOpen, PackageSearch } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";
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
    <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">Bibliothèque de prix (BPU)</h1>
          <p className="text-sm text-muted">
            Gérez vos prix unitaires, matériaux et catégories de référence.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
        >
          <BookOpen className="h-4 w-4" />
          Retour
        </Link>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          title={langue === "fr" ? "Total des postes" : "Total items"}
          value={filtered.length}
          icon={<PackageSearch className="h-5 w-5" />}
          color="blue"
        />
        <StatCard
          title={langue === "fr" ? "Prix valides" : "Valid prices"}
          value={countValide}
          icon={<BookOpen className="h-5 w-5" />}
          color="emerald"
        />
        <StatCard
          title={langue === "fr" ? "Prix total" : "Total price"}
          value={totalPrix.toLocaleString(langue === "fr" ? "fr-FR" : "en-US")}
          subtitle="FCFA"
          icon={<BookOpen className="h-5 w-5" />}
          color="amber"
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div className="lg:col-span-1" />
        <form onSubmit={handleAdd} className="grid grid-cols-1 gap-3 lg:col-span-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
            <input
              className="rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none focus:border-primary dark:bg-slate-800 dark:text-slate-200"
              placeholder="Code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <input
              className="rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none focus:border-primary dark:bg-slate-800 dark:text-slate-200"
              placeholder={langue === "fr" ? "Désignation *" : "Designation *"}
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              required
            />
            <input
              className="rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none focus:border-primary dark:bg-slate-800 dark:text-slate-200"
              placeholder={langue === "fr" ? "Unité *" : "Unit *"}
              value={unite}
              onChange={(e) => setUnite(e.target.value)}
              required
            />
            <input
              className="rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none focus:border-primary dark:bg-slate-800 dark:text-slate-200"
              type="number"
              placeholder={langue === "fr" ? "Prix (FCFA)" : "Price (FCFA)"}
              value={prix}
              onChange={(e) => setPrix(e.target.value)}
            />
            <input
              className="rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none focus:border-primary dark:bg-slate-800 dark:text-slate-200"
              placeholder={langue === "fr" ? "Source" : "Source"}
              value={source}
              onChange={(e) => setSource(e.target.value)}
            />
            <Button type="submit" disabled={loading}>
              {loading ? (langue === "fr" ? "Ajout..." : "Adding...") : (langue === "fr" ? "Ajouter" : "Add")}
            </Button>
          </div>
        </form>
        {message && (
          <p className="mt-3 rounded-xl border border-primary/30 bg-primary/10 p-3 text-sm text-foreground">{message}</p>
        )}
      </div>

      <section>
        <h2 className="mb-4 text-lg font-bold text-foreground">
          {filtered.length} {langue === "fr" ? "postes" : "items"}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="p-3 font-semibold text-muted">Code</th>
                <th className="p-3 font-semibold text-muted">Désignation</th>
                <th className="p-3 font-semibold text-muted text-center">Unité</th>
                <th className="p-3 font-semibold text-muted text-right">Prix (FCFA)</th>
                <th className="p-3 font-semibold text-muted">Statut</th>
                <th className="p-3 font-semibold text-muted text-right">Source</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="p-3 text-muted">{p.code ?? "-"}</td>
                  <td className="p-3 font-medium text-foreground">{p.designation}</td>
                  <td className="p-3 text-center text-muted">{p.unite}</td>
                  <td className="p-3 text-right font-mono text-foreground">
                    {p.prix_unitaire.toLocaleString(langue === "fr" ? "fr-FR" : "en-US")}
                  </td>
                  <td className="p-3">
                    <Badge variant={p.statut === "valide" ? "success" : "warning"}>
                      {langue === "fr" ? STATUT_LABELS[p.statut].fr : STATUT_LABELS[p.statut].en}
                    </Badge>
                  </td>
                  <td className="p-3 text-right text-muted">{p.source ?? "-"}</td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => handleRemove(p.id)}
                      className="text-danger text-xs font-medium hover:underline"
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-muted">
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
