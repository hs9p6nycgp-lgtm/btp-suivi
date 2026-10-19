"use client";

import { createClient } from "@/lib/supabase/client";
import * as XLSX from "xlsx";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { traduireErreur } from "@/lib/i18n";
import {
  analyserImportReferentiel,
  preparerApplicationImport,
  type ApplicationImport,
  type LigneImportReferentiel,
  type LigneReferentiel,
  type RejetImport,
} from "@/lib/referentiel/prix";

const TAILLE_LOT_MAJ = 20;
const TAILLE_LOT_CREATION = 100;

function payload(ligne: LigneImportReferentiel) {
  return {
    code: ligne.code,
    designation: ligne.designation,
    categorie: ligne.categorie,
    unite: ligne.unite,
    prix_unitaire: ligne.prix_unitaire,
    source: ligne.source,
    date_source: ligne.date_source,
    date_validite: ligne.date_validite,
    statut: ligne.statut,
    zone: ligne.zone,
  };
}

export default function ReferentielImport({ onImporte }: { onImporte: () => void }) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [application, setApplication] = useState<ApplicationImport | null>(null);
  const [rejets, setRejets] = useState<RejetImport[]>([]);
  const [erreurs, setErreurs] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryOk, setSummaryOk] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setImporting(false);
    setSummary(null);
    setErreurs([]);
    setApplication(null);
    setRejets([]);

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

    const analyse = analyserImportReferentiel(json);
    setRejets(analyse.rejets);
    if (analyse.lignes.length === 0) return;

    const supabase = createClient();
    const { data, error } = await supabase
      .from("referentiel_prix")
      .select("id,code,designation,categorie,unite,prix_unitaire,source,date_source,date_validite,statut,zone");
    if (error) {
      setErreurs([traduireErreur(error)]);
      return;
    }
    setApplication(preparerApplicationImport((data ?? []) as LigneReferentiel[], analyse.lignes));
  }

  async function handleImport() {
    if (!application) return;
    setImporting(true);
    setSummary(null);
    const supabase = createClient();
    const problemes: string[] = [];

    // 1) Mises a jour du referentiel (par lots) + historique des changements de prix (REF-03)
    const maj = application.aMettreAJour;
    for (let i = 0; i < maj.length; i += TAILLE_LOT_MAJ) {
      const lot = maj.slice(i, i + TAILLE_LOT_MAJ);
      const resultats = await Promise.all(
        lot.map((m) => supabase.from("referentiel_prix").update(payload(m.ligne)).eq("id", m.id)),
      );
      resultats.forEach((r, k) => {
        if (r.error) problemes.push(`${lot[k].ligne.designation} : ${traduireErreur(r.error)}`);
      });
    }
    const entreesHistorique = maj
      .filter((m) => m.ancienPrix !== m.ligne.prix_unitaire)
      .map((m) => ({
        referentiel_prix_id: m.id,
        ancien_prix: m.ancienPrix,
        nouveau_prix: m.ligne.prix_unitaire,
        auteur: null,
        motif: "Import Excel / CSV",
      }));
    if (entreesHistorique.length > 0) {
      const { error } = await supabase.from("historique_prix").insert(entreesHistorique);
      if (error) problemes.push(`Historique : ${traduireErreur(error)}`);
    }

    // 2) Creations (par lots)
    for (let i = 0; i < application.aInserer.length; i += TAILLE_LOT_CREATION) {
      const lot = application.aInserer.slice(i, i + TAILLE_LOT_CREATION);
      const { error } = await supabase.from("referentiel_prix").insert(lot.map(payload));
      if (error) problemes.push(`Créations : ${traduireErreur(error)}`);
    }

    setImporting(false);
    setErreurs(problemes);
    setSummaryOk(problemes.length === 0);
    setSummary(
      `Import terminé : ${application.aInserer.length} prix créé(s), ${application.aMettreAJour.length} mis à jour, ${application.inchanges} déjà à jour.` +
        (entreesHistorique.length > 0 ? ` ${entreesHistorique.length} entrée(s) d'historique enregistrée(s).` : "") +
        (rejets.length > 0 ? ` ${rejets.length} ligne(s) rejetée(s).` : ""),
    );
    setApplication(null);
    onImporte();
  }

  return (
    <Card padding="lg">
      <h2 className="mb-1 flex items-center gap-2.5 text-lg font-bold text-foreground">
        <span className="h-5 w-1.5 rounded-full bg-gradient-to-b from-action to-action-strong" aria-hidden />
        Import du référentiel
      </h2>
      <p className="mb-4 text-sm text-muted">
        Fichier Excel (.xlsx, .xls) ou CSV avec les colonnes : Code, Désignation, Catégorie, Unité,
        Prix unitaire, Source, Date source, Date de validité, Statut, Zone. Un prix sans source ni
        date est refusé. Un prix existant est reconnu par son code (sinon par sa désignation), puis
        mis à jour — l&apos;ancien prix part dans l&apos;historique.
      </p>
      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border/80 bg-surface-2 px-4 py-6 text-center transition hover:border-primary-light/60">
        <span className="text-sm font-medium text-foreground">
          {fileName ?? "Choisir un fichier Excel ou CSV"}
        </span>
        <span className="text-xs text-muted">Le fichier est analysé avant l&apos;import.</span>
        <input type="file" accept=".xlsx,.xls,.csv" onChange={onFile} className="hidden" />
      </label>

      {rejets.length > 0 && (
        <ul className="mt-4 space-y-1 rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-foreground">
          {rejets.slice(0, 8).map((r, i) => (
            <li key={i}>{r.ligne > 0 ? `Ligne ${r.ligne} : ${r.raison}` : r.raison}</li>
          ))}
          {rejets.length > 8 && <li>… et {rejets.length - 8} autre(s) ligne(s) rejetée(s).</li>}
        </ul>
      )}

      {application && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <p className="text-sm text-foreground">
            {application.aInserer.length} nouveau(x), {application.aMettreAJour.length} à mettre à
            jour, {application.inchanges} déjà à jour.
          </p>
          <Button onClick={handleImport} disabled={importing}>
            {importing ? "Import en cours..." : "Importer dans le référentiel"}
          </Button>
        </div>
      )}

      {summary && (
        <p className={`mt-3 text-sm font-medium ${summaryOk ? "text-success" : "text-danger"}`}>
          {summary}
        </p>
      )}

      {erreurs.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm text-danger">
          {erreurs.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}
    </Card>
  );
}
