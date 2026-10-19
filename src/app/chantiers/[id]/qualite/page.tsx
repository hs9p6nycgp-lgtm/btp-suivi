"use client";

import { BadgeCheck, ClipboardCheck, FlaskConical, ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { estConforme } from "@/lib/calculs/qualite";
import PlansControleQualite from "@/components/qualite/PlansControleQualite";
import {
  nomParametre,
  parametresEquivalents,
  type PlanControle,
} from "@/lib/qualite/plansControle";
import {
  cheminPhotoNonConformite,
  etatEcheanceNC,
  formaterDateNC,
  libelleGraviteNC,
  libelleStatutNC,
  validerSuiviNC,
} from "@/lib/qualite/nonConformites";
import { compresserImage } from "@/lib/photos/compression";
import { BUCKET_PHOTOS, urlsSignees } from "@/lib/photos/urls";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StatCard } from "@/components/ui/StatCard";
import { getLangue, traduireErreur } from "@/lib/i18n";

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
  const router = useRouter();
  const chantierId = String(params?.id ?? "");
  const langue = getLangue();

  const [plans, setPlans] = useState<PlanControle[]>([]);
  const [typeChantier, setTypeChantier] = useState<string>("route");
  const [essais, setEssais] = useState<Essai[]>([]);
  const [nonConformites, setNonConformites] = useState<NonConformite[]>([]);
  const [epreuves, setEpreuves] = useState<EpreuveBeton[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  // Suivi d'une fiche de non-conformité (responsable, action corrective, échéance)
  const [ncEnTraitement, setNcEnTraitement] = useState<NonConformite | null>(null);
  const [ncResponsable, setNcResponsable] = useState("");
  const [ncAction, setNcAction] = useState("");
  const [ncEcheance, setNcEcheance] = useState("");
  const [ncMessage, setNcMessage] = useState<string | null>(null);

  // Photos jointes aux fiches de non-conformité
  const [photosNC, setPhotosNC] = useState<Record<string, { chemin: string; legende: string | null; url: string | null }[]>>({});
  const [photoNCFichier, setPhotoNCFichier] = useState<File | null>(null);
  const [photoNCLegende, setPhotoNCLegende] = useState("");
  const [apercuNC, setApercuNC] = useState<string | null>(null);
  const [envoiPhoto, setEnvoiPhoto] = useState(false);

  // QUA-04 : formulaire nouvel éprouvette béton
  const [nouvelleDateCoulage, setNouvelleDateCoulage] = useState<Date | null>(null);
  const [nouvelAgeJours, setNouvelAgeJours] = useState<number | null>(null);
  const [nouvelleResistanceMesuree, setNouvelleResistanceMesuree] = useState<number>(0);
  const [nouvelleResistanceExigee, setNouvelleResistanceExigee] = useState<number>(0);

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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/login"); return; }
    const { data: chantier } = await supabase.from("chantiers").select("id, type").eq("id", chantierId).eq("proprietaire_id", user.id).maybeSingle();
    if (!chantier) { router.replace("/chantiers"); return; }
    setTypeChantier((chantier as { type?: string }).type ?? "route");
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
    await chargerPhotosNC(ncRes.data ?? []);
    setLoading(false);
  }

  /** Charge les photos des fiches de non-conformité et signe leurs URL. */
  async function chargerPhotosNC(nonConformites: { id: string }[]) {
    const ids = nonConformites.map((n) => n.id);
    if (ids.length === 0) {
      setPhotosNC({});
      return;
    }
    const supabase = createClient();
    const { data } = await supabase
      .from("photos_non_conformite")
      .select("id,non_conformite_id,chemin,legende")
      .in("non_conformite_id", ids);
    const urls = await urlsSignees((data ?? []).map((p: any) => p.chemin));
    const parNc: Record<string, { chemin: string; legende: string | null; url: string | null }[]> = {};
    for (const p of (data ?? []) as any[]) {
      const liste = parNc[p.non_conformite_id] ?? [];
      liste.push({ chemin: p.chemin, legende: p.legende ?? null, url: urls.get(p.chemin) ?? null });
      parNc[p.non_conformite_id] = liste;
    }
    setPhotosNC(parNc);
  }

  /** Joint une photo à la fiche de non-conformité traitée. */
  async function ajouterPhotoNC() {
    if (!ncEnTraitement || !photoNCFichier) return;
    setEnvoiPhoto(true);
    setNcMessage(null);
    const supabase = createClient();
    const fichier = await compresserImage(photoNCFichier);
    const chemin = cheminPhotoNonConformite(ncEnTraitement.id, fichier.name, Date.now());
    const { error: errUpload } = await supabase.storage
      .from(BUCKET_PHOTOS)
      .upload(chemin, fichier, { upsert: false });
    if (errUpload) {
      setEnvoiPhoto(false);
      setNcMessage(
        langue === "fr"
          ? "La photo n'a pas pu être envoyée : réessayez une fois le réseau revenu."
          : "The photo could not be uploaded: try again when the network is back.",
      );
      return;
    }
    const { error: errInsert } = await supabase.from("photos_non_conformite").insert({
      non_conformite_id: ncEnTraitement.id,
      chemin,
      legende: photoNCLegende.trim() || null,
    });
    setEnvoiPhoto(false);
    if (errInsert) {
      setNcMessage(traduireErreur(errInsert));
      return;
    }
    setPhotoNCFichier(null);
    setPhotoNCLegende("");
    setApercuNC(null);
    await chargerPhotosNC(nonConformites);
  }

  async function ajouterEssai(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const supabase = createClient();
    const valeur = Number(nouvelleValeur) || 0;
    const plan = plans.find((p) => parametresEquivalents(nomParametre(p), nouvelEssaiType));
    const valeurExigee = plan ? plan.valeur_exigee : 0;
    const tolPos = plan ? plan.tolerance_pos : 0;
    const tolNeg = plan ? plan.tolerance_neg : 0;
    const conforme = estConforme(valeur, valeurExigee, tolPos, tolNeg);

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
    if (error) { setMessage(traduireErreur(error)); return; }
    setNouvelEssaiType("");
    setNouvelleValeur("");
    setNouvelleSection("");
    setNouveauResponsable("");
    setNouvellesObservations("");
    setMessage(conforme ? (langue === "fr" ? "Essai conforme enregistre." : "Conforming test recorded.") : (langue === "fr" ? "Essai NON CONFORME - Fiche NC creee." : "Non-conforming test - NC sheet created."));
    load();
  }

  // Ouvre le traitement d'une fiche : responsable, action corrective, échéance
  function ouvrirSuiviNC(nc: NonConformite) {
    setNcEnTraitement(nc);
    setNcResponsable(nc.responsable ?? "");
    setNcAction(nc.action_corrective ?? "");
    setNcEcheance(nc.echeance ?? "");
    setNcMessage(null);
  }

  function fermerSuiviNC() {
    setNcEnTraitement(null);
    setNcMessage(null);
  }

  async function enregistrerSuiviNC(cloturer: boolean) {
    if (!ncEnTraitement) return;
    const controle = validerSuiviNC(
      { responsable: ncResponsable, action_corrective: ncAction, echeance: ncEcheance },
      { cloture: cloturer },
    );
    if (!controle.ok) {
      setNcMessage(controle.erreurs.join(" "));
      return;
    }
    setNcMessage(null);
    const supabase = createClient();
    const champs: Record<string, unknown> = {
      responsable: ncResponsable.trim(),
      action_corrective: ncAction.trim(),
      echeance: ncEcheance || null,
    };
    if (cloturer) {
      champs.statut = "cloturee";
      champs.date_cloture = new Date().toISOString().slice(0, 10);
    }
    const { error } = await supabase
      .from("non_conformites")
      .update(champs)
      .eq("id", ncEnTraitement.id);
    if (error) {
      setNcMessage(traduireErreur(error));
      return;
    }
    setMessage(
      langue === "fr"
        ? cloturer
          ? "Fiche de non-conformité clôturée."
          : "Suivi de la non-conformité enregistré."
        : cloturer
          ? "Non-conformity closed."
          : "Non-conformity follow-up saved.",
    );
    fermerSuiviNC();
    load();
  }

  // QUA-04 : ajout d'éprouvette béton (7, 14, 28 jours)
  async function ajouterEpreuve(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const supabase = createClient();
    const conform = estConforme(nouvelleResistanceMesuree, nouvelleResistanceExigee, 0, 0);
    const { data, error } = await supabase.from("epreuves_beton").insert({
      chantier_id: chantierId,
      section_id: null,
      date_coulage: nouvelleDateCoulage?.toISOString().slice(0, 10) || new Date().toISOString().slice(0, 10),
      age_jours: nouvelAgeJours ?? 0,
      resistance_mesuree: nouvelleResistanceMesuree,
      resistance_exigee: nouvelleResistanceExigee,
      conforme: conform,
    }).select().single();

    if (error) { setMessage(traduireErreur(error)); setLoading(false); return; }
    setEpreuves((prev) => [...prev, data as EpreuveBeton]);
    setNouvelleDateCoulage(null);
    setNouvelAgeJours(null);
    setNouvelleResistanceMesuree(0);
    setNouvelleResistanceExigee(0);
    setMessage(conform ? (langue === "fr" ? "Éprouvette enregistrée — conforme." : "Sample recorded — compliant.") : (langue === "fr" ? "Éprouvette enregistrée — NON conforme." : "Sample recorded — NON compliant."));
    setLoading(false);
    load();
  }

  const nbNC = nonConformites.filter((nc) => nc.statut !== "cloturee").length;
  const nbEssais = essais.length;
  const nbConformes = essais.filter((e) => e.conforme).length;
  const tauxConformite = nbEssais > 0 ? Math.round((nbConformes / nbEssais) * 100) : 100;

  return (
    <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
      <PageHeader
        eyebrow={langue === "fr" ? "Suivi de chantier" : "Site tracking"}
        title={langue === "fr" ? "Qualité & Contrôle" : "Quality & Control"}
        description={
          langue === "fr"
            ? "Essais de contrôle, non-conformités et suivi des éprouvettes béton."
            : "Control tests, non-conformities and concrete sample tracking."
        }
        icon={<ClipboardCheck className="h-5 w-5" />}
        actions={
          <Link
            href={`/chantiers/${chantierId}`}
            className="inline-flex items-center gap-2 rounded-xl border border-border/80 bg-surface px-3.5 py-2 text-sm font-semibold text-muted shadow-sm transition hover:border-primary-light/50 hover:text-foreground"
          >
            <span>←</span>
            {langue === "fr" ? "Retour au chantier" : "Back to site"}
          </Link>
        }
      />

      {message && (
        <div className="anim-fade-up mb-4 rounded-xl border border-primary/30 bg-primary/10 p-3 text-sm text-foreground">
          {message}
        </div>
      )}

      {/* Statistiques */}
      <div className="anim-fade-up anim-delay-1 mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
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
      <section className="anim-fade-up anim-delay-2 mb-6">
        <Card padding="lg">
          <h2 className="mb-4 text-lg font-bold text-foreground">
            {langue === "fr" ? "Taux de conformité" : "Compliance rate"}
          </h2>
          <ProgressBar value={tauxConformite} color="success" label={langue === "fr" ? "Conformité des essais" : "Test compliance"} />
        </Card>
      </section>

      {/* Plan de contrôle (QUA-01) */}
      <section className="anim-fade-up anim-delay-2 mb-6">
        <PlansControleQualite
          chantierId={chantierId}
          typeOuvrage={typeChantier}
          plans={plans}
          onReload={load}
        />
      </section>

      {/* Formulaire d'un nouvel essai */}
      <section className="anim-fade-up anim-delay-3 mb-6">
        <Card padding="lg">
          <h2 className="mb-4 text-lg font-bold text-foreground">
            {langue === "fr" ? "Nouvel essai de contrôle" : "New control test"}
          </h2>
          <form onSubmit={ajouterEssai} className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <select
              className="rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10"
              value={nouvelEssaiType}
              onChange={(e) => setNouvelEssaiType(e.target.value)}
              required
            >
              <option value="">{langue === "fr" ? "Sélectionner un paramètre" : "Select a parameter"}</option>
              {plans.map((p) => (
                <option key={p.id} value={nomParametre(p)}>
                  {nomParametre(p)} ({p.unite})
                </option>
              ))}
            </select>
            {plans.length === 0 && (
              <p className="text-xs text-muted md:col-span-4">
                {langue === "fr"
                  ? "Aucun paramètre de contrôle : créez d'abord un plan de contrôle (ci-dessus), sinon l'essai ne pourra pas être vérifié."
                  : "No control parameter: create a control plan first (above), otherwise the test cannot be checked."}
              </p>
            )}
            <input
              className="rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10"
              type="number"
              step="0.01"
              placeholder={langue === "fr" ? "Valeur mesurée" : "Measured value"}
              value={nouvelleValeur}
              onChange={(e) => setNouvelleValeur(e.target.value)}
              required
            />
            <input
              className="rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10"
              placeholder={langue === "fr" ? "Section (optionnel)" : "Section (optional)"}
              value={nouvelleSection}
              onChange={(e) => setNouvelleSection(e.target.value)}
            />
            <input
              className="rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10"
              placeholder={langue === "fr" ? "Responsable (optionnel)" : "Owner (optional)"}
              value={nouveauResponsable}
              onChange={(e) => setNouveauResponsable(e.target.value)}
            />
            <textarea
              className="rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10 md:col-span-4"
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
      <section className="anim-fade-up anim-delay-4 mb-6">
        <h2 className="mb-4 flex items-center gap-2.5 text-lg font-bold text-foreground">
          <span className="h-5 w-1.5 rounded-full bg-gradient-to-b from-action to-action-strong" aria-hidden />
          {langue === "fr" ? "Essais de contrôle" : "Control tests"}
        </h2>
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/80 bg-surface-2 text-left">
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted">Date</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted">Paramètre</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted">Mesure</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted">Exigé</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted">Unité</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted">Statut</th>
                </tr>
              </thead>
              <tbody>
                {essais.map((e) => (
                  <tr key={e.id} className={`border-b border-border/60 transition last:border-0 hover:bg-surface-2/70 ${!e.conforme ? "bg-danger/5" : ""}`}>
                    <td className="px-4 py-3">{new Date(e.date_controle).toLocaleDateString(langue === "fr" ? "fr-FR" : "en-US")}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{e.type_controle}</td>
                    <td className="px-4 py-3 text-center tabular-nums">{e.valeur_mesuree}</td>
                    <td className="px-4 py-3 text-center tabular-nums">{e.valeur_exigee}</td>
                    <td className="px-4 py-3 text-center text-muted">{e.unite}</td>
                    <td className="px-4 py-3 text-center">
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
        </Card>
      </section>

      {/* Non-conformités */}
      <section className="anim-fade-up anim-delay-5 mb-6">
        <h2 className="mb-4 flex items-center gap-2.5 text-lg font-bold text-foreground">
          <span className="h-5 w-1.5 rounded-full bg-gradient-to-b from-action to-action-strong" aria-hidden />
          {langue === "fr" ? "Fiches de non-conformité" : "Non-conformity sheets"}
        </h2>
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/80 bg-surface-2 text-left">
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted">Description</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted">Gravité</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted">Statut</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted">Responsable</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted">Action corrective</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted">Photos</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted">Échéance</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted">Action</th>
                </tr>
              </thead>
              <tbody>
                {nonConformites.map((nc) => {
                  const echeance = etatEcheanceNC(nc);
                  return (
                    <tr key={nc.id} className={`border-b border-border/60 transition last:border-0 hover:bg-surface-2/70 ${nc.statut !== "cloturee" ? "bg-warning/10" : ""}`}>
                      <td className="px-4 py-3">{nc.description}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={nc.gravite === "critique" ? "danger" : nc.gravite === "majeure" ? "warning" : "info"}>
                          {libelleGraviteNC(nc.gravite)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={nc.statut === "cloturee" ? "success" : "warning"}>
                          {libelleStatutNC(nc.statut)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center text-muted">{nc.responsable ?? "—"}</td>
                      <td className="px-4 py-3 text-xs text-muted">
                        {nc.action_corrective ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        {(photosNC[nc.id] ?? []).length === 0 ? (
                          <span className="text-xs text-muted">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {(photosNC[nc.id] ?? []).map((photo) => (
                              <a
                                key={photo.chemin}
                                href={photo.url ?? "#"}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={photo.legende ?? "Photo de la non-conformité"}
                              >
                                {photo.url ? (
                                  <img
                                    src={photo.url}
                                    alt={photo.legende ?? "Non-conformité"}
                                    className="h-10 w-10 rounded-lg border border-border object-cover"
                                  />
                                ) : (
                                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border text-[10px] text-muted">
                                    NC
                                  </span>
                                )}
                              </a>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <p className="text-muted">{formaterDateNC(nc.echeance) || "—"}</p>
                        {echeance.enRetard && (
                          <Badge variant="danger">{echeance.libelle}</Badge>
                        )}
                        {!echeance.enRetard && !echeance.clos && nc.echeance && (
                          <p className="text-[11px] text-muted">{echeance.libelle}</p>
                        )}
                        {echeance.clos && nc.date_cloture && (
                          <p className="text-[11px] text-muted">Clôturée le {formaterDateNC(nc.date_cloture)}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {nc.statut !== "cloturee" && (
                          <Button variant="secondary" size="sm" onClick={() => ouvrirSuiviNC(nc)}>
                            {langue === "fr" ? "Traiter" : "Handle"}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {ncEnTraitement && (
                  <tr className="border-b border-border/60 bg-surface-2/60">
                    <td colSpan={8} className="px-4 py-4">
                      <p className="mb-3 text-sm font-semibold text-foreground">
                        {langue === "fr" ? "Traitement de la non-conformité" : "Non-conformity follow-up"}
                      </p>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                        <input
                          className="rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10"
                          placeholder={langue === "fr" ? "Responsable *" : "Owner *"}
                          value={ncResponsable}
                          onChange={(e) => setNcResponsable(e.target.value)}
                        />
                        <input
                          className="rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10 md:col-span-2"
                          placeholder={langue === "fr" ? "Action corrective *" : "Corrective action *"}
                          value={ncAction}
                          onChange={(e) => setNcAction(e.target.value)}
                        />
                        <input
                          className="rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10"
                          type="date"
                          value={ncEcheance}
                          onChange={(e) => setNcEcheance(e.target.value)}
                        />
                      </div>
                      {ncMessage && (
                        <p className="mt-2 rounded-xl border border-danger/40 bg-danger/10 p-2.5 text-xs text-foreground">
                          {ncMessage}
                        </p>
                      )}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button size="sm" onClick={() => enregistrerSuiviNC(false)}>
                          {langue === "fr" ? "Enregistrer" : "Save"}
                        </Button>
                        <Button size="sm" variant="success" onClick={() => enregistrerSuiviNC(true)}>
                          {langue === "fr" ? "Enregistrer et clôturer" : "Save and close"}
                        </Button>
                        <Button size="sm" variant="outline" onClick={fermerSuiviNC}>
                          {langue === "fr" ? "Annuler" : "Cancel"}
                        </Button>
                      </div>

                      {/* Photo du défaut (QUA-03) */}
                      <div className="mt-4 rounded-xl border border-border/70 bg-surface/60 p-3">
                        <p className="text-xs font-semibold text-foreground">
                          {langue === "fr" ? "Photo du défaut" : "Photo of the defect"}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="text-xs"
                            onChange={(e) => {
                              const fichier = e.target.files?.[0] ?? null;
                              setPhotoNCFichier(fichier);
                              if (apercuNC) URL.revokeObjectURL(apercuNC);
                              setApercuNC(fichier ? URL.createObjectURL(fichier) : null);
                            }}
                          />
                          <input
                            className="min-w-40 flex-1 rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10"
                            placeholder={langue === "fr" ? "Légende (facultatif)" : "Caption (optional)"}
                            value={photoNCLegende}
                            onChange={(e) => setPhotoNCLegende(e.target.value)}
                          />
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={ajouterPhotoNC}
                            disabled={!photoNCFichier || envoiPhoto}
                          >
                            {envoiPhoto
                              ? (langue === "fr" ? "Envoi..." : "Sending...")
                              : (langue === "fr" ? "Joindre" : "Attach")}
                          </Button>
                        </div>
                        {apercuNC && (
                          <img
                            src={apercuNC}
                            alt={langue === "fr" ? "Aperçu de la photo" : "Photo preview"}
                            className="mt-2 h-20 w-20 rounded-lg border border-border object-cover"
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                )}
                {nonConformites.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-4 text-center text-muted">Aucune non-conformité.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      {/* QUA-04 : formulaire nouvel éprouvette béton */}
      <section className="anim-fade-up anim-delay-2 mb-6">
        <Card padding="lg">
          <h2 className="mb-4 flex items-center gap-2.5 text-lg font-bold text-foreground">
            <span className="h-5 w-1.5 rounded-full bg-gradient-to-b from-action to-action-strong" aria-hidden />
            {langue === "fr" ? "Nouvelle éprouvette béton" : "New concrete sample"}
          </h2>
          <form onSubmit={ajouterEpreuve} className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Date de coulage *</label>
              <input
                type="date"
                className="rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10"
                value={nouvelleDateCoulage ? nouvelleDateCoulage.toISOString().slice(0, 10) : ""}
                onChange={(e) => {
                  const val = (e.target as HTMLInputElement).value;
                  setNouvelleDateCoulage(val ? new Date(val) : null);
                }}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Âge (jours) *</label>
              <input
                type="number"
                className="rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10"
                min="7" max="28" step="1"
                value={nouvelAgeJours != null ? String(nouvelAgeJours) : ""}
                onChange={(e) => {
                  const val = Number((e.target as HTMLInputElement).value);
                  setNouvelAgeJours(val >= 7 && val <= 28 ? val : null);
                }}
                required
              />
              <span className="text-xs text-muted ml-2">7, 14 ou 28</span>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Résistance mesurée (MPa) *</label>
              <input
                type="number"
                className="rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10"
                step="0.1"
                value={nouvelleResistanceMesuree}
                onChange={(e) => {
                  const val = Number((e.target as HTMLInputElement).value);
                  setNouvelleResistanceMesuree(isNaN(val) ? 0 : val);
                }}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Résistance exigée (MPa) *</label>
              <input
                type="number"
                className="rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10"
                step="0.1"
                value={nouvelleResistanceExigee}
                onChange={(e) => {
                  const val = Number((e.target as HTMLInputElement).value);
                  setNouvelleResistanceExigee(isNaN(val) ? 0 : val);
                }}
                required
              />
            </div>
            <Button type="submit" disabled={loading} className="md:col-span-4">
              {loading ? (langue === "fr" ? "Enregistrement..." : "Recording...") : (langue === "fr" ? "Enregistrer" : "Record")}
            </Button>
          </form>
        </Card>
      </section>

      {/* Éprouvettes béton */}
      <section className="anim-fade-up anim-delay-6">
        <h2 className="mb-4 flex items-center gap-2.5 text-lg font-bold text-foreground">
          <span className="h-5 w-1.5 rounded-full bg-gradient-to-b from-action to-action-strong" aria-hidden />
          {langue === "fr" ? "Suivi des éprouvettes béton" : "Concrete samples tracking"}
        </h2>
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/80 bg-surface-2 text-left">
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted">Date de coulage</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted">Âge (jours)</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted">Résistance mesurée</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted">Résistance exigée</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted">Statut</th>
                </tr>
              </thead>
              <tbody>
                {epreuves.map((ep) => (
                  <tr key={ep.id} className={`border-b border-border/60 transition last:border-0 hover:bg-surface-2/70 ${!ep.conforme ? "bg-danger/5" : ""}`}>
                    <td className="px-4 py-3">{new Date(ep.date_coulage).toLocaleDateString(langue === "fr" ? "fr-FR" : "en-US")}</td>
                    <td className="px-4 py-3 text-center tabular-nums">{ep.age_jours}</td>
                    <td className="px-4 py-3 text-center tabular-nums">{ep.resistance_mesuree ?? "-"}</td>
                    <td className="px-4 py-3 text-center tabular-nums">{ep.resistance_exigee}</td>
                    <td className="px-4 py-3 text-center">
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
        </Card>
      </section>
    </main>
  );
}
