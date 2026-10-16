"use client";

import { Banknote, Coins, Receipt, Scale } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StatCard } from "@/components/ui/StatCard";
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
  const router = useRouter();
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/login"); return; }
    const { data: chantier } = await supabase.from("chantiers").select("id").eq("id", chantierId).eq("proprietaire_id", user.id).maybeSingle();
    if (!chantier) { router.replace("/chantiers"); return; }
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

  // Aucun calcul modifié : les formules du cahier des charges restent identiques.
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

    // NOT-01 : alerte si l'écart budgétaire dépasse 5 % du budget prévu
    try {
      const nouveauTotalReel = totalCoutReel + montantTotal;
      const seuilBudget = totalCoutPrevu > 0 ? 0.05 * totalCoutPrevu : 0;
      if (totalCoutPrevu > 0 && (nouveauTotalReel - totalCoutPrevu) > seuilBudget) {
        const supabase2 = createClient();
        const ecartPct = Math.round(((nouveauTotalReel - totalCoutPrevu) / totalCoutPrevu) * 10000) / 100;
        await supabase2.from("alertes").insert({
          chantier_id: chantierId,
          type: "budget",
          valeur: ecartPct,
          seuil: 5,
          statut: "ouverte",
        });
      }
    } catch (e) {
      console.error("Erreur génération alerte budget:", e);
    }
  }

  async function supprimerDepense(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from("depenses_reelles").delete().eq("id", id);
    if (error) { setMessage(error.message); return; }
    setDepenses((prev) => prev.filter((d) => d.id !== id));
  }

  const libelleCategorie = (categorieDepense: string) => {
    const c = CAT_LABELS[categorieDepense] ?? { fr: categorieDepense, en: categorieDepense };
    return langue === "fr" ? c.fr : c.en;
  };

  return (
    <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href={`/chantiers/${chantierId}`} className="text-sm font-medium text-primary hover:underline">
            &larr; Retour chantier
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-foreground md:text-3xl">Coûts &amp; Budget</h1>
        </div>
      </div>

      {/* Cartes de synthèse */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title={langue === "fr" ? "Coût prévu" : "Planned cost"}
          value={totalCoutPrevu.toLocaleString(langue === "fr" ? "fr-FR" : "en-US")}
          subtitle="FCFA"
          icon={<Coins className="h-5 w-5" />}
          color="blue"
        />
        <StatCard
          title={langue === "fr" ? "Coût réalisé" : "Realized cost"}
          value={totalCoutReel.toLocaleString(langue === "fr" ? "fr-FR" : "en-US")}
          subtitle="FCFA"
          icon={<Banknote className="h-5 w-5" />}
          color="emerald"
        />
        <StatCard
          title={langue === "fr" ? "Écart budgétaire" : "Budget gap"}
          value={`${totalEcart >= 0 ? "+" : ""}${totalEcart.toLocaleString(langue === "fr" ? "fr-FR" : "en-US")}`}
          subtitle="FCFA"
          icon={<Scale className="h-5 w-5" />}
          color={totalEcart > 0 ? "rose" : "blue"}
        />
        <StatCard
          title={langue === "fr" ? "Dépenses réelles" : "Real expenses"}
          value={totalDepenses.toLocaleString(langue === "fr" ? "fr-FR" : "en-US")}
          subtitle="FCFA"
          icon={<Receipt className="h-5 w-5" />}
          color="amber"
        />
      </div>

      {message && (
        <div className="mb-4 rounded-xl border border-primary/30 bg-primary/10 p-3 text-sm text-foreground">
          {message}
        </div>
      )}

      {/* Comparaison coût par poste DQE */}
      <section className="mb-6">
        <Card padding="lg">
          <h2 className="mb-4 text-lg font-bold text-foreground">Coût par poste DQE</h2>
          <p className="mb-4 text-sm text-muted">
            {langue === "fr"
              ? "Coût réalisé = Quantités réalisées × Prix du BPU. Écart = Coût réalisé − Coût prévu."
              : "Realized cost = Quantities realized × BPU price. Gap = Realized − Planned."}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="p-3 font-semibold text-muted">Poste</th>
                  <th className="p-3 text-center font-semibold text-muted">Qté marché</th>
                  <th className="p-3 text-center font-semibold text-muted">Qté réalisée</th>
                  <th className="p-3 text-center font-semibold text-muted">Prix unitaire</th>
                  <th className="p-3 text-right font-semibold text-muted">Coût prévu</th>
                  <th className="p-3 text-right font-semibold text-muted">Coût réalisé</th>
                  <th className="p-3 text-right font-semibold text-muted">Écart</th>
                  <th className="p-3 text-center font-semibold text-muted">Avancement</th>
                </tr>
              </thead>
              <tbody>
                {coutsParPoste.map((c) => {
                  const couleurAvancement = c.avancement_pct >= 90 ? "success" : c.avancement_pct >= 70 ? "warning" : "primary";
                  return (
                    <tr
                      key={c.designation}
                      className={`border-b border-border last:border-0 ${c.ecart > c.cout_prevu * 0.05 ? "bg-danger/5" : ""}`}
                    >
                      <td className="p-3">
                        {c.designation} <span className="text-xs text-muted">({c.code ?? "-"})</span>
                      </td>
                      <td className="p-3 text-center">{c.qte_marche.toFixed(2)}</td>
                      <td className="p-3 text-center">{c.qte_reelle.toFixed(2)}</td>
                      <td className="p-3 text-center">{c.prix_unitaire.toLocaleString(langue === "fr" ? "fr-FR" : "en-US")}</td>
                      <td className="p-3 text-right">{c.cout_prevu.toLocaleString(langue === "fr" ? "fr-FR" : "en-US")}</td>
                      <td className="p-3 text-right font-semibold">{c.cout_reel.toLocaleString(langue === "fr" ? "fr-FR" : "en-US")}</td>
                      <td className={`p-3 text-right font-semibold ${c.ecart > 0 ? "text-danger" : "text-success"}`}>
                        {c.ecart >= 0 ? "+" : ""}{c.ecart.toLocaleString(langue === "fr" ? "fr-FR" : "en-US")}
                      </td>
                      <td className="p-3 text-center">
                        <ProgressBar
                          value={c.avancement_pct}
                          color={couleurAvancement}
                          size="sm"
                          showValue={false}
                        />
                        <span className="ml-2 text-xs font-semibold text-muted">{c.avancement_pct.toFixed(0)}%</span>
                      </td>
                    </tr>
                  );
                })}
                {coutsParPoste.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-4 text-center text-muted">Aucun poste DQE importé.</td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="border-t border-border font-bold bg-slate-50 dark:bg-slate-800/40">
                  <td className="p-3">TOTAL</td>
                  <td className="p-3 text-center"></td>
                  <td className="p-3 text-center"></td>
                  <td className="p-3 text-center"></td>
                  <td className="p-3 text-right">{totalCoutPrevu.toLocaleString(langue === "fr" ? "fr-FR" : "en-US")}</td>
                  <td className="p-3 text-right">{totalCoutReel.toLocaleString(langue === "fr" ? "fr-FR" : "en-US")}</td>
                  <td className={`p-3 text-right ${totalEcart > 0 ? "text-danger" : "text-success"}`}>
                    {totalEcart >= 0 ? "+" : ""}{totalEcart.toLocaleString(langue === "fr" ? "fr-FR" : "en-US")}
                  </td>
                  <td className="p-3 text-center"></td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted">
            {langue === "fr"
              ? totalEcart > totalCoutPrevu * 0.05
                ? "⚠️ Écart budgétaire supérieur à 5 % du budget."
                : totalEcart < -totalCoutPrevu * 0.05
                  ? "ℹ️ Sous-consommation notable."
                  : "✅ Écart budgétaire dans la tolérance (±5 %)."
              : totalEcart > totalCoutPrevu * 0.05
                ? "Budget gap larger than 5% of the budget."
                : totalEcart < -totalCoutPrevu * 0.05
                  ? "Notable underspending."
                  : "Budget gap within tolerance (±5%)."}
          </p>
        </Card>
      </section>

      {/* Dépenses réelles */}
      <section>
        <Card padding="lg">
          <h2 className="mb-4 text-lg font-bold text-foreground">Dépenses réelles</h2>
          <form onSubmit={ajouterDepense} className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-6">
            <select
              className="rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none focus:border-primary dark:bg-slate-800 dark:text-slate-200"
              value={categorie}
              onChange={(e) => setCategorie(e.target.value as typeof categorie)}
            >
              <option value="materiaux">Matériaux</option>
              <option value="main_doeuvre">Main-d'œuvre</option>
              <option value="engins">Engins</option>
              <option value="sous_traitance">Sous-traitance</option>
              <option value="carburant">Carburant</option>
              <option value="autre">Autre</option>
            </select>
            <input
              className="rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none focus:border-primary dark:bg-slate-800 dark:text-slate-200"
              placeholder="Désignation *"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              required
            />
            <input
              className="rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none focus:border-primary dark:bg-slate-800 dark:text-slate-200"
              type="number"
              step="0.01"
              placeholder="Qté"
              value={quantite}
              onChange={(e) => setQuantite(e.target.value)}
              required
            />
            <input
              className="rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none focus:border-primary dark:bg-slate-800 dark:text-slate-200"
              placeholder="Unité"
              value={unite}
              onChange={(e) => setUnite(e.target.value)}
            />
            <input
              className="rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none focus:border-primary dark:bg-slate-800 dark:text-slate-200"
              type="number"
              step="0.01"
              placeholder="Prix unitaire (FCFA)"
              value={prixUnitaire}
              onChange={(e) => setPrixUnitaire(e.target.value)}
              required
            />
            <input
              type="date"
              className="rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none focus:border-primary dark:bg-slate-800 dark:text-slate-200"
              value={dateDepense}
              onChange={(e) => setDateDepense(e.target.value)}
            />
            <Button type="submit" disabled={loading}>
              Ajouter
            </Button>
          </form>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="p-3 font-semibold text-muted">Date</th>
                  <th className="p-3 font-semibold text-muted">Catégorie</th>
                  <th className="p-3 font-semibold text-muted">Désignation</th>
                  <th className="p-3 text-center font-semibold text-muted">Qté</th>
                  <th className="p-3 text-center font-semibold text-muted">Unité</th>
                  <th className="p-3 text-right font-semibold text-muted">Prix unitaire</th>
                  <th className="p-3 text-right font-semibold text-muted">Montant</th>
                  <th className="p-3 text-right font-semibold text-muted">Référence</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {depenses.map((d) => (
                  <tr key={d.id} className="border-b border-border last:border-0">
                    <td className="p-3">{new Date(d.date_depense).toLocaleDateString(langue === "fr" ? "fr-FR" : "en-US")}</td>
                    <td className="p-3">{libelleCategorie(d.categorie)}</td>
                    <td className="p-3 font-medium text-foreground">{d.designation}</td>
                    <td className="p-3 text-center">{d.quantite.toFixed(2)}</td>
                    <td className="p-3 text-center text-muted">{d.unite ?? "-"}</td>
                    <td className="p-3 text-right">{d.prix_unitaire.toLocaleString(langue === "fr" ? "fr-FR" : "en-US")}</td>
                    <td className="p-3 text-right font-semibold">{d.montant_total.toLocaleString(langue === "fr" ? "fr-FR" : "en-US")}</td>
                    <td className="p-3 text-right text-muted">{d.reference ?? "-"}</td>
                    <td className="p-3 text-right">
                      <button type="button" onClick={() => supprimerDepense(d.id)} className="text-danger text-xs font-medium hover:underline">
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
                {depenses.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-4 text-center text-muted">Aucune dépense saisie.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </section>
    </main>
  );
}
