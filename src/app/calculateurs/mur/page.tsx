"use client";

import { Calculator } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getLangue } from "@/lib/i18n";
import { calculerDevisMur, normaliserUnite } from "@/lib/calculs/mur";

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

  const agglo = bpu.find((b) => b.id === aggloId) ?? null;
  const ciment = bpu.find((b) => b.id === cimentId) ?? null;
  const sable = bpu.find((b) => b.id === sableId) ?? null;
  const enduit = bpu.find((b) => b.id === enduitId) ?? null;

  // Calcul complet : quantités exactes, conversion dans l'unité du prix
  // du BPU avant de multiplier, montants en FCFA sans décimale (RG-06).
  const devis = calculerDevisMur({
    longueur: L,
    hauteur: H,
    epaisseur: E,
    ouverturesPct: Number(ouvertures) || 0,
    pertesPct: Number(pertes) || 0,
    prix: {
      agglos: agglo?.prix_unitaire ?? null,
      ciment: ciment?.prix_unitaire ?? null,
      sable: sable?.prix_unitaire ?? null,
      enduit: enduit?.prix_unitaire ?? null,
    },
    unites: {
      agglos: agglo?.unite ?? null,
      ciment: ciment?.unite ?? null,
      sable: sable?.unite ?? null,
      enduit: enduit?.unite ?? null,
    },
  });

  const { surfaceBrute, surfaceNette, volumeMur, nbBlocs, volumeMortier, cimentKg, sableM3 } = devis;
  const totalMateriaux = devis.totalMateriaux;
  const taches = devis.taches;

  // Format français : virgule décimale, espace insécable pour les milliers.
  const fr = langue === "fr" ? "fr-FR" : "en-US";
  const nombre = (valeur: number, decimales = 2) =>
    valeur.toLocaleString(fr, { minimumFractionDigits: decimales, maximumFractionDigits: decimales });
  const fcfa = (montant: number) => Math.round(montant).toLocaleString(fr);
  const uniteLisible = (unite: string | null | undefined) => {
    const u = normaliserUnite(unite);
    if (u === "m3") return "m³";
    if (u === "m2") return "m²";
    if (u === "t") return "t";
    if (u === "sac") return "sac";
    if (u === "u") return "u";
    return unite ?? "";
  };

  const designations: Record<string, string | null> = {
    agglos: agglo?.designation ?? null,
    ciment: ciment?.designation ?? null,
    sable: sable?.designation ?? null,
    enduit: enduit?.designation ?? null,
  };

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
            <p>Surface brute : {nombre(surfaceBrute, 2)} m²</p>
            <p>Surface nette : {nombre(surfaceNette, 2)} m²</p>
            <p>Volume du mur : {nombre(volumeMur, 3)} m³</p>
            <p>Blocs agglos : {nbBlocs} u</p>
            <p>Volume mortier : {nombre(volumeMortier, 3)} m³</p>
            <p>Ciment : {nombre(cimentKg, 1)} kg ({nombre(cimentKg / 50, 2)} sac de 50 kg)</p>
            <p>Sable : {nombre(sableM3, 3)} m³</p>
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
                {devis.lignes.map((ligne) => (
                  <tr key={ligne.cle} className="border-b border-border">
                    <td className="p-2">
                      {ligne.libelle} {designations[ligne.cle] ? `(${designations[ligne.cle]})` : "(non trouvé dans BPU)"}
                      {ligne.message && (
                        <span className="mt-1 block text-xs text-warning">{ligne.message}</span>
                      )}
                    </td>
                    <td className="p-2 text-center">
                      {ligne.quantite !== null
                        ? `${nombre(ligne.quantite, ligne.quantite >= 100 ? 0 : 2)} ${uniteLisible(ligne.unite)}`
                        : "—"}
                    </td>
                    <td className="p-2 text-right">
                      {ligne.prixUnitaire !== null ? fcfa(ligne.prixUnitaire) : "—"}
                    </td>
                    <td className="p-2 text-right font-medium">
                      {ligne.total !== null ? fcfa(ligne.total) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            <div className="mt-3 text-right font-bold text-foreground">
              Total matériaux estimé : {fcfa(totalMateriaux)} FCFA
            </div>
            {devis.posteNonValorise && (
              <p className="mt-2 text-xs text-warning">
                Un poste n’a pas pu être valorisé : l’unité du prix du BPU ne correspond
                pas aux quantités calculées. Choisissez un poste du BPU dans la bonne unité
                (sac, m³, tonne, unité…) pour obtenir le total complet.
              </p>
            )}
            <p className="mt-2 text-xs text-muted">
              Les quantités sont converties dans l’unité du prix du BPU avant le calcul
              (par exemple : le ciment est chiffré au sac de 50 kg, pas au kilo).
              Les montants sont arrondis au franc près (FCFA sans décimale).
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
