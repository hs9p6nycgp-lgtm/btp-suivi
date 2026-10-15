"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";

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
  es: number; // jour relatif depuis le début du projet
  ef: number;
  ls: number;
  lf: number;
  marge: number;
  est_critique: boolean;
  est_jalon: boolean;
};

function parseDate(s: string | null): number | null {
  if (!s) return null;
  return new Date(s).getTime();
}

function formatDate(ts: number | null): string | null {
  if (!ts) return null;
  return new Date(ts).toLocaleDateString("fr-FR");
}

export default function PlanningPage() {
  const params = useParams();
  const chantierId = String(params?.id ?? "");
  const router = useRouter();

  const [taches, setTaches] = useState<Tache[]>([]);
  const [dependances, setDependances] = useState<Dependance[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  // État pour ajout de tâche
  const [nomTache, setNomTache] = useState("");
  const [dureeTache, setDureeTache] = useState("1");
  const [dateDebutTache, setDateDebutTache] = useState("");
  const [estJalon, setEstJalon] = useState(false);

  // Calcul PERT
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

    // Suivants et prédécesseurs
    const successeurs = new Map<string, string[]>();
    const predecesseurs = new Map<string, string[]>();
    taches.forEach((t) => {
      successeurs.set(t.id, []);
      predecesseurs.set(t.id, []);
    });
    dependances.forEach((d) => {
      const preds = predecesseurs.get(d.tache_successeur_id) ?? [];
      preds.push(d.tache_predecesseur_id);
      predecesseurs.set(d.tache_successeur_id, preds);

      const sucs = successeurs.get(d.tache_predecesseur_id) ?? [];
      sucs.push(d.tache_successeur_id);
      successeurs.set(d.tache_predecesseur_id, sucs);
    });

    // Trouver les tâches racines (sans prédécesseur)
    const racines = taches.filter((t) => (predecesseurs.get(t.id)?.length ?? 0) === 0);

    // Passage avant (Forward pass) - ES et EF
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

    // Initialiser les racines
    for (const t of racines) {
      const idx = tacheMap.get(t.id)!.index;
      es[idx] = 0;
      ef[idx] = es[idx] + t.duree_jours;
    }

    // Calcul ES/EF dans l'ordre topologique
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

    // Durée totale du projet
    const dureeProjet = Math.max(...ef);

    // Passage arrière (Backward pass) - LS et LF
    const visite2 = new Set<string>();
    const ordreTopoInv: string[] = [];

    function dfsInv(nodeId: string) {
      if (visite2.has(nodeId)) return;
      visite2.add(nodeId);
      const sucs = successeurs.get(nodeId) ?? [];
      for (const s of sucs) dfsInv(s);
      ordreTopoInv.push(nodeId);
    }

    // Trouver les tâches feuilles (sans successeur)
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

    // Marges et chemin critique
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

  useEffect(() => {
    async function load() {
      if (!chantierId) return;
      const supabase = createClient();
      const [tRes, dRes] = await Promise.all([
        supabase.from("taches_planning").select("*").eq("chantier_id", chantierId).order("created_at", { ascending: true }),
        supabase.from("dependances_planning").select("*").eq("chantier_id", chantierId),
      ]);
      if (tRes.error) setMessage(tRes.error.message);
      else setTaches((tRes.data ?? []) as Tache[]);
      if (dRes.error) setMessage(dRes.error.message);
      else setDependances((dRes.data ?? []) as Dependance[]);
      setLoading(false);
    }
    load();
  }, [chantierId]);

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
      date_prevue_fin: dateDebutTache ? new Date(dateDebutTache).toISOString() : null,
      est_jalon: estJalon,
      statut: "a_faire",
    }).select().single();
    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setTaches((prev) => [...prev, data as Tache]);
    setNomTache("");
    setDureeTache("1");
    setDateDebutTache("");
    setEstJalon(false);
    setMessage("Tâche ajoutée.");
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
    if (error) {
      setMessage(error.message);
      return;
    }
    setTaches((prev) => prev.map((x) => x.id === t.id ? { ...x, ...updates } : x));
  }

  const dureeProjet = pert.length > 0 ? Math.max(...pert.map((p) => p.ef)) : 0;
  const tachesCritiques = pert.filter((p) => p.est_critique).length;

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <Link href={`/chantiers/${chantierId}`} className="text-sm text-action hover:underline">
          &lt; Retour chantier
        </Link>
        <h1 className="text-2xl font-bold text-primary">Planning et PERT</h1>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4 text-sm">
        <div className="card p-4">
          <p className="text-muted text-xs uppercase font-semibold">Tâches</p>
          <p className="text-2xl font-bold text-primary">{taches.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-muted text-xs uppercase font-semibold">Durée projet</p>
          <p className="text-2xl font-bold text-primary">{dureeProjet} jours</p>
        </div>
        <div className="card p-4">
          <p className="text-muted text-xs uppercase font-semibold">Chemin critique</p>
          <p className="text-2xl font-bold text-danger">{tachesCritiques}</p>
        </div>
        <div className="card p-4">
          <p className="text-muted text-xs uppercase font-semibold">Tâches terminées</p>
          <p className="text-2xl font-bold text-success">{taches.filter((t) => t.statut === "termine").length}</p>
        </div>
      </div>

      {message && <p className="mb-4 rounded-lg bg-danger/10 p-3 text-sm text-danger border border-danger/20">{message}</p>}

      {/* Ajout de tâche */}
      <section className="card p-5 mb-8">
        <h2 className="mb-3 text-lg font-bold text-primary">Nouvelle tâche</h2>
        <form onSubmit={ajouterTache} className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <input className="rounded-xl border p-2.5 text-sm focus:ring-2 focus:ring-action outline-none" placeholder="Nom de la tâche *" value={nomTache} onChange={(e) => setNomTache(e.target.value)} required />
          <input className="rounded-xl border p-2.5 text-sm focus:ring-2 focus:ring-action outline-none" type="number" placeholder="Durée (j)" value={dureeTache} onChange={(e) => setDureeTache(e.target.value)} />
          <input className="rounded-xl border p-2.5 text-sm focus:ring-2 focus:ring-action outline-none" type="date" value={dateDebutTache} onChange={(e) => setDateDebutTache(e.target.value)} />
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={estJalon} onChange={(e) => setEstJalon(e.target.checked)} className="rounded text-action" />
            Jalons
          </label>
          <button type="submit" className="btn-primary">Ajouter</button>
        </form>
      </section>

      {/* Tableau PERT */}
      <section className="card p-6 mb-8">
        <h2 className="mb-4 text-lg font-bold text-primary">Calcul PERT (Chemin critique)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left">
                <th className="p-3 font-semibold text-muted">Tâche</th>
                <th className="p-3 font-semibold text-muted text-center">Durée (j)</th>
                <th className="p-3 font-semibold text-muted text-center">ES</th>
                <th className="p-3 font-semibold text-muted text-center">EF</th>
                <th className="p-3 font-semibold text-muted text-center">LS</th>
                <th className="p-3 font-semibold text-muted text-center">LF</th>
                <th className="p-3 font-semibold text-muted text-center">Marge</th>
                <th className="p-3 font-semibold text-muted text-center">Critique</th>
              </tr>
            </thead>
            <tbody>
              {pert.map((p) => (
                <tr key={p.tache_id} className={`border-b border-slate-100 ${p.est_critique ? "bg-red-50" : ""}`}>
                  <td className="p-3">{p.nom}{p.est_jalon ? " <span className='text-xs text-action'>◊</span>" : ""}</td>
                  <td className="p-3 text-center">{p.duree_jours}</td>
                  <td className="p-3 text-center">{p.es}</td>
                  <td className="p-3 text-center">{p.ef}</td>
                  <td className="p-3 text-center">{p.ls}</td>
                  <td className="p-3 text-center">{p.lf}</td>
                  <td className={`p-3 text-center font-semibold ${p.est_critique ? "text-danger" : "text-muted"}`}>{p.marge}</td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${p.est_critique ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-500"}`}>
                      {p.est_critique ? "OUI" : "—"}
                    </span>
                  </td>
                </tr>
              ))}
              {pert.length === 0 && (
                <tr><td colSpan={8} className="p-4 text-center text-muted">Aucune tâche. Ajoutez une tâche ci-dessus.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Gantt simplifié */}
      <section className="card p-6">
        <h2 className="mb-4 text-lg font-bold text-primary">Diagramme de Gantt (simplifié)</h2>
        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            <div className="flex items-start border-r border-slate-200">
              <div className="w-48 shrink-0">
                {pert.map((p) => (
                  <div key={p.tache_id} className="p-2 border-b border-slate-100 text-sm truncate" title={p.nom}>
                    {p.nom}
                  </div>
                ))}
              </div>
              <div className="flex flex-col h-auto">
                {/* Échelle du temps */}
                <div className="flex items-center border-b border-slate-200">
                  {Array.from({ length: dureeProjet + 1 }, (_, i) => (
                    <div key={i} className="w-[30px] h-8 flex items-center justify-center text-[10px] text-muted border-r border-slate-100">
                      J{i}
                    </div>
                  ))}
                </div>
                {/* Barres des tâches */}
                {pert.map((p) => {
                  const largeur = p.ef - p.es;
                  const debut = p.es * 30;
                  return (
                    <div key={p.tache_id} className="flex items-center border-b border-slate-100">
                      <div className={`w-[30px] h-24 flex items-center justify-center overflow-hidden relative group`} style={{ marginLeft: `${debut}px` }}>
                        <div className={`h-6 rounded-full ${p.est_critique ? "bg-red-500" : "bg-primary"}`} style={{ width: `${Math.max(largeur * 30 - 4, 20)}px` }}></div>
                        {p.est_critique && (
                          <div className="absolute top-0 left-0 w-1 h-24 bg-red-500"></div>
                        )}
                        <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] text-muted whitespace-nowrap">{p.duree_jours}j</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted">J0 = début du projet. Barre rouge = tâche critique (marge = 0).</p>
        </div>
      </section>

      {/* Liste des tâches avec statut */}
      <section className="card p-6">
        <h2 className="mb-4 text-lg font-bold text-primary">Gestion des tâches</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left">
                <th className="p-3 font-semibold text-muted">Tâche</th>
                <th className="p-3 font-semibold text-muted text-center">Statut</th>
                <th className="p-3 font-semibold text-muted text-center">Date prévue</th>
                <th className="p-3 font-semibold text-muted text-center">Avancement</th>
                <th className="p-3 font-semibold text-muted text-center"></th>
              </tr>
            </thead>
            <tbody>
              {taches.map((t) => (
                <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="p-3">{t.nom}</td>
                  <td className="p-3 text-center">
                    <button onClick={() => toggleStatut(t)} className={`px-3 py-1 rounded text-xs font-bold transition-colors ${t.statut === "termine" ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                      {t.statut === "termine" ? "Terminé" : "À faire"}
                    </button>
                  </td>
                  <td className="p-3 text-center">{formatDate(parseDate(t.date_prevue_debut)) ?? "—"}</td>
                  <td className="p-3 text-center">
                    <div className="w-24 bg-slate-100 rounded-full h-2">
                      <div className="h-2 rounded-full bg-action" style={{ width: `${t.avancement_pct}%` }}></div>
                    </div>
                    <span className="text-[10px] text-muted">{t.avancement_pct}%</span>
                  </td>
                  <td className="p-3 text-right">
                    {t.description && <span className="text-[10px] text-muted truncate max-w-[150px]" title={t.description}>{t.description}</span>}
                  </td>
                </tr>
              ))}
              {taches.length === 0 && (
                <tr><td colSpan={5} className="p-4 text-center text-muted">Aucune tâche.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}