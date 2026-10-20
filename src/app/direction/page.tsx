"use client";

// Tableau de bord multi-chantiers pour la direction (cahier des charges
// §6.2) : carte geographique avec code couleur, classement par ecart de
// cout et de delai, chiffre d'affaires realise et reste a realiser, et
// utilisation des engins entre chantiers.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Building2, Coins, MapPin, Route, ShieldAlert, TrendingUp } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { getLangue } from "@/lib/i18n";
import {
  classerChantiers,
  lignesDirection,
  syntheseGlobale,
  utilisationEngins,
  type CritereClassement,
  type LigneDirection,
} from "@/lib/direction/synthese";
import { formaterMontant } from "@/lib/rapport/agregats";

const COULEURS_ETAT = {
  vert: { pastille: "bg-emerald-500", texte: "text-emerald-700", label: "Dans les temps" },
  orange: { pastille: "bg-amber-500", texte: "text-amber-700", label: "Vigilance" },
  rouge: { pastille: "bg-rose-500", texte: "text-rose-700", label: "Critique" },
} as const;

const COULEUR_OSM = { vert: "green", orange: "orange", rouge: "red" } as const;

function formaterDate(valeur: string | null | undefined): string {
  if (!valeur) return "—";
  const d = new Date(`${String(valeur).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return String(valeur);
  return d.toLocaleDateString("fr-FR");
}

export default function DirectionPage() {
  const langue = getLangue();
  const [lignes, setLignes] = useState<LigneDirection[]>([]);
  const [engins, setEngins] = useState<ReturnType<typeof utilisationEngins>>([]);
  const [critere, setCritere] = useState<CritereClassement>("delai");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [cRes, poRes, qtRes, depRes, alRes, ncRes, thRes, jrRes, enRes, bpuRes] = await Promise.all([
        supabase.from("chantiers").select("id,nom,type,statut,latitude,longitude,montant_marche,date_fin_prevue,date_debut").eq("proprietaire_id", user.id),
        supabase.from("postes_dqe").select("id,chantier_id,quantite_marche,prix_unitaire"),
        supabase.from("quantites_realisees").select("chantier_id,poste_dqe_id,quantite"),
        supabase.from("depenses_reelles").select("chantier_id,montant_total"),
        supabase.from("alertes").select("chantier_id,statut").eq("statut", "ouverte"),
        supabase.from("non_conformites").select("chantier_id,statut").in("statut", ["ouverte", "en_cours"]),
        supabase.from("taches_planning").select("chantier_id,date_prevue_fin,date_reelle_fin,statut"),
        supabase.from("journaux").select("id,chantier_id"),
        supabase.from("journal_engins").select("journal_id,type_engin,heures_marche"),
        supabase.from("bpu_postes").select("id,prix_unitaire"),
      ]);

      const chantiers = (cRes.data ?? []) as any[];
      const postes = (poRes.data ?? []) as any[];
      const quantites = (qtRes.data ?? []) as any[];
      const depenses = (depRes.data ?? []) as any[];
      const alertes = (alRes.data ?? []) as any[];
      const nc = (ncRes.data ?? []) as any[];
      const taches = (thRes.data ?? []) as any[];
      const journaux = (jrRes.data ?? []) as any[];
      const enginsJournal = (enRes.data ?? []) as any[];
      const prixBpu = new Map<string, number>(
        ((bpuRes.data ?? []) as any[]).map((b) => [b.id, Number(b.prix_unitaire) || 0]),
      );

      const nomChantier = new Map(chantiers.map((c) => [c.id, c.nom]));

      const lignesCalculees = chantiers.map((c) => {
        const postesChantier = postes.filter((p) => p.chantier_id === c.id);
        const quantitesChantier = quantites.filter((q) => q.chantier_id === c.id);
        const realise = new Map<string, number>();
        for (const q of quantitesChantier) {
          realise.set(q.poste_dqe_id, (realise.get(q.poste_dqe_id) ?? 0) + (Number(q.quantite) || 0));
        }
        let montantMarche = 0;
        let valorisation = 0;
        for (const p of postesChantier) {
          const prix = prixBpu.get(p.id) ?? (Number(p.prix_unitaire) || 0);
          const qteMarche = Number(p.quantite_marche) || 0;
          const qteRealisee = realise.get(p.id) ?? 0;
          montantMarche += qteMarche * prix;
          valorisation += qteRealisee * prix;
        }
        const avancementPct = montantMarche > 0 ? (valorisation / montantMarche) * 100 : 0;
        const depensesChantier = depenses
          .filter((d) => d.chantier_id === c.id)
          .reduce((s, d) => s + (Number(d.montant_total) || 0), 0);
        const alertesChantier = alertes.filter((a) => a.chantier_id === c.id).length;
        const ncChantier = nc.filter((n) => n.chantier_id === c.id).length;

        // Ecart de délai : fin prevue du planning contre fin contractuelle
        const tachesChantier = taches.filter((t) => t.chantier_id === c.id);
        const finPlanning = tachesChantier.reduce((max, t) => {
          const date = t.date_reelle_fin ?? t.date_prevue_fin;
          if (!date) return max;
          const t2 = new Date(`${String(date).slice(0, 10)}T00:00:00`).getTime();
          return Number.isNaN(t2) ? max : Math.max(max, t2);
        }, 0);
        const finContractuelle = c.date_fin_prevue
          ? new Date(`${String(c.date_fin_prevue).slice(0, 10)}T00:00:00`).getTime()
          : NaN;
        const ecartDelaiJours =
          !Number.isNaN(finContractuelle) && finPlanning > 0
            ? Math.round((finPlanning - finContractuelle) / 86400000)
            : null;

        return {
          id: c.id,
          nom: c.nom,
          type: c.type,
          statut: c.statut,
          latitude: c.latitude,
          longitude: c.longitude,
          montantMarche: Number(c.montant_marche) || montantMarche,
          dateFinPrevue: c.date_fin_prevue,
          avancementPct: Math.round(avancementPct * 10) / 10,
          valorisationTravaux: Math.round(valorisation),
          depensesReelles: Math.round(depensesChantier),
          alertesOuvertes: alertesChantier,
          nonConformitesOuvertes: ncChantier,
          ecartDelaiJours,
        };
      });

      setLignes(lignesDirection(lignesCalculees));
      setEngins(
        utilisationEngins(
          enginsJournal.map((e) => ({
            type_engin: e.type_engin,
            heures_marche: Number(e.heures_marche) || 0,
            chantier:
              nomChantier.get(
                journaux.find((j) => j.id === e.journal_id)?.chantier_id ?? "",
              ) ?? "Chantier",
          })),
        ),
      );
      setLoading(false);
    }
    load();
  }, []);

  const synthese = useMemo(() => syntheseGlobale(lignes), [lignes]);
  const classes = useMemo(() => classerChantiers(lignes, critere), [lignes, critere]);

  // Carte : bornes des chantiers positionnes, avec une fenetre par defaut
  const carte = useMemo(() => {
    const positionnes = lignes.filter((c) => c.latitude !== null && c.longitude !== null);
    if (positionnes.length === 0) return null;
    const lats = positionnes.map((c) => c.latitude as number);
    const lons = positionnes.map((c) => c.longitude as number);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);
    const margeLat = Math.max((maxLat - minLat) * 0.2, 0.02);
    const margeLon = Math.max((maxLon - minLon) * 0.2, 0.02);
    const bbox = `${minLon - margeLon},${minLat - margeLat},${maxLon + margeLon},${maxLat + margeLat}`;
    const markers = positionnes
      .map((c) => `&marker=${c.latitude},${c.longitude},${COULEUR_OSM[c.etat]}`)
      .join("");
    return { url: `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik${markers}`, positionnes: positionnes.length };
  }, [lignes]);

  return (
    <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
      <div className="mx-auto w-full max-w-6xl">
        <PageHeader
          eyebrow={langue === "fr" ? "Direction" : "Management"}
          title={langue === "fr" ? "Tous les chantiers" : "All sites"}
          description={
            langue === "fr"
              ? "Situation d'ensemble : carte, classement par écart de coût et de délai, chiffre d'affaires réalisé et utilisation des engins."
              : "Overall status: map, ranking by cost and delay gap, realized revenue and plant usage."
          }
          icon={<TrendingUp className="h-5 w-5" />}
        />

        {loading ? (
          <p className="text-sm text-muted">Chargement…</p>
        ) : lignes.length === 0 ? (
          <Card padding="lg">
            <p className="text-sm text-muted">
              {langue === "fr"
                ? "Aucun chantier : le tableau de bord direction se remplira dès la création d'un premier chantier."
                : "No site yet: the management dashboard will fill in as soon as a site is created."}
            </p>
          </Card>
        ) : (
          <>
            {/* Chiffres clés */}
            <div className="anim-fade-up anim-delay-1 mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title={langue === "fr" ? "Chiffre d'affaires réalisé" : "Realized revenue"}
                value={formaterMontant(synthese.chiffreAffairesRealise)}
                subtitle={`${synthese.tauxRealisationPct} % du marché`}
                icon={<TrendingUp className="h-5 w-5" />}
                color="emerald"
              />
              <StatCard
                title={langue === "fr" ? "Reste à réaliser" : "Remaining work"}
                value={formaterMontant(synthese.resteARealiserTotal)}
                subtitle={`marché : ${formaterMontant(synthese.montantMarcheTotal)}`}
                icon={<MapPin className="h-5 w-5" />}
                color="blue"
              />
              <StatCard
                title={langue === "fr" ? "Marge (travaux − dépenses)" : "Margin (works − expenses)"}
                value={formaterMontant(synthese.margeTotale)}
                subtitle={`dépenses : ${formaterMontant(synthese.depensesReellesTotal)}`}
                icon={<Coins className="h-5 w-5" />}
                color={synthese.margeTotale < 0 ? "rose" : "emerald"}
              />
              <StatCard
                title={langue === "fr" ? "Points d'attention" : "Points of attention"}
                value={synthese.chantiersEnRetard + synthese.nonConformitesOuvertesTotal}
                subtitle={`${synthese.chantiersEnRetard} en retard · ${synthese.alertesOuvertesTotal} alerte(s) · ${synthese.nonConformitesOuvertesTotal} NC`}
                icon={<ShieldAlert className="h-5 w-5" />}
                color={synthese.chantiersEnRetard > 0 ? "rose" : "amber"}
              />
            </div>

            {/* Carte */}
            {carte && (
              <section className="anim-fade-up anim-delay-2 mb-6">
                <Card padding="lg">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-lg font-bold text-foreground">
                      {langue === "fr" ? "Carte des chantiers" : "Sites map"}
                    </h2>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
                      {(["vert", "orange", "rouge"] as const).map((etat) => (
                        <span key={etat} className="inline-flex items-center gap-1.5">
                          <span className={`h-2.5 w-2.5 rounded-full ${COULEURS_ETAT[etat].pastille}`} />
                          {COULEURS_ETAT[etat].label}
                        </span>
                      ))}
                    </div>
                  </div>
                  <iframe
                    title="Carte des chantiers"
                    loading="lazy"
                    className="h-80 w-full rounded-2xl border border-border/80"
                    src={carte.url}
                  />
                  <p className="mt-2 text-xs text-muted">
                    {langue === "fr"
                      ? `${carte.positionnes} chantier(s) positionné(s) — le code couleur suit l'état de chaque chantier.`
                      : `${carte.positionnes} located site(s) — the color code follows each site's status.`}
                  </p>
                </Card>
              </section>
            )}

            {/* Classement */}
            <section className="anim-fade-up anim-delay-3 mb-6">
              <Card padding="lg">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-lg font-bold text-foreground">
                    {langue === "fr" ? "Classement des chantiers" : "Site ranking"}
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {([
                      ["delai", "Retard"],
                      ["cout", "Écart de coût"],
                      ["avancement", "Avancement"],
                    ] as [CritereClassement, string][]).map(([cle, label]) => (
                      <button
                        key={cle}
                        type="button"
                        onClick={() => setCritere(cle)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                          critere === cle
                            ? "bg-primary text-white shadow-sm"
                            : "border border-border/80 bg-surface text-muted hover:border-primary-light/50"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/80 bg-surface-2 text-left">
                        <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted">
                          Chantier
                        </th>
                        <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-muted">
                          Avancement
                        </th>
                        <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-muted">
                          Valorisation
                        </th>
                        <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-muted">
                          Écart de coût
                        </th>
                        <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-muted">
                          Délai
                        </th>
                        <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-muted">
                          État
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {classes.map((c) => {
                        const etat = COULEURS_ETAT[c.etat];
                        return (
                          <tr key={c.id} className="border-b border-border/60">
                            <td className="px-3 py-2.5">
                              <Link
                                href={`/chantiers/${c.id}`}
                                className="inline-flex items-center gap-1.5 font-medium text-foreground hover:text-primary hover:underline"
                              >
                                {c.type === "route" ? (
                                  <Route className="h-3.5 w-3.5" />
                                ) : (
                                  <Building2 className="h-3.5 w-3.5" />
                                )}
                                {c.nom}
                              </Link>
                              <p className="text-[11px] text-muted">Fin prévue : {formaterDate(c.dateFinPrevue)}</p>
                            </td>
                            <td className="px-3 py-2.5 text-right tabular-nums">
                              {String(c.avancementPct).replace(".", ",")} %
                            </td>
                            <td className="px-3 py-2.5 text-right tabular-nums">
                              {formaterMontant(c.valorisationTravaux)}
                            </td>
                            <td
                              className={`px-3 py-2.5 text-right tabular-nums ${
                                c.ecartBudgetaire < 0 ? "text-danger" : "text-foreground"
                              }`}
                            >
                              {formaterMontant(c.ecartBudgetaire)}
                            </td>
                            <td className="px-3 py-2.5 text-center tabular-nums">
                              {c.ecartDelaiJours === null
                                ? "—"
                                : c.ecartDelaiJours > 0
                                  ? `+${c.ecartDelaiJours} j`
                                  : `${c.ecartDelaiJours} j`}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <span
                                className={`inline-flex items-center gap-1.5 text-xs font-semibold ${etat.texte}`}
                              >
                                <span className={`h-2 w-2 rounded-full ${etat.pastille}`} />
                                {etat.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            </section>

            {/* Utilisation des engins */}
            {engins.length > 0 && (
              <section className="anim-fade-up anim-delay-4 mb-6">
                <Card padding="lg">
                  <h2 className="mb-3 text-lg font-bold text-foreground">
                    {langue === "fr" ? "Utilisation des engins" : "Plant usage"}
                  </h2>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/80 bg-surface-2 text-left">
                        <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted">
                          Matériel
                        </th>
                        <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-muted">
                          Heures de marche
                        </th>
                        <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-muted">
                          Chantiers
                        </th>
                        <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted">
                          Répartition
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {engins.map((e) => (
                        <tr key={e.typeEngin} className="border-b border-border/60">
                          <td className="px-3 py-2.5 font-medium text-foreground">{e.typeEngin}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums">
                            {String(e.heuresMarche).replace(".", ",")} h
                          </td>
                          <td className="px-3 py-2.5 text-center tabular-nums">{e.chantiers}</td>
                          <td className="px-3 py-2.5 text-xs text-muted">
                            {e.parChantier
                              .map((c) => `${c.chantier} (${String(c.heures).replace(".", ",")} h)`)
                              .join(" · ")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
