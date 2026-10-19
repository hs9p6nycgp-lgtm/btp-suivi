"use client";

import { Box, Calculator } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { templates } from "@/lib/devis/templates";
import { modele3dDevis } from "@/lib/devis/model3d";
import { templatePourTypeDeChantier } from "@/lib/devis/types-projets";
import { groupesTypesDetailles } from "@/lib/chantiers/types";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import Modele3DGenerique from "@/components/visualisation/Modele3DGenerique";
import { getLangue } from "@/lib/i18n";

type Bpu = { id: string; designation: string; unite: string; prix_unitaire: number };

// Les 100 types de chantier (CHA-01), groupés par catégorie pour le sélecteur.
const GROUPES_TYPES = groupesTypesDetailles();
// Par défaut : le premier type de chantier qui correspond au modèle de devis proposé en premier.
const TYPE_PAR_DEFAUT =
  GROUPES_TYPES.flatMap((g) => g.types).find(
    (t) => templatePourTypeDeChantier(t.value) === templates[0].id,
  )?.value ?? "";

export default function DevisAssistantPage() {
  const langue = getLangue();

  const [typeChantier, setTypeChantier] = useState(TYPE_PAR_DEFAUT);
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

  // Vue 3D : recalculée à partir des saisies avec un léger différé,
  // pour ne pas reconstruire le rendu à chaque frappe.
  const inputsDiffere = useDeferredValue(inputs);
  const modele3d = useMemo(() => modele3dDevis(template, inputsDiffere), [template, inputsDiffere]);

  const fcfa = (montant: number) => montant.toLocaleString(langue === "fr" ? "fr-FR" : "en-US");

  return (
    <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
      <div className="mx-auto w-full max-w-5xl">
        <PageHeader
          eyebrow="Assistant"
          title="Calcul de devis"
          description="Choisissez un type de chantier parmi 100, saisissez les dimensions, puis choisissez les matériaux proposés."
          icon={<Calculator className="h-5 w-5" />}
          actions={
            <Link
              href="/bpu"
              className="inline-flex items-center gap-2 rounded-xl border border-border/80 bg-surface px-3.5 py-2 text-sm font-semibold text-muted shadow-sm transition hover:border-primary-light/50 hover:text-foreground"
            >
              <span>←</span>
              Retour au BPU
            </Link>
          }
        />

        <section className="anim-fade-up anim-delay-1 mb-6">
          <Card padding="lg">
            <h2 className="mb-4 text-lg font-bold text-foreground">Type de chantier</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="block text-sm font-medium text-foreground">
                Type de chantier ({GROUPES_TYPES.reduce((s, g) => s + g.types.length, 0)} types)
                <select
                  className="mt-1 w-full rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10"
                  value={typeChantier}
                  onChange={(e) => {
                    const valeur = e.target.value;
                    setTypeChantier(valeur);
                    const propose = templatePourTypeDeChantier(valeur);
                    if (propose && templates.some((t) => t.id === propose)) {
                      setTemplateId(propose);
                    }
                  }}
                >
                  {GROUPES_TYPES.map((groupe) => (
                    <optgroup key={groupe.categorie} label={groupe.categorie}>
                      {groupe.types.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium text-foreground">
                Modèle de calcul détaillé
                <select
                  className="mt-1 w-full rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10"
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nom}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs font-normal text-muted">
                  Proposé automatiquement selon le type de chantier ; vous pouvez le changer si besoin.
                </p>
              </label>
            </div>
          </Card>
        </section>

        <section className="anim-fade-up anim-delay-2 mb-6">
          <Card padding="lg">
            <h2 className="mb-4 text-lg font-bold text-foreground">Dimensions / données</h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {template.inputs.map((inp) => (
                <label key={inp.id} className="block text-sm font-medium text-foreground">
                  {inp.label}
                  {inp.type === "select" ? (
                    <select
                      className="mt-1 w-full rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10"
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
                      className="mt-1 w-full rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10"
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

        <section className="anim-fade-up anim-delay-3 mb-6">
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
                          {fcfa(q * chosen.prix_unitaire)} FCFA
                        </p>
                      )}
                    </div>
                    {line.keywords.length > 0 ? (
                      <select
                        className="w-full rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10"
                        value={selections[line.code] ?? ""}
                        onChange={(e) => setSelections((prev) => ({ ...prev, [line.code]: e.target.value }))}
                      >
                        <option value="">(aucun poste BPU recommandé)</option>
                        {options.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.designation} - {fcfa(Number(b.prix_unitaire))} FCFA/{b.unite}
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

            {/* Total estimatif : somme des postes BPU choisis */}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-gradient-to-br from-primary via-primary to-primary-deep px-5 py-4 text-white shadow-lg shadow-primary/20">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/60">
                  Total estimatif
                </p>
                <p className="text-xs text-white/70">Somme des postes BPU choisis pour ce projet.</p>
              </div>
              <p className="text-2xl font-bold tabular-nums">
                {fcfa(total)}
                <span className="ml-1.5 text-sm font-semibold text-white/70">FCFA</span>
              </p>
            </div>
          </Card>
        </section>

        <section className="anim-fade-up anim-delay-4 mb-6">
          <Card padding="lg">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2.5 text-lg font-bold text-foreground">
                  <span className="h-5 w-1.5 rounded-full bg-gradient-to-b from-action to-action-strong" aria-hidden />
                  Vue 3D du projet
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Aperçu en volume généré à partir de vos saisies. Se met à jour automatiquement.
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-surface-2 px-3 py-1.5 text-xs font-semibold text-muted">
                <Box className="h-3.5 w-3.5" />
                {template.nom}
              </span>
            </div>
            <Modele3DGenerique modele={modele3d} />
          </Card>
        </section>

        <section className="anim-fade-up anim-delay-5">
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
      </div>
    </main>
  );
}
