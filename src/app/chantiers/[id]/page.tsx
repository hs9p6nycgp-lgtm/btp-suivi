"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import DqeImport from "@/components/DqeImport";
import ChantierEquipe from "@/components/ChantierEquipe";
import Modele3D from "@/components/visualisation/Modele3D";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { getLangue, t } from "@/lib/i18n";

type Chantier = {
  id: string;
  nom: string;
  type: string;
  maitre_ouvrage: string | null;
  montant_marche: number;
  date_debut: string | null;
  date_fin_prevue: string | null;
  latitude: number | null;
  longitude: number | null;
  longueur: number | null;
  largeur: number | null;
  hauteur: number | null;
  seuil_ecart_pct: number;
  statut: string;
  created_at: string;
};

const STATUT_LABELS: Record<string, { fr: string; en: string; color: "success" | "warning" | "danger" | "info" | "primary" }> = {
  en_preparation: { fr: "En préparation", en: "Preparation", color: "info" },
  en_cours: { fr: "En cours", en: "In Progress", color: "success" },
  suspendu: { fr: "Suspendu", en: "Suspended", color: "warning" },
  receptionne_provisoirement: { fr: "Réceptionné prov.", en: "Provisional Acceptance", color: "info" },
  cloture: { fr: "Clôturé", en: "Closed", color: "danger" },
};

