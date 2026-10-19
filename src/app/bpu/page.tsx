"use client";

import { BookOpen, PackageSearch } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { getLangue, traduireErreur } from "@/lib/i18n";

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
    if (error) setMessage(traduireErreur(error));
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
      setMessage(traduireErreur(error));
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
      setMessage(traduireErreur(error));
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
      <PageHeader
        eyebrow={langue === "fr" ? "Bibliothèque" : "Library"}
        title="Bibliothèque de prix (BPU)"
        description="Gérez vos prix unitaires, matériaux et catégories de référence."
        icon={<BookOpen className="h-5 w-5" />}
        actions={
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-border/80 bg-surface px-3.5 py-2 text-sm font-semibold text-muted shadow-sm transition hover:border-primary-light/50 hover:text-foreground"
          >
            <BookOpen className="h-4 w-4" />
            Retour
          </Link>
        }
      />

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
              className="rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10"
              placeholder="Code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <input
              className="rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10"
              placeholder={langue === "fr" ? "Désignation *" : "Designation *"}
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              required
            />
            <input
              className="rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10"
              placeholder={langue === "fr" ? "Unité *" : "Unit *"}
              value={unite}
              onChange={(e) => setUnite(e.target.value)}
              required
            />
            <input
              className="rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10"
              type="number"
              placeholder={langue === "fr" ? "Prix (FCFA)" : "Price (FCFA)"}
              value={prix}
              onChange={(e) => setPrix(e.target.value)}
            />
            <input
              className="rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10"
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
        <h2 className="mb-4 flex items-center gap-2.5 text-lg font-bold text-foreground">
          <span className="h-5 w-1.5 rounded-full bg-gradient-to-b from-action to-action-strong" aria-hidden />
          {filtered.length} {langue === "fr" ? "postes" : "items"}
        </h2>
        <div className="overflow-x-auto rounded-2xl border border-border/80 bg-surface shadow-soft">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/80 bg-surface-2 text-left">
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted">Code</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted">Désignation</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted">Unité</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted">Prix (FCFA)</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted">Statut</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted">Source</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-border/60 transition last:border-0 hover:bg-surface-2/70">
                  <td className="px-4 py-3 text-muted">{p.code ?? "-"}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{p.designation}</td>
                  <td className="px-4 py-3 text-center text-muted">{p.unite}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-foreground">
                    {p.prix_unitaire.toLocaleString(langue === "fr" ? "fr-FR" : "en-US")}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={p.statut === "valide" ? "success" : "warning"}>
                      {langue === "fr" ? STATUT_LABELS[p.statut].fr : STATUT_LABELS[p.statut].en}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right text-muted">{p.source ?? "-"}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleRemove(p.id)}
                      className="text-xs font-medium text-danger hover:underline"
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted">
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
