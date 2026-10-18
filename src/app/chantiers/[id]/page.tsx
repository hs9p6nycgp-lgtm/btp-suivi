"use client";

import { Box, Calendar, CalendarRange, ClipboardCheck, ClipboardList, Coins, MapPin, Calculator, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import DqeImport from "@/components/DqeImport";
import ChantierEquipe from "@/components/ChantierEquipe";
import ChantierAvancement from "@/components/ChantierAvancement";
import Modele3D from "@/components/visualisation/Modele3D";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { getLangue } from "@/lib/i18n";
import { libelleTypeDetail } from "@/lib/chantiers/types";

type Chantier = {
  id: string;
  nom: string;
  type: string;
  type_detail: string | null;
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
        supabase.from("chantiers").select("*").eq("id", chantierId).eq("proprietaire_id", user.id).maybeSingle(),
        supabase.from("postes_dqe").select("*").eq("chantier_id", chantierId).order("created_at", { ascending: true }),
        supabase.from("chantier_utilisateurs").select("*, profil:profils(id,nom,email)").eq("chantier_id", chantierId),
        supabase.from("sections_chantier").select("*").eq("chantier_id", chantierId),
      ]);

      if (cRes.data) setChantier(cRes.data as Chantier);
      else { router.replace("/chantiers"); return; }
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
          <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-border border-t-action" />
        </div>
      </main>
    );
  }

  const s = STATUT_LABELS[chantier.statut] || STATUT_LABELS.en_preparation;

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
                {chantier.type === "route" ? (langue === "fr" ? "🛣️ Route" : "🛣️ Road") : (langue === "fr" ? "🏢 Bâtiment" : "🏢 Building")} -{" "}
                {chantier.maitre_ouvrage ?? (langue === "fr" ? "sans maître d'ouvrage" : "without project owner")}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {chantier.type_detail ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-action/50 bg-action/20 px-3 py-1.5 text-xs font-semibold backdrop-blur">
                  <span className="h-1.5 w-1.5 rounded-full bg-action" aria-hidden />
                  {libelleTypeDetail(chantier.type_detail)}
                </span>
              ) : null}
              <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold backdrop-blur">
                {langue === "fr" ? s.fr : s.en}
              </span>
              <select
                value={statut}
                onChange={(e) => {
                  setStatut(e.target.value);
                  const supabase = createClient();
                  supabase.auth.getUser().then(({ data: { user } }) => {
                    supabase.from("chantiers").update({ statut: e.target.value }).eq("id", chantierId).eq("proprietaire_id", user?.id ?? "");
                  });
                }}
                className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white backdrop-blur outline-none transition-all focus:border-action"
              >
                {Object.entries(STATUT_LABELS).map(([key, label]) => (
                  <option key={key} value={key} className="text-foreground">{langue === "fr" ? label.fr : label.en}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Accès rapides */}
          <div className="mt-5 flex flex-wrap gap-2">
            {[
              { href: `/chantiers/${chantier.id}/modifier`, label: langue === "fr" ? "Modifier le chantier" : "Edit site", icon: <Pencil className="h-4 w-4" /> },
              { href: `/chantiers/${chantier.id}/planning`, label: "Planning & PERT", icon: <CalendarRange className="h-4 w-4" /> },
              { href: `/chantiers/${chantier.id}/couts`, label: langue === "fr" ? "Coûts & Budget" : "Costs & Budget", icon: <Coins className="h-4 w-4" /> },
              { href: `/chantiers/${chantier.id}/qualite`, label: langue === "fr" ? "Qualité" : "Quality", icon: <ClipboardCheck className="h-4 w-4" /> },
              { href: `/chantiers/${chantier.id}/modelisation3d`, label: langue === "fr" ? "Modélisation 3D" : "3D Modeling", icon: <Box className="h-4 w-4" /> },
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

      {/* Chiffres clés */}
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
          title={langue === "fr" ? "Seuil d'alerte" : "Alert Threshold"}
          value={`${chantier.seuil_ecart_pct}%`}
          subtitle={langue === "fr" ? "écart quantité" : "quantity variance"}
          icon={<MapPin className="h-5 w-5" />}
          color="orange"
        />
        <StatCard
          className="h-full"
          title={langue === "fr" ? "Statut" : "Status"}
          value={langue === "fr" ? s.fr : s.en}
          subtitle={chantier.statut}
          icon={<ClipboardList className="h-5 w-5" />}
          color={s.color as "blue" | "orange" | "emerald" | "rose" | "amber" | "slate"}
        />
        <StatCard
          className="h-full"
          title={langue === "fr" ? "Date début" : "Start Date"}
          value={chantier.date_debut ?? (langue === "fr" ? "Non définie" : "Not set")}
          subtitle={langue === "fr" ? "Début du chantier" : "Start date"}
          icon={<Calendar className="h-5 w-5" />}
          color="slate"
        />
      </div>

      {chantier.latitude !== null && chantier.longitude !== null && (
        <div className="anim-fade-up anim-delay-2 mb-6">
          <div className="mb-4 flex items-start justify-between">
            <h2 className="flex items-center gap-2.5 text-lg font-bold text-foreground">
              <span className="h-5 w-1.5 rounded-full bg-gradient-to-b from-action to-action-strong" aria-hidden />
              {langue === "fr" ? "Localisation GPS" : "GPS Location"}
            </h2>
          </div>
          <Card padding="lg">
            <p className="text-sm font-medium tabular-nums text-foreground">
              {chantier.latitude}, {chantier.longitude}
            </p>
            <div className="mt-4 flex h-48 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-surface-2 text-sm text-muted">
              <MapPin className="h-6 w-6 text-primary" />
              {langue === "fr" ? "Carte interactive (à venir)" : "Interactive map (coming soon)"}
            </div>
          </Card>
        </div>
      )}

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
              ? "Les sections du modèle 3D reprennent les sections enregistrées (table sections_chantier)."
              : "The 3D model sections reuse the registered sections (sections_chantier table)."}
          </p>
        )}
      </section>
    </main>
  );
}
