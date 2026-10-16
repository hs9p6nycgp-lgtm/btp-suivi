"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { getLangue } from "@/lib/i18n";

type Journal = {
  id: string;
  chantier_id: string;
  date_journal: string;
  meteo: string | null;
  observations: string | null;
  statut: "brouillon" | "valide";
  created_at: string;
};

const STATUT_LABELS: Record<string, { fr: string; en: string; color: "success" | "warning" | "danger" | "info" }> = {
  brouillon: { fr: "Brouillon", en: "Draft", color: "warning" },
  valide: { fr: "Validé", en: "Validated", color: "success" },
};

export default function JournauxPage() {
  const params = useParams();
  const router = useRouter();
  const chantierId = String(params?.id ?? "");
  const langue = getLangue();
  const [items, setItems] = useState<Journal[]>([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [meteo, setMeteo] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (chantierId) load();
  }, [chantierId]);

  async function load() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("journaux")
      .select("*")
      .eq("chantier_id", chantierId)
      .order("date_journal", { ascending: false });
    if (error) return;
    setItems((data ?? []) as Journal[]);
    setLoading(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("journaux")
      .insert({ chantier_id: chantierId, date_journal: date, meteo: meteo || null, statut: "brouillon" })
      .select()
      .single();
    setLoading(false);
    if (error) return;
    router.push(`/chantiers/${chantierId}/journaux/${data.id}`);
  }

  return (
    <main className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-6">
      <div className="mb-6 flex items-start justify-between">
        <Link href={`/chantiers/${chantierId}`} className="text-sm text-orange-600 hover:underline">
          ← Retour chantier
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Journal de chantier</h1>
      </div>

      <Card variant="elevated" padding="lg">
        <h2 className="mb-4 text-lg font-bold text-slate-900">Nouveau journal</h2>
        <form onSubmit={handleCreate} className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
            <input className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Météo</label>
            <input className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none" placeholder="Ensoleillé, pluvieux..." value={meteo} onChange={(e) => setMeteo(e.target.value)} />
          </div>
          <button type="submit" disabled={loading} className="rounded-xl bg-orange-600 px-4 py-3 text-white font-semibold hover:bg-orange-700 disabled:opacity-50 transition-all shadow-sm hover:shadow-md">
            {loading ? "Création..." : "Créer le journal"}
          </button>
        </form>
      </Card>

      <div className="mt-6">
        <h2 className="mb-4 text-lg font-bold text-slate-900">Journaux existants</h2>
        <div className="space-y-3">
          {loading ? (
            <div className="animate-pulse rounded-full h-8 w-32 bg-slate-200"></div>
          ) : items.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-slate-300 p-10 text-center bg-slate-50">
              <p className="text-sm text-slate-500">Aucun journal pour le moment.</p>
            </div>
          ) : (
            items.map((j) => (
              <Link key={j.id} href={`/chantiers/${chantierId}/journaux/${j.id}`} className="block">
                <Card padding="none" className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-all border-b border-slate-100 last:border-0">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">{new Date(j.date_journal).toLocaleDateString(langue === "fr" ? "fr-FR" : "en-US")}</span>
                      <Badge variant={j.statut === "valide" ? "success" : "warning"}>
                        {langue === "fr" ? STATUT_LABELS[j.statut].fr : STATUT_LABELS[j.statut].en}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600 mt-1">{j.meteo ?? (langue === "fr" ? "Météo non renseignée" : "Weather not specified")}</p>
                  </div>
                  <span className="text-orange-600 text-sm font-medium">Ouvrir →</span>
                </Card>
              </Link>
            ))
          )}
        </div>
      </div>
    </main>
  );
}