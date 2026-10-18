"use client";

import { CalendarDays, ChevronLeft, ChevronRight, ClipboardCheck, FilePlus2 } from "lucide-react";
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

type Etape = 0 | 1 | 2;

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
  const [etape, setEtape] = useState<Etape>(0);
  const [message, setMessage] = useState<string | null>(null);

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

  // La création de la fiche reste exactement la même action que précédemment :
  // le bouton final d'étape 3 insère le journal comme avant.
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("journaux")
      .insert({ chantier_id: chantierId, date_journal: date, meteo: meteo || null, statut: "brouillon" })
      .select()
      .single();
    setLoading(false);
    if (error) {
      setMessage(traduireErreur(error));
      return;
    }
    router.push(`/chantiers/${chantierId}/journaux/${data.id}`);
  }

  const libelleEtape = (etapeCourante: Etape): string => {
    if (etapeCourante === 0) return langue === "fr" ? "1. Saisir le jour" : "Step 1: Enter the day";
    if (etapeCourante === 1) return langue === "fr" ? "2. Vérifier" : "Step 2: Review";
    return langue === "fr" ? "3. Créer la fiche" : "Step 3: Create";
  };

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

      {/* Barre d'étapes */}
      <div className="anim-fade-up anim-delay-1 mb-6 flex items-center gap-2 rounded-xl border border-border/80 bg-surface p-3 shadow-soft">
        {([0, 1, 2] as Etape[]).map((etapeCourante) => (
          <div
            key={etapeCourante}
            className={`flex flex-1 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${
              etape === etapeCourante
                ? "bg-primary text-white"
                : "text-muted"
            }`}
          >
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                etape === etapeCourante ? "bg-white text-primary" : "bg-surface-2 text-muted"
              }`}
            >
              {etapeCourante + 1}
            </span>
            {libelleEtape(etapeCourante)}
          </div>
        ))}
      </div>

      {/* Étape 1 : saisie */}
      {etape === 0 && (
        <Card padding="lg" className="anim-fade-up">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground">
            <CalendarDays className="h-5 w-5 text-primary" />
            {langue === "fr" ? "Saisir le jour" : "Enter the day"}
          </h2>
          <form
            onSubmit={() => {
              setEtape(1);
            }}
            className="grid grid-cols-1 gap-4 md:grid-cols-2"
          >
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Date</label>
              <input
                type="date"
                className="w-full rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Météo</label>
              <input
                className="w-full rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10"
                placeholder="Ensoleillé, pluvieux..."
                value={meteo}
                onChange={(e) => setMeteo(e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-foreground">Observations</label>
              <textarea
                className="w-full rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10"
                rows={3}
                placeholder="Travaux réalisés, incidents, heures supplémentaires..."
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
              />
            </div>
            <div className="md:col-span-2 flex items-end">
              <Button type="submit" size="lg" className="w-full">
                Continuer vers la vérification
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Étape 2 : vérification */}
      {etape === 1 && (
        <Card padding="lg" className="anim-fade-up">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            {langue === "fr" ? "Vérifier le jour saisi" : "Review the entered day"}
          </h2>
          <div className="space-y-3 text-sm text-foreground">
            <div className="rounded-xl border border-border p-4">
              <p className="font-semibold">Date : {date}</p>
              <p className="mt-1">Météo : {meteo || (langue === "fr" ? "non renseignée" : "not specified")}</p>
            </div>
            <div className="rounded-xl border border-border p-4">
              <p className="font-semibold">Observations</p>
              <p className="mt-1 whitespace-pre-wrap">{observations || (langue === "fr" ? "aucune" : "none")}</p>
            </div>
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
            <Button variant="secondary" onClick={() => setEtape(0)}>
              <ChevronLeft className="h-4 w-4" />
              Modifier
            </Button>
            <Button onClick={() => setEtape(2)}>
              Créer la fiche
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {/* Étape 3 : création */}
      {etape === 2 && (
        <Card padding="lg" className="anim-fade-up">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground">
            <FilePlus2 className="h-5 w-5 text-primary" />
            {langue === "fr" ? "Créer la fiche" : "Create the sheet"}
          </h2>
          <div className="space-y-2 text-sm text-foreground">
            <p>
              <span className="font-semibold">Date : </span>
              {date}
            </p>
            <p>
              <span className="font-semibold">Météo : </span>
              {meteo || (langue === "fr" ? "non renseignée" : "not specified")}
            </p>
            <p>
              <span className="font-semibold">Observations : </span>
              {observations || (langue === "fr" ? "aucune" : "none")}
            </p>
          </div>
          <p className="mt-4 text-xs text-muted">
            {langue === "fr"
              ? "Le journal sera enregistré au statut « Brouillon »."
              : "The journal will be saved as « Draft »."}
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
            <Button variant="secondary" onClick={() => setEtape(1)}>
              <ChevronLeft className="h-4 w-4" />
              Retour
            </Button>
            <Button type="button" onClick={(e) => handleCreate(e)} size="lg" disabled={loading}>
              Créer le journal
            </Button>
          </div>
        </Card>
      )}

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
                      <span className="font-semibold text-foreground">{new Date(j.date_journal).toLocaleDateString(langue === "fr" ? "fr-FR" : "en-US")}</span>
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
