"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { getLangue } from "@/lib/i18n";
import { Download, Printer } from "lucide-react";
import * as XLSX from "xlsx";
import {
  agregatJournaux,
  agregatNonConformites,
  comparaisonDelai,
  depensesParCategorie,
  formaterMontant,
  formaterPourcentage,
  periodeParDefaut,
  totalDepenses,
  totalValorisation,
  valorisationPostes,
  type LigneValorisation,
} from "@/lib/rapport/agregats";

type Periode = "journalier" | "hebdomadaire" | "mensuel";

// Affichage compact des dates (règle du projet : JJ/MM/AAAA)
function afficherDate(iso: string) {
  const [annee, mois, jour] = (iso || "").split("-");
  return annee && mois && jour ? `${jour}/${mois}/${annee}` : iso;
}

type DetailChantier = {
  id: string;
  nom: string;
  date_fin_prevue: string | null;
  statut: string | null;
  montant_marche: number | null;
};

export default function RapportsPage() {
  const langue = getLangue();
  const [chantiers, setChantiers] = useState<any[]>([]);
  const [selectedChantier, setSelectedChantier] = useState("");
  const [periode, setPeriode] = useState<Periode>("journalier");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => { loadChantiers(); }, []);

  async function loadChantiers() {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("chantiers").select("id,nom").eq("proprietaire_id", user.id).order("nom");
    setChantiers((data ?? []) as any[]);
    setLoading(false);
  }

  async function genererRapport() {
    if (!selectedChantier) { return; }
    setGenerating(true);
    const supabase = createClient();

    const chantier = chantiers.find((c) => c.id === selectedChantier);
    const defauts = periodeParDefaut(periode);
    const debut = dateDebut || defauts.debut;
    const fin = dateFin || defauts.fin;

    const [postesRes, qtesRes, depensesRes, journauxRes, essaisRes, ncRes, detailRes, dernierRes] = await Promise.all([
      supabase.from("postes_dqe").select("*").eq("chantier_id", selectedChantier),
      supabase.from("quantites_realisees").select("*").eq("chantier_id", selectedChantier).gte("date_saisie", debut).lte("date_saisie", fin),
      supabase.from("depenses_reelles").select("*").eq("chantier_id", selectedChantier).gte("date_depense", debut).lte("date_depense", fin),
      supabase.from("journaux").select("*").eq("chantier_id", selectedChantier).gte("date_journal", debut).lte("date_journal", fin),
      supabase.from("essais_qualite").select("*").eq("chantier_id", selectedChantier).gte("date_controle", debut).lte("date_controle", fin),
      supabase.from("non_conformites").select("*").eq("chantier_id", selectedChantier),
      supabase.from("chantiers").select("id,nom,date_fin_prevue,statut,montant_marche").eq("id", selectedChantier).maybeSingle(),
      supabase.from("journaux").select("date_journal").eq("chantier_id", selectedChantier).order("date_journal", { ascending: false }).limit(1),
    ]);

    const postes = postesRes.data ?? [];
    const qtes = qtesRes.data ?? [];
    const depenses = depensesRes.data ?? [];
    const journaux = journauxRes.data ?? [];
    const essais = essaisRes.data ?? [];
    const nonConformites = ncRes.data ?? [];
    const detail = (detailRes.data ?? null) as DetailChantier | null;

    // Détail des journaux de la période (effectifs, engins, incidents, photos)
    const journalIds = journaux.map((j: any) => j.id as string);
    const [effRes, engRes, incRes, phoRes] = journalIds.length
      ? await Promise.all([
          supabase.from("journal_effectifs").select("*").in("journal_id", journalIds),
          supabase.from("journal_engins").select("*").in("journal_id", journalIds),
          supabase.from("incidents_journal").select("*").in("journal_id", journalIds),
          supabase.from("photos_journal").select("*").in("journal_id", journalIds),
        ])
      : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }];

    // --- Agrégats ---
    const lignesValorisation = valorisationPostes(postes, qtes);
    const totaux = totalValorisation(lignesValorisation);
    const totalDepenseReelle = totalDepenses(depenses);
    const parCategorie = depensesParCategorie(depenses);
    const nc = agregatNonConformites(nonConformites);
    const journauxAgg = agregatJournaux({
      journaux,
      effectifs: effRes.data ?? [],
      engins: engRes.data ?? [],
      incidents: incRes.data ?? [],
      photos: phoRes.data ?? [],
    });

    const dernierActivite = (dernierRes.data?.[0]?.date_journal as string | undefined) ?? null;
    const delai = comparaisonDelai(
      detail?.date_fin_prevue ?? null,
      dernierActivite,
      detail?.statut === "cloture",
    );

    const nbConformes = essais.filter((e: any) => e.conforme).length;
    const tauxConformite = essais.length > 0 ? Math.round((nbConformes / essais.length) * 100) : 100;
    const avancement = totaux.montantMarche > 0 ? (totaux.montantRealise / totaux.montantMarche) * 100 : 0;
    const marge = totaux.montantRealise - totalDepenseReelle;

    setReportData({
      chantier: chantier?.nom ?? selectedChantier,
      periode,
      debut,
      fin,
      postes: postes.length,
      totalCoutPrevu: totaux.montantMarche,
      totalCoutReel: totaux.montantRealise,
      totalDepenses: totalDepenseReelle,
      marge,
      avancement: Math.round(avancement * 10) / 10,
      nbJournaux: journauxAgg.nombreJournaux,
      nbEssais: essais.length,
      tauxConformite,
      valorisation: lignesValorisation,
      depensesParCategorie: parCategorie,
      nonConformites: nc,
      journaux: journauxAgg,
      delai,
      dateGeneration: new Date().toLocaleDateString("fr-FR"),
    });
    setGenerating(false);
  }

  function imprimer() {
    window.print();
  }

  function exporterExcel() {
    if (!reportData) return;
    const wb = XLSX.utils.book_new();

    const synthese = [
      { Indicateur: "Chantier", Valeur: reportData.chantier },
      { Indicateur: "Période", Valeur: `${afficherDate(reportData.debut)} → ${afficherDate(reportData.fin)}` },
      { Indicateur: "Avancement physique", Valeur: `${reportData.avancement} %` },
      { Indicateur: "Valorisation des travaux (FCFA)", Valeur: reportData.totalCoutReel },
      { Indicateur: "Montant du marché (DQE, FCFA)", Valeur: reportData.totalCoutPrevu },
      { Indicateur: "Dépenses réelles (FCFA)", Valeur: reportData.totalDepenses },
      { Indicateur: "Marge valorisation - dépenses (FCFA)", Valeur: reportData.marge },
      { Indicateur: "Journaux", Valeur: reportData.nbJournaux },
      { Indicateur: "Effectifs cumulés (personnes·jours)", Valeur: reportData.journaux.effectifsCumules },
      { Indicateur: "Heures de marche", Valeur: reportData.journaux.heuresMarche },
      { Indicateur: "Incidents", Valeur: reportData.journaux.nombreIncidents },
      { Indicateur: "Photos", Valeur: reportData.journaux.nombrePhotos },
      { Indicateur: "Non-conformités ouvertes", Valeur: reportData.nonConformites.ouvertes },
      { Indicateur: "Taux de conformité des essais", Valeur: `${reportData.tauxConformite} %` },
      { Indicateur: "Délai", Valeur: reportData.delai.libelle },
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(synthese), "Synthèse");

    const valorisation = (reportData.valorisation ?? []).map((l: LigneValorisation) => ({
      Code: l.code ?? "",
      Désignation: l.designation,
      Unité: l.unite,
      "Quantité marché": l.quantiteMarche,
      "Quantité réalisée": l.quantiteRealisee,
      "Prix unitaire": l.prixUnitaire,
      "Montant marché (FCFA)": Math.round(l.montantMarche),
      "Montant valorisé (FCFA)": Math.round(l.montantRealise),
      "Avancement %": Math.round(l.avancement * 10) / 10,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(valorisation), "Valorisation");

    const depenses = (reportData.depensesParCategorie ?? []).map((d: any) => ({
      Catégorie: d.libelle,
      Nombre: d.nombre,
      "Total (FCFA)": Math.round(d.total),
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(depenses), "Dépenses");

    const nonConformites = (reportData.nonConformites?.parGravite ?? []).map((g: any) => ({
      Gravité: g.libelle,
      Nombre: g.total,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(nonConformites), "Non-conformités");

    XLSX.writeFile(wb, `rapport_${reportData.chantier}_${reportData.debut}.xlsx`);
  }

  return (
    <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
      <PageHeader
        eyebrow={langue === "fr" ? "Synthèse" : "Summary"}
        title="Rapports"
        description="Générez un rapport de synthèse par chantier et période, imprimable en PDF."
        icon={<Printer className="h-5 w-5" />}
        actions={
          reportData ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={exporterExcel}>
                <Download className="h-4 w-4" />
                Exporter en Excel
              </Button>
              <Button onClick={imprimer}>
                <Printer className="h-4 w-4" />
                Imprimer / PDF
              </Button>
            </div>
          ) : undefined
        }
      />

      <Card className="mb-6 max-w-2xl">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Chantier</label>
            <select value={selectedChantier} onChange={(e) => setSelectedChantier(e.target.value)} className="w-full rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10">
              <option value="">— Sélectionner —</option>
              {chantiers.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Période</label>
            <select
              value={periode}
              onChange={(e) => {
                const valeur = e.target.value as Periode;
                setPeriode(valeur);
                // La période commande réellement la fenêtre du rapport.
                const bornes = periodeParDefaut(valeur);
                setDateDebut(bornes.debut);
                setDateFin(bornes.fin);
              }}
              className="w-full rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10"
            >
              <option value="journalier">Journalier</option>
              <option value="hebdomadaire">Hebdomadaire</option>
              <option value="mensuel">Mensuel</option>
            </select>
            <p className="mt-1 text-xs text-muted">
              {periode === "journalier"
                ? "La journée en cours."
                : periode === "hebdomadaire"
                  ? "Les sept derniers jours."
                  : "Depuis le premier jour du mois."}
            </p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Date début</label>
            <input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} className="w-full rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Date fin</label>
            <input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} className="w-full rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10" />
          </div>
        </div>
        <Button onClick={genererRapport} disabled={generating || !selectedChantier} className="mt-4">
          {generating ? "Génération..." : "Générer le rapport"}
        </Button>
      </Card>

      {reportData && (
        <div className="space-y-6">
          <Card padding="lg" className="print:shadow-none" id="rapport">
            <h2 className="mb-1 text-xl font-bold">Rapport de synthèse</h2>
            <p className="mb-4 text-sm text-muted">
              Chantier : {reportData.chantier} · Période : {reportData.periode} · {afficherDate(reportData.debut)} → {afficherDate(reportData.fin)}
            </p>
            <p className="mb-4 text-xs text-muted">Généré le {reportData.dateGeneration}</p>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="rounded-xl border border-border/70 bg-surface-2 p-3 text-center">
                <p className="text-xs text-muted">Postes DQE</p>
                <p className="text-lg font-bold">{reportData.postes}</p>
              </div>
              <div className="rounded-xl border border-border/70 bg-surface-2 p-3 text-center">
                <p className="text-xs text-muted">Avancement physique</p>
                <p className="text-lg font-bold">{formaterPourcentage(reportData.avancement)}</p>
              </div>
              <div className="rounded-xl border border-border/70 bg-surface-2 p-3 text-center">
                <p className="text-xs text-muted">Montant du marché (DQE)</p>
                <p className="text-lg font-bold">{formaterMontant(reportData.totalCoutPrevu)}</p>
              </div>
              <div className="rounded-xl border border-border/70 bg-surface-2 p-3 text-center">
                <p className="text-xs text-muted">Valorisation travaux</p>
                <p className="text-lg font-bold">{formaterMontant(reportData.totalCoutReel)}</p>
              </div>
              <div className="rounded-xl border border-border/70 bg-surface-2 p-3 text-center">
                <p className="text-xs text-muted">Dépenses réelles</p>
                <p className="text-lg font-bold">{formaterMontant(reportData.totalDepenses)}</p>
              </div>
              <div className="rounded-xl border border-border/70 bg-surface-2 p-3 text-center">
                <p className="text-xs text-muted">Marge (valorisation − dépenses)</p>
                <p className={`text-lg font-bold ${reportData.marge < 0 ? "text-danger" : "text-foreground"}`}>
                  {formaterMontant(reportData.marge)}
                </p>
              </div>
              <div className="rounded-xl border border-border/70 bg-surface-2 p-3 text-center">
                <p className="text-xs text-muted">Délai</p>
                <p className="text-sm font-bold">{reportData.delai.libelle}</p>
              </div>
              <div className="rounded-xl border border-border/70 bg-surface-2 p-3 text-center">
                <p className="text-xs text-muted">Conformité des essais</p>
                <p className="text-lg font-bold">{reportData.tauxConformite} %</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted">
              « Valorisation travaux » = quantités réalisées × prix unitaires. « Dépenses réelles » = argent
              effectivement décaissé. Les deux notions sont distinctes : leur écart donne la marge.
            </p>
          </Card>

          {/* Journaux de la période */}
          <Card padding="lg" className="print:shadow-none">
            <h3 className="mb-3 text-lg font-bold">Journaux de la période</h3>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="rounded-xl border border-border/70 bg-surface-2 p-3 text-center">
                <p className="text-xs text-muted">Journaux</p>
                <p className="text-lg font-bold">{reportData.journaux.nombreJournaux}</p>
                <p className="text-[11px] text-muted">{reportData.journaux.nombreValides} validés</p>
              </div>
              <div className="rounded-xl border border-border/70 bg-surface-2 p-3 text-center">
                <p className="text-xs text-muted">Effectifs cumulés</p>
                <p className="text-lg font-bold">{reportData.journaux.effectifsCumules}</p>
                <p className="text-[11px] text-muted">personnes·jours</p>
              </div>
              <div className="rounded-xl border border-border/70 bg-surface-2 p-3 text-center">
                <p className="text-xs text-muted">Heures de marche</p>
                <p className="text-lg font-bold">{reportData.journaux.heuresMarche}</p>
                <p className="text-[11px] text-muted">
                  disponibilité {reportData.journaux.tauxDisponibilite === null ? "—" : `${reportData.journaux.tauxDisponibilite} %`}
                </p>
              </div>
              <div className="rounded-xl border border-border/70 bg-surface-2 p-3 text-center">
                <p className="text-xs text-muted">Incidents</p>
                <p className="text-lg font-bold">{reportData.journaux.nombreIncidents}</p>
                <p className="text-[11px] text-muted">{reportData.journaux.heuresIncident} h d'arrêt</p>
              </div>
              <div className="rounded-xl border border-border/70 bg-surface-2 p-3 text-center">
                <p className="text-xs text-muted">Photos</p>
                <p className="text-lg font-bold">{reportData.journaux.nombrePhotos}</p>
              </div>
              <div className="rounded-xl border border-border/70 bg-surface-2 p-3 text-center">
                <p className="text-xs text-muted">Essais qualité</p>
                <p className="text-lg font-bold">{reportData.nbEssais}</p>
              </div>
            </div>
          </Card>

          {/* Dépenses par catégorie */}
          <Card padding="lg" className="print:shadow-none">
            <h3 className="mb-3 text-lg font-bold">Dépenses réelles par catégorie</h3>
            {reportData.depensesParCategorie.length === 0 ? (
              <p className="text-sm text-muted">Aucune dépense enregistrée sur la période.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/80 bg-surface-2 text-left">
                    <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted">Catégorie</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wider text-muted">Nombre</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-muted">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.depensesParCategorie.map((d: any) => (
                    <tr key={d.categorie} className="border-b border-border/60">
                      <td className="px-3 py-2 font-medium text-foreground">{d.libelle}</td>
                      <td className="px-3 py-2 text-center tabular-nums">{d.nombre}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formaterMontant(d.total)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td className="px-3 py-2 font-semibold">Total</td>
                    <td />
                    <td className="px-3 py-2 text-right font-bold tabular-nums">
                      {formaterMontant(reportData.totalDepenses)}
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
          </Card>

          {/* Non-conformités */}
          <Card padding="lg" className="print:shadow-none">
            <h3 className="mb-3 text-lg font-bold">Non-conformités</h3>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="rounded-xl border border-border/70 bg-surface-2 p-3 text-center">
                <p className="text-xs text-muted">Total</p>
                <p className="text-lg font-bold">{reportData.nonConformites.total}</p>
              </div>
              <div className="rounded-xl border border-border/70 bg-surface-2 p-3 text-center">
                <p className="text-xs text-muted">Ouvertes</p>
                <p className="text-lg font-bold text-danger">{reportData.nonConformites.ouvertes}</p>
              </div>
              <div className="rounded-xl border border-border/70 bg-surface-2 p-3 text-center">
                <p className="text-xs text-muted">Clôturées</p>
                <p className="text-lg font-bold text-success">{reportData.nonConformites.cloturees}</p>
              </div>
              {reportData.nonConformites.parGravite.map((g: any) => (
                <div key={g.gravite} className="rounded-xl border border-border/70 bg-surface-2 p-3 text-center">
                  <p className="text-xs text-muted">Gravité {g.libelle.toLowerCase()}</p>
                  <p className="text-lg font-bold">{g.total}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Valorisation par poste */}
          <Card padding="lg" className="print:shadow-none">
            <h3 className="mb-3 text-lg font-bold">Valorisation des travaux par poste</h3>
            {reportData.valorisation.length === 0 ? (
              <p className="text-sm text-muted">Aucun poste au DQE pour ce chantier.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/80 bg-surface-2 text-left">
                      <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted">Poste</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-muted">Qté marché</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-muted">Qté réalisée</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-muted">Avancement</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-muted">Valorisé</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.valorisation.map((l: LigneValorisation) => (
                      <tr key={l.posteId} className="border-b border-border/60">
                        <td className="px-3 py-2 font-medium text-foreground">
                          {l.code ? `${l.code} · ` : ""}
                          {l.designation}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {l.quantiteMarche} {l.unite}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{l.quantiteRealisee}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formaterPourcentage(l.avancement)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formaterMontant(l.montantRealise)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}
    </main>
  );
}
