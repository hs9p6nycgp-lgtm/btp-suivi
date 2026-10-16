"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { getLangue } from "@/lib/i18n";

type PosteDQE = {
  id: string;
  code: string | null;
  designation: string;
  unite: string;
  quantite_marche: number;
  prix_unitaire: number;
};

type QteRealisee = {
  id: string;
  chantier_id: string;
  poste_dqe_id: string;
  quantite: number;
  date_saisie: string;
};

type BpuPoste = {
  id: string;
  code: string | null;
  designation: string;
  unite: string;
  prix_unitaire: number;
};

type DepenseReelle = {
  id: string;
  chantier_id: string;
  categorie: "materiaux" | "main_doeuvre" | "engins" | "sous_traitance" | "carburant" | "autre";
  designation: string;
  quantite: number;
  unite: string | null;
  prix_unitaire: number;
  montant_total: number;
  date_depense: string;
  reference: string | null;
};

const CAT_LABELS: Record<string, { fr: string; en: string }> = {
  materiaux: { fr: "Matériaux", en: "Materials" },
  main_doeuvre: { fr: "Main-d'œuvre", en: "Labor" },
  engins: { fr: "Engins", en: "Equipment" },
  sous_traitance: { fr: "Sous-traitance", en: "Subcontracting" },
  carburant: { fr: "Carburant", en: "Fuel" },
  autre: { fr: "Autre", en: "Other" },
};

