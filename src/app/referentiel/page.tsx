"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { getLangue } from "@/lib/i18n";
import { lignesAffecteesParMiseAJour } from "@/lib/referentiel/prix";

type Prix = {
  id: string;
  code: string | null;
  designation: string;
  categorie: string | null;
  unite: string;
  prix_unitaire: number;
  source: string | null;
  date_source: string | null;
  date_validite: string | null;
  statut: string;
  zone: string | null;
};

export default function ReferentielPage() {
  const langue = getLangue();
  const [items, setItems] = useState<Prix[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filtreCategorie, setFiltreCategorie] = useState("");

  // Propagation REF-06 : confirmation avant de mettre à jour les DQE/BPU affectés
  const [propagating, setPropagating] = useState(false);
  const [pendingPrice, setPendingPrice] = useState<{ id: string; prix: number; ancienPrix: number; designation: string } | null>(null);
  const [affectedDQE, setAffectedDQE] = useState<Array<{ id: string; chantier_id: string; code: string | null; designation: string; quantite_marche: number }>>([]);
  const [affectedBPU, setAffectedBPU] = useState<Array<{ id: string; code: string | null; designation: string; prix_unitaire: number }>>([]);

  // Formulaire
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Prix | null>(null);
  const [code, setCode] = useState("");
  const [designation, setDesignation] = useState("");
  const [categorie, setCategorie] = useState("");
  const [unite, setUnite] = useState("");
  const [prix, setPrix] = useState("");
  const [source, setSource] = useState("");
  const [dateSource, setDateSource] = useState("");
  const [dateValidite, setDateValidite] = useState("");
  const [statut, setStatut] = useState("valide");
  const [zone, setZone] = useState("");
  const [motif, setMotif] = useState("");

  async function load() {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase
      .from("referentiel_prix")
      .select("*")
      .order("designation", { ascending: true });
    if (error) { setMessage(error.message); setLoading(false); return; }
    setItems((data ?? []) as Prix[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function resetForm() {
    setEditing(null);
    setCode(""); setDesignation(""); setCategorie(""); setUnite("");
    setPrix(""); setSource(""); setDateSource(""); setDateValidite("");
    setStatut("valide"); setZone(""); setMotif("");
    setShowForm(false);
  }

  function startEdit(p: Prix) {
    setEditing(p);
    setCode(p.code ?? "");
    setDesignation(p.designation);
    setCategorie(p.categorie ?? "");
    setUnite(p.unite);
    setPrix(String(p.prix_unitaire));
    setSource(p.source ?? "");
    setDateSource(p.date_source ?? "");
    setDateValidite(p.date_validite ?? "");
    setStatut(p.statut);
    setZone(p.zone ?? "");
    setMotif("");
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!designation.trim() || !unite.trim()) { setMessage("Désignation et unité obligatoires."); return; }
    setLoading(true);
    setMessage(null);
    const supabase = createClient();
    const payload = {
      code: code.trim() || null,
      designation: designation.trim(),
      categorie: categorie.trim() || null,
      unite: unite.trim(),
      prix_unitaire: Math.round(Number(prix) || 0),
      source: source.trim() || null,
      date_source: dateSource || null,
      date_validite: dateValidite || null,
      statut,
      zone: zone.trim() || null,
    };

    if (editing) {
      // REF-03 : enregistrer l'historique si le prix a changé
      if (Number(prix) !== editing.prix_unitaire) {
        await supabase.from("historique_prix").insert({
          referentiel_prix_id: editing.id,
          ancien_prix: editing.prix_unitaire,
          nouveau_prix: Math.round(Number(prix) || 0),
          auteur: null,
          motif: motif.trim() || null,
        });
      }
      const { error } = await supabase.from("referentiel_prix").update(payload).eq("id", editing.id);
      if (error) { setMessage(error.message); setLoading(false); return; }
      setMessage("Prix mis à jour.");
    } else {
      const { error } = await supabase.from("referentiel_prix").insert(payload);
      if (error) { setMessage(error.message); setLoading(false); return; }
      setMessage("Prix créé.");
    }
    setLoading(false);
    resetForm();
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer ce prix du référentiel ?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("referentiel_prix").delete().eq("id", id);
    if (error) { setMessage(error.message); return; }
    setMessage("Prix supprimé.");
    load();
  }

  const categories = [...new Set(items.map((i) => i.categorie).filter(Boolean))] as string[];
  const filtres = items.filter((p) => {
    const q = search.trim().toLowerCase();
    if (q && !p.designation.toLowerCase().includes(q) && !(p.code ?? "").toLowerCase().includes(q)) return false;
    if (filtreCategorie && p.categorie !== filtreCategorie) return false;
    return true;
  });

  return (
    <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">Référentiel de prix</h1>
          <p className="text-sm text-muted">Base centralisée des matériaux et matériels (REF-01 à REF-04). Chaque prix porte une source et une date.</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary">Nouveau prix</button>
      </div>

      {message && <p className="mb-4 text-sm text-muted">{message}</p>}

      <div className="mb-4 flex flex-wrap gap-3">
        <input type="text" placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="rounded-xl border border-border bg-surface px-3 py-2 text-sm" />
        <select value={filtreCategorie} onChange={(e) => setFiltreCategorie(e.target.value)} className="rounded-xl border border-border bg-surface px-3 py-2 text-sm">
          <option value="">Toutes catégories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {showForm && (
        <div className="mb-6 card p-4">
          <h2 className="mb-3 text-lg font-medium text-primary">{editing ? "Modifier le prix" : "Nouveau prix"}</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <input className="rounded-xl border border-border bg-surface px-3 py-2 text-sm" placeholder="Code" value={code} onChange={(e) => setCode(e.target.value)} />
            <input className="rounded-xl border border-border bg-surface px-3 py-2 text-sm" placeholder="Désignation *" value={designation} onChange={(e) => setDesignation(e.target.value)} required />
            <input className="rounded-xl border border-border bg-surface px-3 py-2 text-sm" placeholder="Catégorie" value={categorie} onChange={(e) => setCategorie(e.target.value)} />
            <input className="rounded-xl border border-border bg-surface px-3 py-2 text-sm" placeholder="Unité *" value={unite} onChange={(e) => setUnite(e.target.value)} required />
            <input className="rounded-xl border border-border bg-surface px-3 py-2 text-sm" type="number" placeholder="Prix unitaire (FCFA)" value={prix} onChange={(e) => setPrix(e.target.value)} />
            <input className="rounded-xl border border-border bg-surface px-3 py-2 text-sm" placeholder="Source (ex: devis fournisseur)" value={source} onChange={(e) => setSource(e.target.value)} />
            <input className="rounded-xl border border-border bg-surface px-3 py-2 text-sm" type="date" placeholder="Date source" value={dateSource} onChange={(e) => setDateSource(e.target.value)} />
            <input className="rounded-xl border border-border bg-surface px-3 py-2 text-sm" type="date" placeholder="Date validité" value={dateValidite} onChange={(e) => setDateValidite(e.target.value)} />
            <select className="rounded-xl border border-border bg-surface px-3 py-2 text-sm" value={statut} onChange={(e) => setStatut(e.target.value)}>
              <option value="valide">Valide</option>
              <option value="a_verifier">À vérifier</option>
            </select>
            <input className="rounded-xl border border-border bg-surface px-3 py-2 text-sm" placeholder="Zone (ville)" value={zone} onChange={(e) => setZone(e.target.value)} />
            {editing && <input className="rounded-xl border border-border bg-surface px-3 py-2 text-sm" placeholder="Motif du changement de prix" value={motif} onChange={(e) => setMotif(e.target.value)} />}
            <div className="md:col-span-3 flex gap-3">
              <button type="submit" className="btn-primary" disabled={loading}>{loading ? "Enregistrement..." : (editing ? "Mettre à jour" : "Créer")}</button>
              <button type="button" onClick={resetForm} className="btn-secondary">Annuler</button>
            </div>
          </form>
        </div>
      )}

      {loading && <p className="text-sm text-muted">Chargement...</p>}
      {!loading && filtres.length === 0 && <p className="text-sm text-muted">Aucun prix dans le référentiel.</p>}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="p-3 font-semibold text-muted">Code</th>
              <th className="p-3 font-semibold text-muted">Désignation</th>
              <th className="p-3 font-semibold text-muted">Catégorie</th>
              <th className="p-3 font-semibold text-muted">Unité</th>
              <th className="p-3 text-right font-semibold text-muted">Prix (FCFA)</th>
              <th className="p-3 font-semibold text-muted">Source</th>
              <th className="p-3 font-semibold text-muted">Statut</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtres.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0">
                <td className="p-3">{p.code ?? "-"}</td>
                <td className="p-3">{p.designation}</td>
                <td className="p-3">{p.categorie ?? "-"}</td>
                <td className="p-3">{p.unite}</td>
                <td className="p-3 text-right font-semibold">{p.prix_unitaire.toLocaleString("fr-FR")}</td>
                <td className="p-3 text-xs text-muted">{p.source ?? "-"} {p.date_source ? `(${p.date_source})` : ""}</td>
                <td className="p-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${p.statut === "valide" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                    {p.statut === "valide" ? "Valide" : "À vérifier"}
                  </span>
                </td>
                <td className="p-3 flex gap-2">
                  <button onClick={() => startEdit(p)} className="text-xs text-primary hover:underline">Modifier</button>
                  <button onClick={() => handleDelete(p.id)} className="text-xs text-danger hover:underline">Supprimer</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
