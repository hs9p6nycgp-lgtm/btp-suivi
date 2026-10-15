"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { CategorieDepense } from "@/types/database";

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

export default function CoutsPage() {
  const params = useParams();
  const chantierId = String(params?.id ?? "");
  const router = useRouter();

  const [postes, setPostes] = useState<PosteDQE[]>([]);
  const [qtes, setQtes] = useState<QteRealisee[]>([]);
  const [bpu, setBpu] = useState<BpuPoste[]>([]);
  const [depenses, setDepenses] = useState<DepenseReelle[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  // État pour ajout de dépense
  const [categorie, setCategorie] = useState<"materiaux" | "main_doeuvre" | "engins" | "sous_traitance" | "carburant" | "autre">("materiaux");
  const [designation, setDesignation] = useState("");
  const [quantite, setQuantite] = useState("");
  const [unite, setUnite] = useState("");
  const [prixUnitaire, setPrixUnitaire] = useState("");
  const [reference, setReference] = useState("");
  const [dateDepense, setDateDepense] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    async function load() {
      if (!chantierId) return;
      const supabase = createClient();
      const [pRes, qRes, bRes, dRes] = await Promise.all([
        supabase.from("postes_dqe").select("*").eq("chantier_id", chantierId).order("created_at", { ascending: true }),
        supabase.from("quantites_realisees").select("*").eq("chantier_id", chantierId).order("date_saisie", { ascending: true }),
        supabase.from("bpu_postes").select("*").order("created_at", { ascending: true }),
        supabase.from("depenses_reelles").select("*").eq("chantier_id", chantierId).order("date_depense", { ascending: true }),
      ]);
      if (pRes.error) setMessage(pRes.error.message);
      else setPostes((pRes.data ?? []) as PosteDQE[]);
      if (qRes.error) setMessage(qRes.error.message);
      else setQtes((qRes.data ?? []) as QteRealisee[]);
      if (bRes.error) setMessage(bRes.error.message);
      else setBpu((bRes.data ?? []) as BpuPoste[]);
      if (dRes.error) setMessage(dRes.error.message);
      else setDepenses((dRes.data ?? []) as DepenseReelle[]);
      setLoading(false);
    }
    load();
  }, [chantierId]);

  // Coût réalisé par poste : quantités réalisées × prix BPU
  const bpuMap = new Map<string, BpuPoste>(bpu.map((b) => [b.id, b]));
  const qteMap = new Map<string, number>();
  qtes.forEach((q) => {
    qteMap.set(q.poste_dqe_id, (qteMap.get(q.poste_dqe_id) ?? 0) + q.quantite);
  });

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
    if (!designation.trim() || !quantite || !prixUnitaire) {
      setMessage("Veuillez remplir tous les champs.");
      return;
    }
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
    if (error) {
      setMessage(error.message);
      return;
    }
    setDepenses((prev) => [...prev, {
      id: "",
      chantier_id: chantierId,
      categorie,
      designation: designation.trim(),
      quantite: Number(quantite),
      unite: unite || null,
      prix_unitaire: Math.round(Number(prixUnitaire)),
      montant_total: montantTotal,
      date_depense: dateDepense,
      reference: reference || null,
    } as DepenseReelle]);
    setDesignation("");
    setQuantite("");
    setUnite("");
    setPrixUnitaire("");
    setReference("");
    setMessage("Dépense ajoutée.");
  }

  async function supprimerDepense(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from("depenses_reelles").delete().eq("id", id);
    if (error) {
      setMessage(error.message);
      return;
    }
    setDepenses((prev) => prev.filter((d) => d.id !== id));
    setMessage("Dépense supprimée.");
  }

  const catLabel: Record<string, string> = {
    materiaux: "Matériaux",
    main_doeuvre: "Main-d'œuvre",
    engins: "Engins",
    sous_traitance: "Sous-traitance",
    carburant: "Carburant",
    autre: "Autre",
  };

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <Link href={`/chantiers/${chantierId}`} className="text-sm text-action hover:underline">
          &lt; Retour chantier
        </Link>
        <h1 className="text-2xl font-bold text-primary">Coûts et budget</h1>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4 text-sm">
        <div className="card p-4">
          <p className="text-muted text-xs uppercase font-semibold">Coût prévu (DQE)</p>
          <p className="text-2xl font-bold text-primary">{totalCoutPrevu.toLocaleString("fr-FR")} FCFA</p>
        </div>
        <div className="card p-4">
          <p className="text-muted text-xs uppercase font-semibold">Coût réalisé</p>
          <p className="text-2xl font-bold text-success">{totalCoutReel.toLocaleString("fr-FR")} FCFA</p>
        </div>
        <div className="card p-4">
          <p className="text-muted text-xs uppercase font-semibold">Écart budgétaire</p>
          <p className={`text-2xl font-bold ${totalEcart > 0 ? "text-danger" : "text-success"}`}>
            {totalEcart >= 0 ? "+" : ""}{totalEcart.toLocaleString("fr-FR")} FCFA
          </p>
        </div>
        <div className="card p-4">
          <p className="text-muted text-xs uppercase font-semibold">Dépenses réelles</p>
          <p className="text-2xl font-bold text-primary">{totalDepenses.toLocaleString("fr-FR")} FCFA</p>
        </div>
      </div>

      {message && <p className="mb-4 rounded-lg bg-danger/10 p-3 text-sm text-danger border border-danger/20">{message}</p>}

      {/* Coût par poste DQE */}
      <section className="card p-6 mb-8">
        <h2 className="mb-4 text-lg font-bold text-primary">Coût par poste DQE (COU-01)</h2>
        <p className="mb-3 text-sm text-muted">
          Coût réalisé = Quantités réalisées × Prix du BPU. Écart = Coût réalisé − Coût prévu.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left">
                <th className="p-3 font-semibold text-muted">Poste</th>
                <th className="p-3 font-semibold text-muted text-center">Qté marché</th>
                <th className="p-3 font-semibold text-muted text-center">Qté réalisée</th>
                <th className="p-3 font-semibold text-muted text-center">Prix unitaire</th>
                <th className="p-3 font-semibold text-muted text-right">Coût prévu</th>
                <th className="p-3 font-semibold text-muted text-right">Coût réalisé</th>
                <th className="p-3 font-semibold text-muted text-right">Écart</th>
                <th className="p-3 font-semibold text-muted text-center">Avancement</th>
              </tr>
            </thead>
            <tbody>
              {coutsParPoste.map((c) => (
                <tr key={c.designation} className={`border-b border-slate-100 ${c.ecart > c.cout_prevu * 0.05 ? "bg-red-50" : ""}`}>
                  <td className="p-3">{c.designation} <span className="text-xs text-muted">({c.code ?? "-"})</span></td>
                  <td className="p-3 text-center">{c.qte_marche.toFixed(2)}</td>
                  <td className="p-3 text-center">{c.qte_reelle.toFixed(2)}</td>
                  <td className="p-3 text-center">{c.prix_unitaire.toLocaleString("fr-FR")}</td>
                  <td className="p-3 text-right">{c.cout_prevu.toLocaleString("fr-FR")}</td>
                  <td className="p-3 text-right">{c.cout_reel.toLocaleString("fr-FR")}</td>
                  <td className={`p-3 text-right font-semibold ${c.ecart > 0 ? "text-danger" : "text-success"}`}>
                    {c.ecart >= 0 ? "+" : ""}{c.ecart.toLocaleString("fr-FR")}
                  </td>
                  <td className="p-3 text-center">
                    <div className="w-16 bg-slate-100 rounded-full h-2">
                      <div className={`h-2 rounded-full ${c.avancement_pct > 90 ? "bg-danger" : c.avancement_pct > 70 ? "bg-warning" : "bg-action"}`} style={{ width: `${Math.min(c.avancement_pct, 100)}%` }}></div>
                    </div>
                    <span className="text-[10px] text-muted">{c.avancement_pct.toFixed(0)}%</span>
                  </td>
                </tr>
              ))}
              {coutsParPoste.length === 0 && (
                <tr><td colSpan={8} className="p-4 text-center text-muted">Aucun poste DQE importé.</td></tr>
              )}
              <tr className="border-t border-slate-200 font-bold bg-slate-50">
                <td className="p-3">TOTAL</td>
                <td className="p-3 text-center"></td>
                <td className="p-3 text-center"></td>
                <td className="p-3 text-center"></td>
                <td className="p-3 text-right">{totalCoutPrevu.toLocaleString("fr-FR")}</td>
                <td className="p-3 text-right">{totalCoutReel.toLocaleString("fr-FR")}</td>
                <td className={`p-3 text-right font-bold ${totalEcart > 0 ? "text-danger" : "text-success"}`}>
                  {totalEcart >= 0 ? "+" : ""}{totalEcart.toLocaleString("fr-FR")}
                </td>
                <td className="p-3 text-center"></td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted">
          {totalEcart > totalCoutPrevu * 0.05 ? "⚠️ Écart budgétaire supérieur à 5% du budget." : totalEcart < -totalCoutPrevu * 0.05 ? "ℹ️ Sous-consommation notable." : "✅ Écart budgétaire dans la tolérance (±5%)."}
        </p>
      </section>

      {/* Dépenses réelles */}
      <section className="card p-6 mb-8">
        <h2 className="mb-3 text-lg font-bold text-primary">Dépenses réelles (COU-02)</h2>
        <form onSubmit={ajouterDepense} className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-5">
          <select className="rounded-xl border p-2.5 text-sm focus:ring-2 focus:ring-action outline-none bg-white" value={categorie} onChange={(e) => setCategorie(e.target.value as CategorieDepense)}>
            <option value="materiaux">Matériaux</option>
            <option value="main_doeuvre">Main-d&apos;uvre</option>
            <option value="engins">Engins</option>
            <option value="sous_traitance">Sous-traitance</option>
            <option value="carburant">Carburant</option>
            <option value="autre">Autre</option>
          </select>
          <input className="rounded-xl border p-2.5 text-sm focus:ring-2 focus:ring-action outline-none" placeholder="Désignation *" value={designation} onChange={(e) => setDesignation(e.target.value)} required />
          <input className="rounded-xl border p-2.5 text-sm focus:ring-2 focus:ring-action outline-none" type="number" step="0.01" placeholder="Qté" value={quantite} onChange={(e) => setQuantite(e.target.value)} required />
          <input className="rounded-xl border p-2.5 text-sm focus:ring-2 focus:ring-action outline-none" placeholder="Unité" value={unite} onChange={(e) => setUnite(e.target.value)} />
          <input className="rounded-xl border p-2.5 text-sm focus:ring-2 focus:ring-action outline-none" type="number" step="0.01" placeholder="Prix unitaire (FCFA)" value={prixUnitaire} onChange={(e) => setPrixUnitaire(e.target.value)} required />
          <input type="date" className="rounded-xl border p-2.5 text-sm focus:ring-2 focus:ring-action outline-none" value={dateDepense} onChange={(e) => setDateDepense(e.target.value)} />
          <input className="rounded-xl border p-2.5 text-sm focus:ring-2 focus:ring-action outline-none" placeholder="Référence (bon, facture)" value={reference} onChange={(e) => setReference(e.target.value)} />
          <button type="submit" className="btn-primary">Ajouter</button>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left">
                <th className="p-3 font-semibold text-muted">Date</th>
                <th className="p-3 font-semibold text-muted">Catégorie</th>
                <th className="p-3 font-semibold text-muted">Désignation</th>
                <th className="p-3 font-semibold text-muted text-center">Qté</th>
                <th className="p-3 font-semibold text-muted text-center">Unité</th>
                <th className="p-3 font-semibold text-muted text-right">Prix unitaire</th>
                <th className="p-3 font-semibold text-muted text-right">Montant</th>
                <th className="p-3 font-semibold text-muted text-right">Référence</th>
                <th className="p-3 font-semibold text-muted"></th>
              </tr>
            </thead>
            <tbody>
              {depenses.map((d) => (
                <tr key={d.id} className="border-b border-slate-100">
                  <td className="p-3">{new Date(d.date_depense).toLocaleDateString("fr-FR")}</td>
                  <td className="p-3">{catLabel[d.categorie]}</td>
                  <td className="p-3">{d.designation}</td>
                  <td className="p-3 text-center">{d.quantite.toFixed(2)}</td>
                  <td className="p-3 text-center">{d.unite ?? "-"}</td>
                  <td className="p-3 text-right">{d.prix_unitaire.toLocaleString("fr-FR")}</td>
                  <td className="p-3 text-right font-semibold">{d.montant_total.toLocaleString("fr-FR")}</td>
                  <td className="p-3 text-right">{d.reference ?? "-"}</td>
                  <td className="p-3">
                    <button onClick={() => supprimerDepense(d.id)} className="text-red-600 text-sm hover:underline">Supprimer</button>
                  </td>
                </tr>
              ))}
              {depenses.length === 0 && (
                <tr><td colSpan={9} className="p-4 text-center text-muted">Aucune dépense saisie.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}