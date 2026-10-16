"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { getLangue } from "@/lib/i18n";

type Periode = "journalier" | "hebdomadaire" | "mensuel";

export default function RapportsPage() {
  const langue = getLangue();
  const [chantiers, setChantiers] = useState<any[]>([]);
  const [selectedChantier, setSelectedChantier] = useState("");
  const [periode, setPeriode] = useState<Periode>("journalier");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any>(null);
  const [generating, setGenerating] = useState(false);

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

  async function genererRapport() {
    if (!selectedChantier) { return; }
    setGenerating(true);
    const supabase = createClient();

    const chantier = chantiers.find((c) => c.id === selectedChantier);
    const debut = dateDebut || new Date().toISOString().slice(0, 10);
    const fin = dateFin || new Date().toISOString().slice(0, 10);

    const [postesRes, qtesRes, depensesRes, journauxRes, essaisRes] = await Promise.all([
      supabase.from("postes_dqe").select("*").eq("chantier_id", selectedChantier),
      supabase.from("quantites_realisees").select("*").eq("chantier_id", selectedChantier).gte("date_saisie", debut).lte("date_saisie", fin),
      supabase.from("depenses_reelles").select("*").eq("chantier_id", selectedChantier).gte("date_depense", debut).lte("date_depense", fin),
      supabase.from("journaux").select("*").eq("chantier_id", selectedChantier).gte("date_journal", debut).lte("date_journal", fin),
      supabase.from("essais_qualite").select("*").eq("chantier_id", selectedChantier).gte("date_controle", debut).lte("date_controle", fin),
    ]);

    const postes = postesRes.data ?? [];
    const qtes = qtesRes.data ?? [];
    const depenses = depensesRes.data ?? [];
    const journaux = journauxRes.data ?? [];
    const essais = essaisRes.data ?? [];

    // Calculs
    const totalCoutPrevu = postes.reduce((s: number, p: any) => s + p.quantite_marche * p.prix_unitaire, 0);
    const realMap = new Map<string, number>();
    for (const q of qtes) realMap.set(q.poste_dqe_id, (realMap.get(q.poste_dqe_id) ?? 0) + Number(q.quantite));
    const totalCoutReel = postes.reduce((s: number, p: any) => {
      const realise = realMap.get(p.id) ?? 0;
      const avancement = p.quantite_marche > 0 ? (realise / p.quantite_marche) * 100 : 0;
      return s + p.quantite_marche * p.prix_unitaire * (avancement / 100);
    }, 0);
    const totalDepenses = depenses.reduce((s: number, d: any) => s + d.montant_total, 0);
    const nbConformes = essais.filter((e: any) => e.conforme).length;
    const tauxConformite = essais.length > 0 ? Math.round((nbConformes / essais.length) * 100) : 100;

    setReportData({
      chantier: chantier?.nom ?? selectedChantier,
      periode,
      debut,
      fin,
      postes: postes.length,
      totalCoutPrevu,
      totalCoutReel: Math.round(totalCoutReel),
      totalDepenses,
      avancement: totalCoutPrevu > 0 ? Math.round((totalCoutReel / totalCoutPrevu) * 1000) / 10 : 0,
      nbJournaux: journaux.length,
      nbEssais: essais.length,
      tauxConformite,
      dateGeneration: new Date().toLocaleDateString("fr-FR"),
    });
    setGenerating(false);
  }

  function imprimer() {
    window.print();
  }

  return (
    <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">Rapports</h1>
          <p className="text-sm text-muted">Générez un rapport de synthèse par chantier et période, imprimable en PDF.</p>
        </div>
        {reportData && (
          <button onClick={imprimer} className="btn-primary">
            Imprimer / PDF
          </button>
        )}
      </div>

      <div className="mb-6 card p-4 max-w-2xl">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Chantier</label>
            <select value={selectedChantier} onChange={(e) => setSelectedChantier(e.target.value)} className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm">
              <option value="">— Sélectionner —</option>
              {chantiers.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Période</label>
            <select value={periode} onChange={(e) => setPeriode(e.target.value as Periode)} className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm">
              <option value="journalier">Journalier</option>
              <option value="hebdomadaire">Hebdomadaire</option>
              <option value="mensuel">Mensuel</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Date début</label>
            <input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Date fin</label>
            <input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm" />
          </div>
        </div>
        <button onClick={genererRapport} disabled={generating || !selectedChantier} className="btn-primary mt-4 disabled:opacity-50">
          {generating ? "Génération..." : "Générer le rapport"}
        </button>
      </div>

      {reportData && (
        <div className="card p-6 print:shadow-none" id="rapport">
          <h2 className="mb-1 text-xl font-bold">Rapport de synthèse</h2>
          <p className="mb-4 text-sm text-muted">
            Chantier : {reportData.chantier} · Période : {reportData.periode} · {reportData.debut} → {reportData.fin}
          </p>
          <p className="mb-4 text-xs text-muted">Généré le {reportData.dateGeneration}</p>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-xl bg-slate-50 p-3 text-center">
              <p className="text-xs text-muted">Postes DQE</p>
              <p className="text-lg font-bold">{reportData.postes}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 text-center">
              <p className="text-xs text-muted">Avancement</p>
              <p className="text-lg font-bold">{reportData.avancement} %</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 text-center">
              <p className="text-xs text-muted">Coût prévu</p>
              <p className="text-lg font-bold">{reportData.totalCoutPrevu.toLocaleString("fr-FR")} FCFA</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 text-center">
              <p className="text-xs text-muted">Coût réalisé</p>
              <p className="text-lg font-bold">{reportData.totalCoutReel.toLocaleString("fr-FR")} FCFA</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 text-center">
              <p className="text-xs text-muted">Dépenses</p>
              <p className="text-lg font-bold">{reportData.totalDepenses.toLocaleString("fr-FR")} FCFA</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 text-center">
              <p className="text-xs text-muted">Journaux</p>
              <p className="text-lg font-bold">{reportData.nbJournaux}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 text-center">
              <p className="text-xs text-muted">Essais qualité</p>
              <p className="text-lg font-bold">{reportData.nbEssais}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 text-center">
              <p className="text-xs text-muted">Conformité</p>
              <p className="text-lg font-bold">{reportData.tauxConformite} %</p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
