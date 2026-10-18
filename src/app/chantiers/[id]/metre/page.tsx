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
import { Ruler } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";

const CLASSE_CHAMP =
  "rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10";

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
    <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
      <div className="mx-auto w-full max-w-4xl">
        <PageHeader
          eyebrow="Calculateur"
          title="Métré & DQE"
          description="Volumes, foisonnement, nombre de bennes et ratio d'acier. Les formules du cahier des charges sont appliquées à l'identique."
          icon={<Ruler className="h-5 w-5" />}
          actions={
            <Link
              href={`/chantiers/${chantierId}`}
              className="inline-flex items-center gap-2 rounded-xl border border-border/80 bg-surface px-3.5 py-2 text-sm font-semibold text-muted shadow-sm transition hover:border-primary-light/50 hover:text-foreground"
            >
              <span>←</span>
              Retour au chantier
            </Link>
          }
        />

        <section className="anim-fade-up anim-delay-1 mb-6">
          <Card padding="lg">
            <h2 className="mb-4 flex items-center gap-2.5 text-lg font-bold text-foreground">
              <span className="h-5 w-1.5 rounded-full bg-gradient-to-b from-action to-action-strong" aria-hidden />
              Volume de couche (L × l × e)
            </h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <input
                className={CLASSE_CHAMP}
                placeholder="Longueur (m)"
                value={l}
                onChange={(e) => setL(e.target.value)}
              />
              <input
                className={CLASSE_CHAMP}
                placeholder="Largeur (m)"
                value={la}
                onChange={(e) => setLa(e.target.value)}
              />
              <input
                className={CLASSE_CHAMP}
                placeholder="Épaisseur (m)"
                value={e}
                onChange={(e) => setE(e.target.value)}
              />
            </div>
            <div className="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              {volCouche !== null && (
                <p className="flex items-center justify-between gap-3 rounded-xl bg-surface-2 px-3 py-2">
                  <span className="text-muted">Volume en place</span>
                  <span className="font-semibold tabular-nums text-foreground">{volCouche} m³</span>
                </p>
              )}
              {volFoisonne !== null && (
                <p className="flex items-center justify-between gap-3 rounded-xl bg-surface-2 px-3 py-2">
                  <span className="text-muted">Volume foisonné (×{foisonnement})</span>
                  <span className="font-semibold tabular-nums text-foreground">{volFoisonne} m³</span>
                </p>
              )}
              {nbBennes !== null && (
                <p className="flex items-center justify-between gap-3 rounded-xl bg-surface-2 px-3 py-2">
                  <span className="text-muted">Nombre de bennes (cap. {capaciteBenne} m³)</span>
                  <span className="font-semibold tabular-nums text-foreground">{nbBennes}</span>
                </p>
              )}
              {surface !== null && (
                <p className="flex items-center justify-between gap-3 rounded-xl bg-surface-2 px-3 py-2">
                  <span className="text-muted">Surface</span>
                  <span className="font-semibold tabular-nums text-foreground">{surface} m²</span>
                </p>
              )}
            </div>
          </Card>
        </section>

        <section className="anim-fade-up anim-delay-2 mb-6">
          <Card padding="lg">
            <h2 className="mb-4 flex items-center gap-2.5 text-lg font-bold text-foreground">
              <span className="h-5 w-1.5 rounded-full bg-gradient-to-b from-action to-action-strong" aria-hidden />
              Béton : ratio d&apos;acier
            </h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <input
                className={CLASSE_CHAMP}
                placeholder="Masse d'acier (kg)"
                value={masseAcier}
                onChange={(e) => setMasseAcier(e.target.value)}
              />
              <input
                className={CLASSE_CHAMP}
                placeholder="Volume de béton (m³)"
                value={volBetonRatio}
                onChange={(e) => setVolBetonRatio(e.target.value)}
              />
            </div>
            {acierRatio !== null && (
              <p className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-surface-2 px-3 py-2 text-sm">
                <span className="text-muted">Ratio d&apos;acier</span>
                <span className="font-semibold tabular-nums text-foreground">{acierRatio} kg/m³</span>
              </p>
            )}
          </Card>
        </section>

        <section className="anim-fade-up anim-delay-3">
          <Card padding="lg">
            <h2 className="mb-4 flex items-center gap-2.5 text-lg font-bold text-foreground">
              <span className="h-5 w-1.5 rounded-full bg-gradient-to-b from-action to-action-strong" aria-hidden />
              Béton simple (un élément)
            </h2>
            <input
              className={`w-full ${CLASSE_CHAMP}`}
              placeholder="Longueur de l'élément (m) pour volume unitaire"
              value={volumeBetonEl}
              onChange={(e) => setVolumeBetonEl(e.target.value)}
            />
            {volBetonCalc !== null && (
              <p className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-surface-2 px-3 py-2 text-sm">
                <span className="text-muted">Volume</span>
                <span className="font-semibold tabular-nums text-foreground">{volBetonCalc} m³</span>
              </p>
            )}
          </Card>
        </section>
      </div>
    </main>
  );
}
