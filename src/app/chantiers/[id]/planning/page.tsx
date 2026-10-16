"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { getLangue } from "@/lib/i18n";

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

  const [nomTache, setNomTache] = useState("");
  const [dureeTache, setDureeTache] = useState("1");
  const [dateDebutTache, setDateDebutTache] = useState("");
  const [estJalon, setEstJalon] = useState(false);

  useEffect(() => {
    if (chantierId) load();
  }, [chantierId]);

  async function load() {
    const supabase = createClient();
    const [tRes, dRes] = await Promise.all([
      supabase.from("taches_planning").select("*").eq("chantier_id", chantierId).order("created_at", { ascending: true }),
      supabase.from("dependances_planning").select("*").eq("chantier_id", chantierId),
    ]);
    if (tRes.error) { setMessage(tRes.error.message); return; }
    if (dRes.error) { setMessage(dRes.error.message); return; }
    setTaches((tRes.data ?? []) as Tache[]);
    setDependances((dRes.data ?? []) as Dependance[]);
    setLoading(false);
  }

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

  const statCardColor = (c: string) => {
    const map: Record<string, { bg: string; text: string }> = {
      blue: { bg: "bg-blue-50", text: "text-blue-600" },
      orange: { bg: "bg-orange-50", text: "text-orange-600" },
      rose: { bg: "bg-rose-50", text: "text-rose-600" },
      emerald: { bg: "bg-emerald-50", text: "text-emerald-600" },
    };
    return map[c] || map.blue;
  };

  function StatMini({ title, value, icon, color }: { title: string; value: string | number; icon: string; color: string }) {
    const c = statCardColor(color);
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm border-b-2 border-transparent">
        <div className="flex items-start justify-between mb-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${c.bg} ${c.text}`}>{icon}</div>
        </div>
        <p className="text-lg font-bold text-slate-900">{value}</p>
      </div>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-6">
      <div className="mb-6 flex items-start justify-between">
        <LinkBack />
        <h1 className="text-2xl font-bold text-slate-900">Planning & PERT</h1>
      </div>

      {message && (
        <div className="mb-4 rounded-lg bg-orange-50 border border-orange-200 p-3 text-sm text-orange-700">
          {message}
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatMini title={langue === "fr" ? "Tâches" : "Tasks"} value={taches.length} icon="📋" color="blue" />
        <StatMini title={langue === "fr" ? "Durée projet" : "Project Duration"} value={`${dureeProjet} j`} icon="⏱️" color="orange" />
        <StatMini title={langue === "fr" ? "Chemin critique" : "Critical Path"} value={tachesCritiques} icon="🔴" color="rose" />
        <StatMini title={langue === "fr" ? "Terminées" : "Completed"} value={terminees} icon="✅" color="emerald" />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm mb-6">
        <h2 className="mb-4 text-lg font-bold text-slate-900">Nouvelle tâche</h2>
        <form onSubmit={ajouterTache} className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <input className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none" placeholder="Nom de la tâche *" value={nomTache} onChange={(e) => setNomTache(e.target.value)} required />
          <input className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none" type="number" placeholder="Durée (j)" value={dureeTache} onChange={(e) => setDureeTache(e.target.value)} />
          <input className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none" type="date" value={dateDebutTache} onChange={(e) => setDateDebutTache(e.target.value)} />
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={estJalon} onChange={(e) => setEstJalon(e.target.checked)} className="rounded text-orange-600" />
              {langue === "fr" ? "Jalon" : "Milestone"}
            </label>
          </div>
          <button type="submit" disabled={loading} className="rounded-xl bg-orange-600 px-4 py-3 text-white font-semibold hover:bg-orange-700 disabled:opacity-50 transition-all shadow-sm hover:shadow-md">
            {loading ? (langue === "fr" ? "Création..." : "Creating...") : (langue === "fr" ? "Ajouter" : "Add")}
          </button>
        </form>
      </div>

      <section className="mb-6">
        <h2 className="mb-4 text-lg font-bold text-slate-900">Calcul PERT</h2>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="p-3 font-semibold text-slate-500">Tâche</th>
                  <th className="p-3 font-semibold text-slate-500 text-center">Durée</th>
                  <th className="p-3 font-semibold text-slate-500 text-center">ES</th>
                  <th className="p-3 font-semibold text-slate-500 text-center">EF</th>
                  <th className="p-3 font-semibold text-slate-500 text-center">LS</th>
                  <th className="p-3 font-semibold text-slate-500 text-center">LF</th>
                  <th className="p-3 font-semibold text-slate-500 text-center">Marge</th>
                  <th className="p-3 font-semibold text-slate-500 text-center">Critique</th>
                </tr>
              </thead>
              <tbody>
                {pert.map((p) => (
                  <tr key={p.tache_id} className={`border-b border-slate-100 ${p.est_critique ? "bg-rose-50" : ""}`}>
                    <td className="p-3">{p.nom}{p.est_jalon ? " <span className='text-xs text-orange-600'>◊</span>" : ""}</td>
                    <td className="p-3 text-center">{p.duree_jours}</td>
                    <td className="p-3 text-center">{p.es}</td>
                    <td className="p-3 text-center">{p.ef}</td>
                    <td className="p-3 text-center">{p.ls}</td>
                    <td className="p-3 text-center">{p.lf}</td>
                    <td className={`p-3 text-center font-semibold ${p.est_critique ? "text-rose-600" : "text-slate-600"}`}>{p.marge}</td>
                    <td className="p-3 text-center">
                      <Badge variant={p.est_critique ? "danger" : "default"}>
                        {p.est_critique ? "OUI" : "—"}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {pert.length === 0 && (
                  <tr><td colSpan={8} className="p-4 text-center text-slate-500">Aucune tâche. Ajoutez une tâche ci-dessus.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="mb-6">
        <h2 className="mb-4 text-lg font-bold text-slate-900">Diagramme de Gantt</h2>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
              <div className="flex items-start border-r border-slate-200">
                <div className="w-48 shrink-0">
                  {pert.map((p) => (
                    <div key={p.tache_id} className="p-2 border-b border-slate-100 text-sm truncate" title={p.nom}>{p.nom}</div>
                  ))}
                </div>
                <div className="flex flex-col h-auto">
                  <div className="flex items-center border-b border-slate-200">
                    {Array.from({ length: dureeProjet + 1 }, (_, i) => (
                      <div key={i} className="w-[30px] h-8 flex items-center justify-center text-[10px] text-slate-500 border-r border-slate-100">J{i}</div>
                    ))}
                  </div>
                  {pert.map((p) => {
                    const largeur = p.ef - p.es;
                    const debut = p.es * 30;
                    return (
                      <div key={p.tache_id} className="flex items-center border-b border-slate-100">
                        <div className={`w-[30px] h-24 flex items-center justify-center overflow-hidden relative group`} style={{ marginLeft: `${debut}px` }}>
                          <div className={`h-6 rounded-full ${p.est_critique ? "bg-rose-600" : "bg-blue-600"}`} style={{ width: `${Math.max(largeur * 30 - 4, 20)}px` }}></div>
                          {p.est_critique && <div className="absolute top-0 left-0 w-1 h-24 bg-rose-600"></div>}
                          <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] text-slate-500 whitespace-nowrap">{p.duree_jours}j</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-500">J0 = début du projet. Barre rouge = tâche critique (marge = 0).</p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-bold text-slate-900">Gestion des tâches</h2>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="p-3 font-semibold text-slate-500">Tâche</th>
                  <th className="p-3 font-semibold text-slate-500 text-center">Statut</th>
                  <th className="p-3 font-semibold text-slate-500 text-center">Avancement</th>
                </tr>
              </thead>
              <tbody>
                {taches.map((t) => (
                  <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-3">{t.nom}</td>
                    <td className="p-3 text-center">
                      <button onClick={() => toggleStatut(t)} className={`px-3 py-1 rounded text-xs font-bold transition-colors ${t.statut === "termine" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                        {t.statut === "termine" ? "Terminé" : "À faire"}
                      </button>
                    </td>
                    <td className="p-3 text-center">
                      <div className="w-20 bg-slate-100 rounded-full h-2">
                        <div className={`h-2 rounded-full ${t.avancement_pct > 90 ? "bg-rose-600" : t.avancement_pct > 70 ? "bg-amber-600" : "bg-blue-600"}`} style={{ width: `${t.avancement_pct}%` }}></div>
                      </div>
                      <span className="text-[10px] text-slate-500">{t.avancement_pct}%</span>
                    </td>
                  </tr>
                ))}
                {taches.length === 0 && (
                  <tr><td colSpan={3} className="p-4 text-center text-slate-500">Aucune tâche.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}

function LinkBack() {
  const langue = getLangue();
  return (
    <Link href="/chantiers" className="inline-flex items-center gap-2 text-sm text-orange-600 font-semibold hover:underline transition-colors">
      <span>←</span>
      {langue === "fr" ? "Retour aux chantiers" : "Back to sites"}
    </Link>
  );
}