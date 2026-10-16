"use client";

import { Calculator } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { templates } from "@/lib/devis/templates";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { getLangue } from "@/lib/i18n";

type Bpu = { id: string; designation: string; unite: string; prix_unitaire: number };

export default function DevisAssistantPage() {
  const langue = getLangue();

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
      <div className="mb-6">
        <Link href="/bpu" className="text-sm font-medium text-primary hover:underline">
          &larr; Retour BPU
        </Link>
        <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold text-foreground md:text-3xl">
          <Calculator className="h-8 w-8 text-primary" />
          Assistant devis - recommandations et choix
        </h1>
      </div>
      <p className="mb-6 max-w-3xl text-sm text-muted">
        Choisissez un type de projet, saisissez les dimensions, puis choisissez les matériaux proposés.
      </p>

      <section className="mb-6">
        <Card padding="lg">
          <h2 className="mb-4 text-lg font-bold text-foreground">Type de projet</h2>
          <select
            className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none focus:border-primary dark:bg-slate-800 dark:text-slate-200"
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
          >
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nom}
              </option>
            ))}
          </select>
        </Card>
      </section>

      <section className="mb-6">
        <Card padding="lg">
          <h2 className="mb-4 text-lg font-bold text-foreground">Dimensions / données</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {template.inputs.map((inp) => (
              <label key={inp.id} className="block text-sm font-medium text-foreground">
                {inp.label}
                {inp.type === "select" ? (
                  <select
                    className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none focus:border-primary dark:bg-slate-800 dark:text-slate-200"
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
                    className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none focus:border-primary dark:bg-slate-800 dark:text-slate-200"
                    type="number"
                    step="0.01"
                    value={inputs[inp.id] ?? ""}
                    onChange={(e) => setInputs((prev) => ({ ...prev, [inp.id]: e.target.value }))}
                  />
                )}
              </label>
            ))}
          </div>
        </Card>
      </section>

      <section className="mb-6">
        <Card padding="lg">
          <h2 className="mb-4 text-lg font-bold text-foreground">Recommandations de matériaux</h2>
          <div className="space-y-4">
            {template.lignes.map((line) => {
              const q = line.quantite(inputs);
              const options = matchOptions(line.keywords);
              const chosen = selectedPrice(line.code);
              return (
                <div key={line.code} className="rounded-xl border border-border p-4">
                  <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-foreground">{line.designation}</p>
                      <p className="text-xs text-muted">
                        {line.calcul} → {q.toFixed(3)} {line.unite}
                      </p>
                    </div>
                    {chosen && (
                      <p className="text-sm font-semibold text-foreground">
                        {(q * chosen.prix_unitaire).toLocaleString(langue === "fr" ? "fr-FR" : "en-US")} FCFA
                      </p>
                    )}
                  </div>
                  {line.keywords.length > 0 ? (
                    <select
                      className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none focus:border-primary dark:bg-slate-800 dark:text-slate-200"
                      value={selections[line.code] ?? ""}
                      onChange={(e) => setSelections((prev) => ({ ...prev, [line.code]: e.target.value }))}
                    >
                      <option value="">(aucun poste BPU recommandé)</option>
                      {options.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.designation} - {Number(b.prix_unitaire).toLocaleString(langue === "fr" ? "fr-FR" : "en-US")} FCFA/{b.unite}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-xs text-muted">Pas de matériau associé (quantité uniquement).</p>
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
        </Card>
      </section>

      <section className="mt-6">
        <Card padding="lg">
          <h2 className="mb-4 text-lg font-bold text-foreground">Planning suggéré (estimation)</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="p-2 font-semibold text-muted">Tâche</th>
                <th className="p-2 font-semibold text-muted text-center">Durée indicative (j)</th>
              </tr>
            </thead>
            <tbody>
              {template.taches(inputs).map((t, idx) => (
                <tr key={idx} className="border-b border-border">
                  <td className="p-2">{t.nom}</td>
                  <td className="p-2 text-center">{t.jours}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-muted">
            Durées indicatives basées sur des rendements moyens. À affiner avec votre planning réel.
          </p>
        </Card>
      </section>
    </main>
  );
}
