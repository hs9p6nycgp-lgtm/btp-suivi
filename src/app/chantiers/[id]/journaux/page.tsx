"use client";

import { CalendarDays } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { getLangue, traduireErreur } from "@/lib/i18n";

type Journal = {
  id: string;
  chantier_id: string;
  date_journal: string;
  meteo: string | null;
  observations: string | null;
  statut: "brouillon" | "valide";
  created_at: string;
};

// Choix rapides de météo : un seul bouton à toucher sur le terrain
const METEO_CHOIX = ["Soleil", "Nuageux", "Pluie", "Harmattan"];

// JJ/MM/AAAA sans risque de décalage de fuseau (chaîne « AAAA-MM-JJ »)
function formaterDate(dateIso: string): string {
  const [a, m, j] = dateIso.split("-");
  return a && m && j ? `${j}/${m}/${a}` : dateIso;
}

const STATUT_LABELS: Record<string, { fr: string; en: string }> = {
  brouillon: { fr: "Brouillon", en: "Draft" },
  valide: { fr: "Validé", en: "Validated" },
};

export default function JournauxPage() {
  const params = useParams();
  const router = useRouter();
  const chantierId = String(params?.id ?? "");
  const langue = getLangue();
  const [items, setItems] = useState<Journal[]>([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [meteo, setMeteo] = useState("");
  const [observations, setObservations] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Un seul journal par jour : si celui de la date choisie existe déjà, on propose de l'ouvrir
  const journalDuJour = items.find((j) => j.date_journal === date) ?? null;

  useEffect(() => {
    if (chantierId) load();
  }, [chantierId]);

  async function load() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/login"); return; }
    const { data: chantier } = await supabase.from("chantiers").select("id").eq("id", chantierId).eq("proprietaire_id", user.id).maybeSingle();
    if (!chantier) { router.replace("/chantiers"); return; }
    const { data, error } = await supabase
      .from("journaux")
      .select("*")
      .eq("chantier_id", chantierId)
      .order("date_journal", { ascending: false });
    if (error) {
      setMessage(traduireErreur(error));
      return;
    }
    setItems((data ?? []) as Journal[]);
  }

  // Création du journal du jour : les observations sont désormais enregistrées
  // (avant, elles étaient saisies puis perdues) et l'insertion est protégée
  // contre les doublons (un seul journal par date).
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (journalDuJour) return;
    setLoading(true);
    setMessage(null);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("journaux")
      .insert({
        chantier_id: chantierId,
        date_journal: date,
        meteo: meteo || null,
        observations: observations || null,
        statut: "brouillon",
      })
      .select()
      .single();
    setLoading(false);
    if (error) {
      setMessage(traduireErreur(error));
      return;
    }
    router.push(`/chantiers/${chantierId}/journaux/${data.id}`);
  }

  return (
    <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
      <PageHeader
        eyebrow={langue === "fr" ? "Suivi de chantier" : "Site tracking"}
        title={langue === "fr" ? "Journal de chantier" : "Site log"}
        description={
          langue === "fr"
            ? "Créez la fiche journalière : météo, observations et validation."
            : "Create the daily sheet: weather, observations and validation."
        }
        icon={<CalendarDays className="h-5 w-5" />}
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
        <div className="anim-fade-up mb-4 rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-foreground">
          {message}
        </div>
      )}

      {/* Saisie du jour : tout sur une seule page, un seul bouton d'enregistrement */}
      <Card padding="lg" className="anim-fade-up anim-delay-1 mb-8">
        <h2 className="mb-4 flex items-center gap-2.5 text-lg font-bold text-foreground">
          <span className="h-5 w-1.5 rounded-full bg-gradient-to-b from-action to-action-strong" aria-hidden />
          {langue === "fr" ? "Saisie du jour" : "Daily entry"}
        </h2>

        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                {langue === "fr" ? "Date du journal" : "Log date"}
              </label>
              <input
                type="date"
                className="w-full rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                {langue === "fr" ? "Météo du jour" : "Weather today"}
              </label>
              <div className="flex flex-wrap gap-2">
                {METEO_CHOIX.map((choix) => (
                  <button
                    key={choix}
                    type="button"
                    onClick={() => setMeteo(meteo === choix ? "" : choix)}
                    className={`rounded-xl border px-3.5 py-2 text-sm font-medium transition ${
                      meteo === choix
                        ? "border-action bg-action/10 text-foreground"
                        : "border-border/80 bg-surface text-muted shadow-sm hover:border-primary-light/50 hover:text-foreground"
                    }`}
                  >
                    {choix}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              {langue === "fr" ? "Observations de la journée" : "Day observations"}
            </label>
            <textarea
              className="w-full rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10"
              rows={4}
              placeholder={
                langue === "fr"
                  ? "Travaux réalisés, incidents, heures supplémentaires..."
                  : "Work done, incidents, overtime..."
              }
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
            />
          </div>

          {journalDuJour ? (
            <div className="flex flex-col gap-3 rounded-xl border border-primary/30 bg-primary/10 p-4 text-sm text-foreground sm:flex-row sm:items-center sm:justify-between">
              <p>
                {langue === "fr"
                  ? `Un journal existe déjà pour le ${formaterDate(journalDuJour.date_journal)}. Ouvrez-le pour continuer la saisie.`
                  : `A log already exists for ${formaterDate(journalDuJour.date_journal)}. Open it to continue.`}
              </p>
              <Link
                href={`/chantiers/${chantierId}/journaux/${journalDuJour.id}`}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-action px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-action/25 transition hover:bg-action-strong"
              >
                {langue === "fr" ? "Ouvrir ce journal" : "Open this log"}
              </Link>
            </div>
          ) : (
            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading
                ? langue === "fr"
                  ? "Enregistrement..."
                  : "Saving..."
                : langue === "fr"
                  ? "Enregistrer le journal"
                  : "Save the log"}
            </Button>
          )}
        </form>
      </Card>

      {/* Liste des journaux existants */}
      <div className="anim-fade-up anim-delay-2 mt-10">
        <h2 className="mb-4 flex items-center gap-2.5 text-lg font-bold text-foreground">
          <span className="h-5 w-1.5 rounded-full bg-gradient-to-b from-action to-action-strong" aria-hidden />
          {langue === "fr" ? "Journaux existants" : "Existing logs"}
        </h2>
        {items.length === 0 ? (
          <Card padding="lg" className="text-center">
            <p className="text-sm text-muted">Aucun journal pour le moment.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {items.map((j) => (
              <Link key={j.id} href={`/chantiers/${chantierId}/journaux/${j.id}`} className="block">
                <Card padding="none" className="flex items-center gap-4 p-4 hover:border-primary/40 transition-all">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">{formaterDate(j.date_journal)}</span>
                      <Badge variant={j.statut === "valide" ? "success" : "warning"}>
                        {langue === "fr" ? STATUT_LABELS[j.statut].fr : STATUT_LABELS[j.statut].en}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted">{j.meteo ?? (langue === "fr" ? "Météo non renseignée" : "Weather not specified")}</p>
                  </div>
                  <span className="text-sm font-medium text-primary">Ouvrir →</span>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