export default function ChantierDetailPage() {
  const params = useParams();
  const router = useRouter();
  const chantierId = String(params?.id ?? "");
  const langue = getLangue();

  const [chantier, setChantier] = useState<Chantier | null>(null);
  const [postes, setPostes] = useState<any[]>([]);
  const [membres, setMembres] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statut, setStatut] = useState("");

  useEffect(() => {
    async function load() {
      if (!chantierId) return;
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }

      const [cRes, pRes, mRes] = await Promise.all([
        supabase.from("chantiers").select("*").eq("id", chantierId).maybeSingle(),
        supabase.from("postes_dqe").select("*").eq("chantier_id", chantierId).order("created_at", { ascending: true }),
        supabase.from("chantier_utilisateurs").select("*, profil:profils(id,nom,email)").eq("chantier_id", chantierId),
      ]);

      if (cRes.data) setChantier(cRes.data as Chantier);
      if (pRes.data) setPostes(pRes.data as any[]);
      if (mRes.data) setMembres(mRes.data as any[]);
      if (cRes.data?.statut) setStatut(cRes.data.statut);
      setLoading(false);
    }
    load();
  }, [chantierId, router]);

  if (!chantier) {
    return (
      <main className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse rounded-full h-8 w-8 bg-slate-200"></div>
        </div>
      </main>
    );
  }

  const s = STATUT_LABELS[chantier.statut] || STATUT_LABELS.en_preparation;

  return (
    <main className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <Link href="/chantiers" className="text-sm text-orange-600 hover:underline flex items-center gap-1 mb-2">
            ← Retour aux chantiers
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">{chantier.nom}</h1>
          <p className="text-sm text-slate-500">
            {chantier.type === "route" ? (langue === "fr" ? "🛣️ Route" : "🛣️ Road") : (langue === "fr" ? "🏢 Bâtiment" : "🏢 Building")} -{" "}
            {chantier.maitre_ouvrage ?? (langue === "fr" ? "sans maître d'ouvrage" : "without project owner")}
          </p>
        </div>
        <div className="flex items-end gap-3">
          <select
            value={statut}
            onChange={(e) => {
              setStatut(e.target.value);
              const supabase = createClient();
              supabase.from("chantiers").update({ statut: e.target.value }).eq("id", chantierId);
            }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all shadow-sm"
          >
            {Object.entries(STATUT_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{langue === "fr" ? label.fr : label.en}</option>
            ))}
          </select>
          <Link
            href={`/chantiers/${chantier.id}/planning`}
            className="rounded-xl bg-blue-600 px-4 py-2 text-white text-sm font-semibold hover:bg-blue-700 transition-all shadow-sm"
          >
            Planning & PERT
          </Link>
          <Link
            href={`/chantiers/${chantier.id}/couts`}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-white text-sm font-semibold hover:bg-emerald-700 transition-all shadow-sm"
          >
            Coûts & Budget
          </Link>
          <Link
            href={`/chantiers/${chantier.id}/qualite`}
            className="rounded-xl bg-purple-600 px-4 py-2 text-white text-sm font-semibold hover:bg-purple-700 transition-all shadow-sm"
          >
            Qualité
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:grid-cols-4">
        <StatCard
          title={langue === "fr" ? "Montant marché" : "Contract Amount"}
          value={Number(chantier.montant_marche).toLocaleString(langue === "fr" ? "fr-FR" : "en-US")}
          subtitle="FCFA"
          icon="💰"
          color="blue"
        />
        <StatCard
          title={langue === "fr" ? "Seuil d'alerte" : "Alert Threshold"}
          value={`${chantier.seuil_ecart_pct}%`}
          subtitle={langue === "fr" ? "écart quantité" : "quantity variance"}
          icon="⚠️"
          color="orange"
        />
        <StatCard
          title={langue === "fr" ? "Statut" : "Status"}
          value={langue === "fr" ? s.fr : s.en}
          subtitle={chantier.statut}
          icon="📋"
          color={s.color as "blue" | "orange" | "emerald" | "rose" | "amber" | "slate"}
        />
        <StatCard
          title={langue === "fr" ? "Date début" : "Start Date"}
          value={chantier.date_debut ?? (langue === "fr" ? "Non définie" : "Not set")}
          subtitle={langue === "fr" ? "Début du chantier" : "Start date"}
          icon="📅"
          color="slate"
        />
      </div>

      {chantier.latitude !== null && chantier.longitude !== null && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-semibold text-slate-700">{langue === "fr" ? "Localisation GPS" : "GPS Location"}</span>
            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">
              {chantier.latitude}, {chantier.longitude}
            </span>
          </div>
          <div className="w-full h-48 rounded-xl bg-slate-200 flex items-center justify-center text-slate-400 text-sm">
            🗺️ Carte interactive (à venir)
          </div>
        </div>
      )}

      <section className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-slate-900">
          {langue === "fr" ? "Modèle 3D" : "3D Model"}
        </h2>
        <p className="mb-3 text-sm text-slate-500">
          {langue === "fr"
            ? "Visualisation 3D du chantier basée sur les dimensions saisies."
            : "3D visualization of the site based on entered dimensions."}
        </p>
        <Modele3D
          chantier={{
            id: chantier.id,
            nom: chantier.nom,
            type: chantier.type,
            longueur: chantier.longueur || 20,
            largeur: chantier.largeur || 10,
            hauteur: chantier.hauteur || 5,
          }}
          sections={[]}
        />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DqeImport chantierId={chantier.id} />
        </div>

        <div className="lg:col-span-1 space-y-6">
          <ChantierEquipe chantierId={chantier.id} initialMembers={(membres ?? []) as any} />
        </div>
      </div>

      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">
            {postes.length > 0 ? (langue === "fr" ? "Postes du DQE" : "DQE Items") : (langue === "fr" ? "Aucun poste importé" : "No items imported")}
          </h2>
          {postes.length > 0 && (
            <Link href="/bpu" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
              Gérer le BPU
            </Link>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left">
                <th className="p-3 font-semibold text-slate-500">Code</th>
                <th className="p-3 font-semibold text-slate-500">Designation</th>
                <th className="p-3 font-semibold text-slate-500 text-center">Unité</th>
                <th className="p-3 font-semibold text-slate-500 text-right">Qté marché</th>
                <th className="p-3 font-semibold text-slate-500 text-right">Prix unitaire</th>
              </tr>
            </thead>
            <tbody>
              {(postes ?? []).map((p) => (
                <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="p-3 text-sm text-slate-600">{p.code ?? "-"}</td>
                  <td className="p-3 text-sm font-medium text-slate-900">{p.designation}</td>
                  <td className="p-3 text-sm text-slate-600 text-center">{p.unite}</td>
                  <td className="p-3 text-sm text-right text-slate-600">{Number(p.quantite_marche).toFixed(2)}</td>
                  <td className="p-3 text-sm text-right font-semibold text-slate-900">{Number(p.prix_unitaire).toLocaleString(langue === "fr" ? "fr-FR" : "en-US")}</td>
                </tr>
              ))}
              {(postes ?? []).length === 0 && (
                <tr>
                  <td className="p-6 text-center text-slate-500" colSpan={5}>
                    Aucun poste importé pour le moment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}