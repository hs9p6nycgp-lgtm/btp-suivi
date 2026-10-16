"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { avancementPoste, avancementPhysiqueGlobal } from "@/lib/calculs/metre";

type Poste = {
  id: string;
  code: string | null;
  designation: string;
  quantite_marche: number;
  prix_unitaire: number;
};

export default function ChantierAvancement({
  chantierId,
}: {
  chantierId: string;
}) {
  const [global, setGlobal] = useState(0);
  const [postes, setPostes] = useState<Array<Poste & { avancement: number }>>([]);

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
        return { ...poste, avancement };
      });

      const g = avancementPhysiqueGlobal(
        rows.map((r) => ({ avancementPct: r.avancement, montant: r.quantite_marche * r.prix_unitaire })),
        totalMontant,
      );
      setGlobal(Math.round(g * 10) / 10);
      setPostes(rows.sort((a, b) => b.avancement - a.avancement));
    }
    if (chantierId) {
      load();
    }
  }, [chantierId]);

  return (
    <section className="card p-4">
      <h2 className="mb-3 text-lg font-medium text-primary">Avancement</h2>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span>Avancement physique global</span>
        <span className="font-semibold">{global} %</span>
      </div>
      <div className="mb-4 h-3 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-action transition-all"
          style={{ width: `${Math.min(global, 100)}%` }}
        />
      </div>

      {postes.length > 0 ? (
        <ul className="space-y-2">
          {postes.map((p) => (
            <li key={p.id}>
              <div className="mb-1 flex justify-between text-xs">
                <span className="truncate">{p.code ?? "-"} {p.designation}</span>
                <span>{Math.round(p.avancement)} %</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${Math.min(p.avancement, 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-600">Aucun poste DQE importe.</p>
      )}
    </section>
  );
}