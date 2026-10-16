"use client";

import { CalendarClock, Flag, Route, TimerReset } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { getLangue } from "@/lib/i18n";
import { joursEcartDelai } from "@/lib/calculs/metre";

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
    if (tRes.error) { setMessage(tRes.error.message); return; }
    if (dRes.error) { setMessage(dRes.error.message); return; }
    if (cRes.error) { setMessage(cRes.error.message); return; }
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
    if (error) { setMessage(error.message); return; }
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
    if (error) { setMessage(error.message); return; }
    setTaches((prev) => prev.map((x) => x.id === t.id ? { ...x, ...updates } : x));
  }

  return (
    <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href={`/chantiers/${chantierId}`} className="text-sm font-medium text-primary hover:underline">
            &larr; Retour chantier
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-foreground md:text-3xl">Planning &amp; PERT</h1>
        </div>
      </div>

      {message && (
        <div className="mb-4 rounded-xl border border-primary/30 bg-primary/10 p-3 text-sm text-foreground">
          {message}
        </div>
      )}

      {/* Statistiques rapides */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
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
      <section className="mb-6">
        <Card padding="lg">
          <h2 className="mb-4 text-lg font-bold text-foreground">Nouvelle tâche</h2>
          <form onSubmit={ajouterTache} className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <input
              className="rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none focus:border-primary dark:bg-slate-800 dark:text-slate-200"
              placeholder="Nom de la tâche *"
              value={nomTache}
              onChange={(e) => setNomTache(e.target.value)}
              required
            />
            <input
              className="rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none focus:border-primary dark:bg-slate-800 dark:text-slate-200"
              type="number"
              placeholder="Durée (j)"
              value={dureeTache}
              onChange={(e) => setDureeTache(e.target.value)}
            />
            <input
              className="rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none focus:border-primary dark:bg-slate-800 dark:text-slate-200"
              type="date"
              value={dateDebutTache}
              onChange={(e) => setDateDebutTache(e.target.value)}
            />
            <div className="flex items-end">
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
      <section className="mb-6">
        <h2 className="mb-4 text-lg font-bold text-foreground">Calcul PERT</h2>
        <Card padding="lg">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="p-3 font-semibold text-muted">Tâche</th>
                  <th className="p-3 text-center font-semibold text-muted">Durée</th>
                  <th className="p-3 text-center font-semibold text-muted">ES</th>
                  <th className="p-3 text-center font-semibold text-muted">EF</th>
                  <th className="p-3 text-center font-semibold text-muted">LS</th>
                  <th className="p-3 text-center font-semibold text-muted">LF</th>
                  <th className="p-3 text-center font-semibold text-muted">Marge</th>
                  <th className="p-3 text-center font-semibold text-muted">Critique</th>
                </tr>
              </thead>
              <tbody>
                {pert.map((p) => (
                  <tr
                    key={p.tache_id}
                    className={`border-b border-border last:border-0 ${p.est_critique ? "bg-primary/10" : ""}`}
                  >
                    <td className="p-3">
                      {p.nom}
                      {p.est_jalon && <span className="ml-1 text-xs font-semibold text-primary">◊</span>}
                    </td>
                    <td className="p-3 text-center">{p.duree_jours}</td>
                    <td className="p-3 text-center">{p.es}</td>
                    <td className="p-3 text-center">{p.ef}</td>
                    <td className="p-3 text-center">{p.ls}</td>
                    <td className="p-3 text-center">{p.lf}</td>
                    <td className={`p-3 text-center font-semibold ${p.est_critique ? "text-action" : "text-muted"}`}>
                      {p.marge}
                    </td>
                    <td className="p-3 text-center">
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
      <section className="mb-6">
        <h2 className="mb-4 text-lg font-bold text-foreground">Diagramme de Gantt</h2>
        <Card padding="lg">
          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
              <div className="flex items-start border-r border-border">
                <div className="w-48 shrink-0">
                  {pert.map((p) => (
                    <div key={p.tache_id} className="truncate p-2 text-sm border-b border-border" title={p.nom}>
                      {p.nom}
                    </div>
                  ))}
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center border-b border-border">
                    {Array.from({ length: dureeProjet + 1 }, (_, i) => (
                      <div
                        key={i}
                        className="h-8 w-[30px] shrink-0 border-r border-border text-[10px] text-muted"
                      >
                        J{i}
                      </div>
                    ))}
                  </div>
                  {pert.map((p) => {
                    const largeur = p.ef - p.es;
                    const debut = p.es * 30;
                    return (
                      <div key={p.tache_id} className="relative flex border-b border-border">
                        <div
                          className="absolute left-0 h-24 w-full"
                          style={{ marginLeft: `${debut}px` }}
                        >
                          <div
                            className={`h-6 rounded-full ${p.est_critique ? "bg-action" : "bg-primary"}`}
                            style={{ width: `${Math.max(largeur * 30 - 4, 20)}px` }}
                          />
                        </div>
                        {p.est_critique && <div className="absolute top-0 left-0 h-24 w-1 bg-action/70" />}
                        <span className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] text-muted">
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
                ? "J0 = début du projet. La barre orange pointée = tâche critique (marge = 0)."
                : "J0 = start of project. The dotted orange bar marks the critical task (zero float)."}
            </p>
          </div>
        </Card>
      </section>
    </main>
  );
}
