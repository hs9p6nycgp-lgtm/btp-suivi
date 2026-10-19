"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { getLangue } from "@/lib/i18n";
import { Download } from "lucide-react";
import {
  formaterDateExport,
  lignesAvancementsExport,
  lignesDepensesExport,
  lignesEssaisExport,
  lignesJournauxExport,
  lignesLivraisonsExport,
  lignesNonConformitesExport,
  lignesPhotosExport,
  lignesPostesDqeExport,
  lignesQuantitesExport,
  lignesSectionsExport,
  lignesTachesExport,
  type LigneExport,
} from "@/lib/export/excel";
import {
  agregatJournaux,
  agregatNonConformites,
  depensesParCategorie,
  formaterMontant,
  totalDepenses,
  totalValorisation,
  valorisationPostes,
} from "@/lib/rapport/agregats";

/** Ajoute une feuille au classeur si elle contient des lignes. */
function ajouterFeuille(wb: XLSX.WorkBook, nom: string, lignes: LigneExport[]) {
  if (!lignes || lignes.length === 0) return;
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(lignes), nom);
}

export default function ExportPage() {
  const langue = getLangue();
  const [chantiers, setChantiers] = useState<any[]>([]);
  const [selectedChantier, setSelectedChantier] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

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

  async function handleExport() {
    if (!selectedChantier) { setMessage("Sélectionnez un chantier."); return; }
    setExporting(true);
    setMessage(null);
    const supabase = createClient();

    try {
      const [
        postesRes, qtesRes, depensesRes, tachesRes, essaisRes, ncRes,
        sectionsRes, journauxRes, livraisonsRes, avancementsRes, detailRes,
      ] = await Promise.all([
        supabase.from("postes_dqe").select("*").eq("chantier_id", selectedChantier).order("created_at"),
        supabase.from("quantites_realisees").select("*").eq("chantier_id", selectedChantier).order("date_saisie"),
        supabase.from("depenses_reelles").select("*").eq("chantier_id", selectedChantier).order("date_depense"),
        supabase.from("taches_planning").select("*").eq("chantier_id", selectedChantier).order("created_at"),
        supabase.from("essais_qualite").select("*").eq("chantier_id", selectedChantier).order("date_controle"),
        supabase.from("non_conformites").select("*").eq("chantier_id", selectedChantier).order("created_at"),
        supabase.from("sections_chantier").select("*").eq("chantier_id", selectedChantier).order("created_at"),
        supabase.from("journaux").select("*").eq("chantier_id", selectedChantier).order("date_journal"),
        supabase.from("livraisons").select("*").eq("chantier_id", selectedChantier).order("date_livraison"),
        supabase.from("avancements_chantier").select("*").eq("chantier_id", selectedChantier).order("date_point"),
        supabase.from("chantiers").select("id,nom,date_debut,date_fin_prevue,statut").eq("id", selectedChantier).maybeSingle(),
      ]);

      const postes = postesRes.data ?? [];
      const qtes = qtesRes.data ?? [];
      const depenses = depensesRes.data ?? [];
      const taches = tachesRes.data ?? [];
      const essais = essaisRes.data ?? [];
      const nonConformites = ncRes.data ?? [];
      const sections = sectionsRes.data ?? [];
      const journaux = journauxRes.data ?? [];
      const livraisons = livraisonsRes.data ?? [];
      const avancements = avancementsRes.data ?? [];
      const detail = (detailRes.data ?? null) as any;

      // Détail des journaux (effectifs, engins, incidents, photos)
      const journalIds = journaux.map((j: any) => j.id as string);
      const [effRes, engRes, incRes, phoRes] = journalIds.length
        ? await Promise.all([
            supabase.from("journal_effectifs").select("*").in("journal_id", journalIds),
            supabase.from("journal_engins").select("*").in("journal_id", journalIds),
            supabase.from("incidents_journal").select("*").in("journal_id", journalIds),
            supabase.from("photos_journal").select("*").in("journal_id", journalIds),
          ])
        : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }];

      const wb = XLSX.utils.book_new();

      // --- Synthèse (première feuille du classeur) ---
      const lignesValorisation = valorisationPostes(postes, qtes);
      const totaux = totalValorisation(lignesValorisation);
      const totalDepenseReelle = totalDepenses(depenses);
      const nc = agregatNonConformites(nonConformites);
      const aggJournaux = agregatJournaux({
        journaux,
        effectifs: effRes.data ?? [],
        engins: engRes.data ?? [],
        incidents: incRes.data ?? [],
        photos: phoRes.data ?? [],
      });
      const parCategorie = depensesParCategorie(depenses);

      const synthese: LigneExport[] = [
        { Indicateur: "Chantier", Valeur: detail?.nom ?? "" },
        { Indicateur: "Type", Valeur: detail?.type ?? "" },
        { Indicateur: "Début", Valeur: formaterDateExport(detail?.date_debut) },
        { Indicateur: "Fin prévue", Valeur: formaterDateExport(detail?.date_fin_prevue) },
        { Indicateur: "Date d'export", Valeur: formaterDateExport(new Date().toISOString()) },
        { Indicateur: "Postes au DQE", Valeur: postes.length },
        {
          Indicateur: "Avancement physique",
          Valeur: totaux.montantMarche > 0
            ? `${Math.round((totaux.montantRealise / totaux.montantMarche) * 1000) / 10} %`
            : "0 %",
        },
        { Indicateur: "Montant du marché (DQE, FCFA)", Valeur: totaux.montantMarche },
        { Indicateur: "Valorisation des travaux (FCFA)", Valeur: totaux.montantRealise },
        { Indicateur: "Dépenses réelles (FCFA)", Valeur: totalDepenseReelle },
        { Indicateur: "Marge valorisation - dépenses (FCFA)", Valeur: totaux.montantRealise - totalDepenseReelle },
        { Indicateur: "Journaux", Valeur: aggJournaux.nombreJournaux },
        { Indicateur: "Effectifs cumulés (personnes·jours)", Valeur: aggJournaux.effectifsCumules },
        { Indicateur: "Heures de marche", Valeur: aggJournaux.heuresMarche },
        { Indicateur: "Incidents", Valeur: aggJournaux.nombreIncidents },
        { Indicateur: "Photos", Valeur: aggJournaux.nombrePhotos },
        { Indicateur: "Non-conformités ouvertes", Valeur: nc.ouvertes },
        { Indicateur: "Non-conformités clôturées", Valeur: nc.cloturees },
        { Indicateur: "Essais qualité", Valeur: essais.length },
        { Indicateur: "Livraisons", Valeur: livraisons.length },
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(synthese), "Synthèse");

      // --- Feuilles de détail ---
      ajouterFeuille(wb, "Postes DQE", lignesPostesDqeExport(postes, qtes));
      ajouterFeuille(
        wb,
        "Quantités réalisées",
        lignesQuantitesExport(
          qtes,
          new Map(
            postes.map((p: any) => [
              p.id,
              { designation: p.designation ?? "", unite: p.unite ?? "" },
            ]),
          ),
        ),
      );
      ajouterFeuille(wb, "Dépenses", lignesDepensesExport(depenses));
      ajouterFeuille(wb, "Planning", lignesTachesExport(taches));
      ajouterFeuille(wb, "Découpage", lignesSectionsExport(sections));
      ajouterFeuille(
        wb,
        "Journaux",
        lignesJournauxExport({
          journaux,
          effectifs: effRes.data ?? [],
          engins: engRes.data ?? [],
          incidents: incRes.data ?? [],
          photos: phoRes.data ?? [],
        }),
      );
      ajouterFeuille(wb, "Photos", lignesPhotosExport(phoRes.data ?? []));
      ajouterFeuille(wb, "Essais qualité", lignesEssaisExport(essais));
      ajouterFeuille(wb, "Non-conformités", lignesNonConformitesExport(nonConformites));
      ajouterFeuille(wb, "Livraisons", lignesLivraisonsExport(livraisons));
      ajouterFeuille(wb, "Points d'avancement", lignesAvancementsExport(avancements));

      // --- Contrôle du classeur (aucune feuille vide) ---
      if (wb.SheetNames.length === 0) {
        setMessage("Aucune donnée à exporter pour ce chantier.");
        return;
      }

      const chantier = chantiers.find((c) => c.id === selectedChantier);
      const fileName = `export_${chantier?.nom ?? selectedChantier}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, fileName);
      setMessage(
        `Export réussi : ${fileName} — ${wb.SheetNames.length} feuilles (${wb.SheetNames.join(", ")}).`,
      );
    } catch (e: any) {
      setMessage(`Erreur d'export : ${e?.message ?? e}`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
      <PageHeader
        eyebrow={langue === "fr" ? "Données" : "Data"}
        title="Export Excel"
        description="Exportez toutes les données d'un chantier dans un classeur Excel : synthèse, postes du DQE, quantités, dépenses, planning, découpage, journaux, photos, qualité, non-conformités, livraisons et points d'avancement."
        icon={<Download className="h-5 w-5" />}
      />

      {loading && <Skeleton variant="rect" height="7.5rem" className="max-w-xl" />}

      {!loading && (
        <Card className="max-w-xl">
          <label className="mb-2 block text-sm font-medium">Chantier</label>
          <select
            value={selectedChantier}
            onChange={(e) => setSelectedChantier(e.target.value)}
            className="mb-4 w-full rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10"
          >
            <option value="">— Sélectionner —</option>
            {chantiers.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
          <Button onClick={handleExport} disabled={exporting || !selectedChantier}>
            {exporting ? "Export en cours..." : "Exporter en Excel"}
          </Button>
          <p className="mt-2 text-xs text-muted">
            Dates au format JJ/MM/AAAA, statuts et catégories en français, montants en FCFA.
          </p>
          {message && (
            <p className="mt-3 rounded-xl border border-primary/30 bg-primary/10 p-3 text-sm text-foreground">
              {message}
            </p>
          )}
        </Card>
      )}
    </main>
  );
}