export default function CoutsPage() {
  const params = useParams();
  const chantierId = String(params?.id ?? "");
  const langue = getLangue();

  const [postes, setPostes] = useState<PosteDQE[]>([]);
  const [qtes, setQtes] = useState<QteRealisee[]>([]);
  const [bpu, setBpu] = useState<BpuPoste[]>([]);
  const [depenses, setDepenses] = useState<DepenseReelle[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const [categorie, setCategorie] = useState<"materiaux" | "main_doeuvre" | "engins" | "sous_traitance" | "carburant" | "autre">("materiaux");
  const [designation, setDesignation] = useState("");
  const [quantite, setQuantite] = useState("");
  const [unite, setUnite] = useState("");
  const [prixUnitaire, setPrixUnitaire] = useState("");
  const [reference, setReference] = useState("");
  const [dateDepense, setDateDepense] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    if (chantierId) load();
  }, [chantierId]);

  async function load() {
    const supabase = createClient();
    const [pRes, qRes, bRes, dRes] = await Promise.all([
      supabase.from("postes_dqe").select("*").eq("chantier_id", chantierId).order("created_at", { ascending: true }),
      supabase.from("quantites_realisees").select("*").eq("chantier_id", chantierId).order("date_saisie", { ascending: true }),
      supabase.from("bpu_postes").select("*").order("created_at", { ascending: true }),
      supabase.from("depenses_reelles").select("*").eq("chantier_id", chantierId).order("date_depense", { ascending: true }),
    ]);
    if (pRes.error) { setMessage(pRes.error.message); return; }
    if (qRes.error) { setMessage(qRes.error.message); return; }
    if (bRes.error) { setMessage(bRes.error.message); return; }
    if (dRes.error) { setMessage(dRes.error.message); return; }
    setPostes((pRes.data ?? []) as PosteDQE[]);
    setQtes((qRes.data ?? []) as QteRealisee[]);
    setBpu((bRes.data ?? []) as BpuPoste[]);
    setDepenses((dRes.data ?? []) as DepenseReelle[]);
    setLoading(false);
  }

  const bpuMap = new Map<string, BpuPoste>(bpu.map((b) => [b.id, b]));
  const qteMap = new Map<string, number>();
  qtes.forEach((q) => { qteMap.set(q.poste_dqe_id, (qteMap.get(q.poste_dqe_id) ?? 0) + q.quantite); });

  type CoutPoste = {
    code: string | null;
    designation: string;
    unite: string;
    qte_marche: number;
    qte_reelle: number;
    prix_unitaire: number;
    cout_prevu: number;
    cout_reel: number;
    ecart: number;
    avancement_pct: number;
  };

  const coutsParPoste: CoutPoste[] = postes.map((p) => {
    const bpuItem = bpuMap.get(p.id);
    const qteReelle = qteMap.get(p.id) ?? 0;
    const prix = bpuItem?.prix_unitaire ?? p.prix_unitaire;
    const coutPrevu = p.quantite_marche * prix;
    const coutReel = qteReelle * prix;
    const ecart = coutReel - coutPrevu;
    const avancementPct = p.quantite_marche > 0 ? (qteReelle / p.quantite_marche) * 100 : 0;
    return {
      code: p.code,
      designation: p.designation,
      unite: p.unite,
      qte_marche: p.quantite_marche,
      qte_reelle: qteReelle,
      prix_unitaire: prix,
      cout_prevu: coutPrevu,
      cout_reel: coutReel,
      ecart,
      avancement_pct: avancementPct,
    };
  });

  const totalCoutPrevu = coutsParPoste.reduce((s, c) => s + c.cout_prevu, 0);
  const totalCoutReel = coutsParPoste.reduce((s, c) => s + c.cout_reel, 0);
  const totalEcart = totalCoutReel - totalCoutPrevu;
  const totalDepenses = depenses.reduce((s, d) => s + d.montant_total, 0);

  async function ajouterDepense(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const supabase = createClient();
    const montantTotal = Math.round(Number(quantite) * Number(prixUnitaire));
    const { error } = await supabase.from("depenses_reelles").insert({
      chantier_id: chantierId,
      categorie,
      designation: designation.trim(),
      quantite: Number(quantite),
      unite: unite || null,
      prix_unitaire: Math.round(Number(prixUnitaire)),
      montant_total: montantTotal,
      reference: reference || null,
      date_depense: dateDepense,
    });
    setLoading(false);
    if (error) { setMessage(error.message); return; }
    setDepenses((prev) => [...prev, { id: "", chantier_id: chantierId, categorie, designation: designation.trim(), quantite: Number(quantite), unite: unite || null, prix_unitaire: Math.round(Number(prixUnitaire)), montant_total: montantTotal, date_depense: dateDepense, reference: reference || null } as unknown as DepenseReelle]);
    setDesignation(""); setQuantite(""); setUnite(""); setPrixUnitaire(""); setReference("");
    setMessage(langue === "fr" ? "Dépense ajoutée." : "Expense added.");
  }

  async function supprimerDepense(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from("depenses_reelles").delete().eq("id", id);
    if (error) { setMessage(error.message); return; }
    setDepenses((prev) => prev.filter((d) => d.id !== id));
  }

  return (
    <main className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-6">
      <div className="mb-6 flex items-start justify-between">
        <LinkBack />
        <h1 className="text-2xl font-bold text-slate-900">Coûts & Budget</h1>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard title="Coût prévu" value={totalCoutPrevu.toLocaleString(langue === "fr" ? "fr-FR" : "en-US")} subtitle="FCFA" icon="📊" color="blue" />
        <StatCard title="Coût réalisé" value={totalCoutReel.toLocaleString(langue === "fr" ? "fr-FR" : "en-US")} subtitle="FCFA" icon="💰" color="emerald" />
        <StatCard title="Écart budgétaire" value={`${totalEcart >= 0 ? "+" : ""}${totalEcart.toLocaleString(langue === "fr" ? "fr-FR" : "en-US")}`} subtitle="FCFA" icon="⚖️" color={totalEcart > 0 ? "rose" : "blue"} />
        <StatCard title="Dépenses réelles" value={totalDepenses.toLocaleString(langue === "fr" ? "fr-FR" : "en-US")} subtitle="FCFA" icon="🧾" color="amber" />
      </div>

      {message && (
        <div className="mb-4 rounded-lg bg-orange-50 border border-orange-200 p-3 text-sm text-orange-700">
          {message}
        </div>
      )}

      <section className="mb-6">
        <h2 className="mb-4 text-lg font-bold text-slate-900">Coût par poste DQE</h2>
        <p className="mb-3 text-sm text-slate-500">
          Coût réalisé = Quantités réalisées × Prix du BPU. Écart = Coût réalisé − Coût prévu.
        </p>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left">
                <th className="p-3 font-semibold text-slate-500">Poste</th>
                <th className="p-3 font-semibold text-slate-500 text-center">Qté marché</th>
                <th className="p-3 font-semibold text-slate-500 text-center">Qté réalisée</th>
                <th className="p-3 font-semibold text-slate-500 text-center">Prix unitaire</th>
                <th className="p-3 font-semibold text-slate-500 text-right">Coût prévu</th>
                <th className="p-3 font-semibold text-slate-500 text-right">Coût réalisé</th>
                <th className="p-3 font-semibold text-slate-500 text-right">Écart</th>
                <th className="p-3 font-semibold text-slate-500 text-center">Avancement</th>
              </tr>
            </thead>
            <tbody>
              {coutsParPoste.map((c) => (
                <tr key={c.designation} className={`border-b border-slate-100 ${c.ecart > c.cout_prevu * 0.05 ? "bg-rose-50" : ""}`}>
                  <td className="p-3 text-sm text-slate-900">{c.designation} <span className="text-xs text-slate-600">({c.code ?? "-"})</span></td>
                  <td className="p-3 text-sm text-center text-slate-600">{c.qte_marche.toFixed(2)}</td>
                  <td className="p-3 text-sm text-center text-slate-600">{c.qte_reelle.toFixed(2)}</td>
                  <td className="p-3 text-sm text-center text-slate-600">{c.prix_unitaire.toLocaleString(langue === "fr" ? "fr-FR" : "en-US")}</td>
                  <td className="p-3 text-sm text-right text-slate-600">{c.cout_prevu.toLocaleString(langue === "fr" ? "fr-FR" : "en-US")}</td>
                  <td className="p-3 text-sm text-right font-semibold text-slate-900">{c.cout_reel.toLocaleString(langue === "fr" ? "fr-FR" : "en-US")}</td>
                  <td className={`p-3 text-sm text-right font-semibold ${c.ecart > 0 ? "text-rose-600" : "text-emerald-600"}`}>{c.ecart >= 0 ? "+" : ""}{c.ecart.toLocaleString(langue === "fr" ? "fr-FR" : "en-US")}</td>
                  <td className="p-3 text-center">
                    <div className="w-16 bg-slate-100 rounded-full h-2">
                      <div className={`h-2 rounded-full ${c.avancement_pct > 90 ? "bg-rose-600" : c.avancement_pct > 70 ? "bg-amber-600" : "bg-blue-600"}`} style={{ width: `${Math.min(c.avancement_pct, 100)}%` }}></div>
                    </div>
                    <span className="text-[10px] text-slate-500">{c.avancement_pct.toFixed(0)}%</span>
                  </td>
                </tr>
              ))}
              {coutsParPoste.length === 0 && (
                <tr><td colSpan={8} className="p-4 text-center text-slate-500">Aucun poste DQE importé.</td></tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200 font-bold bg-slate-50">
                <td className="p-3">TOTAL</td>
                <td className="p-3 text-center"></td>
                <td className="p-3 text-center"></td>
                <td className="p-3 text-center"></td>
                <td className="p-3 text-right">{totalCoutPrevu.toLocaleString(langue === "fr" ? "fr-FR" : "en-US")}</td>
                <td className="p-3 text-right">{totalCoutReel.toLocaleString(langue === "fr" ? "fr-FR" : "en-US")}</td>
                <td className={`p-3 text-right font-bold ${totalEcart > 0 ? "text-rose-600" : "text-emerald-600"}`}>{totalEcart >= 0 ? "+" : ""}{totalEcart.toLocaleString(langue === "fr" ? "fr-FR" : "en-US")}</td>
                <td className="p-3 text-center"></td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          {totalEcart > totalCoutPrevu * 0.05 ? "⚠️ Écart budgétaire supérieur à 5% du budget." : totalEcart < -totalCoutPrevu * 0.05 ? "ℹ️ Sous-consommation notable." : "✅ Écart budgétaire dans la tolérance (±5%)."}
        </p>
      </section>

      <section className="mb-6">
        <h2 className="mb-3 text-lg font-bold text-slate-900">Dépenses réelles</h2>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <form onSubmit={ajouterDepense} className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-6">
            <select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none" value={categorie} onChange={(e) => setCategorie(e.target.value as any)}>
              <option value="materiaux">Matériaux</option>
              <option value="main_doeuvre">Main-d'œuvre</option>
              <option value="engins">Engins</option>
              <option value="sous_traitance">Sous-traitance</option>
              <option value="carburant">Carburant</option>
              <option value="autre">Autre</option>
            </select>
            <input className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none" placeholder="Désignation *" value={designation} onChange={(e) => setDesignation(e.target.value)} required />
            <input className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none" type="number" step="0.01" placeholder="Qté" value={quantite} onChange={(e) => setQuantite(e.target.value)} required />
            <input className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none" placeholder="Unité" value={unite} onChange={(e) => setUnite(e.target.value)} />
            <input className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none" type="number" step="0.01" placeholder="Prix unitaire (FCFA)" value={prixUnitaire} onChange={(e) => setPrixUnitaire(e.target.value)} required />
            <input type="date" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none" value={dateDepense} onChange={(e) => setDateDepense(e.target.value)} />
            <button type="submit" className="rounded-xl bg-orange-600 px-4 py-2.5 text-white font-semibold hover:bg-orange-700">Ajouter</button>
          </form>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left">
                <th className="p-3 font-semibold text-slate-500">Date</th>
                <th className="p-3 font-semibold text-slate-500">Catégorie</th>
                <th className="p-3 font-semibold text-slate-500">Désignation</th>
                <th className="p-3 font-semibold text-slate-500 text-center">Qté</th>
                <th className="p-3 font-semibold text-slate-500 text-center">Unité</th>
                <th className="p-3 font-semibold text-slate-500 text-right">Prix unitaire</th>
                <th className="p-3 font-semibold text-slate-500 text-right">Montant</th>
                <th className="p-3 font-semibold text-slate-500 text-right">Référence</th>
                <th className="p-3 font-semibold text-slate-500"></th>
              </tr>
            </thead>
            <tbody>
              {depenses.map((d) => (
                <tr key={d.id} className="border-b border-slate-100">
                  <td className="p-3 text-sm text-slate-600">{new Date(d.date_depense).toLocaleDateString(langue === "fr" ? "fr-FR" : "en-US")}</td>
                  <td className="p-3 text-sm text-slate-600">{CAT_LABELS[d.categorie]?.[langue] || d.categorie}</td>
                  <td className="p-3 text-sm text-slate-900">{d.designation}</td>
                  <td className="p-3 text-sm text-center text-slate-600">{d.quantite.toFixed(2)}</td>
                  <td className="p-3 text-sm text-center text-slate-600">{d.unite ?? "-"}</td>
                  <td className="p-3 text-sm text-right text-slate-600">{d.prix_unitaire.toLocaleString(langue === "fr" ? "fr-FR" : "en-US")}</td>
                  <td className="p-3 text-sm text-right font-semibold text-slate-900">{d.montant_total.toLocaleString(langue === "fr" ? "fr-FR" : "en-US")}</td>
                  <td className="p-3 text-sm text-right text-slate-600">{d.reference ?? "-"}</td>
                  <td className="p-3">
                    <button onClick={() => supprimerDepense(d.id)} className="text-rose-600 text-xs hover:underline font-medium">Supprimer</button>
                  </td>
                </tr>
              ))}
              {depenses.length === 0 && (
                <tr><td colSpan={9} className="p-4 text-center text-slate-500">Aucune dépense saisie.</td></tr>
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
    <Link href="/chantiers" className="inline-flex items-center gap-2 text-sm text-orange-600 font-semibold hover:underline transition-colors">
      <span>←</span>
      {langue === "fr" ? "Retour aux chantiers" : "Back to sites"}
    </Link>
  );
}

function StatCard({ title, value, subtitle, icon, color }: { title: string; value: string | number; subtitle?: string; icon: string; color: string }) {
  const colorMap: Record<string, { bg: string; text: string }> = {
    blue: { bg: "bg-blue-50", text: "text-blue-600" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-600" },
    rose: { bg: "bg-rose-50", text: "text-rose-600" },
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