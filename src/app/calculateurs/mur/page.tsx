"use client";

import { Calculator } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getLangue } from "@/lib/i18n";

type Bpu = { id: string; designation: string; unite: string; prix_unitaire: number };

export default function MurCalculatorPage() {
  const langue = getLangue();

  const [l, setL] = useState("10");
  const [h, setH] = useState("2.8");
  const [e, setE] = useState("0.15");
  const [ouvertures, setOuvertures] = useState("5");
  const [pertes, setPertes] = useState("5");
  const [bpu, setBpu] = useState<Bpu[]>([]);
  const [aggloId, setAggloId] = useState("");
  const [cimentId, setCimentId] = useState("");
  const [sableId, setSableId] = useState("");
  const [enduitId, setEnduitId] = useState("");

  const optionsAgglo = bpu.filter((b) => (b.designation ?? "").toLowerCase().includes("agglo") || (b.designation ?? "").toLowerCase().includes("bloc"));
  const optionsCiment = bpu.filter((b) => (b.designation ?? "").toLowerCase().includes("ciment"));
  const optionsSable = bpu.filter((b) => (b.designation ?? "").toLowerCase().includes("sable"));
  const optionsEnduit = bpu.filter((b) => (b.designation ?? "").toLowerCase().includes("enduit"));

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("bpu_postes")
        .select("id,designation,unite,prix_unitaire")
        .order("created_at", { ascending: false });
      const items = (data ?? []) as Bpu[];
      setBpu(items);
      setAggloId((prev) => prev || (items.find((b) => (b.designation ?? "").toLowerCase().includes("agglo") || (b.designation ?? "").toLowerCase().includes("bloc"))?.id ?? ""));
      setCimentId((prev) => prev || (items.find((b) => (b.designation ?? "").toLowerCase().includes("ciment"))?.id ?? ""));
      setSableId((prev) => prev || (items.find((b) => (b.designation ?? "").toLowerCase().includes("sable"))?.id ?? ""));
      setEnduitId((prev) => prev || (items.find((b) => (b.designation ?? "").toLowerCase().includes("enduit"))?.id ?? ""));
    }
    load();
  }, []);

  const L = Number(l) || 0;
  const H = Number(h) || 0;
  const E = Number(e) || 0;
  const surfaceBrute = L * H;
  const surfaceOuv = surfaceBrute * ((Number(ouvertures) || 0) / 100);
  const surfaceNette = Math.max(surfaceBrute - surfaceOuv, 0);

  const blocSurface = 0.2 * 0.2;
  const coeffPertes = 1 + (Number(pertes) || 0) / 100;
  const nbBlocs = Math.ceil((surfaceNette / blocSurface) * coeffPertes);

  const volumeMur = surfaceNette * E;
  const volumeBloc = nbBlocs * blocSurface * E;
  const volumeMortier = Math.max(volumeMur - volumeBloc * 0.92, 0); // marge de pose

  const cimentKg = volumeMortier * 280;
  const sableM3 = volumeMortier * 0.8;

  const agglo = bpu.find((b) => b.id === aggloId) ?? null;
  const ciment = bpu.find((b) => b.id === cimentId) ?? null;
  const sable = bpu.find((b) => b.id === sableId) ?? null;
  const enduit = bpu.find((b) => b.id === enduitId) ?? null;

  const coutAgglo = agglo ? nbBlocs * agglo.prix_unitaire : null;
  const coutCiment = ciment ? cimentKg * ciment.prix_unitaire : null;
  const coutSable = sable ? sableM3 * sable.prix_unitaire : null;
  const coutEnduit = enduit ? surfaceNette * enduit.prix_unitaire : null;
  const totalMateriaux =
    (coutAgglo ?? 0) + (coutCiment ?? 0) + (coutSable ?? 0) + (coutEnduit ?? 0);

  const taches = [
    { nom: "Implantation et fondations", jours: 1 },
    { nom: "Montage mur en agglos", jours: Math.max(1, Math.ceil(surfaceNette / 8)) },
    { nom: "Pose mortier / reglage", jours: Math.max(1, Math.ceil(volumeMortier / 0.5)) },
    { nom: "Enduit", jours: Math.max(1, Math.ceil(surfaceNette / 15)) },
    { nom: "Finition et cure", jours: Math.max(1, Math.ceil(surfaceNette / 25)) },
  ];

  const fcfa = (montant: number) =>
    montant.toLocaleString(langue === "fr" ? "fr-FR" : "en-US");

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8">
      <div className="mb-6">
        <Link href="/bpu" className="text-sm font-medium text-primary hover:underline">
          &larr; Retour BPU
        </Link>
        <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold text-foreground md:text-3xl">
          <Calculator className="h-8 w-8 text-primary" />
          Assistant devis - Mur en agglos
        </h1>
      </div>

      <section className="mb-6">
        <Card padding="lg">
          <h2 className="mb-4 text-lg font-bold text-foreground">Dimensions et hypothèses</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <label className="block text-sm font-medium text-foreground">
              Longueur (m)
              <input
                className="mt-1 w-full rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10"
                value={l}
                onChange={(e) => setL(e.target.value)}
              />
            </label>
            <label className="block text-sm font-medium text-foreground">
              Hauteur (m)
              <input
                className="mt-1 w-full rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10"
                value={h}
                onChange={(e) => setH(e.target.value)}
              />
            </label>
            <label className="block text-sm font-medium text-foreground">
              Épaisseur (m)
              <input
                className="mt-1 w-full rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10"
                value={e}
                onChange={(e) => setE(e.target.value)}
              />
            </label>
            <label className="block text-sm font-medium text-foreground">
              Ouvertures (%)
              <input
                className="mt-1 w-full rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10"
                value={ouvertures}
                onChange={(e) => setOuvertures(e.target.value)}
              />
            </label>
            <label className="block text-sm font-medium text-foreground">
              Pertes de blocs (%)
              <input
                className="mt-1 w-full rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10"
                value={pertes}
                onChange={(e) => setPertes(e.target.value)}
              />
            </label>
          </div>
        </Card>
      </section>

      <section className="mb-6">
        <Card padding="lg">
          <h2 className="mb-4 text-lg font-bold text-foreground">Choix des matériaux (recommandations)</h2>
          <p className="mb-4 text-sm text-muted">
            Choisissez parmi les postes du BPU. Les prix se mettent à jour automatiquement.
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block text-sm font-medium text-foreground">
              Agglo / bloc
              <select
                className="mt-1 w-full rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10"
                value={aggloId}
                onChange={(e) => setAggloId(e.target.value)}
              >
                <option value="">(aucun)</option>
                {optionsAgglo.map((b) => (
                  <option key={b.id} value={b.id}>{b.designation}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-foreground">
              Ciment
              <select
                className="mt-1 w-full rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10"
                value={cimentId}
                onChange={(e) => setCimentId(e.target.value)}
              >
                <option value="">(aucun)</option>
                {optionsCiment.map((b) => (
                  <option key={b.id} value={b.id}>{b.designation}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-foreground">
              Sable
              <select
                className="mt-1 w-full rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10"
                value={sableId}
                onChange={(e) => setSableId(e.target.value)}
              >
                <option value="">(aucun)</option>
                {optionsSable.map((b) => (
                  <option key={b.id} value={b.id}>{b.designation}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-foreground">
              Enduit (optionnel)
              <select
                className="mt-1 w-full rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10"
                value={enduitId}
                onChange={(e) => setEnduitId(e.target.value)}
              >
                <option value="">(aucun)</option>
                {optionsEnduit.map((b) => (
                  <option key={b.id} value={b.id}>{b.designation}</option>
                ))}
              </select>
            </label>
          </div>
        </Card>
      </section>

      <section className="mb-6">
        <Card padding="lg">
          <h2 className="mb-4 text-lg font-bold text-foreground">Quantités estimées</h2>
          <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
            <p>Surface brute : {surfaceBrute.toFixed(2)} m²</p>
            <p>Surface nette : {surfaceNette.toFixed(2)} m²</p>
            <p>Volume du mur : {volumeMur.toFixed(3)} m³</p>
            <p>Blocs agglos : {nbBlocs} u</p>
            <p>Volume mortier : {volumeMortier.toFixed(3)} m³</p>
            <p>Ciment : {cimentKg.toFixed(0)} kg</p>
            <p>Sable : {sableM3.toFixed(3)} m³</p>
          </div>
        </Card>
      </section>

      <section>
        <Card padding="lg">
          <h2 className="mb-4 text-lg font-bold text-foreground">Prix (depuis le BPU)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="p-2 font-semibold text-muted">Poste</th>
                  <th className="p-2 font-semibold text-muted text-center">Quantité</th>
                  <th className="p-2 font-semibold text-muted text-right">Prix unit. (FCFA)</th>
                  <th className="p-2 font-semibold text-muted text-right">Total (FCFA)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border">
                  <td className="p-2">
                    Agglos {agglo ? `(${agglo.designation})` : "(non trouvé dans BPU)"}
                  </td>
                  <td className="p-2 text-center">{nbBlocs}</td>
                  <td className="p-2 text-right">{agglo ? agglo.prix_unitaire.toLocaleString(langue === "fr" ? "fr-FR" : "en-US") : "-"}</td>
                  <td className="p-2 text-right">{coutAgglo !== null ? Math.round(coutAgglo).toLocaleString(langue === "fr" ? "fr-FR" : "en-US") : "-"}</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="p-2">
                    Ciment {ciment ? `(${ciment.designation})` : "(non trouvé dans BPU)"}
                  </td>
                  <td className="p-2 text-center">{cimentKg.toFixed(0)} kg</td>
                  <td className="p-2 text-right">{ciment ? ciment.prix_unitaire.toLocaleString(langue === "fr" ? "fr-FR" : "en-US") : "-"}</td>
                  <td className="p-2 text-right">{coutCiment !== null ? Math.round(coutCiment).toLocaleString(langue === "fr" ? "fr-FR" : "en-US") : "-"}</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="p-2">
                    Sable {sable ? `(${sable.designation})` : "(non trouvé dans BPU)"}
                  </td>
                  <td className="p-2 text-center">{sableM3.toFixed(3)} m3</td>
                  <td className="p-2 text-right">{sable ? sable.prix_unitaire.toLocaleString(langue === "fr" ? "fr-FR" : "en-US") : "-"}</td>
                  <td className="p-2 text-right">{coutSable !== null ? Math.round(coutSable).toLocaleString(langue === "fr" ? "fr-FR" : "en-US") : "-"}</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="p-2">
                    Enduit {enduit ? `(${enduit.designation})` : "(non sélectionné)"}
                  </td>
                  <td className="p-2 text-center">{surfaceNette.toFixed(2)} m2</td>
                  <td className="p-2 text-right">{enduit ? enduit.prix_unitaire.toLocaleString(langue === "fr" ? "fr-FR" : "en-US") : "-"}</td>
                  <td className="p-2 text-right">{coutEnduit !== null ? Math.round(coutEnduit).toLocaleString(langue === "fr" ? "fr-FR" : "en-US") : "-"}</td>
                </tr>
              </tbody>
            </table>
            </div>
            <div className="mt-3 text-right font-bold text-foreground">
              Total matériaux estimé : {fcfa(totalMateriaux)} FCFA
            </div>
            <p className="mt-2 text-xs text-muted">
              Les prix sont pris depuis le BPU (premier poste correspondant). Ajustez si le prix est par sac/m3. Enduit : {enduit ? enduit.designation : " non trouvé dans le BPU"}.
            </p>
          </Card>
        </section>

        <section className="mt-6">
          <Card padding="lg">
            <h2 className="mb-4 text-lg font-bold text-foreground">Planning suggéré (estimation)</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="p-2 font-semibold text-muted">Tâche</th>
                    <th className="p-2 font-semibold text-muted text-center">Durée indicative (j)</th>
                  </tr>
                </thead>
                <tbody>
                  {taches.map((t) => (
                    <tr key={t.nom} className="border-b border-border">
                      <td className="p-2">{t.nom}</td>
                      <td className="p-2 text-center">{t.jours}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-xs text-muted">
                Durées indicatives basées sur des rendements moyens (mason unique). A affiner en phase planing.
              </p>
            </div>
          </Card>
        </section>
    </main>
  );
}
