"use client";

import { createClient } from "@/lib/supabase/client";
import * as XLSX from "xlsx";
import { parseBasePrixWorkbook, validerBasePrix } from "@/lib/import/basePrix";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function BasePrixImport({ onImported }: { onImported?: () => void }) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<ReturnType<typeof parseBasePrixWorkbook>>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setMessage(null);
    setRows([]);

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const parsed = parseBasePrixWorkbook(workbook);

    if (parsed.length === 0) {
      setMessage("Aucune ligne valide trouvée dans les onglets.");
      return;
    }
    setRows(parsed);
  }

  async function handleImport() {
    if (rows.length === 0) return;
    setImporting(true);
    setMessage(null);
    const supabase = createClient();

    // Exigence REF-04 : chaque prix doit porter une source et une date.
    const problemes: string[] = [];
    for (const r of rows) {
      const err = validerBasePrix(r);
      if (err) problemes.push(`${r.code ?? "?"} : ${err}`);
    }
    if (problemes.length > 0) {
      setImporting(false);
      setMessage(
        `Import bloqué : ${problemes.length} ligne(s) sans source ou sans date de source. ` +
        `Exemples : ${problemes.slice(0, 3).join(" ; ")}`,
      );
      return;
    }

    const payload = rows.map((r) => {
      const extra = [r.categorie ? `Catégorie : ${r.categorie}` : "", r.zone ? `Zone : ${r.zone}` : ""]
        .filter(Boolean)
        .join(" | ");
      const source = [r.source, extra].filter(Boolean).join(" - ") || null;
      return {
        code: r.code,
        designation: r.designation,
        unite: r.unite,
        prix_unitaire: r.prix_unitaire,
        source,
        date_source: r.date_source,
        date_validite: r.date_validite,
        statut: r.statut,
      };
    });

    const { error } = await supabase.from("bpu_postes").insert(payload);
    setImporting(false);
    if (error) {
      setMessage(`Erreur d'import : ${error.message}`);
      return;
    }
    setMessage(`${rows.length} poste(s) importé(s) avec succès.`);
    setRows([]);
    if (onImported) onImported();
  }

  return (
    <Card>
      <h2 className="mb-1 flex items-center gap-2.5 text-lg font-bold text-foreground">
        <span className="h-5 w-1.5 rounded-full bg-gradient-to-b from-action to-action-strong" aria-hidden />
        Import Excel (tous les onglets)
      </h2>
      <p className="mb-4 text-sm text-muted">
        Lit chaque feuille du classeur, ignore la ligne d&apos;en-tête et importe les colonnes
        code, désignation, unité, prix, source et dates.
      </p>
      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border/80 bg-surface-2 px-4 py-6 text-center transition hover:border-primary-light/60">
        <span className="text-sm font-medium text-foreground">
          {fileName ?? "Choisir un fichier Excel"}
        </span>
        <span className="text-xs text-muted">Le fichier est analysé avant l&apos;import.</span>
        <input type="file" accept=".xlsx,.xls" onChange={onFile} className="hidden" />
      </label>
      {rows.length > 0 && (
        <div className="mt-3 flex items-center gap-3">
          <p className="text-sm">{rows.length} ligne(s) prête(s).</p>
          <Button onClick={handleImport} disabled={importing}>
            {importing ? "Import en cours..." : "Importer dans le BPU"}
          </Button>
        </div>
      )}
      {message && <p className="mt-3 text-sm text-muted">{message}</p>}
    </Card>
  );
}