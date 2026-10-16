"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { getLangue } from "@/lib/i18n";

type PlanControle = {
  id: string;
  chantier_id: string;
  type_ouvrage: string;
  parametre: string;
  valeur_exigee: number;
  tolerance_pos: number;
  tolerance_neg: number;
  unite: string;
};

type Essai = {
  id: string;
  chantier_id: string;
  plan_controle_id: string | null;
  section_id: string | null;
  type_controle: string;
  valeur_mesuree: number;
  valeur_exigee: number;
  tolerance_pos: number;
  tolerance_neg: number;
  unite: string;
  conforme: boolean;
  date_controle: string;
  responsable: string | null;
  observations: string | null;
};

type NonConformite = {
  id: string;
  chantier_id: string;
  essai_id: string | null;
  description: string;
  gravite: string;
  statut: string;
  responsable: string | null;
  action_corrective: string | null;
  echeance: string | null;
  date_cloture: string | null;
};

type EpreuveBeton = {
  id: string;
  chantier_id: string;
  section_id: string | null;
  date_coulage: string;
  age_jours: number;
  resistance_mesuree: number | null;
  resistance_exigee: number;
  conforme: boolean;
};

export default function QualitePage() {
  const params = useParams();
  const chantierId = String(params?.id ?? "");
  const langue = getLangue();

  const [plans, setPlans] = useState<PlanControle[]>([]);
  const [essais, setEssais] = useState<Essai[]>([]);
  const [nonConformites, setNonConformites] = useState<NonConformite[]>([]);
  const [epreuves, setEpreuves] = useState<EpreuveBeton[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  // Formulaire nouvel essai
  const [nouvelEssaiType, setNouvelEssaiType] = useState("");
  const [nouvelleValeur, setNouvelleValeur] = useState("");
  const [nouvelleSection, setNouvelleSection] = useState("");
  const [nouveauResponsable, setNouveauResponsable] = useState("");
  const [nouvellesObservations, setNouvellesObservations] = useState("");

  useEffect(() => {
    if (chantierId) load();
  }, [chantierId]);

  async function load() {
    const supabase = createClient();
    const [pRes, eRes, ncRes, epRes] = await Promise.all([
      supabase.from("plans_controle").select("*").eq("chantier_id", chantierId),
      supabase.from("essais_qualite").select("*").eq("chantier_id", chantierId).order("date_controle", { ascending: false }),
      supabase.from("non_conformites").select("*").eq("chantier_id", chantierId).order("created_at", { ascending: false }),
      supabase.from("epreuves_beton").select("*").eq("chantier_id", chantierId).order("date_coulage", { ascending: false }),
    ]);
    if (pRes.data) setPlans(pRes.data as PlanControle[]);
    if (eRes.data) setEssais(eRes.data as Essai[]);
    if (ncRes.data) setNonConformites(ncRes.data as NonConformite[]);
    if (epRes.data) setEpreuves(epRes.data as EpreuveBeton[]);
    setLoading(false);
  }

  async function ajouterEssai(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const supabase = createClient();
    const valeur = Number(nouvelleValeur) || 0;
    const plan = plans.find((p) => p.parametre === nouvelEssaiType);
    const valeurExigee = plan ? plan.valeur_exigee : 0;
    const tolPos = plan ? plan.tolerance_pos : 0;
    const tolNeg = plan ? plan.tolerance_neg : 0;
    const conforme = valeur >= (valeurExigee - tolNeg) && valeur <= (valeurExigee + tolPos);

    const { data, error } = await supabase.from("essais_qualite").insert({
      chantier_id: chantierId,
      plan_controle_id: plan?.id || null,
      section_id: nouvelleSection || null,
      type_controle: nouvelEssaiType,
      valeur_mesuree: valeur,
      valeur_exigee: valeurExigee,
      tolerance_pos: tolPos,
      tolerance_neg: tolNeg,
      unite: plan?.unite || "",
      conforme: conforme,
      responsable: nouveauResponsable || null,
      observations: nouvellesObservations || null,
      date_controle: new Date().toISOString().slice(0, 10),
    }).select().single();

    // Si non conforme, créer automatiquement une fiche NC (RG-04)
    if (!conforme && !error && data) {
      await supabase.from("non_conformites").insert({
        chantier_id: chantierId,
        essai_id: (data as any).id,
        description: `Controle non conforme : ${nouvelEssaiType} = ${valeur}${plan?.unite || ""} (exige : ${valeurExigee}${plan?.unite || ""} +${tolPos}/-${tolNeg})`,
        gravite: Math.abs(valeur - valeurExigee) > Math.max(tolPos, tolNeg) * 2 ? "critique" : "majeure",
        statut: "ouverte",
        responsable: nouveauResponsable || null,
        action_corrective: null,
        echeance: null,
      });
    }

    setLoading(false);
    if (error) { setMessage(error.message); return; }
    setNouvelEssaiType("");
    setNouvelleValeur("");
    setNouvelleSection("");
    setNouveauResponsable("");
    setNouvellesObservations("");
    setMessage(conforme ? (langue === "fr" ? "Essai conforme enregistre." : "Conforming test recorded.") : (langue === "fr" ? "Essai NON CONFORME - Fiche NC creee." : "Non-conforming test - NC sheet created."));
    load();
  }

  async function cloturerNC(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from("non_conformites").update({ statut: "cloturee", date_cloture: new Date().toISOString().slice(0, 10) }).eq("id", id);
    if (error) { setMessage(error.message); return; }
    setMessage(langue === "fr" ? "Non-conformite cloturee." : "Non-conformity closed.");
    load();
  }

  const nbNC = nonConformites.filter((nc) => nc.statut !== "cloturee").length;
  const nbEssais = essais.length;
  const nbConformes = essais.filter((e) => e.conforme).length;
  const tauxConformite = nbEssais > 0 ? Math.round((nbConformes / nbEssais) * 100) : 100;

  return (
    <main className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-6">
      <div className="mb-6 flex items-start justify-between">
        <Link href={`/chantiers/${chantierId}`} className="text-sm text-orange-600 hover:underline">
          &lt; Retour chantier
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">
          {langue === "fr" ? "Qualite & Controle" : "Quality & Control"}
        </h1>
      </div>

      {message && (
        <div className="mb-4 rounded-lg bg-orange-50 border border-orange-200 p-3 text-sm text-orange-700">
          {message}
        </div>
      )}

      {/* Stats */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase">{langue === "fr" ? "Essais" : "Tests"}</p>
          <p className="text-2xl font-bold text-slate-900">{nbEssais}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase">{langue === "fr" ? "Taux de conformite" : "Compliance rate"}</p>
          <p className="text-2xl font-bold text-slate-900">{tauxConformite}%</p>
          <ProgressBar value={tauxConformite} size="sm" />
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase">{langue === "fr" ? "Non-conformites actives" : "Active non-conformities"}</p>
          <p className={`text-2xl font-bold ${nbNC > 0 ? "text-rose-600" : "text-emerald-600"}`}>{nbNC}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase">{langue === "fr" ? "Eprouvettes beton" : "Concrete samples"}</p>
          <p className="text-2xl font-bold text-slate-900">{epreuves.length}</p>
        </div>
      </div>

      {/* Nouvel essai */}
      <Card variant="elevated" padding="lg" className="mb-6">
        <h2 className="mb-3 text-lg font-bold text-slate-900">
          {langue === "fr" ? "Nouvel essai de controle" : "New control test"}
        </h2>
        <form onSubmit={ajouterEssai} className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <select
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
            value={nouvelEssaiType}
            onChange={(e) => setNouvelEssaiType(e.target.value)}
            required
          >
            <option value="">{langue === "fr" ? "Selectionner un parametre" : "Select a parameter"}</option>
            {plans.map((p) => (
              <option key={p.id} value={p.parametre}>
                {p.parametre} ({p.unite})
              </option>
            ))}
          </select>
          <input
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
            type="number"
            step="0.01"
            placeholder={langue === "fr" ? "Valeur mesuree" : "Measured value"}
            value={nouvelleValeur}
            onChange={(e) => setNouvelleValeur(e.target.value)}
            required
          />
          <input
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
            placeholder={langue === "fr" ? "Section (optionnel)" : "Section (optional)"}
            value={nouvelleSection}
            onChange={(e) => setNouvelleSection(e.target.value)}
          />
          <button type="submit" disabled={loading} className="rounded-xl bg-orange-600 px-4 py-3 text-white font-semibold hover:bg-orange-700 disabled:opacity-50 transition-all shadow-sm hover:shadow-md">
            {langue === "fr" ? "Enregistrer l'essai" : "Record test"}
          </button>
        </form>
      </Card>

      {/* Essais */}
      <section className="mb-6">
        <h2 className="mb-4 text-lg font-bold text-slate-900">
          {langue === "fr" ? "Essais de controle" : "Control tests"}
        </h2>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left">
                <th className="p-3 font-semibold text-slate-500">Date</th>
                <th className="p-3 font-semibold text-slate-500">Parametre</th>
                <th className="p-3 font-semibold text-slate-500 text-center">Mesure</th>
                <th className="p-3 font-semibold text-slate-500 text-center">Exige</th>
                <th className="p-3 font-semibold text-slate-500 text-center">Unite</th>
                <th className="p-3 font-semibold text-slate-500 text-center">Statut</th>
              </tr>
            </thead>
            <tbody>
              {essais.map((e) => (
                <tr key={e.id} className={`border-b border-slate-100 ${!e.conforme ? "bg-rose-50" : ""}`}>
                  <td className="p-3 text-sm text-slate-600">{new Date(e.date_controle).toLocaleDateString(langue === "fr" ? "fr-FR" : "en-US")}</td>
                  <td className="p-3 text-sm text-slate-900">{e.type_controle}</td>
                  <td className="p-3 text-sm text-center text-slate-600">{e.valeur_mesuree}</td>
                  <td className="p-3 text-sm text-center text-slate-600">{e.valeur_exigee}</td>
                  <td className="p-3 text-sm text-center text-slate-600">{e.unite}</td>
                  <td className="p-3 text-center">
                    <Badge variant={e.conforme ? "success" : "danger"}>
                      {e.conforme ? (langue === "fr" ? "Conforme" : "Conforming") : (langue === "fr" ? "NON CONFORME" : "NON CONFORMING")}
                    </Badge>
                  </td>
                </tr>
              ))}
              {essais.length === 0 && (
                <tr><td colSpan={6} className="p-4 text-center text-slate-500">Aucun essai saisi.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Non-conformites */}
      <section className="mb-6">
        <h2 className="mb-4 text-lg font-bold text-slate-900">
          {langue === "fr" ? "Fiches de non-conformite" : "Non-conformity sheets"}
        </h2>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left">
                <th className="p-3 font-semibold text-slate-500">Description</th>
                <th className="p-3 font-semibold text-slate-500 text-center">Gravite</th>
                <th className="p-3 font-semibold text-slate-500 text-center">Statut</th>
                <th className="p-3 font-semibold text-slate-500 text-center">Responsable</th>
                <th className="p-3 font-semibold text-slate-500 text-center">Echeance</th>
                <th className="p-3 font-semibold text-slate-500 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {nonConformites.map((nc) => (
                <tr key={nc.id} className={`border-b border-slate-100 ${nc.statut !== "cloturee" ? "bg-rose-50" : ""}`}>
                  <td className="p-3 text-sm text-slate-900">{nc.description}</td>
                  <td className="p-3 text-sm text-center">
                    <Badge variant={nc.gravite === "critique" ? "danger" : nc.gravite === "majeure" ? "warning" : "info"}>
                      {nc.gravite}
                    </Badge>
                  </td>
                  <td className="p-3 text-sm text-center">
                    <Badge variant={nc.statut === "cloturee" ? "success" : nc.statut === "en_cours" ? "warning" : "info"}>
                      {nc.statut}
                    </Badge>
                  </td>
                  <td className="p-3 text-sm text-slate-600">{nc.responsable ?? "-"}</td>
                  <td className="p-3 text-sm text-center text-slate-600">{nc.echeance ?? "-"}</td>
                  <td className="p-3 text-center">
                    {nc.statut !== "cloturee" && (
                      <button onClick={() => cloturerNC(nc.id)} className="text-emerald-600 text-xs hover:underline font-medium">
                        {langue === "fr" ? "Cloturer" : "Close"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {nonConformites.length === 0 && (
                <tr><td colSpan={6} className="p-4 text-center text-slate-500">Aucune non-conformite.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Epreuves beton */}
      <section className="mb-6">
        <h2 className="mb-4 text-lg font-bold text-slate-900">
          {langue === "fr" ? "Suivi des éprouvettes beton" : "Concrete samples tracking"}
        </h2>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left">
                <th className="p-3 font-semibold text-slate-500">Date de coulage</th>
                <th className="p-3 font-semibold text-slate-500 text-center">Age (jours)</th>
                <th className="p-3 font-semibold text-slate-500 text-center">Resistance mesuree</th>
                <th className="p-3 font-semibold text-slate-500 text-center">Resistance exigee</th>
                <th className="p-3 font-semibold text-slate-500 text-center">Statut</th>
              </tr>
            </thead>
            <tbody>
              {epreuves.map((ep) => (
                <tr key={ep.id} className={`border-b border-slate-100 ${!ep.conforme ? "bg-rose-50" : ""}`}>
                  <td className="p-3 text-sm text-slate-600">{new Date(ep.date_coulage).toLocaleDateString(langue === "fr" ? "fr-FR" : "en-US")}</td>
                  <td className="p-3 text-sm text-center text-slate-600">{ep.age_jours}</td>
                  <td className="p-3 text-sm text-center text-slate-600">{ep.resistance_mesuree ?? "-"}</td>
                  <td className="p-3 text-sm text-center text-slate-600">{ep.resistance_exigee}</td>
                  <td className="p-3 text-center">
                    <Badge variant={ep.conforme ? "success" : "danger"}>
                      {ep.conforme ? (langue === "fr" ? "Conforme" : "Conforming") : (langue === "fr" ? "NON CONFORME" : "NON CONFORMING")}
                    </Badge>
                  </td>
                </tr>
              ))}
              {epreuves.length === 0 && (
                <tr><td colSpan={5} className="p-4 text-center text-slate-500">Aucune eprouvette enregistree.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}