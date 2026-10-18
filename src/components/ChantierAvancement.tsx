"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { avancementPoste, avancementPhysiqueGlobal, avancementFinancier, ecartQuantite } from "@/lib/calculs/metre";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

type Poste = {
  id: string;
  code: string | null;
  designation: string;
  quantite_marche: number;
  prix_unitaire: number;
};

export default function ChantierAvancement({
  chantierId,
  seuilEcartPct,
}: {
  chantierId: string;
  seuilEcartPct?: number;
}) {
  const [global, setGlobal] = useState(0);
  const [financier, setFinancier] = useState(0);
  const [postes, setPostes] = useState<Array<Poste & { avancement: number; ecartQte: number }>>([]);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: p } = await supabase
        .from("postes_dqe")
        .select("id,code,designation,quantite_marche,prix_unitaire")
        .eq("chantier_id", chantierId);
      const { data: q } = await supabase
        .from("quantites_realisees")
        .select("poste_dqe_id,quantite")
        .eq("chantier_id", chantierId);
      const { data: c } = await supabase
        .from("chantiers")
        .select("montant_marche")
        .eq("id", chantierId)
        .maybeSingle();

      const realMap = new Map<string, number>();
      for (const row of q ?? []) {
        realMap.set(row.poste_dqe_id, (realMap.get(row.poste_dqe_id) ?? 0) + Number(row.quantite));
      }

      let totalMontant = 0;
      let montantRealise = 0;
      const rows = (p ?? []).map(( poste: Poste) => {
        const realise = realMap.get(poste.id) ?? 0;
        const avancement = avancementPoste(realise, poste.quantite_marche);
        const montant = poste.quantite_marche * poste.prix_unitaire;
        totalMontant += montant;
        montantRealise += montant * (avancement / 100);
        const ecartQte = ecartQuantite(realise, poste.quantite_marche);
        return { ...poste, avancement, ecartQte };
      });

      const g = avancementPhysiqueGlobal(
        rows.map((r) => ({ avancementPct: r.avancement, montant: r.quantite_marche * r.prix_unitaire })),
        totalMontant,
      );
      const f = c?.montant_marche ? avancementFinancier(montantRealise, Number(c.montant_marche)) : 0;
      setGlobal(Math.round(g * 10) / 10);
      setFinancier(Math.round(f * 10) / 10);
      setPostes(rows.sort((a, b) => b.avancement - a.avancement));
    }
    if (chantierId) {
      load();
    }
  }, [chantierId]);

  return (
    <Card padding="lg">
      <h2 className="mb-4 flex items-center gap-2.5 text-lg font-bold text-foreground">
        <span className="h-5 w-1.5 rounded-full bg-gradient-to-b from-action to-action-strong" aria-hidden />
        Avancement
      </h2>

      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-muted">Avancement physique global</span>
        <span className="font-semibold tabular-nums text-foreground">{global} %</span>
      </div>
      <div className="mb-4 h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full bg-gradient-to-r from-action to-action-strong transition-all"
          style={{ width: `${Math.min(global, 100)}%` }}
        />
      </div>

      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-muted">Avancement financier</span>
        <span className="font-semibold tabular-nums text-foreground">{financier} %</span>
      </div>
      <div className="mb-4 h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all"
          style={{ width: `${Math.min(financier, 100)}%` }}
        />
      </div>

      {postes.length > 0 ? (
        <ul className="space-y-3">
          {postes.map((p) => (
            <li key={p.id}>
              <div className="mb-1 flex justify-between gap-2 text-xs">
                <span className="truncate text-foreground">
                  {p.code ?? "-"} {p.designation}
                </span>
                <span className="shrink-0 font-semibold tabular-nums text-foreground">
                  {Math.round(p.avancement)} %
                </span>
              </div>
              <div className="mb-1 flex items-center justify-between gap-2 text-xs text-muted">
                <span className="tabular-nums">
                  Écart quantité : {p.ecartQte >= 0 ? "+" : ""}
                  {Math.round(p.ecartQte)} %
                </span>
                {Math.abs(p.ecartQte) > (seuilEcartPct ?? 10) && (
                  <Badge variant="danger">Seuil dépassé</Badge>
                )}
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-primary-deep transition-all"
                  style={{ width: `${Math.min(p.avancement, 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">Aucun poste DQE importé.</p>
      )}
    </Card>
  );
}