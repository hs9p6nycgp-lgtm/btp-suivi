"use client";

import { CalendarClock, Check, Flag, Link2, Pencil, Route, TimerReset, Trash2 } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { ConfirmDialog, type DemandeConfirmation } from "@/components/ui/ConfirmDialog";
import { getLangue, traduireErreur } from "@/lib/i18n";
import { joursEcartDelai, serieCumulative, partRealisee } from "@/lib/calculs/metre";
import { calculPert } from "@/lib/calculs/pert";
import {
  ajouterJours,
  chaineCritique,
  libelleLien,
  verifierLien,
} from "@/lib/planning/liens";
import {
  formaterRessources,
  joursSansEquipe,
  repartitionCharge,
} from "@/lib/planning/ressources";

type Tache = {
  id: string;
  chantier_id: string;
  nom: string;
  description: string | null;
  duree_jours: number;
  date_prevue_debut: string | null;
  date_prevue_fin: string | null;
  date_reelle_debut: string | null;
  date_reelle_fin: string | null;
  avancement_pct: number;
  est_jalon: boolean;
  equipe?: string | null;
  engins?: string | null;
  statut: "a_faire" | "en_cours" | "termine" | "retarde" | "annule";
};

type Dependance = {
  id: string;
  chantier_id: string;
  tache_predecesseur_id: string;
  tache_successeur_id: string;
  type_dependance: string;
  decalage_jours: number;
};

type CalculPert = {
  tache_id: string;
  nom: string;
  duree_jours: number;
  es: number;
  ef: number;
  ls: number;
  lf: number;
  marge: number;
  est_critique: boolean;
  est_jalon: boolean;
};

