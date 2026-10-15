"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

type Bpu = { id: string; designation: string; unite: string; prix_unitaire: number };

export default function MurCalculatorPage() {
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

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold text-primary">
        Assistant devis - Mur en agglos
      </h1>

      <section className="card p-4">
        <h2 className="mb-3 text-lg font-medium">Dimensions et hypothèses</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <input className="rounded border p-2" placeholder="Longueur (m)" value={l} onChange={(e) => setL(e.target.value)} />
          <input className="rounded border p-2" placeholder="Hauteur (m)" value={h} onChange={(e) => setH(e.target.value)} />
          <input className="rounded border p-2" placeholder="Epaisseur (m)" value={e} onChange={(e) => setE(e.target.value)} />
          <input className="rounded border p-2" placeholder="Ouvertures (%)" value={ouvertures} onChange={(e) => setOuvertures(e.target.value)} />
          <input className="rounded border p-2" placeholder="Pertes blocs (%)" value={pertes} onChange={(e) => setPertes(e.target.value)} />
        </div>
      </section>

      <section className="mt-6 card p-4">
        <h2 className="mb-3 text-lg font-medium text-primary">Choix des matériaux (recommandations)</h2>
        <p className="mb-3 text-sm text-slate-600">
          Choisissez parmi les postes du BPU. Les prix se mettent à jour automatiquement.
        </p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="text-sm">
            Agglo / bloc
            <select className="mt-1 w-full rounded border p-2" value={aggloId} onChange={(e) => setAggloId(e.target.value)}>
              <option value="">(aucun)</option>
              {optionsAgglo.map((b) => (
                <option key={b.id} value={b.id}>{b.designation}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Ciment
            <select className="mt-1 w-full rounded border p-2" value={cimentId} onChange={(e) => setCimentId(e.target.value)}>
              <option value="">(aucun)</option>
              {optionsCiment.map((b) => (
                <option key={b.id} value={b.id}>{b.designation}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Sable
            <select className="mt-1 w-full rounded border p-2" value={sableId} onChange={(e) => setSableId(e.target.value)}>
              <option value="">(aucun)</option>
              {optionsSable.map((b) => (
                <option key={b.id} value={b.id}>{b.designation}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Enduit (optionnel)
            <select className="mt-1 w-full rounded border p-2" value={enduitId} onChange={(e) => setEnduitId(e.target.value)}>
              <option value="">(aucun)</option>
              {optionsEnduit.map((b) => (
                <option key={b.id} value={b.id}>{b.designation}</option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="mt-6 card p-4">
        <h2 className="mb-3 text-lg font-medium text-primary">Quantités estimées</h2>
        <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
          <p>Surface brute : {surfaceBrute.toFixed(2)} m²</p>
          <p>Surface nette : {surfaceNette.toFixed(2)} m²</p>
          <p>Volume du mur : {volumeMur.toFixed(3)} m³</p>
          <p>Blocs agglos : {nbBlocs} u</p>
          <p>Volume mortier : {volumeMortier.toFixed(3)} m³</p>
          <p>Ciment : {cimentKg.toFixed(0)} kg</p>
          <p>Sable : {sableM3.toFixed(3)} m³</p>
        </div>
      </section>

      <section className="mt-6 card p-4">
        <h2 className="mb-3 text-lg font-medium text-primary">Prix (depuis le BPU)</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="p-2">Poste</th>
              <th className="p-2">Quantité</th>
              <th className="p-2">Prix unit. (FCFA)</th>
              <th className="p-2">Total (FCFA)</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="p-2">Agglos {agglo ? `(${agglo.designation})` : "(non trouvé dans BPU)"}</td>
              <td className="p-2">{nbBlocs}</td>
              <td className="p-2">{agglo ? Number(agglo.prix_unitaire).toLocaleString("fr-FR") : "-"}</td>
              <td className="p-2">{coutAgglo !== null ? Math.round(coutAgglo).toLocaleString("fr-FR") : "-"}</td>
            </tr>
            <tr className="border-b">
              <td className="p-2">Ciment {ciment ? `(${ciment.designation})` : "(non trouvé dans BPU)"}</td>
              <td className="p-2">{cimentKg.toFixed(0)} kg</td>
              <td className="p-2">{ciment ? Number(ciment.prix_unitaire).toLocaleString("fr-FR") : "-"}</td>
              <td className="p-2">{coutCiment !== null ? Math.round(coutCiment).toLocaleString("fr-FR") : "-"}</td>
            </tr>
            <tr className="border-b">
              <td className="p-2">Sable {sable ? `(${sable.designation})` : "(non trouvé dans BPU)"}</td>
              <td className="p-2">{sableM3.toFixed(3)} m3</td>
              <td className="p-2">{sable ? Number(sable.prix_unitaire).toLocaleString("fr-FR") : "-"}</td>
              <td className="p-2">{coutSable !== null ? Math.round(coutSable).toLocaleString("fr-FR") : "-"}</td>
            </tr>
            <tr className="border-b">
              <td className="p-2">Enduit {enduit ? `(${enduit.designation})` : "(non sélectionné)"}</td>
              <td className="p-2">{surfaceNette.toFixed(2)} m2</td>
              <td className="p-2">{enduit ? Number(enduit.prix_unitaire).toLocaleString("fr-FR") : "-"}</td>
              <td className="p-2">{coutEnduit !== null ? Math.round(coutEnduit).toLocaleString("fr-FR") : "-"}</td>
            </tr>
          </tbody>
        </table>
        <div className="mt-3 text-right font-bold text-primary">
          Total matériaux estimé : {Math.round(totalMateriaux).toLocaleString("fr-FR")} FCFA
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Les prix sont pris depuis le BPU (premier poste correspondant). Ajustez si le prix est par sac/m3. Enduit :
          {enduit ? ` ${enduit.designation}` : " non trouvé dans le BPU"}.
        </p>
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
            {taches.map((t) => (
              <tr key={t.nom} className="border-b">
                <td className="p-2">{t.nom}</td>
                <td className="p-2">{t.jours}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-slate-500">
          Durées indicatives basées sur des rendements moyens (mason unique). A affiner en phase planing.
        </p>
      </section>
    </main>
  );
}