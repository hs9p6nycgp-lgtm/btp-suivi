"use client";

import { createClient } from "@/lib/supabase/client";
import {
  volumeCouche,
  volumeFoisonne,
  nombreBennes,
  volumeBeton,
  ratioAcier,
  surfaceRectangle,
  arrondir2Decimales,
} from "@/lib/calculs/metre";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function MetrePage() {
  const params = useParams();
  const chantierId = String(params?.id ?? "");
  const [foisonnement, setFoisonnement] = useState(1.2);
  const [capaciteBenne, setCapaciteBenne] = useState(15);

  const [l, setL] = useState("");
  const [la, setLa] = useState("");
  const [e, setE] = useState("");

  const [volumeBetonEl, setVolumeBetonEl] = useState("");
  const [masseAcier, setMasseAcier] = useState("");
  const [volBetonRatio, setVolBetonRatio] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("parametres_metre")
        .select("*")
        .eq("chantier_id", chantierId)
        .maybeSingle();
      if (data) {
        setFoisonnement(Number(data.coefficient_foisonnement));
        setCapaciteBenne(Number(data.capacite_benne_m3));
      }
    }
    if (chantierId) load();
  }, [chantierId]);

  const volCouche =
    l && la && e ? arrondir2Decimales(volumeCouche(Number(l), Number(la), Number(e))) : null;
  const volFoisonne =
    volCouche !== null ? arrondir2Decimales(volumeFoisonne(volCouche, foisonnement)) : null;
  const nbBennes =
    volFoisonne !== null ? nombreBennes(volFoisonne, capaciteBenne) : null;

  const surface = l && la ? arrondir2Decimales(surfaceRectangle(Number(l), Number(la))) : null;

  let acierRatio: number | null = null;
  if (masseAcier && volBetonRatio) {
    try {
      acierRatio = arrondir2Decimales(ratioAcier(Number(masseAcier), Number(volBetonRatio)));
    } catch {
      acierRatio = null;
    }
  }

  const volBetonCalc = volumeBetonEl
    ? arrondir2Decimales(volumeBeton([{ longueur: Number(volumeBetonEl), largeur: 1, hauteur: 1 }]))
    : null;

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8">
      <div className="mb-4">
        <a href={`/chantiers/${chantierId}`} className="text-sm text-orange-600">
          &lt; Retour chantier
        </a>
      </div>
      <h1 className="mb-6 text-2xl font-semibold">Calculateurs de metre</h1>

      <section className="mb-6 card p-4">
        <h2 className="mb-3 text-lg font-medium">Volume de couche (L x l x e)</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <input className="rounded border p-2" placeholder="Longueur (m)" value={l} onChange={(e) => setL(e.target.value)} />
          <input className="rounded border p-2" placeholder="Largeur (m)" value={la} onChange={(e) => setLa(e.target.value)} />
          <input className="rounded border p-2" placeholder="Epaisseur (m)" value={e} onChange={(e) => setE(e.target.value)} />
        </div>
        <div className="mt-3 space-y-1 text-sm">
          {volCouche !== null && <p>Volume en place : {volCouche} m3</p>}
          {volFoisonne !== null && <p>Volume foisonne (x{foisonnement}) : {volFoisonne} m3</p>}
          {nbBennes !== null && <p>Nombre de bennes (cap. {capaciteBenne} m3) : {nbBennes}</p>}
          {surface !== null && <p>Surface : {surface} m2</p>}
        </div>
      </section>

      <section className="mb-6 card p-4">
        <h2 className="mb-3 text-lg font-medium">Beton : ratio d&apos;acier</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <input className="rounded border p-2" placeholder="Masse d'acier (kg)" value={masseAcier} onChange={(e) => setMasseAcier(e.target.value)} />
          <input className="rounded border p-2" placeholder="Volume de beton (m3)" value={volBetonRatio} onChange={(e) => setVolBetonRatio(e.target.value)} />
        </div>
        {acierRatio !== null && <p className="mt-3 text-sm">Ratio : {acierRatio} kg/m3</p>}
      </section>

      <section className="card p-4">
        <h2 className="mb-3 text-lg font-medium">Beton simple (un element)</h2>
        <input
          className="w-full rounded border p-2"
          placeholder="Longueur de l'element (m) pour volume unitaire"
          value={volumeBetonEl}
          onChange={(e) => setVolumeBetonEl(e.target.value)}
        />
        {volBetonCalc !== null && <p className="mt-3 text-sm">Volume : {volBetonCalc} m3</p>}
      </section>
    </main>
  );
}