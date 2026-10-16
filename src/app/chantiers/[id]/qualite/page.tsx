"use client";

import { BadgeCheck, ClipboardCheck, FlaskConical, ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StatCard } from "@/components/ui/StatCard";
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
    <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href={`/chantiers/${chantierId}`} className="text-sm font-medium text-primary hover:underline">
            &larr; Retour chantier
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-foreground md:text-3xl">
            {langue === "fr" ? "Qualité & Contrôle" : "Quality & Control"}
          </h1>
        </div>
      </div>

      {message && (
        <div className="mb-4 rounded-xl border border-primary/30 bg-primary/10 p-3 text-sm text-foreground">
          {message}
        </div>
      )}

      {/* Statistiques */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title={langue === "fr" ? "Essais" : "Tests"}
          value={nbEssais}
          icon={<FlaskConical className="h-5 w-5" />}
          color="blue"
        />
        <StatCard
          title={langue === "fr" ? "Taux de conformité" : "Compliance rate"}
          value={`${tauxConformite}%`}
          icon={<BadgeCheck className="h-5 w-5" />}
          color="emerald"
        />
        <StatCard
          title={langue === "fr" ? "Non-conformités actives" : "Active non-conformities"}
          value={nbNC}
          icon={<ShieldAlert className="h-5 w-5" />}
          color="rose"
        />
        <StatCard
          title={langue === "fr" ? "Éprouvettes béton" : "Concrete samples"}
          value={epreuves.length}
          icon={<ClipboardCheck className="h-5 w-5" />}
          color="amber"
        />
      </div>

      {/* Taux de conformité */}
      <section className="mb-6">
        <Card padding="lg">
          <h2 className="mb-4 text-lg font-bold text-foreground">
            {langue === "fr" ? "Taux de conformité" : "Compliance rate"}
          </h2>
          <ProgressBar value={tauxConformite} color="success" label={langue === "fr" ? "Conformité des essais" : "Test compliance"} />
        </Card>
      </section>

      {/* Formulaire d'un nouvel essai */}
      <section className="mb-6">
        <Card padding="lg">
          <h2 className="mb-4 text-lg font-bold text-foreground">
            {langue === "fr" ? "Nouvel essai de contrôle" : "New control test"}
          </h2>
          <form onSubmit={ajouterEssai} className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <select
              className="rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none focus:border-primary dark:bg-slate-800 dark:text-slate-200"
              value={nouvelEssaiType}
              onChange={(e) => setNouvelEssaiType(e.target.value)}
              required
            >
              <option value="">{langue === "fr" ? "Sélectionner un paramètre" : "Select a parameter"}</option>
              {plans.map((p) => (
                <option key={p.id} value={p.parametre}>
                  {p.parametre} ({p.unite})
                </option>
              ))}
            </select>
            <input
              className="rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none focus:border-primary dark:bg-slate-800 dark:text-slate-200"
              type="number"
              step="0.01"
              placeholder={langue === "fr" ? "Valeur mesurée" : "Measured value"}
              value={nouvelleValeur}
              onChange={(e) => setNouvelleValeur(e.target.value)}
              required
            />
            <input
              className="rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none focus:border-primary dark:bg-slate-800 dark:text-slate-200"
              placeholder={langue === "fr" ? "Section (optionnel)" : "Section (optional)"}
              value={nouvelleSection}
              onChange={(e) => setNouvelleSection(e.target.value)}
            />
            <input
              className="rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none focus:border-primary dark:bg-slate-800 dark:text-slate-200"
              placeholder={langue === "fr" ? "Responsable (optionnel)" : "Owner (optional)"}
              value={nouveauResponsable}
              onChange={(e) => setNouveauResponsable(e.target.value)}
            />
            <textarea
              className="rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none focus:border-primary dark:bg-slate-800 dark:text-slate-200 md:col-span-4"
              rows={2}
              placeholder={langue === "fr" ? "Observations (optionnel)" : "Observations (optional)"}
              value={nouvellesObservations}
              onChange={(e) => setNouvellesObservations(e.target.value)}
            />
            <Button type="submit" disabled={loading} className="md:col-span-4">
              {langue === "fr" ? "Enregistrer l'essai" : "Record test"}
            </Button>
          </form>
        </Card>
      </section>

      {/* Essais */}
      <section className="mb-6">
        <h2 className="mb-4 text-lg font-bold text-foreground">
          {langue === "fr" ? "Essais de contrôle" : "Control tests"}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="p-3 font-semibold text-muted">Date</th>
                <th className="p-3 font-semibold text-muted">Paramètre</th>
                <th className="p-3 text-center font-semibold text-muted">Mesure</th>
                <th className="p-3 text-center font-semibold text-muted">Exige</th>
                <th className="p-3 text-center font-semibold text-muted">Unité</th>
                <th className="p-3 text-center font-semibold text-muted">Statut</th>
              </tr>
            </thead>
            <tbody>
              {essais.map((e) => (
                <tr key={e.id} className={`border-b border-border last:border-0 ${!e.conforme ? "bg-danger/5" : ""}`}>
                  <td className="p-3">{new Date(e.date_controle).toLocaleDateString(langue === "fr" ? "fr-FR" : "en-US")}</td>
                  <td className="p-3 font-medium text-foreground">{e.type_controle}</td>
                  <td className="p-3 text-center">{e.valeur_mesuree}</td>
                  <td className="p-3 text-center">{e.valeur_exigee}</td>
                  <td className="p-3 text-center text-muted">{e.unite}</td>
                  <td className="p-3 text-center">
                    <Badge variant={e.conforme ? "success" : "danger"}>
                      {e.conforme ? (langue === "fr" ? "Conforme" : "Conforming") : (langue === "fr" ? "NON CONFORME" : "NON CONFORMING")}
                    </Badge>
                  </td>
                </tr>
              ))}
              {essais.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-muted">Aucun essai saisi.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Non-conformités */}
      <section className="mb-6">
        <h2 className="mb-4 text-lg font-bold text-foreground">
          {langue === "fr" ? "Fiches de non-conformité" : "Non-conformity sheets"}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="p-3 font-semibold text-muted">Description</th>
                <th className="p-3 font-semibold text-muted text-center">Gravité</th>
                <th className="p-3 font-semibold text-muted text-center">Statut</th>
                <th className="p-3 font-semibold text-muted text-center">Responsable</th>
                <th className="p-3 font-semibold text-muted text-center">Échéance</th>
                <th className="p-3 font-semibold text-muted text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {nonConformites.map((nc) => (
                <tr key={nc.id} className={`border-b border-border last:border-0 ${nc.statut !== "cloturee" ? "bg-warning/10" : ""}`}>
                  <td className="p-3">{nc.description}</td>
                  <td className="p-3 text-center">
                    <Badge variant={nc.gravite === "critique" ? "danger" : nc.gravite === "majeure" ? "warning" : "info"}>
                      {nc.gravite}
                    </Badge>
                  </td>
                  <td className="p-3 text-center">
                    <Badge variant={nc.statut === "cloturee" ? "success" : "warning"}>
                      {nc.statut}
                    </Badge>
                  </td>
                  <td className="p-3 text-center text-muted">{nc.responsable ?? "-"}</td>
                  <td className="p-3 text-center text-muted">{nc.echeance ?? "-"}</td>
                  <td className="p-3 text-center">
                    {nc.statut !== "cloturee" && (
                      <Button variant="secondary" size="sm" onClick={() => cloturerNC(nc.id)}>
                        {langue === "fr" ? "Cloturer" : "Close"}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {nonConformites.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-muted">Aucune non-conformité.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Éprouvettes béton */}
      <section>
        <h2 className="mb-4 text-lg font-bold text-foreground">
          {langue === "fr" ? "Suivi des éprouvettes béton" : "Concrete samples tracking"}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="p-3 font-semibold text-muted">Date de coulage</th>
                <th className="p-3 font-semibold text-muted text-center">Âge (jours)</th>
                <th className="p-3 font-semibold text-muted text-center">Résistance mesurée</th>
                <th className="p-3 font-semibold text-muted text-center">Résistance exigée</th>
                <th className="p-3 font-semibold text-muted text-center">Statut</th>
              </tr>
            </thead>
            <tbody>
              {epreuves.map((ep) => (
                <tr key={ep.id} className={`border-b border-border last:border-0 ${!ep.conforme ? "bg-danger/5" : ""}`}>
                  <td className="p-3">{new Date(ep.date_coulage).toLocaleDateString(langue === "fr" ? "fr-FR" : "en-US")}</td>
                  <td className="p-3 text-center">{ep.age_jours}</td>
                  <td className="p-3 text-center">{ep.resistance_mesuree ?? "-"}</td>
                  <td className="p-3 text-center">{ep.resistance_exigee}</td>
                  <td className="p-3 text-center">
                    <Badge variant={ep.conforme ? "success" : "danger"}>
                      {ep.conforme ? (langue === "fr" ? "Conforme" : "Conforming") : (langue === "fr" ? "NON CONFORME" : "NON CONFORMING")}
                    </Badge>
                  </td>
                </tr>
              ))}
              {epreuves.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-muted">Aucune éprouvette enregistrée.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
