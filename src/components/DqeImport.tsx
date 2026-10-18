"use client";

import { createClient } from "@/lib/supabase/client";
import * as XLSX from "xlsx";
import { useState } from "react";

type ParsedRow = {
  code: string | null;
  designation: string;
  unite: string;
  quantite_marche: number;
  prix_unitaire: number;
};

function findColumn(headers: string[], keywords: string[]): string | null {
  const lower = headers.map((h) => String(h).toLowerCase());
  for (const kw of keywords) {
    const idx = lower.findIndex((h) => h.includes(kw));
    if (idx >= 0) return headers[idx];
  }
  return null;
}

function parseNumber(v: unknown): number {
  if (typeof v === "number") return v;
  const s = String(v ?? "").replace(/\s/g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

export default function DqeImport({ chantierId }: { chantierId: string }) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setSummary(null);
    setErrors([]);
    setRows([]);

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: "",
    });

    if (json.length === 0) {
      setErrors(["Fichier vide ou aucune ligne de donnees."]);
      return;
    }

    const headers = Object.keys(json[0]);
    const codeCol = findColumn(headers, ["code"]);
    const desCol = findColumn(headers, ["designation", "désignation", "ouvrage", "poste"]);
    const uniteCol = findColumn(headers, ["unite", "unité", "u."]);
    const qteCol = findColumn(headers, ["quantite", "quantité", "qte", "quantités"]);
    const prixCol = findColumn(headers, ["prix", "pu", "unitaire"]);

    const parsed: ParsedRow[] = [];
    const errs: string[] = [];

    json.forEach((raw, i) => {
      const line = i + 2;
      const designation = String(desCol ? (raw[desCol] ?? "") : "").trim();
      const unite = String(uniteCol ? (raw[uniteCol] ?? "") : "").trim();
      const qte = parseNumber(qteCol ? raw[qteCol] : 0);
      const prix = parseNumber(prixCol ? raw[prixCol] : 0);

      if (!designation) {
        errs.push(`Ligne ${line} : designation manquante.`);
        return;
      }
      if (!unite) {
        errs.push(`Ligne ${line} : unite manquante.`);
        return;
      }
      if (!Number.isFinite(qte) || qte < 0) {
        errs.push(`Ligne ${line} : quantite invalide.`);
        return;
      }
      if (!Number.isFinite(prix) || prix < 0) {
        errs.push(`Ligne ${line} : prix unitaire invalide.`);
        return;
      }

      parsed.push({
        code: codeCol ? String(raw[codeCol] ?? "").trim() || null : null,
        designation,
        unite,
        quantite_marche: qte,
        prix_unitaire: Math.round(prix),
      });
    });

    setRows(parsed);
    setErrors(errs);
  }

  async function handleImport() {
    if (rows.length === 0) return;
    setImporting(true);
    const supabase = createClient();
    setSummary(null);
    const payload = rows.map((r) => ({ chantier_id: chantierId, ...r }));
    const { error } = await supabase.from("postes_dqe").insert(payload);
    setImporting(false);
    if (error) {
      setSummary(`Erreur d'import : ${error.message}`);
      return;
    }
    setSummary(`${rows.length} poste(s) importe(s) avec succes.`);
    setRows([]);
  }

  return (
    <section className="card p-5">
      <h2 className="mb-1 text-lg font-bold text-foreground">Import du DQE</h2>
      <p className="mb-4 text-sm text-muted">
        Format attendu (premiere feuille) : colonnes Code, Designation, Unite,
        Quantite, Prix unitaire (FCFA). Les lignes invalides sont ignorees.
      </p>
      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-surface-2 px-4 py-6 text-center transition hover:border-primary-light/60">
        <span className="text-sm font-medium text-foreground">
          {fileName ?? "Choisir un fichier Excel (.xlsx, .xls, .csv)"}
        </span>
        <span className="text-xs text-muted">Le fichier est analysé avant l&apos;import.</span>
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={onFile}
          className="hidden"
        />
      </label>
      {errors.length > 0 && (
        <ul className="mt-4 space-y-1 rounded-xl border border-rose-600/20 bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
          {errors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}
      {rows.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <p className="text-sm text-foreground">{rows.length} ligne(s) prete(s) a importer.</p>
          <button
            onClick={handleImport}
            disabled={importing}
            className="btn-primary disabled:opacity-50"
          >
            {importing ? "Import en cours..." : "Importer dans le chantier"}
          </button>
        </div>
      )}
      {summary && <p className="mt-3 text-sm font-medium text-foreground">{summary}</p>}
    </section>
  );
}