"use client";

import { CalendarDays, ChevronLeft, ChevronRight, ClipboardCheck, FilePlus2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { getLangue } from "@/lib/i18n";

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
    if (error) return;
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
    if (error) return;
    router.push(`/chantiers/${chantierId}/journaux/${data.id}`);
  }

  const libelleEtape = (etapeCourante: Etape): string => {
    if (etapeCourante === 0) return langue === "fr" ? "1. Saisir le jour" : "Step 1: Enter the day";
    if (etapeCourante === 1) return langue === "fr" ? "2. Vérifier" : "Step 2: Review";
    return langue === "fr" ? "3. Créer la fiche" : "Step 3: Create";
  };

  return (
    <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
      <div className="mb-6">
        <Link href={`/chantiers/${chantierId}`} className="text-sm font-medium text-primary hover:underline">
          &larr; Retour chantier
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-foreground md:text-3xl">Journal de chantier</h1>
      </div>

      {/* Barre d'étapes */}
      <div className="mb-6 flex items-center gap-2 rounded-xl border border-border bg-surface p-3">
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
                etape === etapeCourante ? "bg-white text-primary" : "bg-slate-200 dark:bg-slate-700"
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
        <Card padding="lg">
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
                className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none focus:border-primary dark:bg-slate-800 dark:text-slate-200"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Météo</label>
              <input
                className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none focus:border-primary dark:bg-slate-800 dark:text-slate-200"
                placeholder="Ensoleillé, pluvieux..."
                value={meteo}
                onChange={(e) => setMeteo(e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-foreground">Observations</label>
              <textarea
                className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none focus:border-primary dark:bg-slate-800 dark:text-slate-200"
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
        <Card padding="lg">
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
        <Card padding="lg">
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
      <div className="mt-10">
        <h2 className="mb-4 text-lg font-bold text-foreground">Journaux existants</h2>
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
