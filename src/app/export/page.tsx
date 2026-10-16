"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { getLangue } from "@/lib/i18n";

export default function ExportPage() {
  const langue = getLangue();
  const [chantiers, setChantiers] = useState<any[]>([]);
  const [selectedChantier, setSelectedChantier] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => { loadChantiers(); }, []);

  async function loadChantiers() {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("chantiers").select("id,nom").eq("proprietaire_id", user.id).order("nom");
    setChantiers((data ?? []) as any[]);
    setLoading(false);
  }

  async function handleExport() {
    if (!selectedChantier) { setMessage("Sélectionnez un chantier."); return; }
    setExporting(true);
    setMessage(null);
    const supabase = createClient();

    try {
      const [postesRes, qtesRes, depensesRes, tachesRes, essaisRes, ncRes] = await Promise.all([
        supabase.from("postes_dqe").select("*").eq("chantier_id", selectedChantier).order("created_at"),
        supabase.from("quantites_realisees").select("*").eq("chantier_id", selectedChantier).order("date_saisie"),
        supabase.from("depenses_reelles").select("*").eq("chantier_id", selectedChantier).order("date_depense"),
        supabase.from("taches_planning").select("*").eq("chantier_id", selectedChantier).order("created_at"),
        supabase.from("essais_qualite").select("*").eq("chantier_id", selectedChantier).order("date_controle"),
        supabase.from("non_conformites").select("*").eq("chantier_id", selectedChantier).order("created_at"),
      ]);

      const wb = XLSX.utils.book_new();

      // Postes DQE
      if (postesRes.data && postesRes.data.length > 0) {
        const ws = XLSX.utils.json_to_sheet(postesRes.data.map((p: any) => ({
          Code: p.code,
          Désignation: p.designation,
          Unité: p.unite,
          "Qté marché": p.quantite_marche,
          "Prix unitaire": p.prix_unitaire,
          "Montant marché": p.quantite_marche * p.prix_unitaire,
        })));
        XLSX.utils.book_append_sheet(wb, ws, "Postes DQE");
      }

      // Quantités réalisées
      if (qtesRes.data && qtesRes.data.length > 0) {
        const ws = XLSX.utils.json_to_sheet(qtesRes.data.map((q: any) => ({
          "Poste": q.poste_dqe_id,
          "Quantité": q.quantite,
          "Date saisie": q.date_saisie,
          "Section": q.section_id,
        })));
        XLSX.utils.book_append_sheet(wb, ws, "Quantités réalisées");
      }

      // Dépenses
      if (depensesRes.data && depensesRes.data.length > 0) {
        const ws = XLSX.utils.json_to_sheet(depensesRes.data.map((d: any) => ({
          Catégorie: d.categorie,
          Désignation: d.designation,
          Quantité: d.quantite,
          Unité: d.unite,
          "Prix unitaire": d.prix_unitaire,
          "Montant total": d.montant_total,
          "Date dépense": d.date_depense,
          Référence: d.reference,
        })));
        XLSX.utils.book_append_sheet(wb, ws, "Dépenses");
      }

      // Planning
      if (tachesRes.data && tachesRes.data.length > 0) {
        const ws = XLSX.utils.json_to_sheet(tachesRes.data.map((t: any) => ({
          Nom: t.nom,
          Durée: t.duree_jours,
          "Date début": t.date_prevue_debut,
          "Date fin": t.date_prevue_fin,
          Statut: t.statut,
          Jalon: t.est_jalon ? "Oui" : "Non",
        })));
        XLSX.utils.book_append_sheet(wb, ws, "Planning");
      }

      // Qualité - Essais
      if (essaisRes.data && essaisRes.data.length > 0) {
        const ws = XLSX.utils.json_to_sheet(essaisRes.data.map((e: any) => ({
          Type: e.type_controle,
          "Valeur mesurée": e.valeur_mesuree,
          "Valeur exigée": e.valeur_exigee,
          "Tol. pos": e.tolerance_pos,
          "Tol. neg": e.tolerance_neg,
          Conforme: e.conforme ? "Oui" : "Non",
          "Date contrôle": e.date_controle,
          Responsable: e.responsable,
        })));
        XLSX.utils.book_append_sheet(wb, ws, "Essais qualité");
      }

      // Non-conformités
      if (ncRes.data && ncRes.data.length > 0) {
        const ws = XLSX.utils.json_to_sheet(ncRes.data.map((n: any) => ({
          Description: n.description,
          Statut: n.statut,
          Responsable: n.responsable,
          "Date création": n.created_at,
          "Date clôture": n.date_cloture,
        })));
        XLSX.utils.book_append_sheet(wb, ws, "Non-conformités");
      }

      const chantier = chantiers.find((c) => c.id === selectedChantier);
      const fileName = `export_${chantier?.nom ?? selectedChantier}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, fileName);
      setMessage(`Export réussi : ${fileName}`);
    } catch (e: any) {
      setMessage(`Erreur d'export : ${e?.message ?? e}`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">Export Excel</h1>
        <p className="text-sm text-muted">Exportez les données d'un chantier vers un fichier Excel (postes DQE, quantités, dépenses, planning, qualité).</p>
      </div>

      {loading && <p className="text-sm text-muted">Chargement...</p>}

      {!loading && (
        <div className="card p-4 max-w-xl">
          <label className="mb-2 block text-sm font-medium">Chantier</label>
          <select
            value={selectedChantier}
            onChange={(e) => setSelectedChantier(e.target.value)}
            className="mb-4 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm"
          >
            <option value="">— Sélectionner —</option>
            {chantiers.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
          <button
            onClick={handleExport}
            disabled={exporting || !selectedChantier}
            className="btn-primary disabled:opacity-50"
          >
            {exporting ? "Export en cours..." : "Exporter en Excel"}
          </button>
          {message && <p className="mt-3 text-sm text-muted">{message}</p>}
        </div>
      )}
    </main>
  );
}
