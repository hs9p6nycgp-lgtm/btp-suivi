"use client";

import { BookOpen, PackageSearch, RefreshCw, Search, TriangleAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { getLangue, traduireErreur } from "@/lib/i18n";
import {
  entreeHistoriquePour,
  planifierAlignement,
  prixComplet,
  raisonPrixIncomplet,
  statutDuPrix,
  trierParPriorite,
  type LigneBpu,
  type LigneReferentiel,
} from "@/lib/referentiel/alignement";

type Row = {
  id: string;
  code: string | null;
  designation: string;
  unite: string;
  prix_unitaire: number;
  source: string | null;
  date_source: string | null;
  date_validite: string | null;
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
  const [dateSource, setDateSource] = useState("");
  const [search, setSearch] = useState("");
  const [filterStatut, setFilterStatut] = useState("");
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
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
    // REF-04 : la source ET la date de source sont exigees.
    const nouveau: Row = {
      id: "",
      code: code || null,
      designation,
      unite,
      prix_unitaire: Number(prix) || 0,
      source: source || null,
      date_source: dateSource || null,
      date_validite: null,
      statut: statutDuPrix({ source, date_source: dateSource }),
    };
    const { data, error } = await supabase
      .from("bpu_postes")
      .insert({
        code: nouveau.code,
        designation: nouveau.designation,
        unite: nouveau.unite,
        prix_unitaire: nouveau.prix_unitaire,
        source: nouveau.source,
        date_source: nouveau.date_source,
        statut: nouveau.statut,
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
    setDateSource("");
    const incomplet = raisonPrixIncomplet(nouveau);
    setMessage(
      incomplet
        ? langue === "fr"
          ? `Poste ajouté, mais ${incomplet.toLowerCase()} : le prix reste « à vérifier » (exigence REF-04).`
          : `Item added, but ${incomplet.toLowerCase()}: the price stays "to verify" (REF-04).`
        : langue === "fr"
          ? "Poste BPU ajouté (source et date enregistrées)."
          : "BPU item added (source and date recorded).",
    );
  }

  /**
   * Synchronise la base de prix vers le referentiel centralise (REF-01) :
   * les prix sans source ni date ne sont pas repris (REF-04) et les
   * changements de prix sont traces dans l'historique (REF-03).
   */
  async function handleSync() {
    setSyncing(true);
    setMessage(null);
    const supabase = createClient();
    const { data: refData, error: refError } = await supabase.from("referentiel_prix").select("*");
    if (refError) {
      setSyncing(false);
      setMessage(traduireErreur(refError));
      return;
    }
    const plan = planifierAlignement(items as LigneBpu[], (refData ?? []) as LigneReferentiel[]);

    if (plan.aCreer.length > 0) {
      const { error } = await supabase.from("referentiel_prix").insert(
        plan.aCreer.map((l) => ({
          code: l.code,
          designation: l.designation,
          categorie: null,
          unite: l.unite,
          prix_unitaire: l.prix_unitaire,
          source: l.source,
          date_source: l.date_source,
          date_validite: l.date_validite,
          statut: l.statut,
          zone: null,
        })),
      );
      if (error) {
        setSyncing(false);
        setMessage(traduireErreur(error));
        return;
      }
    }

    for (const maj of plan.aMettreAJour) {
      const { error } = await supabase
        .from("referentiel_prix")
        .update({
          designation: maj.ligne.designation,
          unite: maj.ligne.unite,
          prix_unitaire: maj.ligne.prix_unitaire,
          source: maj.ligne.source,
          date_source: maj.ligne.date_source,
          date_validite: maj.ligne.date_validite,
          statut: maj.ligne.statut,
        })
        .eq("id", maj.referentielId);
      if (error) {
        setSyncing(false);
        setMessage(traduireErreur(error));
        return;
      }
      // Historique du prix (REF-03)
      const entree = entreeHistoriquePour(
        maj.referentielId,
        maj.ancienPrix,
        maj.ligne.prix_unitaire,
        null,
        "Mise a jour depuis la base de prix (BPU)",
      );
      if (entree) {
        await supabase.from("historique_prix").insert({
          referentiel_prix_id: entree.referentiel_prix_id,
          ancien_prix: entree.ancien_prix,
          nouveau_prix: entree.nouveau_prix,
          auteur: entree.auteur,
          motif: entree.motif,
        });
      }
    }

    setSyncing(false);
    const resume =
      langue === "fr"
        ? `Référentiel à jour : ${plan.aCreer.length} prix créé(s), ${plan.aMettreAJour.length} mis à jour, ${plan.inchanges} déjà alignés.`
        : `Reference updated: ${plan.aCreer.length} created, ${plan.aMettreAJour.length} updated, ${plan.inchanges} already aligned.`;
    setMessage(
      plan.nonSynchronisables.length > 0
        ? `${resume} ${plan.nonSynchronisables.length} poste(s) sans source ni date n'ont pas été repris (REF-04).`
        : resume,
    );
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

  const filtrees = items.filter((p) => {
    const q = search.trim().toLowerCase();
    if (q && !p.designation.toLowerCase().includes(q) && !(p.code ?? "").toLowerCase().includes(q)) return false;
    if (filterStatut && p.statut !== filterStatut) return false;
    return true;
  });

  // Liste de travail : les prix « a verifier », du plus cher au moins cher.
  const aVerifier = trierParPriorite(
    items.filter((p) => p.statut === "a_verifier") as unknown as LigneBpu[],
  ) as unknown as Row[];

  const totalPrix = filtrees.reduce((s, p) => s + p.prix_unitaire, 0);
  const countValide = filtrees.filter((p) => p.statut === "valide").length;
  const sansDate = items.filter((p) => !prixComplet(p)).length;
  const fr = langue === "fr" ? "fr-FR" : "en-US";
  const dateLisible = (d: string | null) => {
    if (!d) return "-";
    const [a, m, j] = String(d).split("-");
    return a && m && j ? `${j}/${m}/${a}` : d;
  };

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

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard
          title={langue === "fr" ? "Total des postes" : "Total items"}
          value={filtrees.length}
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
          title={langue === "fr" ? "À vérifier" : "To verify"}
          value={items.filter((p) => p.statut === "a_verifier").length}
          icon={<TriangleAlert className="h-5 w-5" />}
          color="amber"
          subtitle={langue === "fr" ? "liste de travail" : "work list"}
        />
        <StatCard
          title={langue === "fr" ? "Prix total" : "Total price"}
          value={totalPrix.toLocaleString(fr)}
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
              placeholder={langue === "fr" ? "Source *" : "Source *"}
              value={source}
              onChange={(e) => setSource(e.target.value)}
            />
            <input
              className="rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10"
              type="date"
              title={langue === "fr" ? "Date de source (obligatoire, exigence REF-04)" : "Source date (required, REF-04)"}
              value={dateSource}
              onChange={(e) => setDateSource(e.target.value)}
              required
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

      {/* Recherche, filtres et synchronisation avec le référentiel */}
      <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-border/80 bg-surface p-4 shadow-soft lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            className="w-full rounded-xl border border-border/80 bg-surface-2 py-2 pl-9 pr-3 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10"
            placeholder={langue === "fr" ? "Rechercher un poste (désignation, code)…" : "Search an item (designation, code)…"}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFilterStatut(filterStatut === "a_verifier" ? "" : "a_verifier")}
            className={`rounded-xl border px-3 py-2 text-sm font-semibold shadow-sm transition ${
              filterStatut === "a_verifier"
                ? "border-warning/50 bg-warning/15 text-warning"
                : "border-border/80 bg-surface-2 text-muted hover:text-foreground"
            }`}
          >
            {langue === "fr" ? "À vérifier" : "To verify"} ({items.filter((p) => p.statut === "a_verifier").length})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatut("")}
            className={`rounded-xl border px-3 py-2 text-sm font-semibold shadow-sm transition ${
              filterStatut === ""
                ? "border-primary/50 bg-primary/15 text-primary"
                : "border-border/80 bg-surface-2 text-muted hover:text-foreground"
            }`}
          >
            {langue === "fr" ? "Tous" : "All"}
          </button>
          <Button type="button" onClick={handleSync} disabled={syncing}>
            <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing
              ? langue === "fr" ? "Synchronisation..." : "Syncing..."
              : langue === "fr" ? "Reprendre dans le référentiel" : "Sync to reference"}
          </Button>
        </div>
      </div>

      {/* Liste de travail : les prix a verifier, du plus cher au moins cher */}
      {aVerifier.length > 0 && filterStatut === "a_verifier" && (
        <section className="mb-6 rounded-2xl border border-warning/40 bg-warning/5 p-4">
          <h2 className="mb-2 text-sm font-bold text-foreground">
            {langue === "fr"
              ? `Liste de travail : ${aVerifier.length} prix à vérifier (du plus cher au moins cher)`
              : `Work list: ${aVerifier.length} prices to verify (most expensive first)`}
          </h2>
          <p className="mb-3 text-xs text-muted">
            {langue === "fr"
              ? "Ces prix viennent du fichier de base de prix : vérifiez-les auprès du fournisseur, puis corrigez la source et la date."
              : "These prices come from the price file: check them with the supplier, then fix the source and date."}
          </p>
          <ul className="grid grid-cols-1 gap-1 text-xs text-muted md:grid-cols-2">
            {aVerifier.slice(0, 12).map((p) => (
              <li key={p.id} className="truncate">
                <span className="font-medium text-foreground">{p.designation}</span> —{" "}
                {p.prix_unitaire.toLocaleString(fr)} FCFA / {p.unite}
              </li>
            ))}
          </ul>
          {aVerifier.length > 12 && (
            <p className="mt-2 text-xs text-muted">
              {langue === "fr"
                ? `… et ${aVerifier.length - 12} autres (le tableau ci-dessous affiche la liste complète).`
                : `… and ${aVerifier.length - 12} more (the table below shows the full list).`}
            </p>
          )}
        </section>
      )}

      <section>
        <h2 className="mb-4 flex items-center gap-2.5 text-lg font-bold text-foreground">
          <span className="h-5 w-1.5 rounded-full bg-gradient-to-b from-action to-action-strong" aria-hidden />
          {filtrees.length} {langue === "fr" ? "postes" : "items"}
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
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted">
                  {langue === "fr" ? "Date de source" : "Source date"}
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtrees.map((p) => (
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
                  <td className="px-4 py-3 text-right text-muted">{dateLisible(p.date_source)}</td>
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
              {filtrees.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted">
                    {search.trim() || filterStatut ? (
                      <>
                        <p>
                          Aucun poste ne correspond à{" "}
                          {search.trim() ? `« ${search.trim()} »` : "ce filtre"}.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setSearch("");
                            setFilterStatut("");
                          }}
                          className="mt-2 cursor-pointer text-xs font-semibold text-primary hover:underline"
                        >
                          Réinitialiser les filtres
                        </button>
                      </>
                    ) : (
                      <p>Aucun poste BPU pour le moment.</p>
                    )}
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
