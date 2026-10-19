"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { getLangue, traduireErreur } from "@/lib/i18n";
import { ConfirmDialog, type DemandeConfirmation } from "@/components/ui/ConfirmDialog";
import { lignesAffecteesParMiseAJour, exporterReferentielCSV, type LigneReferentiel } from "@/lib/referentiel/prix";
import { BookOpen } from "lucide-react";
import ReferentielImport from "@/components/ReferentielImport";

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

// Affichage compact des dates (règle du projet : JJ/MM/AAAA)
function afficherDate(iso: string) {
  const [annee, mois, jour] = (iso || "").split("-");
  return annee && mois && jour ? `${jour}/${mois}/${annee}` : iso;
}

export default function ReferentielPage() {
  const langue = getLangue();
  const [items, setItems] = useState<Prix[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filtreCategorie, setFiltreCategorie] = useState("");
  const [confirmation, setConfirmation] = useState<DemandeConfirmation | null>(null);

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
    if (error) { setMessage(traduireErreur(error)); setLoading(false); return; }
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
      const nouveauPrix = Math.round(Number(prix) || 0);
      if (nouveauPrix !== editing.prix_unitaire) {
        await supabase.from("historique_prix").insert({
          referentiel_prix_id: editing.id,
          ancien_prix: editing.prix_unitaire,
          nouveau_prix: nouveauPrix,
          auteur: null,
          motif: motif.trim() || null,
        });
      }

      // REF-06 : détecter les DQE et BPU affectés par ce changement de prix
      if (nouveauPrix !== editing.prix_unitaire && editing.code) {
        const [dqeRes, bpuRes] = await Promise.all([
          supabase.from("postes_dqe").select("id,chantier_id,code,designation,quantite_marche").ilike("code", editing.code),
          supabase.from("bpu_postes").select("id,code,designation,prix_unitaire").ilike("code", editing.code),
        ]);
        const dqeLignes = (dqeRes.data ?? []) as Array<{ id: string; chantier_id: string; code: string | null; designation: string; quantite_marche: number }>;
        const bpuLignes = (bpuRes.data ?? []) as Array<{ id: string; code: string | null; designation: string; prix_unitaire: number }>;
        const affectesDQE = lignesAffecteesParMiseAJour(editing.code, editing.designation, dqeLignes);
        const affectesBPU = lignesAffecteesParMiseAJour(editing.code, editing.designation, bpuLignes);
        if (affectesDQE.length > 0 || affectesBPU.length > 0) {
          setPendingPrice({ id: editing.id, prix: nouveauPrix, ancienPrix: editing.prix_unitaire, designation: editing.designation });
          setAffectedDQE(affectesDQE as Array<{ id: string; chantier_id: string; code: string | null; designation: string; quantite_marche: number }>);
          setAffectedBPU(affectesBPU as Array<{ id: string; code: string | null; designation: string; prix_unitaire: number }>);
          setPropagating(true);
          setLoading(false);
          return;
        }
      }

      const { error } = await supabase.from("referentiel_prix").update(payload).eq("id", editing.id);
      if (error) { setMessage(traduireErreur(error)); setLoading(false); return; }
      setMessage("Prix mis à jour.");
    } else {
      const { error } = await supabase.from("referentiel_prix").insert(payload);
      if (error) { setMessage(traduireErreur(error)); setLoading(false); return; }
      setMessage("Prix créé.");
    }
    setLoading(false);
    resetForm();
    load();
  }

  async function confirmPropagation() {
    if (!pendingPrice) return;
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from("referentiel_prix").update({ prix_unitaire: pendingPrice.prix }).eq("id", pendingPrice.id);
    setLoading(false);
    if (error) { setMessage(traduireErreur(error)); return; }
    setMessage(`Prix mis à jour (${pendingPrice.ancienPrix} → ${pendingPrice.prix} FCFA). ${affectedDQE.length + affectedBPU.length} poste(s) DQE/BPU concerné(s) — mise à jour manuelle recommandée.`);
    setPropagating(false);
    setPendingPrice(null);
    setAffectedDQE([]);
    setAffectedBPU([]);
    resetForm();
    load();
  }

  function cancelPropagation() {
    setPropagating(false);
    setPendingPrice(null);
    setAffectedDQE([]);
    setAffectedBPU([]);
  }

  async function handleDelete(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from("referentiel_prix").delete().eq("id", id);
    if (error) { setMessage(traduireErreur(error)); return; }
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

  // REF-05 : export des lignes affichées dans un vrai fichier CSV (téléchargé).
  function exporterCSV() {
    const lignes = filtres.map((p) => ({
      id: p.id,
      code: p.code,
      designation: p.designation,
      categorie: p.categorie,
      unite: p.unite,
      prix_unitaire: p.prix_unitaire,
      source: p.source,
      date_source: p.date_source,
      date_validite: p.date_validite,
      statut: p.statut as "valide" | "a_verifier",
      zone: p.zone,
    }));
    const csv = exporterReferentielCSV(lignes);
    if (!csv) { setMessage("Aucun prix à exporter."); return; }
    // BOM UTF-8 : les accents restent lisibles à l'ouverture dans Excel.
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const lien = document.createElement("a");
    lien.href = url;
    lien.download = `referentiel-prix-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(lien);
    lien.click();
    lien.remove();
    URL.revokeObjectURL(url);
    setMessage(`${lignes.length} prix exporté(s) — fichier CSV téléchargé.`);
  }

  return (
    <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
      <PageHeader
        eyebrow={langue === "fr" ? "Base de prix" : "Price base"}
        title="Référentiel de prix"
        description="Base centralisée des matériaux et matériels (REF-01 à REF-04). Chaque prix porte une source et une date."
        icon={<BookOpen className="h-5 w-5" />}
        actions={
          <Button onClick={() => { resetForm(); setShowForm(true); }}>Nouveau prix</Button>
        }
      />

      {message && (
        <p className="mb-4 rounded-xl border border-primary/30 bg-primary/10 p-3 text-sm text-foreground">
          {message}
        </p>
      )}

      <div className="mb-4 flex flex-wrap gap-3">
        <input type="text" placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10" />
        <select value={filtreCategorie} onChange={(e) => setFiltreCategorie(e.target.value)} className="rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10">
          <option value="">Toutes catégories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <Button
        variant="outline"
        onClick={exporterCSV}
        className="mb-4"
        title="Exporte les lignes affichées dans un fichier CSV (séparateur point-virgule, ouvrable dans Excel)."
      >
        Exporter CSV ({filtres.length})
      </Button>

      <div className="mb-4">
        <ReferentielImport onImporte={load} />
      </div>

      {showForm && (
        <Card className="mb-6">
          <h2 className="mb-4 flex items-center gap-2.5 text-lg font-bold text-foreground">
            <span className="h-5 w-1.5 rounded-full bg-gradient-to-b from-action to-action-strong" aria-hidden />
            {editing ? "Modifier le prix" : "Nouveau prix"}
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <input className="rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10" placeholder="Code" value={code} onChange={(e) => setCode(e.target.value)} />
            <input className="rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10" placeholder="Désignation *" value={designation} onChange={(e) => setDesignation(e.target.value)} required />
            <input className="rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10" placeholder="Catégorie" value={categorie} onChange={(e) => setCategorie(e.target.value)} />
            <input className="rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10" placeholder="Unité *" value={unite} onChange={(e) => setUnite(e.target.value)} required />
            <input className="rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10" type="number" placeholder="Prix unitaire (FCFA)" value={prix} onChange={(e) => setPrix(e.target.value)} />
            <input className="rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10" placeholder="Source (ex: devis fournisseur)" value={source} onChange={(e) => setSource(e.target.value)} />
            <input className="rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10" type="date" placeholder="Date source" value={dateSource} onChange={(e) => setDateSource(e.target.value)} />
            <input className="rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10" type="date" placeholder="Date validité" value={dateValidite} onChange={(e) => setDateValidite(e.target.value)} />
            <select className="rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10" value={statut} onChange={(e) => setStatut(e.target.value)}>
              <option value="valide">Valide</option>
              <option value="a_verifier">À vérifier</option>
            </select>
            <input className="rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10" placeholder="Zone (ville)" value={zone} onChange={(e) => setZone(e.target.value)} />
            {editing && <input className="rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10" placeholder="Motif du changement de prix" value={motif} onChange={(e) => setMotif(e.target.value)} />}
            <div className="md:col-span-3 flex gap-3">
              <Button type="submit" disabled={loading}>{loading ? "Enregistrement..." : editing ? "Mettre à jour" : "Créer"}</Button>
              <Button type="button" variant="outline" onClick={resetForm}>Annuler</Button>
            </div>
          </form>
        </Card>
      )}

      {loading && (
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} variant="rect" height="2.75rem" />
          ))}
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-border/80 bg-surface shadow-soft">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/80 bg-surface-2 text-left">
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted">Code</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted">Désignation</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted">Catégorie</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted">Unité</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted">Prix (FCFA)</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted">Source</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted">Statut</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtres.map((p) => (
              <tr key={p.id} className="border-b border-border/60 transition last:border-0 hover:bg-surface-2/70">
                <td className="px-4 py-3 text-muted">{p.code ?? "-"}</td>
                <td className="px-4 py-3 font-medium text-foreground">{p.designation}</td>
                <td className="px-4 py-3 text-muted">{p.categorie ?? "-"}</td>
                <td className="px-4 py-3 text-muted">{p.unite}</td>
                <td className="px-4 py-3 text-right font-mono tabular-nums text-foreground">
                  {p.prix_unitaire.toLocaleString("fr-FR")}
                </td>
                <td className="px-4 py-3 text-xs text-muted">
                  {p.source ?? "-"} {p.date_source ? `(${afficherDate(p.date_source)})` : ""}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={p.statut === "valide" ? "success" : "warning"}>
                    {p.statut === "valide" ? "Valide" : "À vérifier"}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-3">
                    <button onClick={() => startEdit(p)} className="text-xs font-medium text-primary hover:underline">Modifier</button>
                    <button
                      onClick={() =>
                        setConfirmation({
                          titre: "Supprimer ce prix du référentiel ?",
                          message: "Ce prix sera définitivement retiré du référentiel.",
                          confirmerLibelle: "Supprimer",
                          danger: true,
                          action: () => handleDelete(p.id),
                        })
                      }
                      className="text-xs font-medium text-danger hover:underline"
                    >
                      Supprimer
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && filtres.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted">
                  Aucun prix dans le référentiel.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog demande={confirmation} onFermer={() => setConfirmation(null)} />
    </main>
  );
}
