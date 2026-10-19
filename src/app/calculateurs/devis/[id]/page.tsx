"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Download, Printer } from "lucide-react";
import * as XLSX from "xlsx";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { formaterMontantFcfa } from "@/lib/devis/enregistrement";

type Devis = {
  id: string;
  numero: string;
  client: string;
  objet: string | null;
  date_devis: string;
  notes: string | null;
  total: number;
  chantier_id: string | null;
};

type LigneDevis = {
  id: string;
  ordre: number;
  designation: string;
  unite: string;
  quantite: number;
  prix_unitaire: number;
  total: number;
};

function formaterDate(valeur: string | null | undefined): string {
  if (!valeur) return "—";
  const d = new Date(`${valeur.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return valeur;
  return d.toLocaleDateString("fr-FR");
}

function formaterNombre(valeur: number | string | null | undefined): string {
  const n = Number(valeur ?? 0);
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
}

/** Feuille devis imprimable (A4) : le document que le client attend. */
export default function DevisImprimablePage() {
  const params = useParams();
  const router = useRouter();
  const devisId = String(params?.id ?? "");

  const [devis, setDevis] = useState<Devis | null>(null);
  const [lignes, setLignes] = useState<LigneDevis[]>([]);
  const [nomChantier, setNomChantier] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!devisId) return;
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }
      const { data: entete, error } = await supabase
        .from("devis")
        .select("*")
        .eq("id", devisId)
        .maybeSingle();
      if (error || !entete) {
        setMessage(
          error?.message?.includes("does not exist")
            ? "La table des devis n'existe pas encore : exécutez la migration 0022_devis_enregistres.sql dans Supabase."
            : "Devis introuvable.",
        );
        setLoading(false);
        return;
      }
      setDevis(entete as Devis);

      const { data: lignesData } = await supabase
        .from("devis_lignes")
        .select("*")
        .eq("devis_id", devisId)
        .order("ordre", { ascending: true });
      setLignes((lignesData ?? []) as LigneDevis[]);

      if (entete.chantier_id) {
        const { data: chantier } = await supabase
          .from("chantiers")
          .select("nom")
          .eq("id", entete.chantier_id)
          .maybeSingle();
        setNomChantier((chantier as { nom?: string } | null)?.nom ?? null);
      }
      setLoading(false);
    }
    load();
  }, [devisId, router]);

  function exporterExcel() {
    if (!devis) return;
    const ws = XLSX.utils.json_to_sheet([
      ...lignes.map((l) => ({
        Désignation: l.designation,
        Unité: l.unite,
        Quantité: Number(l.quantite),
        "Prix unitaire (FCFA)": Number(l.prix_unitaire),
        "Total (FCFA)": Number(l.total),
      })),
      {
        Désignation: "TOTAL",
        "Total (FCFA)": Number(devis.total),
      },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Devis");
    XLSX.writeFile(wb, `devis_${devis.numero}_${devis.date_devis}.xlsx`);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-slate-300 border-t-slate-600" />
      </div>
    );
  }

  if (!devis) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-100 text-slate-700">
        <p className="text-sm">{message ?? "Devis introuvable."}</p>
        <Link href="/calculateurs/devis" className="text-sm font-semibold text-primary hover:underline">
          Retour au calculateur
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 py-6 print:bg-white print:py-0">
      {/* Barre d'actions — masquée à l'impression */}
      <div className="mx-auto mb-4 flex w-full max-w-[210mm] flex-wrap items-center justify-between gap-3 px-4 print:hidden">
        <Link
          href="/calculateurs/devis"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au calculateur
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={exporterExcel}>
            <Download className="h-4 w-4" />
            Exporter en Excel
          </Button>
          <Button size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Imprimer / PDF
          </Button>
        </div>
      </div>

      {/* Feuille A4 */}
      <div className="mx-auto w-full max-w-[210mm] bg-white px-10 py-10 text-slate-900 shadow-lg print:max-w-none print:px-0 print:py-0 print:shadow-none">
        {/* En-tête */}
        <div className="flex items-start justify-between gap-6 border-b-2 border-slate-900 pb-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
              BTP Suivi Pro — Devis
            </p>
            <h1 className="mt-1 text-2xl font-bold">Devis n° {devis.numero}</h1>
            <p className="mt-1 text-[12px] text-slate-600">
              {devis.objet ?? "Offre de prix"}
              {nomChantier ? ` — ${nomChantier}` : ""}
            </p>
          </div>
          <div className="text-right text-[11px] text-slate-500">
            <p>Date : {formaterDate(devis.date_devis)}</p>
            <p className="mt-1">Client : {devis.client}</p>
          </div>
        </div>

        {/* Lignes du devis */}
        <table className="mt-6 w-full border-collapse text-[12px]">
          <thead>
            <tr className="border-b-2 border-slate-400 text-left text-slate-500">
              <th className="py-2 pr-2 font-semibold">Désignation</th>
              <th className="py-2 pr-2 text-center font-semibold">Unité</th>
              <th className="py-2 pr-2 text-right font-semibold">Quantité</th>
              <th className="py-2 pr-2 text-right font-semibold">Prix unitaire</th>
              <th className="py-2 text-right font-semibold">Total (FCFA)</th>
            </tr>
          </thead>
          <tbody>
            {lignes.map((l) => (
              <tr key={l.id} className="border-b border-slate-200">
                <td className="py-1.5 pr-2">{l.designation}</td>
                <td className="py-1.5 pr-2 text-center text-slate-600">{l.unite}</td>
                <td className="py-1.5 pr-2 text-right tabular-nums">{formaterNombre(l.quantite)}</td>
                <td className="py-1.5 pr-2 text-right tabular-nums">{formaterNombre(l.prix_unitaire)}</td>
                <td className="py-1.5 text-right tabular-nums font-medium">
                  {formaterNombre(l.total)}
                </td>
              </tr>
            ))}
            {lignes.length === 0 && (
              <tr>
                <td colSpan={5} className="py-3 text-center text-slate-500">
                  Aucune ligne enregistrée.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4} className="pt-3 text-right text-[12px] font-semibold uppercase tracking-wider text-slate-700">
                Total du devis
              </td>
              <td className="pt-3 text-right text-[15px] font-bold tabular-nums">
                {formaterMontantFcfa(Number(devis.total))}
              </td>
            </tr>
          </tfoot>
        </table>

        {devis.notes && (
          <div className="mt-6">
            <h2 className="mb-1 text-[12px] font-bold uppercase tracking-wider text-slate-700">
              Observations
            </h2>
            <p className="text-[12px] text-slate-700">{devis.notes}</p>
          </div>
        )}

        {/* Signatures */}
        <div className="mt-10 grid grid-cols-2 gap-8">
          {["Le client", "L'entreprise"].map((role) => (
            <div key={role}>
              <p className="text-[11px] font-semibold text-slate-700">{role}</p>
              <div className="mt-10 border-t border-slate-400" />
              <p className="mt-1 text-[10px] text-slate-400">Nom, date et signature</p>
            </div>
          ))}
        </div>

        <p className="mt-8 border-t border-slate-200 pt-2 text-center text-[10px] text-slate-400">
          Devis {devis.numero} — {devis.client} — {formaterDate(devis.date_devis)}
        </p>
      </div>
    </div>
  );
}
