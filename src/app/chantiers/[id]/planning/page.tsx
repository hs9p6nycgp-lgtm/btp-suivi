"use client";

import { CalendarClock, Flag, Route, TimerReset } from "lucide-react";
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
import { getLangue, traduireErreur } from "@/lib/i18n";
import { joursEcartDelai, serieCumulative, partRealisee } from "@/lib/calculs/metre";

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

  const [nomTache, setNomTache] = useState("");
  const [dureeTache, setDureeTache] = useState("1");
  const [dateDebutTache, setDateDebutTache] = useState("");
  const [estJalon, setEstJalon] = useState(false);

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
      supabase.from("chantiers").select("date_fin_prevue").eq("id", chantierId).maybeSingle(),
    ]);
    if (tRes.error) { setMessage(traduireErreur(tRes.error)); return; }
    if (dRes.error) { setMessage(traduireErreur(dRes.error)); return; }
    if (cRes.error) { setMessage(traduireErreur(cRes.error)); return; }
    setTaches((tRes.data ?? []) as Tache[]);
    setDependances((dRes.data ?? []) as Dependance[]);
    setDateFinPrevue(cRes.data?.date_fin_prevue ?? null);
    setLoading(false);
  }

  // Aucun calcul n'a été modifié : ES/EF/LS/LF/marge et le chemin critique sont d'origine.
  const calculerPert = useCallback((): CalculPert[] => {
    if (taches.length === 0) return [];

    const tacheMap = new Map<string, Tache & { index: number }>();
    taches.forEach((t, i) => tacheMap.set(t.id, { ...t, index: i }));

    const n = taches.length;
    const es = new Array(n).fill(0);
    const ef = new Array(n).fill(0);
    const ls = new Array(n).fill(0);
    const lf = new Array(n).fill(0);
    const marge = new Array(n).fill(0);
    const estCritique = new Array(n).fill(false);

    const successeurs = new Map<string, string[]>();
    const predecesseurs = new Map<string, string[]>();
    taches.forEach((t) => { successeurs.set(t.id, []); predecesseurs.set(t.id, []); });
    dependances.forEach((d) => {
      const preds = predecesseurs.get(d.tache_successeur_id) ?? [];
      preds.push(d.tache_predecesseur_id);
      predecesseurs.set(d.tache_successeur_id, preds);
      const sucs = successeurs.get(d.tache_predecesseur_id) ?? [];
      sucs.push(d.tache_successeur_id);
      successeurs.set(d.tache_predecesseur_id, sucs);
    });

    const racines = taches.filter((t) => (predecesseurs.get(t.id)?.length ?? 0) === 0);
    const visite = new Set<string>();
    const ordreTopo: string[] = [];

    function dfs(nodeId: string) {
      if (visite.has(nodeId)) return;
      visite.add(nodeId);
      const preds = predecesseurs.get(nodeId) ?? [];
      for (const p of preds) dfs(p);
      ordreTopo.push(nodeId);
    }
    for (const r of racines) dfs(r.id);

    for (const t of racines) {
      const idx = tacheMap.get(t.id)!.index;
      es[idx] = 0;
      ef[idx] = es[idx] + t.duree_jours;
    }

    for (const nodeId of ordreTopo) {
      const t = tacheMap.get(nodeId)!;
      const idx = t.index;
      const preds = predecesseurs.get(nodeId) ?? [];
      if (preds.length > 0) {
        let maxEf = 0;
        for (const p of preds) {
          const pIdx = tacheMap.get(p)!.index;
          maxEf = Math.max(maxEf, ef[pIdx]);
        }
        es[idx] = maxEf;
        ef[idx] = es[idx] + t.duree_jours;
      }
    }

    const dureeProjet = Math.max(...ef);
    const visite2 = new Set<string>();
    const ordreTopoInv: string[] = [];

    function dfsInv(nodeId: string) {
      if (visite2.has(nodeId)) return;
      visite2.add(nodeId);
      const sucs = successeurs.get(nodeId) ?? [];
      for (const s of sucs) dfsInv(s);
      ordreTopoInv.push(nodeId);
    }

    const feuilles = taches.filter((t) => (successeurs.get(t.id)?.length ?? 0) === 0);
    for (const f of feuilles) {
      const idx = tacheMap.get(f.id)!.index;
      lf[idx] = dureeProjet;
      ls[idx] = lf[idx] - f.duree_jours;
    }

    for (const nodeId of ordreTopoInv) {
      const t = tacheMap.get(nodeId)!;
      const idx = t.index;
      const sucs = successeurs.get(nodeId) ?? [];
      if (sucs.length > 0) {
        let minLs = dureeProjet;
        for (const s of sucs) {
          const sIdx = tacheMap.get(s)!.index;
          minLs = Math.min(minLs, ls[sIdx]);
        }
        lf[idx] = minLs;
        ls[idx] = lf[idx] - t.duree_jours;
      }
    }

    for (let i = 0; i < n; i++) {
      marge[i] = ls[i] - es[i];
      estCritique[i] = marge[i] === 0;
    }

    return taches.map((t) => {
      const idx = tacheMap.get(t.id)!.index;
      return {
        tache_id: t.id,
        nom: t.nom,
        duree_jours: t.duree_jours,
        es: es[idx],
        ef: ef[idx],
        ls: ls[idx],
        lf: lf[idx],
        marge: marge[idx],
        est_critique: estCritique[idx],
        est_jalon: t.est_jalon,
      };
    });
  }, [taches, dependances]);

  const pert = calculerPert();
  const dureeProjet = pert.length > 0 ? Math.max(...pert.map((p) => p.ef)) : 0;
  const tachesCritiques = pert.filter((p) => p.est_critique).length;
  const terminees = taches.filter((t) => t.statut === "termine").length;

  // 5.4 - Écart de délai : fin prévue du projet vs date contractuelle du chantier
  const dernierFinPrevue = pert.length > 0
    ? Math.max(...pert.map((p) => {
        const t = taches.find((t) => t.id === p.tache_id);
        return t?.date_prevue_fin ? new Date(t.date_prevue_fin).getTime() : 0;
      }))
    : 0;
  const ecartDelaiJours = dateFinPrevue && dernierFinPrevue > 0
    ? joursEcartDelai(
        new Date(dernierFinPrevue).toISOString().split("T")[0],
        dateFinPrevue,
      )
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

  async function ajouterTache(e: React.FormEvent) {
    e.preventDefault();
    if (!nomTache.trim()) return;
    setLoading(true);
    setMessage(null);
    const supabase = createClient();
    const { data, error } = await supabase.from("taches_planning").insert({
      chantier_id: chantierId,
      nom: nomTache.trim(),
      duree_jours: Number(dureeTache) || 1,
      date_prevue_debut: dateDebutTache || null,
      date_prevue_fin: dateDebutTache ? new Date(new Date(dateDebutTache).getTime() + (Number(dureeTache) || 1) * 86400000).toISOString() : null,
      est_jalon: estJalon,
      statut: "a_faire",
    }).select().single();
    setLoading(false);
    if (error) { setMessage(traduireErreur(error)); return; }
    setTaches((prev) => [...prev, data as Tache]);
    setNomTache("");
    setDureeTache("1");
    setDateDebutTache("");
    setEstJalon(false);
    setMessage(langue === "fr" ? "Tâche ajoutée." : "Task added.");
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
          color="rose"
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

      {/* Formulaire d'ajout de tâche */}
      <section className="anim-fade-up anim-delay-2 mb-6">
        <Card padding="lg">
          <h2 className="mb-4 text-lg font-bold text-foreground">
            {langue === "fr" ? "Nouvelle tâche" : "New task"}
          </h2>
          <form onSubmit={ajouterTache} className="grid grid-cols-1 gap-4 md:grid-cols-4">
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
            <Button type="submit" disabled={loading} className="md:col-span-4">
              {loading ? (langue === "fr" ? "Création..." : "Creating...") : (langue === "fr" ? "Ajouter" : "Add")}
            </Button>
          </form>
        </Card>
      </section>

      {/* Tableau PERT */}
      <section className="anim-fade-up anim-delay-3 mb-6">
        <h2 className="mb-4 flex items-center gap-2.5 text-lg font-bold text-foreground">
          <span className="h-5 w-1.5 rounded-full bg-gradient-to-b from-action to-action-strong" aria-hidden />
          {langue === "fr" ? "Calcul PERT" : "PERT calculation"}
        </h2>
        <Card padding="lg">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/80 bg-surface-2 text-left">
                  <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted">Tâche</th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-muted">Durée</th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-muted">ES</th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-muted">EF</th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-muted">LS</th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-muted">LF</th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-muted">Marge</th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-muted">Critique</th>
                </tr>
              </thead>
              <tbody>
                {pert.map((p) => (
                  <tr
                    key={p.tache_id}
                    className={`border-b border-border/60 transition last:border-0 hover:bg-surface-2/70 ${p.est_critique ? "bg-primary/10" : ""}`}
                  >
                    <td className="px-3 py-2.5">
                      {p.nom}
                      {p.est_jalon && <span className="ml-1 text-xs font-semibold text-primary">◊</span>}
                    </td>
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
                  </tr>
                ))}
                {pert.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-4 text-center text-muted">Aucune tâche. Ajoutez une tâche ci-dessus.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

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
                    return (
                      <div key={p.tache_id} className="relative h-10 border-b border-border">
                        <div
                          className={`absolute top-1/2 h-5 -translate-y-1/2 rounded-full shadow-sm ${
                            p.est_critique
                              ? "bg-gradient-to-r from-action to-action-strong"
                              : "bg-gradient-to-r from-primary to-primary-deep"
                          }`}
                          style={{ left: `${debut}px`, width: `${largeur}px` }}
                          title={`${p.nom} — J${p.es} → J${p.ef}`}
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
    </main>
  );
}
