"use client";

import { createClient } from "@/lib/supabase/client";
import * as XLSX from "xlsx";
import { parseBasePrixWorkbook } from "@/lib/import/basePrix";
import { useState } from "react";

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
      setMessage("Aucune ligne valide trouvee dans les onglets.");
      return;
    }
    setRows(parsed);
  }

  async function handleImport() {
    if (rows.length === 0) return;
    setImporting(true);
    setMessage(null);
    const supabase = createClient();

    const payload = rows.map((r) => {
      const extra = [r.categorie ? `Categorie: ${r.categorie}` : "", r.zone ? `Zone: ${r.zone}` : ""]
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
    setMessage(`${rows.length} poste(s) importe(s) avec succes.`);
    setRows([]);
    if (onImported) onImported();
  }

  return (
    <section className="card p-4">
      <h2 className="mb-3 text-lg font-medium text-primary">Import Excel (tous les onglets)</h2>
      <p className="mb-3 text-sm text-slate-600">
        Lit chaque feuille du classeur, ignore la ligne d&apos;en-tete et importe les colonnes
        code, designation, unite, prix, source et dates.
      </p>
      <input type="file" accept=".xlsx,.xls" onChange={onFile} className="block" />
      {fileName && <p className="mt-2 text-sm">Fichier : {fileName}</p>}
      {rows.length > 0 && (
        <div className="mt-3 flex items-center gap-3">
          <p className="text-sm">{rows.length} ligne(s) prete(s).</p>
          <button
            onClick={handleImport}
            disabled={importing}
            className="btn-primary disabled:opacity-50"
          >
            {importing ? "Import en cours..." : "Importer dans le BPU"}
          </button>
        </div>
      )}
      {message && <p className="mt-3 text-sm text-slate-600">{message}</p>}
    </section>
  );
}