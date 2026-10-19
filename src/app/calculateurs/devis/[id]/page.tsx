"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Download, Printer, Save, Trash2 } from "lucide-react";
import * as XLSX from "xlsx";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formaterMontantFcfa } from "@/lib/devis/enregistrement";
import { toast } from "@/components/ui/toast";
import { traduireErreur } from "@/lib/i18n";

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
  const [chantiers, setChantiers] = useState<{ id: string; nom: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Champs modifiables de l'en-tête du devis
  const [client, setClient] = useState("");
  const [numero, setNumero] = useState("");
  const [dateDevis, setDateDevis] = useState("");
  const [objet, setObjet] = useState("");
  const [notes, setNotes] = useState("");
  const [chantierId, setChantierId] = useState("");

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

      // Champs modifiables
      setClient((entete as Devis).client ?? "");
      setNumero((entete as Devis).numero ?? "");
      setDateDevis((entete as Devis).date_devis ?? "");
      setObjet((entete as Devis).objet ?? "");
      setNotes((entete as Devis).notes ?? "");
      setChantierId((entete as Devis).chantier_id ?? "");

      const { data: listeChantiers } = await supabase
        .from("chantiers")
        .select("id,nom")
        .eq("proprietaire_id", user.id)
        .order("nom");
      setChantiers((listeChantiers ?? []) as { id: string; nom: string }[]);

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

  async function enregistrerModification(e: React.FormEvent) {
    e.preventDefault();
    if (!devis) return;
    if (!client.trim() || !numero.trim() || !dateDevis) {
      setMessage("Le client, le numéro et la date du devis sont obligatoires.");
      return;
    }
    setSaving(true);
    setMessage(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("devis")
      .update({
        client: client.trim(),
        numero: numero.trim(),
        date_devis: dateDevis,
        objet: objet.trim() || null,
        notes: notes.trim() || null,
        chantier_id: chantierId || null,
      })
      .eq("id", devis.id);
    setSaving(false);
    if (error) {
      setMessage(traduireErreur(error));
      return;
    }
    setDevis((prev) =>
      prev
        ? {
            ...prev,
            client: client.trim(),
            numero: numero.trim(),
            date_devis: dateDevis,
            objet: objet.trim() || null,
            notes: notes.trim() || null,
            chantier_id: chantierId || null,
          }
        : prev,
    );
    const { data: chantier } = chantierId
      ? await supabase.from("chantiers").select("nom").eq("id", chantierId).maybeSingle()
      : { data: null };
    setNomChantier((chantier as { nom?: string } | null)?.nom ?? null);
    toast("Devis mis à jour.");
  }

  async function supprimerDevis() {
    if (!devis) return;
    const supabase = createClient();
    const { error } = await supabase.from("devis").delete().eq("id", devis.id);
    if (error) {
      setMessage(traduireErreur(error));
      return;
    }
    toast("Devis supprimé.");
    router.replace("/calculateurs/devis");
  }

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

      {/* Informations du devis — modifiables (masqué à l'impression) */}
      {devis && (
        <div className="mx-auto mb-4 w-full max-w-[210mm] px-4 print:hidden">
          <Card padding="lg">
            <h2 className="mb-3 text-lg font-bold text-foreground">Informations du devis</h2>
            <form onSubmit={enregistrerModification} className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="block text-sm font-medium text-foreground">
                Client *
                <input
                  className="mt-1 w-full rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10"
                  value={client}
                  onChange={(e) => setClient(e.target.value)}
                  required
                />
              </label>
              <label className="block text-sm font-medium text-foreground">
                Numéro du devis *
                <input
                  className="mt-1 w-full rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10"
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  required
                />
              </label>
              <label className="block text-sm font-medium text-foreground">
                Date du devis *
                <input
                  className="mt-1 w-full rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10"
                  type="date"
                  value={dateDevis}
                  onChange={(e) => setDateDevis(e.target.value)}
                  required
                />
              </label>
              <label className="block text-sm font-medium text-foreground">
                Chantier rattaché
                <select
                  className="mt-1 w-full rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10"
                  value={chantierId}
                  onChange={(e) => setChantierId(e.target.value)}
                >
                  <option value="">Aucun chantier rattaché</option>
                  {chantiers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nom}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium text-foreground md:col-span-2">
                Objet du devis
                <input
                  className="mt-1 w-full rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10"
                  value={objet}
                  onChange={(e) => setObjet(e.target.value)}
                />
              </label>
              <label className="block text-sm font-medium text-foreground md:col-span-2">
                Observations / conditions
                <textarea
                  className="mt-1 w-full rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </label>
              <div className="flex flex-wrap gap-2 md:col-span-2">
                <Button type="submit" disabled={saving}>
                  <Save className="h-4 w-4" />
                  {saving ? "Enregistrement..." : "Enregistrer les modifications"}
                </Button>
                <Button type="button" variant="danger" onClick={supprimerDevis}>
                  <Trash2 className="h-4 w-4" />
                  Supprimer le devis
                </Button>
              </div>
            </form>
            {message && (
              <p className="mt-3 rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-foreground">
                {message}
              </p>
            )}
          </Card>
        </div>
      )}

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
