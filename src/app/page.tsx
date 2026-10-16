"use client";

import { CalendarClock, Coins, FileText, Image as ImageIcon, TriangleAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { getLangue } from "@/lib/i18n";

type Chantier = {
  id: string;
  nom: string;
  type: string;
  maitre_ouvrage: string | null;
  montant_marche: number;
  date_debut: string | null;
  date_fin_prevue: string | null;
  statut: string;
  created_at: string;
};

type DepenseRealisee = {
  chantier_id: string;
  date_depense: string;
  montant_total: number;
};

type Alerte = {
  id: string;
  chantier_id: string;
  type: string;
  valeur: number;
  seuil: number;
  statut: string;
  date_alerte: string;
};

type PhotoJournal = {
  chemin: string;
  legende: string | null;
  created_at: string;
};

const STATUT_LABELS: Record<string, { fr: string; en: string; color: "success" | "warning" | "danger" | "info" }> = {
  en_preparation: { fr: "En préparation", en: "Preparation", color: "info" },
  en_cours: { fr: "En cours", en: "In Progress", color: "success" },
  suspendu: { fr: "Suspendu", en: "Suspended", color: "warning" },
  receptionne_provisoirement: { fr: "Réceptionné prov.", en: "Provisional Acceptance", color: "info" },
  cloture: { fr: "Clôturé", en: "Closed", color: "danger" },
};

// Un point d'une mini-courbe : uniquement affiché
type PointeMini = { x: string; y: number };

function trierParDate(dateA: string, dateB: string) {
  return dateA < dateB ? -1 : dateA > dateB ? 1 : 0;
}

// Mini-courbe 1 : activité, nombre cumulé de chantiers créés dans le temps
function activiteParCreation(chantiers: Chantier[]): PointeMini[] {
  const tries = chantiers.slice().sort((a, b) => trierParDate(a.created_at, b.created_at));
  let cumul = 0;
  return tries.map((chantier, index) => {
    cumul += 1;
    return { x: chantier.created_at.slice(0, 10), y: cumul };
  });
}

// Mini-courbe 2 : cumul du montant des chantiers en cours, dans le temps
function montantEnCours(chantiers: Chantier[]): PointeMini[] {
  const enCours = chantiers
    .filter((c) => c.statut === "en_cours")
    .sort((a, b) => trierParDate(a.created_at, b.created_at));
  let cumul = 0;
  return enCours.map((chantier) => {
    cumul += Number(chantier.montant_marche || 0);
    return { x: chantier.created_at.slice(0, 10), y: cumul };
  });
}

// Mini-courbe 3 : cumul du montant des chantiers clôturés, dans le temps
function montantClotures(chantiers: Chantier[]): PointeMini[] {
  const clotures = chantiers
    .filter((c) => c.statut === "cloture")
    .sort((a, b) => trierParDate(a.created_at, b.created_at));
  let cumul = 0;
  return clotures.map((chantier) => {
    cumul += Number(chantier.montant_marche || 0);
    return { x: chantier.created_at.slice(0, 10), y: cumul };
  });
}

// Mini-courbe 4 : montant cumulé par mois de création (FCFA)
function montantParMois(chantiers: Chantier[]): PointeMini[] {
  const parMois = new Map<string, number>();
  for (const chantier of chantiers) {
    const mois = (chantier.created_at || "").slice(0, 7);
    parMois.set(mois, (parMois.get(mois) ?? 0) + Number(chantier.montant_marche || 0));
  }
  const mois = [...parMois.keys()].sort();
  let cumul = 0;
  return mois.map((cle) => {
    cumul += parMois.get(cle) ?? 0;
    return { x: cle, y: cumul };
  });
}

// Mini-courbe 5 : cumul du nombre de chantiers en préparation
function chantiersEnPreparation(chantiers: Chantier[]): PointeMini[] {
  const enPreparation = chantiers
    .filter((c) => c.statut === "en_preparation")
    .sort((a, b) => trierParDate(a.created_at, b.created_at));
  let cumul = 0;
  return enPreparation.map((chantier) => {
    cumul += 1;
    return { x: chantier.created_at.slice(0, 10), y: cumul };
  });
}

type DonneesPlanRealisé = {
  planifiee: PointeMini[];
  realisee: PointeMini[];
};

// Valeur la plus récente en date x pour un rendu en escalier
type DonneesFusionnees = Array<{
  x: string;
  planifiee: number | null;
  realisee: number | null;
}>;

function valeurEn(uneSerie: PointeMini[], x: string): number | null {
  let valeur: number | null = null;
  for (const point of uneSerie) {
    if (point.x <= x) {
      valeur = point.y;
    } else {
      break;
    }
  }
  return valeur;
}

// Fusionne les deux séries pour les afficher sur un même axe
function fusionnerSeries(planifiee: PointeMini[], realisee: PointeMini[]): DonneesFusionnees {
  const axes = [
    ...new Set([...planifiee.map((point) => point.x), ...realisee.map((point) => point.x)]),
  ].sort();

  return axes.map((x) => ({
    x,
    planifiee: valeurEn(planifiee, x),
    realisee: valeurEn(realisee, x),
  }));
}

// S prévu / réalisé : la courbe « prévu » atteint 100 % à la date de fin prévue,
// la courbe « réalisé » suit le cumul des dépenses réelles datées.
// la courbe « réalisé » suit les dépenses réelles datées.
function planVersRealise(chantiers: Chantier[], depenses: DepenseRealisee[]): DonneesPlanRealisé {
  const terminaisons = chantiers
    .filter((c) => c.date_fin_prevue !== null)
    .map((c) => c.date_fin_prevue as string)
    .sort(trierParDate);

  const planifiee: PointeMini[] = [];
  if (terminaisons.length > 0) {
    const total = terminaisons.length;
    terminaisons.forEach((date, index) => {
      const progres = ((index + 1) / total) * 100;
      planifiee.push({ x: date, y: Math.round(progres * 10) / 10 });
    });
  }

  const realisee: PointeMini[] = [];
  const depensesTriees = depenses
    .slice()
    .sort((a, b) => trierParDate(a.date_depense, b.date_depense));
  let cumul = 0;
  for (const depense of depensesTriees) {
    cumul += depense.montant_total;
    realisee.push({ x: depense.date_depense, y: cumul });
  }

  return { planifiee, realisee };
}

export default function Home() {
  const router = useRouter();
  const langue = getLangue();
  const [chantiers, setChantiers] = useState<Chantier[]>([]);
  const [depenses, setDepenses] = useState<DepenseRealisee[]>([]);
  const [alertes, setAlertes] = useState<Alerte[]>([]);
  const [photos, setPhotos] = useState<PhotoJournal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }

      const { data } = await supabase.from("chantiers").select("*").eq("proprietaire_id", user.id).order("created_at", { ascending: false });
      setChantiers((data ?? []) as Chantier[]);
      setLoading(false);
    }
    load();
  }, [router]);

  // Données d'affichage (lecture seule)
  useEffect(() => {
    let actif = true;
    async function loadSupplementaire() {
      const supabase = createClient();
      try {
        const depensesData = await supabase.from("depenses_reelles").select("chantier_id, date_depense, montant_total");
        if (!actif) return;
        setDepenses((depensesData.data ?? []) as DepenseRealisee[]);

        const alertesData = await supabase
          .from("alertes")
          .select("id, chantier_id, type, valeur, seuil, statut, date_alerte")
          .eq("statut", "ouverte");
        if (!actif) return;
        setAlertes((alertesData.data ?? []) as Alerte[]);

        const photosData = await supabase
          .from("photos_journal")
          .select("chemin, legende, created_at")
          .order("created_at", { ascending: false })
          .limit(12);
        if (!actif) return;
        setPhotos((photosData.data ?? []) as PhotoJournal[]);
      } catch {
        // Les données secondaires sont remplies à la volée ; on continue sans elles
      }
    }
    loadSupplementaire();
    return () => {
      actif = false;
    };
  }, []);

  const totalMontant = chantiers.reduce((s, c) => s + Number(c.montant_marche || 0), 0);
  const enCours = chantiers.filter((c) => c.statut === "en_cours").length;
  const clotures = chantiers.filter((c) => c.statut === "cloture").length;
  const enPreparation = chantiers.filter((c) => c.statut === "en_preparation").length;
  const terminePct = chantiers.length > 0 ? Math.round((clotures / chantiers.length) * 100) : 0;

  const nomDesChantiers = new Map(chantiers.map((c) => [c.id, c.nom]));

  const { planifiee, realisee } = planVersRealise(chantiers, depenses);
  const donnees = fusionnerSeries(planifiee, realisee);

  const comparaison = chantiers
    .map((chantier) => {
      const realiseTotal = depenses
        .filter((d) => d.chantier_id === chantier.id)
        .reduce((s, d) => s + d.montant_total, 0);
      return {
        chantier,
        realiseTotal,
      };
    })
    .sort((a, b) => b.realiseTotal - a.realiseTotal);

  const libelleStatut = (statut: string) => {
    const s = STATUT_LABELS[statut] ?? STATUT_LABELS.en_preparation;
    return langue === "fr" ? s.fr : s.en;
  };

  return (
    <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
      {/* En-tête de la page */}
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground md:text-3xl">Tableau de bord</h1>
            <p className="text-sm text-muted">
              Vue d'ensemble de vos chantiers en cours et à venir.
            </p>
          </div>
        </div>
      </div>

      {/* Cartes de chiffres clés */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={langue === "fr" ? "Chantiers actifs" : "Active sites"}
          value={enCours}
          icon={<CalendarClock className="h-5 w-5" />}
          color="blue"
          trend={{ value: `${enCours}`, label: langue === "fr" ? "en cours" : "in progress", positive: true }}
          miniPoints={activiteParCreation(chantiers)}
        />
        <StatCard
          title={langue === "fr" ? "En cours" : "In progress"}
          value={enCours}
          icon={<Coins className="h-5 w-5" />}
          color="orange"
          trend={{ value: `${enCours}`, label: langue === "fr" ? "en cours" : "in progress", positive: true }}
          miniPoints={montantEnCours(chantiers)}
        />
        <StatCard
          title={langue === "fr" ? "Clôturés" : "Closed"}
          value={clotures}
          icon={<FileText className="h-5 w-5" />}
          color="emerald"
          trend={{ value: terminePct.toString(), label: "% du total", positive: true }}
          miniPoints={montantClotures(chantiers)}
        />
        <StatCard
          title={langue === "fr" ? "Montant total" : "Total amount"}
          value={totalMontant.toLocaleString(langue === "fr" ? "fr-FR" : "en-US")}
          subtitle="FCFA"
          icon={<Coins className="h-5 w-5" />}
          color="amber"
          miniPoints={montantParMois(chantiers)}
        />
        <StatCard
          title={langue === "fr" ? "En préparation" : "In preparation"}
          value={enPreparation}
          icon={<CalendarClock className="h-5 w-5" />}
          color="slate"
          trend={{ value: `${enPreparation}`, label: langue === "fr" ? "à venir" : "planned", positive: true }}
          miniPoints={chantiersEnPreparation(chantiers)}
        />
      </div>

      {/* Plan prévu / réalisé */}
      <section className="mb-6">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">Plan prévu / réalisé</h2>
            <p className="text-sm text-muted">Comparaison entre le planning prévu et les dépenses réelles.</p>
          </div>
        </div>
        <Card padding="lg">
          {/* Courbe du plan prévu : avancement en % */}
          <div className="mb-6 h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={donnees}
                margin={{ top: 10, left: 10, right: 20, bottom: 10 }}
              >
                <XAxis dataKey="x" tick={{ fontSize: 11 }} stroke="var(--border)" />
                <YAxis
                  domain={[0, 100]}
                  unit="%"
                  tick={{ fontSize: 11 }}
                  stroke="var(--border)"
                  label={{ value: "Avancement", angle: -90, position: "insideLeft" }}
                />
                <Tooltip
                  formatter={(valeur) => [`${Number(valeur).toLocaleString(langue === "fr" ? "fr-FR" : "en-US")}%`, "Avancement"]}
                />
                <Line type="monotone" dataKey="planifiee" stroke="var(--primary)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {/* Courbe des dépenses réelles : cumul des montants FCFA */}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-muted">Dépenses réelles</h3>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={donnees}
                  margin={{ top: 10, left: 10, right: 20, bottom: 10 }}
                >
                  <XAxis dataKey="x" tick={{ fontSize: 11 }} stroke="var(--border)" />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    stroke="var(--border)"
                    tickFormatter={(valeur) => `${Number(valeur) / 1000} k`}
                  />
                  <Tooltip
                    formatter={(valeur) => [
                      `${Number(valeur).toLocaleString(langue === "fr" ? "fr-FR" : "en-US")} FCFA`,
                      "Dépenses",
                    ]}
                  />
                  <Line type="monotone" dataKey="realisee" stroke="var(--action)" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted">
            {langue === "fr"
              ? "La courbe « prévu » atteint 100 % à la date de fin prévue, la « réalisé » suit les dépenses réelles."
              : "The « planned » curve reaches 100% at the planned end date, the « realized » curve tracks actual expenses."}
          </p>
        </Card>
      </section>

      {/* Comparatif prévu / réalisé par chantier */}
      <section className="mb-6">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">Prévu / réalisé par chantier</h2>
            <p className="text-sm text-muted">Montant du marché et dépenses réellement engagées.</p>
          </div>
        </div>
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="p-3 font-semibold text-muted">Chantier</th>
                <th className="p-3 text-right font-semibold text-muted">Montant marché (FCFA)</th>
                <th className="p-3 text-right font-semibold text-muted">Dépenses réelles (FCFA)</th>
                <th className="p-3 text-right font-semibold text-muted">Écart (FCFA)</th>
              </tr>
            </thead>
            <tbody>
              {comparaison.map(({ chantier, realiseTotal }) => (
                <tr key={chantier.id} className="border-b border-border last:border-0">
                  <td className="p-3 font-medium text-foreground">{chantier.nom}</td>
                  <td className="p-3 text-right font-mono text-foreground">
                    {Number(chantier.montant_marche || 0).toLocaleString(langue === "fr" ? "fr-FR" : "en-US")}
                  </td>
                  <td className="p-3 text-right font-mono text-foreground">
                    {realiseTotal.toLocaleString(langue === "fr" ? "fr-FR" : "en-US")}
                  </td>
                  <td className="p-3 text-right font-mono text-danger">
                    {(realiseTotal - Number(chantier.montant_marche || 0)).toLocaleString(langue === "fr" ? "fr-FR" : "en-US")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Alertes en cours */}
      <section className="mb-6">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">Alertes en cours</h2>
            <p className="text-sm text-muted">Non-conformités et écarts encore ouverts.</p>
          </div>
        </div>
        {alertes.length === 0 ? (
          <Card padding="lg" className="text-center">
            <TriangleAlert className="mx-auto mb-3 h-10 w-10 text-success" />
            <p className="text-sm text-muted">Aucune alerte en cours.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {alertes.map((alerte) => {
              const chantier = nomDesChantiers.get(alerte.chantier_id);
              return (
                <Card key={alerte.id} padding="md" className="flex items-start gap-4 border-l-4 border-warning">
                  <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">
                      {chantier ? `${chantier} — ` : ""}
                      {alerte.type}
                    </p>
                    <p className="text-sm text-muted">
                      Valeur : {alerte.valeur} / Seuil : {alerte.seuil}
                    </p>
                  </div>
                  <Badge variant="warning">{alerte.statut}</Badge>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Galerie photos */}
      <section>
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">Galerie photos</h2>
            <p className="text-sm text-muted">Dernières photos saisies dans les journaux.</p>
          </div>
        </div>
        {photos.length === 0 ? (
          <Card padding="lg" className="text-center">
            <ImageIcon className="mx-auto mb-3 h-10 w-10 text-muted" />
            <p className="text-sm text-muted">Aucune photo pour le moment.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {photos.map((photo) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={photo.chemin}
                src={photo.chemin}
                alt={photo.legende ?? "Photo de chantier"}
                className="h-40 w-full rounded-xl border border-border object-cover"
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
