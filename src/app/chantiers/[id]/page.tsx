"use client";

import { Calendar, ClipboardList, MapPin, Calculator } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import DqeImport from "@/components/DqeImport";
import ChantierEquipe from "@/components/ChantierEquipe";
import Modele3D from "@/components/visualisation/Modele3D";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { getLangue } from "@/lib/i18n";

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

type Section3D = {
  id: string;
  nom: string;
  pk_debut: number | null;
  pk_fin: number | null;
  niveau: string | null;
  lot: string | null;
  type_ouvrage: string | null;
};

const STATUT_LABELS: Record<string, { fr: string; en: string; color: "success" | "warning" | "danger" | "info" | "primary" }> = {
  en_preparation: { fr: "En préparation", en: "Preparation", color: "info" },
  en_cours: { fr: "En cours", en: "In Progress", color: "success" },
  suspendu: { fr: "Suspendu", en: "Suspended", color: "warning" },
  receptionne_provisulement: { fr: "Réceptionné prov.", en: "Provisional Acceptance", color: "info" },
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
  const [sections, setSections] = useState<Section3D[]>([]);
  const [loading, setLoading] = useState(true);
  const [statut, setStatut] = useState("");

  useEffect(() => {
    async function load() {
      if (!chantierId) return;
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }

      const [cRes, pRes, mRes, sRes] = await Promise.all([
        supabase.from("chantiers").select("*").eq("id", chantierId).maybeSingle(),
        supabase.from("postes_dqe").select("*").eq("chantier_id", chantierId).order("created_at", { ascending: true }),
        supabase.from("chantier_utilisateurs").select("*, profil:profils(id,nom,email)").eq("chantier_id", chantierId),
        supabase.from("sections_chantier").select("*").eq("chantier_id", chantierId),
      ]);

      if (cRes.data) setChantier(cRes.data as Chantier);
      if (pRes.data) setPostes(pRes.data as any[]);
      if (mRes.data) setMembres(mRes.data as any[]);
      if (sRes.data) setSections(sRes.data as Section3D[]);
      if (cRes.data?.statut) setStatut(cRes.data.statut);
      setLoading(false);
    }
    load();
  }, [chantierId, router]);

  if (!chantier) {
    return (
      <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
        <div className="flex h-64 items-center justify-center">
          <div className="animate-pulse rounded-full h-8 w-8 bg-action/60"></div>
        </div>
      </main>
    );
  }

  const s = STATUT_LABELS[chantier.statut] || STATUT_LABELS.en_preparation;

  return (
    <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/chantiers" className="text-sm font-medium text-primary hover:underline flex items-center gap-1 mb-2">
            &larr; Retour aux chantiers
          </Link>
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">{chantier.nom}</h1>
          <p className="text-sm text-muted">
            {chantier.type === "route" ? (langue === "fr" ? "🛣️ Route" : "🛣️ Road") : (langue === "fr" ? "🏢 Bâtiment" : "🏢 Building")} -{" "}
            {chantier.maitre_ouvrage ?? (langue === "fr" ? "sans maître d'ouvrage" : "without project owner")}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <StatCard
            title={langue === "fr" ? "Montant marché" : "Contract Amount"}
            value={chantier.montant_marche.toLocaleString(langue === "fr" ? "fr-FR" : "en-US")}
            subtitle="FCFA"
            icon={<Calculator className="h-5 w-5" />}
            color="blue"
          />
          <StatCard
            title={langue === "fr" ? "Seuil d'alerte" : "Alert Threshold"}
            value={`${chantier.seuil_ecart_pct}%`}
            subtitle={langue === "fr" ? "écart quantité" : "quantity variance"}
            icon={<MapPin className="h-5 w-5" />}
            color="orange"
          />
          <StatCard
            title={langue === "fr" ? "Statut" : "Status"}
            value={langue === "fr" ? s.fr : s.en}
            subtitle={chantier.statut}
            icon={<ClipboardList className="h-5 w-5" />}
            color={s.color as "blue" | "orange" | "emerald" | "rose" | "amber" | "slate"}
          />
          <StatCard
            title={langue === "fr" ? "Date début" : "Start Date"}
            value={chantier.date_debut ?? (langue === "fr" ? "Non définie" : "Not set")}
            subtitle={langue === "fr" ? "Début du chantier" : "Start date"}
            icon={<Calendar className="h-5 w-5" />}
            color="slate"
          />
        </div>
        <select
          value={statut}
          onChange={(e) => {
            setStatut(e.target.value);
            const supabase = createClient();
            supabase.from("chantiers").update({ statut: e.target.value }).eq("id", chantierId);
          }}
          className="rounded-xl border border-border bg-surface px-3 py-2 text-xs font-semibold text-foreground focus:ring-2 focus:ring-action focus:border-action outline-none transition-all"
        >
          {Object.entries(STATUT_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{langue === "fr" ? label.fr : label.en}</option>
          ))}
        </select>
        <Link
          href={`/chantiers/${chantier.id}/planning`}
          className="text-sm font-medium text-primary hover:underline"
        >
          Planning & PERT
        </Link>
        <Link
          href={`/chantiers/${chantier.id}/couts`}
          className="text-sm font-medium text-primary hover:underline"
        >
          Coûts & Budget
        </Link>
        <Link
          href={`/chantiers/${chantier.id}/qualite`}
          className="text-sm font-medium text-primary hover:underline"
        >
          Qualité
        </Link>
        </div>

      {chantier.latitude !== null && chantier.longitude !== null && (
        <div className="mb-6">
          <Card padding="lg">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold text-foreground">
                {langue === "fr" ? "Localisation GPS" : "GPS Location"}
              </h2>
            </div>
            <p className="mt-3 text-sm text-foreground">
              {chantier.latitude}, {chantier.longitude}
            </p>
            <div className="mt-4 flex h-48 w-full items-center justify-center rounded-xl bg-muted text-sm text-muted-foreground">
              <MapPin className="mr-2 h-4 w-4" />
              Carte interactive (à venir)
            </div>
          </Card>
        </div>
      )}

      <section className="mb-8">
        <div className="mb-4 flex items-start justify-between">
          <h2 className="text-lg font-bold text-foreground">
            {langue === "fr" ? "Modèle 3D" : "3D Model"}
          </h2>
        </div>
        <Card padding="lg">
          <Modele3D
            chantier={{
              id: chantier.id,
              nom: chantier.nom,
              type: chantier.type,
              longueur: chantier.longueur || 20,
              largeur: chantier.largeur || 10,
              hauteur: chantier.hauteur || 5,
            }}
            sections={sections}
          />
        </Card>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DqeImport chantierId={chantier.id} />
        </div>

        <div className="space-y-6">
          <ChantierEquipe chantierId={chantier.id} initialMembers={(membres ?? []) as any} />
        </div>
      </div>

      <section className="mt-8">
        <div className="mb-4 flex items-start justify-between">
          <h2 className="text-lg font-bold text-foreground">
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
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="p-3 font-semibold text-muted">Code</th>
                <th className="p-3 font-semibold text-muted">Designation</th>
                <th className="p-3 font-semibold text-muted text-center">Unité</th>
                <th className="p-3 font-semibold text-muted text-right">Qté marché</th>
                <th className="p-3 font-semibold text-muted text-right">Prix unitaire</th>
              </tr>
            </thead>
            <tbody>
              {(postes ?? []).map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="p-3 text-muted">{p.code ?? "-"}</td>
                  <td className="p-3 font-medium text-foreground">{p.designation}</td>
                  <td className="p-3 text-center text-muted">{p.unite}</td>
                  <td className="p-3 text-right">{Number(p.quantite_marche).toFixed(2)}</td>
                  <td className="p-3 text-right font-semibold">{Number(p.prix_unitaire).toLocaleString(langue === "fr" ? "fr-FR" : "en-US")}</td>
                </tr>
              ))}
              {(postes ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-muted">
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
              ? "Les sections du modèle 3D reprennent les sections enregistrées (table sections_chantier)."
              : "The 3D model sections reuse the registered sections (sections_chantier table)."}
          </p>
        )}
      </section>
    </main>
  );
}