/** Date au format AAAA-MM-JJ (heure locale, sans passage UTC). */
function formaterIso(ms: number): string {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const j = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${j}`;
}

export default function PlanningPage() {
  const params = useParams();
  const router = useRouter();
  const chantierId = String(params?.id ?? "");
  const langue = getLangue();

  const [taches, setTaches] = useState<Tache[]>([]);
  const [dependances, setDependances] = useState<Dependance[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [dateFinPrevue, setDateFinPrevue] = useState<string | null>(null);
  const [dateDebutChantier, setDateDebutChantier] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<DemandeConfirmation | null>(null);
  // Ressources par tâche : disponibles après la migration 0023.
  const [ressourcesDisponibles, setRessourcesDisponibles] = useState<boolean | null>(null);

  const [nomTache, setNomTache] = useState("");
  const [dureeTache, setDureeTache] = useState("1");
  const [dateDebutTache, setDateDebutTache] = useState("");
  const [estJalon, setEstJalon] = useState(false);
  const [equipeTache, setEquipeTache] = useState("");
  const [enginsTache, setEnginsTache] = useState("");
  const [predecesseurTache, setPredecesseurTache] = useState("");
  const [tacheEnEdition, setTacheEnEdition] = useState<Tache | null>(null);
  const [lienPredecesseur, setLienPredecesseur] = useState("");
  const [lienSuccesseur, setLienSuccesseur] = useState("");

  useEffect(() => {
    if (chantierId) load();
  }, [chantierId]);

  async function load() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/login"); return; }
    const { data: chantier } = await supabase.from("chantiers").select("id").eq("id", chantierId).eq("proprietaire_id", user.id).maybeSingle();
    if (!chantier) { router.replace("/chantiers"); return; }
    const [tRes, dRes, cRes] = await Promise.all([
      supabase.from("taches_planning").select("*").eq("chantier_id", chantierId).order("created_at", { ascending: true }),
      supabase.from("dependances_planning").select("*").eq("chantier_id", chantierId),
      supabase.from("chantiers").select("date_fin_prevue, date_debut").eq("id", chantierId).maybeSingle(),
    ]);
    if (tRes.error) { setMessage(traduireErreur(tRes.error)); return; }
    if (dRes.error) { setMessage(traduireErreur(dRes.error)); return; }
    if (cRes.error) { setMessage(traduireErreur(cRes.error)); return; }
    setTaches((tRes.data ?? []) as Tache[]);
    setDependances((dRes.data ?? []) as Dependance[]);
    setDateFinPrevue(cRes.data?.date_fin_prevue ?? null);
    setDateDebutChantier(cRes.data?.date_debut ?? null);
    // Colonnes d'affectation des ressources (migration 0023) : si elles
    // manquent, l'écran fonctionne quand même, sans les ressources.
    const { error: errRessources } = await supabase
      .from("taches_planning")
      .select("id,equipe,engins")
      .limit(1);
    setRessourcesDisponibles(!errRessources);
    setLoading(false);
  }

  // PERT : une seule implementation, la logique pure testee de src/lib/calculs/pert.ts
  // (PLA-02). La page ne fait que presenter les resultats.
  const calculerPert = useCallback((): CalculPert[] => {
    if (taches.length === 0) return [];

    const resultat = calculPert(
      taches.map((t) => ({
        id: t.id,
        duree: t.duree_jours,
        predecesseurs: dependances
          .filter((d) => d.tache_successeur_id === t.id)
          .map((d) => d.tache_predecesseur_id),
      })),
    );
    const parId = new Map(resultat.map((r) => [r.id, r]));

    return taches.map((t) => {
      const r = parId.get(t.id);
      const es = r?.dateAuPlusTot ?? 0;
      const ls = r?.dateAuPlusTard ?? es;
      return {
        tache_id: t.id,
        nom: t.nom,
        duree_jours: t.duree_jours,
        es,
        ef: es + t.duree_jours,
        ls,
        lf: ls + t.duree_jours,
        marge: r?.margeTotale ?? ls - es,
        est_critique: r?.estCritique ?? ls - es === 0,
        est_jalon: t.est_jalon,
      };
    });
  }, [taches, dependances]);

  const pert = calculerPert();
  const dureeProjet = pert.length > 0 ? Math.max(...pert.map((p) => p.ef)) : 0;
  const tachesCritiques = pert.filter((p) => p.est_critique).length;
  const terminees = taches.filter((t) => t.statut === "termine").length;

  // Noms des tâches (prédécesseurs affichés) et chaîne critique
  const nomsParId = new Map(taches.map((t) => [t.id, t.nom]));
  const predicteursDe = (id: string) =>
    dependances
      .filter((d) => d.tache_successeur_id === id)
      .map((d) => nomsParId.get(d.tache_predecesseur_id) ?? "?");
  const cheminCritique = chaineCritique(
    taches.map((t) => ({ id: t.id, nom: t.nom, duree_jours: t.duree_jours })),
    dependances,
  );
  const charges = repartitionCharge(taches);
  const joursNonAffectes = joursSansEquipe(taches);

  // 5.4 - Écart de délai : fin prévue du planning (PERT) vs date contractuelle du chantier
  const dateFinProjet = dateDebutChantier ? ajouterJours(dateDebutChantier, dureeProjet) : null;
  const dernierFinTaches =
    pert.length > 0
      ? Math.max(
          ...pert.map((p) => {
            const t = taches.find((x) => x.id === p.tache_id);
            return t?.date_prevue_fin ? new Date(`${t.date_prevue_fin}T00:00:00`).getTime() : 0;
          }),
        )
      : 0;
  const dernierFinPrevue =
    dateFinProjet ?? (dernierFinTaches > 0 ? formaterIso(dernierFinTaches) : null);
  const ecartDelaiJours = dateFinPrevue && dernierFinPrevue
    ? joursEcartDelai(dernierFinPrevue, dateFinPrevue)
    : 0;

  // PLA-05 : courbe en S — avancement cumulé prévu (PERT) vs réel (dates réelles)
  function calculerCourbeS() {
    if (pert.length === 0) return null;

    const poidsTotal = pert.reduce((s, p) => s + Math.max(p.duree_jours, 0), 0) || pert.length;

    // J0 = première date connue du planning (prévue ou réelle)
    const datesConnues = [
      ...taches.map((t) => t.date_prevue_debut),
      ...taches.map((t) => t.date_reelle_debut),
    ]
      .filter((d): d is string => Boolean(d))
      .map((d) => new Date(d).getTime())
      .sort((a, b) => a - b);
    const debutProjetMs = datesConnues.length > 0 ? datesConnues[0] : Date.now();
    const jourDe = (date: string) => Math.max(0, Math.round((new Date(date).getTime() - debutProjetMs) / 86400000));

    const aujourdHuiJour = Math.max(0, Math.round((Date.now() - debutProjetMs) / 86400000));
    // Limite de sécurité : 3 ans de courbe maximum
    const dernierJour = Math.min(Math.max(dureeProjet, aujourdHuiJour), 1095);

    const incPrevu: number[] = [];
    const incReel: number[] = [];
    for (let d = 0; d <= dernierJour; d++) {
      // Prévu : chaque tâche progresse linéairement de ES à EF (en tâche-jours)
      let prevuJour = 0;
      let prevuVeille = 0;
      for (const p of pert) {
        const poids = Math.max(p.duree_jours, 0);
        prevuJour += partRealisee(p.es, p.ef, d) * poids;
        if (d > 0) prevuVeille += partRealisee(p.es, p.ef, d - 1) * poids;
      }
      incPrevu.push(prevuJour - prevuVeille);

      // Réel : chaque tâche progresse de sa date réelle de début à sa date réelle de fin (ou aujourd'hui)
      let reelJour = 0;
      let reelVeille = 0;
      for (const t of taches) {
        const poids = Math.max(t.duree_jours, 0);
        if (poids === 0 || !t.date_reelle_debut) continue;
        const debut = jourDe(t.date_reelle_debut);
        const fin = t.date_reelle_fin ? jourDe(t.date_reelle_fin) : aujourdHuiJour;
        const part = (t.avancement_pct ?? 0) / 100;
        reelJour += partRealisee(debut, Math.max(fin, debut), d) * part * poids;
        if (d > 0) reelVeille += partRealisee(debut, Math.max(fin, debut), d - 1) * part * poids;
      }
      incReel.push(Math.max(reelJour - reelVeille, 0));
    }

    const cumPrevu = serieCumulative(incPrevu);
    const cumReel = serieCumulative(incReel);
    const enPourcent = (v: number) => poidsTotal > 0 ? Math.round((v / poidsTotal) * 1000) / 10 : 0;

    const donnees = cumPrevu.map((v, d) => ({
      jour: `J${d}`,
      prevu: enPourcent(v),
      reel: d <= aujourdHuiJour ? enPourcent(cumReel[d]) : null,
    }));

    const idxAujourdHui = Math.min(aujourdHuiJour, donnees.length - 1);
    const prevuAujourdHui = donnees[idxAujourdHui]?.prevu ?? 0;
    const reelAujourdHui = donnees[idxAujourdHui]?.reel ?? 0;

    return {
      donnees,
      prevuAujourdHui,
      reelAujourdHui,
      ecart: Math.round((reelAujourdHui - prevuAujourdHui) * 10) / 10,
    };
  }

  const courbeS = calculerCourbeS();

  function reinitialiserFormulaire() {
    setNomTache("");
    setDureeTache("1");
    setDateDebutTache("");
    setEstJalon(false);
    setEquipeTache("");
    setEnginsTache("");
    setPredecesseurTache("");
    setTacheEnEdition(null);
  }

  function commencerEdition(t: Tache) {
    setTacheEnEdition(t);
    setNomTache(t.nom);
    setDureeTache(String(t.duree_jours ?? 1));
    setDateDebutTache(t.date_prevue_debut ?? "");
    setEstJalon(Boolean(t.est_jalon));
    setEquipeTache(t.equipe ?? "");
    setEnginsTache(t.engins ?? "");
    setMessage(
      langue === "fr"
        ? `Modification de « ${t.nom} » : corrigez les champs puis enregistrez.`
        : `Editing "${t.nom}": change the fields then save.`,
    );
  }

  async function enregistrerTache(e: React.FormEvent) {
    e.preventDefault();
    if (!nomTache.trim()) return;
    setLoading(true);
    setMessage(null);
    const supabase = createClient();
    const duree = Number(dureeTache) || 1;
    const finPrevue = dateDebutTache
      ? new Date(new Date(`${dateDebutTache}T00:00:00`).getTime() + duree * 86400000)
          .toISOString()
          .slice(0, 10)
      : null;

    if (tacheEnEdition) {
      const champs: Record<string, unknown> = {
        nom: nomTache.trim(),
        duree_jours: duree,
        date_prevue_debut: dateDebutTache || null,
        date_prevue_fin: finPrevue,
        est_jalon: estJalon,
      };
      if (ressourcesDisponibles) {
        champs.equipe = equipeTache.trim() || null;
        champs.engins = enginsTache.trim() || null;
      }
      const { error } = await supabase
        .from("taches_planning")
        .update(champs)
        .eq("id", tacheEnEdition.id);
      setLoading(false);
      if (error) { setMessage(traduireErreur(error)); return; }
      reinitialiserFormulaire();
      setMessage(langue === "fr" ? "Tâche modifiée." : "Task updated.");
      load();
      return;
    }

    const champs: Record<string, unknown> = {
      chantier_id: chantierId,
      nom: nomTache.trim(),
      duree_jours: duree,
      date_prevue_debut: dateDebutTache || null,
      date_prevue_fin: finPrevue,
      est_jalon: estJalon,
      statut: "a_faire",
    };
    if (ressourcesDisponibles) {
      champs.equipe = equipeTache.trim() || null;
      champs.engins = enginsTache.trim() || null;
    }
    const { data, error } = await supabase.from("taches_planning").insert(champs).select().single();
    setLoading(false);
    if (error) { setMessage(traduireErreur(error)); return; }

    // Chaînage direct : la nouvelle tâche commence après la tâche précédente.
    if (predecesseurTache) {
      const { error: errLien } = await supabase.from("dependances_planning").insert({
        chantier_id: chantierId,
        tache_predecesseur_id: predecesseurTache,
        tache_successeur_id: (data as Tache).id,
        type_dependance: "fin_debut",
        decalage_jours: 0,
      });
      if (errLien) {
        setMessage(traduireErreur(errLien));
        reinitialiserFormulaire();
        load();
        return;
      }
    }

    reinitialiserFormulaire();
    setMessage(langue === "fr" ? "Tâche ajoutée." : "Task added.");
    load();
  }

  async function ajouterLien(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const controle = verifierLien(
      taches.map((t) => ({ id: t.id, nom: t.nom, duree_jours: t.duree_jours })),
      dependances,
      lienPredecesseur,
      lienSuccesseur,
    );
    if (!controle.ok) {
      setMessage(controle.raison);
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from("dependances_planning").insert({
      chantier_id: chantierId,
      tache_predecesseur_id: lienPredecesseur,
      tache_successeur_id: lienSuccesseur,
      type_dependance: "fin_debut",
      decalage_jours: 0,
    });
    setLoading(false);
    if (error) { setMessage(traduireErreur(error)); return; }
    setLienPredecesseur("");
    setLienSuccesseur("");
    setMessage(
      langue === "fr"
        ? "Lien ajouté : le chemin critique est recalculé."
        : "Link added: the critical path has been recalculated.",
    );
    load();
  }

  async function supprimerLien(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from("dependances_planning").delete().eq("id", id);
    if (error) { setMessage(traduireErreur(error)); return; }
    setMessage(
      langue === "fr" ? "Lien supprimé." : "Link removed.",
    );
    load();
  }

  async function supprimerTache(t: Tache) {
    const supabase = createClient();
    const { error } = await supabase.from("taches_planning").delete().eq("id", t.id);
    if (error) { setMessage(traduireErreur(error)); return; }
    if (tacheEnEdition?.id === t.id) reinitialiserFormulaire();
    setMessage(langue === "fr" ? "Tâche supprimée." : "Task deleted.");
    load();
  }

  async function toggleStatut(t: Tache) {
    const nouveauStatut = t.statut === "termine" ? "a_faire" : "termine";
    const supabase = createClient();
    const updates: Partial<Tache> & { avancement_pct: number; date_reelle_fin: string | null } = {
      statut: nouveauStatut,
      avancement_pct: nouveauStatut === "termine" ? 100 : 0,
      date_reelle_fin: nouveauStatut === "termine" ? new Date().toISOString().slice(0, 10) : null,
    };
    const { error } = await supabase.from("taches_planning").update(updates).eq("id", t.id);
    if (error) { setMessage(traduireErreur(error)); return; }
    setTaches((prev) => prev.map((x) => x.id === t.id ? { ...x, ...updates } : x));
  }

  return (
    <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
      <PageHeader
        eyebrow={langue === "fr" ? "Suivi de chantier" : "Site tracking"}
        title={langue === "fr" ? "Planning & PERT" : "Schedule & PERT"}
        description={
          langue === "fr"
            ? "Tâches, chemin critique, marges et diagramme de Gantt."
            : "Tasks, critical path, float and Gantt chart."
        }
        icon={<CalendarClock className="h-5 w-5" />}
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

      {/* Statistiques rapides */}
      <div className="anim-fade-up anim-delay-1 mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          title={langue === "fr" ? "Tâches" : "Tasks"}
          value={taches.length}
          icon={<Route className="h-5 w-5" />}
          color="blue"
        />
        <StatCard
          title={langue === "fr" ? "Durée projet" : "Project duration"}
          value={`${dureeProjet} j`}
          icon={<TimerReset className="h-5 w-5" />}
          color="orange"
        />
        <StatCard
          title={langue === "fr" ? "Chemin critique" : "Critical path"}
          value={tachesCritiques}
          icon={<Flag className="h-5 w-5" />}
          color="amber"
        />
        <StatCard
          title={langue === "fr" ? "Terminées" : "Completed"}
          value={terminees}
          icon={<CalendarClock className="h-5 w-5" />}
          color="emerald"
        />
        <StatCard
          title={langue === "fr" ? "Écart délai" : "Delay gap"}
          value={ecartDelaiJours >= 0 ? `+${ecartDelaiJours}` : String(ecartDelaiJours)}
          subtitle="jours"
          icon={<TimerReset className="h-5 w-5" />}
          color={ecartDelaiJours > 0 ? "rose" : "blue"}
        />
      </div>

      {/* Formulaire d'ajout / de modification de tâche */}
      <section className="anim-fade-up anim-delay-2 mb-6">
        <Card padding="lg">
          <h2 className="mb-4 text-lg font-bold text-foreground">
            {tacheEnEdition
              ? langue === "fr"
                ? `Modifier la tâche « ${tacheEnEdition.nom} »`
                : `Edit task "${tacheEnEdition.nom}"`
              : langue === "fr"
                ? "Nouvelle tâche"
                : "New task"}
          </h2>
          <form onSubmit={enregistrerTache} className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <input
              className="rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10"
              placeholder={langue === "fr" ? "Nom de la tâche *" : "Task name *"}
              value={nomTache}
              onChange={(e) => setNomTache(e.target.value)}
              required
            />
            <input
              className="rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10"
              type="number"
              placeholder={langue === "fr" ? "Durée (j)" : "Duration (d)"}
              value={dureeTache}
              onChange={(e) => setDureeTache(e.target.value)}
            />
            <input
              className="rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10"
              type="date"
              value={dateDebutTache}
              onChange={(e) => setDateDebutTache(e.target.value)}
            />
            <div className="flex items-center">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={estJalon}
                  onChange={(e) => setEstJalon(e.target.checked)}
                  className="rounded text-primary"
                />
                {langue === "fr" ? "Jalon" : "Milestone"}
              </label>
            </div>
            {ressourcesDisponibles !== false && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:col-span-4">
                <label className="block text-sm font-medium text-foreground">
                  {langue === "fr" ? "Équipe affectée" : "Assigned team"}
                  <input
                    className="mt-1 w-full rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10"
                    placeholder={langue === "fr" ? "ex. : Terrassiers" : "e.g. Earthworks"}
                    value={equipeTache}
                    onChange={(e) => setEquipeTache(e.target.value)}
                  />
                </label>
                <label className="block text-sm font-medium text-foreground">
                  {langue === "fr" ? "Engins et matériel" : "Plant and equipment"}
                  <input
                    className="mt-1 w-full rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10"
                    placeholder={langue === "fr" ? "ex. : 1 pelleteuse, 2 camions" : "e.g. 1 excavator"}
                    value={enginsTache}
                    onChange={(e) => setEnginsTache(e.target.value)}
                  />
                </label>
              </div>
            )}
            {!tacheEnEdition && (
              <div className="md:col-span-4">
                <label className="mb-1 block text-xs font-medium text-muted">
                  {langue === "fr"
                    ? "Précédente (facultatif) : la tâche commencera à la fin de celle-ci"
                    : "Predecessor (optional): the task will start when it ends"}
                </label>
                <select
                  className="w-full rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10"
                  value={predecesseurTache}
                  onChange={(e) => setPredecesseurTache(e.target.value)}
                >
                  <option value="">
                    {langue === "fr" ? "Aucune (démarrage à J0)" : "None (starts at J0)"}
                  </option>
                  {taches.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nom} ({t.duree_jours} j)
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex flex-wrap gap-3 md:col-span-4">
              <Button type="submit" disabled={loading}>
                {loading
                  ? langue === "fr"
                    ? "Enregistrement..."
                    : "Saving..."
                  : tacheEnEdition
                    ? langue === "fr"
                      ? "Enregistrer les modifications"
                      : "Save changes"
                    : langue === "fr"
                      ? "Ajouter"
                      : "Add"}
              </Button>
              {tacheEnEdition && (
                <Button type="button" variant="outline" onClick={reinitialiserFormulaire}>
                  {langue === "fr" ? "Annuler" : "Cancel"}
                </Button>
              )}
            </div>
          </form>
        </Card>
      </section>

      {/* Liens entre tâches (chemin critique) */}
      <section className="anim-fade-up anim-delay-2 mb-6">
        <h2 className="mb-4 flex items-center gap-2.5 text-lg font-bold text-foreground">
          <span className="h-5 w-1.5 rounded-full bg-gradient-to-b from-action to-action-strong" aria-hidden />
          {langue === "fr" ? "Enchaînement des tâches" : "Task sequence"}
        </h2>
        <Card padding="lg">
          <p className="mb-4 text-sm text-muted">
            {langue === "fr"
              ? "Reliez les tâches dans l'ordre réel des travaux (fin → début). Le chemin critique, les marges et le diagramme de Gantt sont recalculés immédiatement."
              : "Link tasks in the real order of work (end → start). The critical path, floats and the Gantt chart are recalculated immediately."}
          </p>
          <form onSubmit={ajouterLien} className="grid grid-cols-1 items-end gap-3 md:grid-cols-5">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">
                {langue === "fr" ? "Tâche précédente" : "Preceding task"}
              </label>
              <select
                className="w-full rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10"
                value={lienPredecesseur}
                onChange={(e) => setLienPredecesseur(e.target.value)}
              >
                <option value="">{langue === "fr" ? "Choisir…" : "Choose…"}</option>
                {taches.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nom}
                  </option>
                ))}
              </select>
            </div>
            <div className="pb-2 text-center text-muted">→</div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">
                {langue === "fr" ? "Tâche suivante" : "Following task"}
              </label>
              <select
                className="w-full rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10"
                value={lienSuccesseur}
                onChange={(e) => setLienSuccesseur(e.target.value)}
              >
                <option value="">{langue === "fr" ? "Choisir…" : "Choose…"}</option>
                {taches.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nom}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" disabled={loading} className="md:col-span-2">
              <Link2 className="h-4 w-4" />
              {langue === "fr" ? "Lier les tâches" : "Link tasks"}
            </Button>
          </form>

          {dependances.length > 0 ? (
            <ul className="mt-4 divide-y divide-border/60">
              {dependances.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="text-sm text-foreground">
                    {libelleLien(
                      taches.map((t) => ({ id: t.id, nom: t.nom, duree_jours: t.duree_jours })),
                      d,
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => supprimerLien(d.id)}
                    className="rounded-lg p-2 text-muted transition hover:bg-danger/10 hover:text-danger"
                    aria-label={langue === "fr" ? "Supprimer le lien" : "Delete the link"}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-foreground">
              {langue === "fr"
                ? "Aucun lien : toutes les tâches démarrent à J0, le chemin critique affiché n'est donc pas le véritable enchaînement des travaux (décapage → remblai → base → revêtement)."
                : "No link: every task starts at J0, so the critical path shown is not the real sequence of work."}
            </p>
          )}
        </Card>
      </section>

      {/* Tableau PERT */}
      <section className="anim-fade-up anim-delay-3 mb-6">
        <h2 className="mb-4 flex items-center gap-2.5 text-lg font-bold text-foreground">
          <span className="h-5 w-1.5 rounded-full bg-gradient-to-b from-action to-action-strong" aria-hidden />
          {langue === "fr" ? "Calcul PERT" : "PERT calculation"}
        </h2>
        <Card padding="lg">
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-surface-2/40 px-4 py-3">
            <span className="text-sm font-semibold text-foreground">
              {langue === "fr" ? "Chaîne critique :" : "Critical path:"}
            </span>
            <span className="text-sm text-muted">
              {cheminCritique.length > 0
                ? cheminCritique.map((t) => t.nom).join(" → ")
                : langue === "fr"
                  ? "aucune (reliez les tâches pour obtenir le vrai enchaînement)"
                  : "none (link tasks to get the real sequence)"}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/80 bg-surface-2 text-left">
                  <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted">Tâche</th>
                  <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted">Prédécesseurs</th>
                  {ressourcesDisponibles !== false && (
                    <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted">Ressources</th>
                  )}
                  <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-muted">Durée</th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-muted">ES</th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-muted">EF</th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-muted">LS</th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-muted">LF</th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-muted">Marge</th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-muted">Critique</th>
                  <th className="w-24 px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pert.map((p) => {
                  const tache = taches.find((t) => t.id === p.tache_id);
                  const predecesseurs = predicteursDe(p.tache_id);
                  return (
                    <tr
                      key={p.tache_id}
                      className={`border-b border-border/60 transition last:border-0 hover:bg-surface-2/70 ${p.est_critique ? "bg-primary/10" : ""}`}
                    >
                      <td className="px-3 py-2.5">
                        {p.nom}
                        {p.est_jalon && <span className="ml-1 text-xs font-semibold text-primary">◊</span>}
                        {tache?.statut === "termine" && (
                          <span className="ml-1 text-xs font-semibold text-success">✓</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted">
                        {predecesseurs.length > 0 ? predecesseurs.join(", ") : "—"}
                      </td>
                      {ressourcesDisponibles !== false && (
                        <td className="px-3 py-2.5 text-xs text-muted">
                          {formaterRessources({ equipe: tache?.equipe, engins: tache?.engins })}
                        </td>
                      )}
                      <td className="px-3 py-2.5 text-center tabular-nums">{p.duree_jours}</td>
                      <td className="px-3 py-2.5 text-center tabular-nums">{p.es}</td>
                      <td className="px-3 py-2.5 text-center tabular-nums">{p.ef}</td>
                      <td className="px-3 py-2.5 text-center tabular-nums">{p.ls}</td>
                      <td className="px-3 py-2.5 text-center tabular-nums">{p.lf}</td>
                      <td className={`px-3 py-2.5 text-center font-semibold tabular-nums ${p.est_critique ? "text-action" : "text-muted"}`}>
                        {p.marge}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {p.est_critique ? (
                          <Badge variant="danger">OUI</Badge>
                        ) : (
                          <Badge variant="default">—</Badge>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => tache && toggleStatut(tache)}
                            className={`rounded-lg p-1.5 transition ${tache?.statut === "termine" ? "bg-success/10 text-success" : "text-muted hover:bg-success/10 hover:text-success"}`}
                            aria-label={
                              langue === "fr"
                                ? `Marquer « ${p.nom} » comme terminée`
                                : `Mark "${p.nom}" as completed`
                            }
                            title={
                              langue === "fr"
                                ? tache?.statut === "termine"
                                  ? "Réouvrir la tâche"
                                  : "Marquer comme terminée"
                                : tache?.statut === "termine"
                                  ? "Reopen the task"
                                  : "Mark as completed"
                            }
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => tache && commencerEdition(tache)}
                            className="rounded-lg p-1.5 text-muted transition hover:bg-primary/10 hover:text-primary"
                            aria-label={langue === "fr" ? `Modifier ${p.nom}` : `Edit ${p.nom}`}
                            title={langue === "fr" ? "Corriger la tâche" : "Edit the task"}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              tache &&
                              setConfirmation({
                                titre:
                                  langue === "fr"
                                    ? `Supprimer la tâche « ${tache.nom} » ?`
                                    : `Delete the task "${tache.nom}"?`,
                                message:
                                  langue === "fr"
                                    ? "La tâche et ses liaisons seront supprimées du planning."
                                    : "The task and its links will be removed from the schedule.",
                                confirmerLibelle: langue === "fr" ? "Supprimer" : "Delete",
                                danger: true,
                                action: () => supprimerTache(tache),
                              })
                            }
                            className="rounded-lg p-1.5 text-muted transition hover:bg-danger/10 hover:text-danger"
                            aria-label={langue === "fr" ? `Supprimer ${p.nom}` : `Delete ${p.nom}`}
                            title={langue === "fr" ? "Supprimer la tâche" : "Delete the task"}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {pert.length === 0 && (
                  <tr>
                    <td colSpan={ressourcesDisponibles !== false ? 11 : 10} className="p-4 text-center text-muted">Aucune tâche. Ajoutez une tâche ci-dessus.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      {/* Charge par équipe (ressources affectées aux tâches) */}
      {ressourcesDisponibles !== false && charges.length > 0 && (
        <section className="anim-fade-up anim-delay-3 mb-6">
          <h2 className="mb-4 flex items-center gap-2.5 text-lg font-bold text-foreground">
            <span className="h-5 w-1.5 rounded-full bg-gradient-to-b from-action to-action-strong" aria-hidden />
            {langue === "fr" ? "Charge par équipe" : "Workload per team"}
          </h2>
          <Card padding="lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/80 bg-surface-2 text-left">
                  <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted">
                    {langue === "fr" ? "Équipe" : "Team"}
                  </th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-muted">
                    {langue === "fr" ? "Tâches" : "Tasks"}
                  </th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-muted">
                    {langue === "fr" ? "Charge (j)" : "Workload (d)"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {charges.map((c) => (
                  <tr key={c.equipe} className="border-b border-border/60">
                    <td className="px-3 py-2.5 font-medium text-foreground">{c.equipe}</td>
                    <td className="px-3 py-2.5 text-center tabular-nums">{c.nombreTaches}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-semibold">{c.jours}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-muted">
              {langue === "fr"
                ? "Charge = somme des durées des tâches affectées à l'équipe."
                : "Workload = sum of the durations of the tasks assigned to the team."}
              {joursNonAffectes > 0 &&
                (langue === "fr"
                  ? ` ${joursNonAffectes} jour(s) de planning ne sont encore affectés à aucune équipe.`
                  : ` ${joursNonAffectes} day(s) of schedule are not assigned to a team yet.`)}
            </p>
          </Card>
        </section>
      )}

      {/* Diagramme de Gantt */}
      <section className="anim-fade-up anim-delay-4 mb-6">
        <h2 className="mb-4 flex items-center gap-2.5 text-lg font-bold text-foreground">
          <span className="h-5 w-1.5 rounded-full bg-gradient-to-b from-action to-action-strong" aria-hidden />
          {langue === "fr" ? "Diagramme de Gantt" : "Gantt chart"}
        </h2>
        <Card padding="lg">
          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
              <div className="flex items-start border-r border-border">
                {/* Colonne des noms — hauteur de ligne alignée sur la colonne du temps (h-10) */}
                <div className="w-48 shrink-0">
                  <div className="h-8 border-b border-border" />
                  {pert.map((p) => (
                    <div
                      key={p.tache_id}
                      className="flex h-10 items-center border-b border-border px-2 text-sm"
                      title={p.nom}
                    >
                      <span className="truncate">{p.nom}</span>
                    </div>
                  ))}
                </div>
                {/* Colonne du temps */}
                <div className="flex flex-col">
                  <div className="flex h-8 items-center border-b border-border">
                    {Array.from({ length: dureeProjet + 1 }, (_, i) => (
                      <div
                        key={i}
                        className="flex h-8 w-[30px] shrink-0 items-center border-r border-border pl-1 text-[10px] text-muted"
                      >
                        J{i}
                      </div>
                    ))}
                  </div>
                  {pert.map((p) => {
                    const largeur = Math.max((p.ef - p.es) * 30 - 4, 20);
                    const debut = p.es * 30;
                    const tache = taches.find((t) => t.id === p.tache_id);
                    const ressources =
                      ressourcesDisponibles !== false
                        ? formaterRessources({ equipe: tache?.equipe, engins: tache?.engins })
                        : "";
                    return (
                      <div key={p.tache_id} className="relative h-10 border-b border-border">
                        <div
                          className={`absolute top-1/2 h-5 -translate-y-1/2 rounded-full shadow-sm ${
                            p.est_critique
                              ? "bg-gradient-to-r from-action to-action-strong"
                              : "bg-gradient-to-r from-primary to-primary-deep"
                          }`}
                          style={{ left: `${debut}px`, width: `${largeur}px` }}
                          title={`${p.nom} — J${p.es} → J${p.ef}${ressources && ressources !== "—" ? ` · ${ressources}` : ""}`}
                        />
                        <span
                          className="absolute top-1/2 -translate-y-1/2 whitespace-nowrap text-[10px] text-muted"
                          style={{ left: `${debut + largeur + 6}px` }}
                        >
                          {p.duree_jours}j
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted">
              {langue === "fr"
                ? "J0 = début du projet. La barre orange = tâche critique (marge = 0) ; la barre bleue = tâche avec marge."
                : "J0 = project start. The orange bar is a critical task (zero float); the blue bar has float."}
            </p>
          </div>
        </Card>
      </section>

      {/* Courbe en S (PLA-05) */}
      <section className="anim-fade-up anim-delay-5 mb-6">
        <h2 className="mb-4 flex items-center gap-2.5 text-lg font-bold text-foreground">
          <span className="h-5 w-1.5 rounded-full bg-gradient-to-b from-action to-action-strong" aria-hidden />
          {langue === "fr" ? "Courbe en S — prévu / réel" : "S-curve — planned / actual"}
        </h2>
        <Card padding="lg">
          {courbeS ? (
            <>
              <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatCard
                  title={langue === "fr" ? "Prévu à ce jour" : "Planned to date"}
                  value={`${courbeS.prevuAujourdHui.toLocaleString(langue === "fr" ? "fr-FR" : "en-US")} %`}
                  icon={<CalendarClock className="h-5 w-5" />}
                  color="blue"
                />
                <StatCard
                  title={langue === "fr" ? "Réalisé à ce jour" : "Actual to date"}
                  value={`${courbeS.reelAujourdHui.toLocaleString(langue === "fr" ? "fr-FR" : "en-US")} %`}
                  icon={<Route className="h-5 w-5" />}
                  color="orange"
                />
                <StatCard
                  title={langue === "fr" ? "Écart d'avancement" : "Progress gap"}
                  value={`${courbeS.ecart >= 0 ? "+" : ""}${courbeS.ecart.toLocaleString(langue === "fr" ? "fr-FR" : "en-US")} pts`}
                  icon={<TimerReset className="h-5 w-5" />}
                  color={courbeS.ecart >= 0 ? "emerald" : "rose"}
                  trend={{
                    value: courbeS.ecart >= 0
                      ? (langue === "fr" ? "En avance" : "Ahead")
                      : (langue === "fr" ? "En retard" : "Behind"),
                    label: langue === "fr" ? "sur le planning prévu" : "vs planned schedule",
                    positive: courbeS.ecart >= 0,
                  }}
                />
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={courbeS.donnees} margin={{ top: 10, left: 10, right: 20, bottom: 10 }}>
                    <XAxis dataKey="jour" tick={{ fontSize: 11 }} stroke="var(--border)" minTickGap={24} />
                    <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} stroke="var(--border)" />
                    <Tooltip
                      formatter={(valeur, nom) => [
                        `${Number(valeur).toLocaleString(langue === "fr" ? "fr-FR" : "en-US")} %`,
                        String(nom),
                      ]}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      name={langue === "fr" ? "Prévu" : "Planned"}
                      dataKey="prevu"
                      stroke="var(--primary)"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      name={langue === "fr" ? "Réel" : "Actual"}
                      dataKey="reel"
                      stroke="var(--action)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-3 text-xs text-muted">
                {langue === "fr"
                  ? "Avancement cumulé pondéré par la durée des tâches : prévu selon le PERT (ES → EF), réel selon les dates réelles saisies (limité à aujourd'hui)."
                  : "Cumulative progress weighted by task duration: planned from PERT (ES → EF), actual from entered real dates (up to today)."}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted">
              {langue === "fr"
                ? "Ajoutez des tâches au planning pour afficher la courbe en S."
                : "Add tasks to the schedule to display the S-curve."}
            </p>
          )}
        </Card>
      </section>

      <ConfirmDialog demande={confirmation} onFermer={() => setConfirmation(null)} />
    </main>
  );
}
