"use client";

import { createClient } from "@/lib/supabase/client";
import { templates } from "@/lib/devis/templates";
import { useEffect, useState } from "react";

type Bpu = { id: string; designation: string; unite: string; prix_unitaire: number };

export default function DevisAssistantPage() {
  const [templateId, setTemplateId] = useState(templates[0].id);
  const template = templates.find((t) => t.id === templateId) ?? templates[0];

  const [inputs, setInputs] = useState<Record<string, string>>(() =>
    Object.fromEntries(template.inputs.map((inp) => [inp.id, inp.default])),
  );
  const [bpu, setBpu] = useState<Bpu[]>([]);
  const [selections, setSelections] = useState<Record<string, string>>({});

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("bpu_postes")
        .select("id,designation,unite,prix_unitaire")
        .order("created_at", { ascending: false });
      setBpu((data ?? []) as Bpu[]);
    }
    load();
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInputs(Object.fromEntries(template.inputs.map((inp) => [inp.id, inp.default])));
    setSelections({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelections((prev) => {
      const next = { ...prev };
      template.lignes.forEach((line) => {
        if (!next[line.code] && line.keywords.length > 0) {
          const opts = matchOptions(line.keywords);
          if (opts.length > 0) next[line.code] = opts[0].id;
        }
      });
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template, bpu]);

  function matchOptions(keywords: string[]): Bpu[] {
    if (keywords.length === 0) return [];
    return bpu.filter((b) => {
      const d = (b.designation ?? "").toLowerCase();
      return keywords.some((k) => d.includes(k.toLowerCase()));
    });
  }

  function selectedPrice(code: string): Bpu | null {
    const line = template.lignes.find((l) => l.code === code);
    if (!line) return null;
    return bpu.find((b) => b.id === selections[code]) ?? null;
  }

  const total = template.lignes.reduce((sum, line) => {
    const q = line.quantite(inputs);
    const item = selectedPrice(line.code);
    return sum + (item ? q * item.prix_unitaire : 0);
  }, 0);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-semibold text-primary">
        Assistant devis - recommandations et choix
      </h1>
      <p className="mb-6 text-sm text-slate-600">
        Choisissez un type de projet, saisissez les dimensions, puis choisissez les matériaux proposés.
      </p>

      <section className="card p-4">
        <label className="block text-sm font-medium">Type de projet</label>
        <select
          className="mt-1 w-full rounded border p-2"
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value)}
        >
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nom}
            </option>
          ))}
        </select>
      </section>

      <section className="mt-6 card p-4">
        <h2 className="mb-3 text-lg font-medium text-primary">Dimensions / données</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {template.inputs.map((inp) => (
            <div key={inp.id}>
              <label className="block text-sm font-medium">{inp.label}</label>
              {inp.type === "select" ? (
                <select
                  className="mt-1 w-full rounded border p-2"
                  value={inputs[inp.id] ?? inp.default}
                  onChange={(e) => setInputs((prev) => ({ ...prev, [inp.id]: e.target.value }))}
                >
                  {inp.options?.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className="mt-1 w-full rounded border p-2"
                  type="number"
                  step="0.01"
                  value={inputs[inp.id] ?? ""}
                  onChange={(e) => setInputs((prev) => ({ ...prev, [inp.id]: e.target.value }))}
                />
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 card p-4">
        <h2 className="mb-3 text-lg font-medium text-primary">Recommandations de matériaux</h2>
        <div className="space-y-3">
          {template.lignes.map((line) => {
            const q = line.quantite(inputs);
            const options = matchOptions(line.keywords);
            const chosen = bpu.find((b) => b.id === selections[line.code]) ?? null;
            return (
              <div key={line.code} className="rounded border p-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{line.designation}</p>
                    <p className="text-xs text-slate-500">
                      {line.calcul} → {q.toFixed(3)} {line.unite}
                    </p>
                  </div>
                  {chosen && (
                    <p className="text-sm font-semibold">
                      {(q * chosen.prix_unitaire).toLocaleString("fr-FR")} FCFA
                    </p>
                  )}
                </div>
                {line.keywords.length > 0 ? (
                  <select
                    className="w-full rounded border p-2"
                    value={selections[line.code] ?? ""}
                    onChange={(e) => setSelections((prev) => ({ ...prev, [line.code]: e.target.value }))}
                  >
                    <option value="">(aucun poste BPU recommandé)</option>
                    {options.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.designation} - {Number(b.prix_unitaire).toLocaleString("fr-FR")} FCFA/{b.unite}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-xs text-slate-500">Pas de matériau associé (quantité uniquement).</p>
                )}
                {options.length === 0 && line.keywords.length > 0 && (
                  <p className="mt-1 text-xs text-warning">
                    Aucun poste du BPU ne correspond aux mots-clés {line.keywords.join(", ")}.
                  </p>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-4 text-right text-xl font-bold text-primary">
          Total matériaux estimé : {Math.round(total).toLocaleString("fr-FR")} FCFA
        </div>
      </section>

      <section className="mt-6 card p-4">
        <h2 className="mb-3 text-lg font-medium text-primary">Planning suggéré (estimation)</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="p-2">Tâche</th>
              <th className="p-2">Durée indicative (j)</th>
            </tr>
          </thead>
          <tbody>
            {template.taches(inputs).map((t, idx) => (
              <tr key={idx} className="border-b">
                <td className="p-2">{t.nom}</td>
                <td className="p-2">{t.jours}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-slate-500">
          Durées indicatives basées sur des rendements moyens. À affiner avec votre planning réel.
        </p>
      </section>
    </main>
  );
}