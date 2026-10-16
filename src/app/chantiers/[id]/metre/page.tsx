"use client";

import {
  volumeCouche,
  volumeFoisonne,
  nombreBennes,
  volumeBeton,
  ratioAcier,
  surfaceRectangle,
  arrondir2Decimales,
} from "@/lib/calculs/metre";
import { createClient } from "@/lib/supabase/client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";

export default function MetrePage() {
  const params = useParams();
  const router = useRouter();
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      const { data: chantier } = await supabase.from("chantiers").select("id").eq("id", chantierId).eq("proprietaire_id", user.id).maybeSingle();
      if (!chantier) { router.replace("/chantiers"); return; }
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

  // Aucun calcul n'a été modifié : les formules et leurs arrondis sont d'origine.
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
      <div className="mb-6">
        <a href={`/chantiers/${chantierId}`} className="text-sm font-medium text-primary hover:underline">
          &larr; Retour chantier
        </a>
        <h1 className="mt-2 text-2xl font-bold text-foreground md:text-3xl">Métré &amp; DQE</h1>
      </div>

      <section className="mb-6">
        <Card padding="lg">
          <h2 className="mb-4 text-lg font-bold text-foreground">Volume de couche (L x l x e)</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <input
              className="rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none focus:border-primary dark:bg-slate-800 dark:text-slate-200"
              placeholder="Longueur (m)"
              value={l}
              onChange={(e) => setL(e.target.value)}
            />
            <input
              className="rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none focus:border-primary dark:bg-slate-800 dark:text-slate-200"
              placeholder="Largeur (m)"
              value={la}
              onChange={(e) => setLa(e.target.value)}
            />
            <input
              className="rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none focus:border-primary dark:bg-slate-800 dark:text-slate-200"
              placeholder="Epaisseur (m)"
              value={e}
              onChange={(e) => setE(e.target.value)}
            />
          </div>
          <div className="mt-4 space-y-1 text-sm text-foreground">
            {volCouche !== null && <p>Volume en place : {volCouche} m³</p>}
            {volFoisonne !== null && <p>Volume foisonné (x{foisonnement}) : {volFoisonne} m³</p>}
            {nbBennes !== null && <p>Nombre de bennes (cap. {capaciteBenne} m³) : {nbBennes}</p>}
            {surface !== null && <p>Surface : {surface} m²</p>}
          </div>
        </Card>
      </section>

      <section className="mb-6">
        <Card padding="lg">
          <h2 className="mb-4 text-lg font-bold text-foreground">Béton : ratio d&apos;acier</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <input
              className="rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none focus:border-primary dark:bg-slate-800 dark:text-slate-200"
              placeholder="Masse d'acier (kg)"
              value={masseAcier}
              onChange={(e) => setMasseAcier(e.target.value)}
            />
            <input
              className="rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none focus:border-primary dark:bg-slate-800 dark:text-slate-200"
              placeholder="Volume de béton (m³)"
              value={volBetonRatio}
              onChange={(e) => setVolBetonRatio(e.target.value)}
            />
          </div>
          {acierRatio !== null && <p className="mt-3 text-sm text-foreground">Ratio : {acierRatio} kg/m³</p>}
        </Card>
      </section>

      <section>
        <Card padding="lg">
          <h2 className="mb-4 text-lg font-bold text-foreground">Béton simple (un élément)</h2>
          <input
            className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none focus:border-primary dark:bg-slate-800 dark:text-slate-200"
            placeholder="Longueur de l'élément (m) pour volume unitaire"
            value={volumeBetonEl}
            onChange={(e) => setVolumeBetonEl(e.target.value)}
          />
          {volBetonCalc !== null && <p className="mt-3 text-sm text-foreground">Volume : {volBetonCalc} m³</p>}
        </Card>
      </section>
    </main>
  );
}
