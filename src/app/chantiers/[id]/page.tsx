"use client";

import {
  AlertTriangle,
  BookOpen,
  Box,
  CalendarRange,
  Calculator,
  ClipboardCheck,
  Coins,
  Copy,
  ExternalLink,
  MapPin,
  Pencil,
  Printer,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import DqeImport from "@/components/DqeImport";
import ChantierEquipe from "@/components/ChantierEquipe";
import ChantierAvancement from "@/components/ChantierAvancement";
import ChantierSections, { type SectionChantier } from "@/components/ChantierSections";
import ChantierIntervenants from "@/components/ChantierIntervenants";
import ChantierDocuments from "@/components/ChantierDocuments";
import ChantierSuiviRapide from "@/components/ChantierSuiviRapide";
import CourbeAvancement from "@/components/CourbeAvancement";
import Modele3D from "@/components/visualisation/Modele3D";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { getLangue } from "@/lib/i18n";
import { libelleTypeDetail } from "@/lib/chantiers/types";
import { avancementMoyenSections, avancementParNiveau, etatEcheance, formaterMetres, joursRestants, longueurSection } from "@/lib/chantiers/complet";
import { descriptionOuvrage, niveauxDepuisChantier, surfacesOuvrage } from "@/lib/chantiers/detailsOuvrage";

type Chantier = {
  id: string;
  nom: string;
  type: string;
  type_detail: string | null;
  maitre_ouvrage: string | null;
  ville?: string | null;
  maitre_oeuvre?: string | null;
  entreprise?: string | null;
  numero_marche?: string | null;
  montant_marche: number;
  date_debut: string | null;
  date_fin_prevue: string | null;
  latitude: number | null;
  longitude: number | null;
  longueur: number | null;
  largeur: number | null;
  hauteur: number | null;
  nb_sous_sols?: number | null;
  nb_etages?: number | null;
  hauteur_niveau?: number | null;
  nb_travees_longueur?: number | null;
  nb_travees_largeur?: number | null;
  type_structure?: string | null;
  type_toiture?: string | null;
  nb_voies?: number | null;
  largeur_accotement?: number | null;
  type_revetement?: string | null;
  seuil_ecart_pct: number;
  statut: string;
  created_at: string;
};

// Couleurs volontairement limitées à la palette de StatCard : une couleur
// inconnue faisait planter toute la fiche (BUG-016 / T-UI-14, 18/10/2026).
const STATUT_LABELS: Record<string, { fr: string; en: string; color: "blue" | "emerald" | "amber" | "rose" }> = {
  en_preparation: { fr: "En préparation", en: "Preparation", color: "blue" },
  en_cours: { fr: "En cours", en: "In Progress", color: "emerald" },
  suspendu: { fr: "Suspendu", en: "Suspended", color: "amber" },
  receptionne_provisoirement: { fr: "Réceptionné prov.", en: "Provisional Acceptance", color: "blue" },
  cloture: { fr: "Clôturé", en: "Closed", color: "rose" },
};

function formaterDate(valeur: string | null | undefined): string {
  if (!valeur) return "—";
  const d = new Date(valeur.length <= 10 ? `${valeur}T00:00:00` : valeur);
  if (Number.isNaN(d.getTime())) return valeur;
  return d.toLocaleDateString("fr-FR");
}

export default function ChantierDetailPage() {
  const params = useParams();
  const router = useRouter();
  const chantierId = String(params?.id ?? "");
  const langue = getLangue();

  const [chantier, setChantier] = useState<Chantier | null>(null);
  const [postes, setPostes] = useState<any[]>([]);
  const [membres, setMembres] = useState<any[]>([]);
  const [sections, setSections] = useState<SectionChantier[]>([]);
  const [avancementSectionOk, setAvancementSectionOk] = useState(true);
  const [compteurs, setCompteurs] = useState({ alertes: 0, nonConformites: 0 });
  const [loading, setLoading] = useState(true);
  const [statut, setStatut] = useState("");

  const chargerSections = useCallback(async () => {
    if (!chantierId) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("sections_chantier")
      .select("*")
      .eq("chantier_id", chantierId)
      .order("created_at", { ascending: true });
    if (data) setSections(data as SectionChantier[]);
  }, [chantierId]);

  useEffect(() => {
    async function load() {
      if (!chantierId) return;
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }

      const [cRes, pRes, mRes, sRes, aRes, nRes, avRes] = await Promise.all([
        supabase.from("chantiers").select("*").eq("id", chantierId).eq("proprietaire_id", user.id).maybeSingle(),
        supabase.from("postes_dqe").select("*").eq("chantier_id", chantierId).order("created_at", { ascending: true }),
        supabase.from("chantier_utilisateurs").select("*, profil:profils(id,nom,email)").eq("chantier_id", chantierId),
        supabase
          .from("sections_chantier")
          .select("*")
          .eq("chantier_id", chantierId)
          .order("created_at", { ascending: true }),
        supabase
          .from("alertes")
          .select("id", { count: "exact", head: true })
          .eq("chantier_id", chantierId)
          .eq("statut", "ouverte"),
        supabase
          .from("non_conformites")
          .select("id", { count: "exact", head: true })
          .eq("chantier_id", chantierId)
          .in("statut", ["ouverte", "en_cours"]),
        supabase.from("sections_chantier").select("avancement_pct").limit(1),
      ]);

      if (cRes.data) setChantier(cRes.data as Chantier);
      else { router.replace("/chantiers"); return; }
      if (pRes.data) setPostes(pRes.data as any[]);
      if (mRes.data) setMembres(mRes.data as any[]);
      if (sRes.data) setSections(sRes.data as SectionChantier[]);
      setCompteurs({ alertes: aRes.count ?? 0, nonConformites: nRes.count ?? 0 });
      setAvancementSectionOk(!avRes.error);
      if (cRes.data?.statut) setStatut(cRes.data.statut);
      setLoading(false);
    }
    load();
  }, [chantierId, router]);

  if (!chantier || loading) {
    return (
      <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
        <div className="flex h-64 items-center justify-center">
          <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-border border-t-action" />
        </div>
      </main>
    );
  }

  const s = STATUT_LABELS[statut] || STATUT_LABELS.en_preparation;
  const jours = joursRestants(chantier.date_fin_prevue);
  const echeance = etatEcheance(chantier.date_fin_prevue, chantier.statut);
  const couleurEcheance =
    echeance === "depasse" ? "rose" : echeance === "proche" ? "amber" : echeance === "normal" ? "emerald" : "slate";
  const lineaire = sections.reduce((total, section) => total + (longueurSection(section.pk_debut, section.pk_fin) ?? 0), 0);
  const avancementGlobal = avancementMoyenSections(sections);
  const description = [...descriptionOuvrage(chantier), ...surfacesOuvrage(chantier)];
  const niveaux = chantier.type === "batiment" ? niveauxDepuisChantier(chantier) : [];
  const avancementNiveaux =
    chantier.type === "batiment" ? avancementParNiveau(sections, niveaux) : [];

  return (
    <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
      {/* Bandeau du chantier */}
      <div className="anim-fade-up relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-primary-deep p-6 text-white shadow-xl shadow-primary/20 md:p-8">
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-40" aria-hidden />
        <div
          className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full bg-action/25 blur-3xl"
          aria-hidden
        />
        <div className="relative">
          <Link
            href="/chantiers"
            className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-white/70 transition hover:text-white"
          >
            &larr; Retour aux chantiers
          </Link>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{chantier.nom}</h1>
              <p className="mt-1 text-sm text-white/70">
                {chantier.type === "route" ? "🛣️ Route" : "🏢 Bâtiment"}
                {chantier.ville ? ` — ${chantier.ville}` : ""}
                {chantier.maitre_ouvrage ? ` — ${chantier.maitre_ouvrage}` : ""}
                {chantier.entreprise ? ` — ${chantier.entreprise}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {chantier.type_detail ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-action/50 bg-action/20 px-3 py-1.5 text-xs font-semibold backdrop-blur">
                  <span className="h-1.5 w-1.5 rounded-full bg-action" aria-hidden />
                  {libelleTypeDetail(chantier.type_detail)}
                </span>
              ) : null}
              {/* Un seul affichage du statut (T-UI-21) : la pastille sert
                  aussi de menu de changement. */}
              <label className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold backdrop-blur">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    s.color === "emerald"
                      ? "bg-emerald-300"
                      : s.color === "amber"
                        ? "bg-amber-300"
                        : s.color === "rose"
                          ? "bg-rose-300"
                          : "bg-sky-300"
                  }`}
                  aria-hidden
                />
                <select
                  value={statut}
                  onChange={(e) => {
                    setStatut(e.target.value);
                    const supabase = createClient();
                    supabase.auth.getUser().then(({ data: { user } }) => {
                      supabase.from("chantiers").update({ statut: e.target.value }).eq("id", chantierId).eq("proprietaire_id", user?.id ?? "");
                    });
                  }}
                  aria-label={langue === "fr" ? "Statut du chantier" : "Site status"}
                  className="cursor-pointer appearance-none bg-transparent text-xs font-semibold text-white outline-none"
                >
                  {Object.entries(STATUT_LABELS).map(([key, label]) => (
                    <option key={key} value={key} className="text-foreground">{langue === "fr" ? label.fr : label.en}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {/* Repères du marché */}
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-white/75">
            <span>Début : {formaterDate(chantier.date_debut)}</span>
            <span>Fin prévue : {formaterDate(chantier.date_fin_prevue)}</span>
            <span>Seuil d&apos;alerte : {chantier.seuil_ecart_pct} %</span>
            {chantier.numero_marche && <span>Marché n° {chantier.numero_marche}</span>}
            {chantier.maitre_oeuvre && <span>Maître d&apos;œuvre : {chantier.maitre_oeuvre}</span>}
            {lineaire > 0 && <span>Linéaire : {formaterMetres(lineaire)}</span>}
          </div>

          {/* Accès rapides */}
          <div className="mt-5 flex flex-wrap gap-2">
            {[
              { href: `/chantiers/${chantier.id}/modifier`, label: langue === "fr" ? "Modifier le chantier" : "Edit site", icon: <Pencil className="h-4 w-4" /> },
              { href: `/chantiers/nouveau?modele=${chantier.id}`, label: langue === "fr" ? "Créer un chantier similaire" : "Create similar site", icon: <Copy className="h-4 w-4" /> },
              { href: `/chantiers/${chantier.id}/planning`, label: "Planning & PERT", icon: <CalendarRange className="h-4 w-4" /> },
              { href: `/chantiers/${chantier.id}/couts`, label: langue === "fr" ? "Coûts & Budget" : "Costs & Budget", icon: <Coins className="h-4 w-4" /> },
              { href: `/chantiers/${chantier.id}/qualite`, label: langue === "fr" ? "Qualité" : "Quality", icon: <ClipboardCheck className="h-4 w-4" /> },
              { href: `/chantiers/${chantier.id}/securite`, label: langue === "fr" ? "Sécurité (HSE)" : "Safety (HSE)", icon: <ShieldCheck className="h-4 w-4" /> },
              { href: `/chantiers/${chantier.id}/modelisation3d`, label: langue === "fr" ? "Modélisation 3D" : "3D Modeling", icon: <Box className="h-4 w-4" /> },
              { href: `/chantiers/${chantier.id}/imprimer`, label: langue === "fr" ? "Imprimer la fiche" : "Print sheet", icon: <Printer className="h-4 w-4" /> },
              { href: `/chantiers/${chantier.id}/carnet`, label: langue === "fr" ? "Imprimer le carnet" : "Print the logbook", icon: <BookOpen className="h-4 w-4" /> },
            ].map((lien) => (
              <Link
                key={lien.href}
                href={lien.href}
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3.5 py-2 text-sm font-semibold text-white backdrop-blur transition hover:border-white/30 hover:bg-white/20"
              >
                {lien.icon}
                {lien.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Chiffres clés du suivi */}
      <div className="anim-fade-up anim-delay-1 mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          className="h-full"
          title={langue === "fr" ? "Montant marché" : "Contract Amount"}
          value={chantier.montant_marche.toLocaleString(langue === "fr" ? "fr-FR" : "en-US")}
          subtitle="FCFA"
          icon={<Calculator className="h-5 w-5" />}
          color="blue"
        />
        <StatCard
          className="h-full"
          title={langue === "fr" ? "Jours restants" : "Days Remaining"}
          value={jours === null ? "—" : jours < 0 ? `${Math.abs(jours)} j de retard` : `${jours} j`}
          subtitle={`Fin prévue : ${formaterDate(chantier.date_fin_prevue)}`}
          icon={<CalendarRange className="h-5 w-5" />}
          color={couleurEcheance}
        />
        <StatCard
          className="h-full"
          title={langue === "fr" ? "Alertes ouvertes" : "Open Alerts"}
          value={compteurs.alertes}
          subtitle={langue === "fr" ? "écarts de quantité" : "quantity variances"}
          icon={<AlertTriangle className="h-5 w-5" />}
          color={compteurs.alertes > 0 ? "amber" : "emerald"}
        />
        <StatCard
          className="h-full"
          title={langue === "fr" ? "Non-conformités" : "Non-conformities"}
          value={compteurs.nonConformites}
          subtitle={langue === "fr" ? "ouvertes ou en cours" : "open or in progress"}
          icon={<ShieldAlert className="h-5 w-5" />}
          color={compteurs.nonConformites > 0 ? "rose" : "emerald"}
        />
      </div>

      {/* Découpage + localisation */}
      <div className="anim-fade-up anim-delay-2 mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChantierSections
            chantierId={chantier.id}
            typeChantier={chantier.type}
            sections={sections}
            onReload={chargerSections}
            avancementDisponible={avancementSectionOk}
            niveauxSuggeres={niveaux}
            longueurRoute={chantier.longueur}
          />
        </div>

        <Card padding="lg">
          <h2 className="flex items-center gap-2.5 text-lg font-bold text-foreground">
            <span className="h-5 w-1.5 rounded-full bg-gradient-to-b from-action to-action-strong" aria-hidden />
            Localisation GPS
          </h2>
          {chantier.latitude !== null && chantier.longitude !== null ? (
            <>
              <p className="mt-1 text-sm tabular-nums text-muted">
                {chantier.latitude}, {chantier.longitude}
              </p>
              <iframe
                title="Carte du chantier"
                loading="lazy"
                className="mt-4 h-64 w-full rounded-2xl border border-border/80"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${chantier.longitude - 0.01}%2C${chantier.latitude - 0.0075}%2C${chantier.longitude + 0.01}%2C${chantier.latitude + 0.0075}&layer=mapnik&marker=${chantier.latitude}%2C${chantier.longitude}`}
              />
              <div className="mt-3 flex flex-wrap gap-3 text-sm">
                <a
                  href={`https://www.openstreetmap.org/?mlat=${chantier.latitude}&mlon=${chantier.longitude}#map=15/${chantier.latitude}/${chantier.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                >
                  OpenStreetMap <ExternalLink className="h-3.5 w-3.5" />
                </a>
                <a
                  href={`https://www.google.com/maps?q=${chantier.latitude},${chantier.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                >
                  Google Maps <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </>
          ) : (
            <div className="mt-4 flex h-48 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-surface-2 text-sm text-muted">
              <MapPin className="h-6 w-6 text-primary" />
              Position non renseignée
              <Link href={`/chantiers/${chantier.id}/modifier`} className="font-semibold text-primary hover:underline">
                Ajouter la position
              </Link>
            </div>
          )}
        </Card>
      </div>

      {/* Avancement par niveau (batiment) */}
      {avancementNiveaux.length > 0 && (
        <div className="anim-fade-up anim-delay-2 mb-6">
          <Card padding="lg">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="flex items-center gap-2.5 text-lg font-bold text-foreground">
                  <span className="h-5 w-1.5 rounded-full bg-gradient-to-b from-action to-action-strong" aria-hidden />
                  Avancement par niveau
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Moyenne des sections de chaque niveau, du plus haut au sous-sol.
                </p>
              </div>
              <span className="text-xs font-medium text-muted">
                {avancementNiveaux.length} niveau{avancementNiveaux.length > 1 ? "x" : ""} suivi
                {avancementNiveaux.length > 1 ? "s" : ""}
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[...avancementNiveaux].reverse().map((niveau) => (
                <div
                  key={niveau.niveau}
                  className="rounded-xl border border-border/70 bg-surface-2/40 p-3"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-semibold text-foreground">{niveau.niveau}</span>
                    <span className="text-sm font-bold tabular-nums text-foreground">
                      {String(niveau.avancement).replace(".", ",")} %
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-action to-action-strong transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(0, niveau.avancement))}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {niveau.sections} section{niveau.sections > 1 ? "s" : ""}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Avancement dans le temps (points datés + courbe) */}
      <div className="anim-fade-up anim-delay-3 mb-6">
        <CourbeAvancement chantierId={chantier.id} avancementActuel={avancementGlobal} />
      </div>

      {/* Intervenants + documents */}
      <div className="anim-fade-up anim-delay-3 mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChantierIntervenants chantierId={chantier.id} />
        <ChantierDocuments chantierId={chantier.id} />
      </div>

      {/* Suivi rapide */}
      <div className="anim-fade-up anim-delay-3 mb-8">
        <ChantierSuiviRapide chantierId={chantier.id} />
      </div>

      <section className="anim-fade-up anim-delay-3 mb-8">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="flex items-center gap-2.5 text-lg font-bold text-foreground">
              <span className="h-5 w-1.5 rounded-full bg-gradient-to-b from-action to-action-strong" aria-hidden />
              {langue === "fr" ? "Modèle 3D" : "3D Model"}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {langue === "fr" ? "Vue interactive du chantier et de ses sections." : "Interactive view of the site and its sections."}
            </p>
          </div>
        </div>
        {description.length > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {description.map((ligne) => (
              <span
                key={ligne.libelle}
                className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-surface px-3 py-1 text-xs shadow-sm"
              >
                <span className="text-muted">{ligne.libelle}</span>
                <span className="font-semibold text-foreground">{ligne.valeur}</span>
              </span>
            ))}
            <Link
              href={`/chantiers/${chantier.id}/modifier`}
              className="inline-flex items-center rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary transition hover:bg-primary/10"
            >
              Ajuster
            </Link>
          </div>
        )}
        <Card padding="lg">
          <Modele3D
            chantier={{
              id: chantier.id,
              nom: chantier.nom,
              type: chantier.type,
              longueur: chantier.longueur,
              largeur: chantier.largeur,
              hauteur: chantier.hauteur,
              nb_sous_sols: chantier.nb_sous_sols,
              nb_etages: chantier.nb_etages,
              hauteur_niveau: chantier.hauteur_niveau,
              nb_travees_longueur: chantier.nb_travees_longueur,
              nb_travees_largeur: chantier.nb_travees_largeur,
              type_structure: chantier.type_structure,
              type_toiture: chantier.type_toiture,
              nb_voies: chantier.nb_voies,
              largeur_accotement: chantier.largeur_accotement,
              type_revetement: chantier.type_revetement,
            }}
            sections={sections}
          />
        </Card>
      </section>

      <div className="anim-fade-up anim-delay-4 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DqeImport chantierId={chantier.id} />
        </div>

        <div className="space-y-6">
          <ChantierEquipe chantierId={chantier.id} initialMembers={(membres ?? []) as any} />
          <ChantierAvancement chantierId={chantier.id} seuilEcartPct={chantier.seuil_ecart_pct} />
        </div>
      </div>

      <section className="anim-fade-up anim-delay-5 mt-8">
        <div className="mb-4 flex items-start justify-between">
          <h2 className="flex items-center gap-2.5 text-lg font-bold text-foreground">
            <span className="h-5 w-1.5 rounded-full bg-gradient-to-b from-action to-action-strong" aria-hidden />
            {postes.length > 0
              ? (langue === "fr" ? "Postes du DQE" : "DQE Items")
              : (langue === "fr" ? "Aucun poste importé" : "No items imported")}
          </h2>
          {postes.length > 0 && (
            <Link href="/bpu" className="text-sm font-medium text-primary hover:underline">
              Gérer le BPU
            </Link>
          )}
        </div>
        <div className="overflow-x-auto rounded-2xl border border-border/80 bg-surface shadow-soft">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/80 bg-surface-2 text-left">
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted">Code</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted">Designation</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted">Unité</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted">Qté marché</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted">Prix unitaire</th>
              </tr>
            </thead>
            <tbody>
              {(postes ?? []).map((p) => (
                <tr key={p.id} className="border-b border-border/60 transition last:border-0 hover:bg-surface-2/70">
                  <td className="px-4 py-3 text-muted">{p.code ?? "-"}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{p.designation}</td>
                  <td className="px-4 py-3 text-center text-muted">{p.unite}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{Number(p.quantite_marche).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">{Number(p.prix_unitaire).toLocaleString(langue === "fr" ? "fr-FR" : "en-US")}</td>
                </tr>
              ))}
              {(postes ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted">
                    Aucun poste importé pour le moment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {postes.length > 0 && (
          <p className="mt-3 text-xs text-muted">
            {langue === "fr"
              ? "Les sections du découpage alimentent le suivi (avancement) et le modèle 3D du chantier."
              : "Breakdown sections feed the tracking (progress) and the site 3D model."}
          </p>
        )}
      </section>
    </main>
  );
}
