"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, LineChart, Trash2, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/client";
import { traduireErreur } from "@/lib/i18n";
import {
  normaliserPoints,
  resumerProgression,
  datePoint,
  type PointAvancement,
} from "@/lib/chantiers/avancement";

// Points d'avancement dates (CHA-04) : courbe de progression, cadence constatee,
// fin estimee et saisie d'un nouveau point. Sans la migration 0018, le composant
// affiche une explication au lieu de planter.

const ORANGE = "#f59e0b";

function formaterDateCourte(valeur: string | null | undefined): string {
  if (!valeur) return "—";
  const d = new Date(valeur.length <= 10 ? `${valeur}T00:00:00` : valeur);
  if (Number.isNaN(d.getTime())) return valeur;
  return d.toLocaleDateString("fr-FR");
}

function nombreFormat(valeur: number | null | undefined): string {
  return Number(valeur ?? 0).toLocaleString("fr-FR", { maximumFractionDigits: 1 });
}

/** Courbe de progression en SVG (realisee a partir des points normalises). */
function Graphique({ points }: { points: PointAvancement[] }) {
  const liste = normaliserPoints(points);
  const resume = useMemo(() => resumerProgression(liste), [liste]);
  const LARGEUR = 640;
  const HAUTEUR = 250;
  const margeG = 46;
  const margeD = 20;
  const margeH = 16;
  const margeB = 36;
  const zoneL = LARGEUR - margeG - margeD;
  const zoneH = HAUTEUR - margeH - margeB;

  if (liste.length === 0) {
    return (
      <div className="flex h-[250px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-surface-2 text-sm text-muted">
        <LineChart className="h-6 w-6 text-primary" />
        Aucun point enregistré pour le moment.
        <span className="text-xs">Ajoutez le premier point ci-contre pour voir la courbe.</span>
      </div>
    );
  }

  const msDebut = (datePoint(liste[0].date_point) as Date).getTime();
  const msDernier = (datePoint(liste[liste.length - 1].date_point) as Date).getTime();
  const msFinProjetee = resume.dateFinEstimee
    ? (datePoint(resume.dateFinEstimee)?.getTime() ?? msDernier)
    : msDernier;
  const msFin = Math.max(msDernier, msFinProjetee);
  const etendue = msFin - msDebut;

  const xDe = (ms: number) => (etendue > 0 ? margeG + ((ms - msDebut) / etendue) * zoneL : margeG + zoneL / 2);
  const yDe = (pct: number) => margeH + (1 - Math.min(100, Math.max(0, pct)) / 100) * zoneH;
  const yBase = yDe(0);

  const paires = liste.map((p) => {
    const ms = (datePoint(p.date_point) as Date).getTime();
    return [xDe(ms), yDe(Number(p.avancement_pct) || 0)] as const;
  });
  const polyligne = paires.map(([x, y]) => `${x},${y}`).join(" ");
  const cheminAire =
    paires.length > 1
      ? `M ${paires[0][0]},${yBase} L ${paires.map(([x, y]) => `${x} ${y}`).join(" L ")} L ${paires[paires.length - 1][0]},${yBase} Z`
      : "";
  const projectionVisible = resume.dateFinEstimee !== null && msFinProjetee > msDernier;

  return (
    <div>
      <svg viewBox={`0 0 ${LARGEUR} ${HAUTEUR}`} className="w-full" role="img" aria-label="Courbe d'avancement">
        {/* Grille et échelle (0 à 100 %) */}
        {[0, 25, 50, 75, 100].map((tick) => (
          <g key={tick}>
            <line x1={margeG} y1={yDe(tick)} x2={LARGEUR - margeD} y2={yDe(tick)} stroke="#e2e8f0" strokeWidth={1} />
            <text x={margeG - 8} y={yDe(tick) + 4} textAnchor="end" fontSize={11} fill="#94a3b8">
              {tick} %
            </text>
          </g>
        ))}

        {/* Aire + courbe réelle */}
        {cheminAire && <path d={cheminAire} fill={ORANGE} opacity={0.12} />}
        <polyline points={polyligne} fill="none" stroke={ORANGE} strokeWidth={2.5} strokeLinejoin="round" />

        {/* Projection au rythme constaté */}
        {projectionVisible && (
          <>
            <line
              x1={paires[paires.length - 1][0]}
              y1={paires[paires.length - 1][1]}
              x2={xDe(msFinProjetee)}
              y2={yDe(100)}
              stroke={ORANGE}
              strokeWidth={2}
              strokeDasharray="5 5"
              opacity={0.7}
            />
            <circle cx={xDe(msFinProjetee)} cy={yDe(100)} r={4} fill="#fff" stroke={ORANGE} strokeWidth={2} />
            <text
              x={LARGEUR - margeD}
              y={margeH + 10}
              textAnchor="end"
              fontSize={11}
              fill={ORANGE}
              fontWeight={600}
            >
              ≈ {formaterDateCourte(resume.dateFinEstimee)}
            </text>
          </>
        )}

        {/* Points datés */}
        {paires.map(([x, y], i) => (
          <g key={liste[i].id}>
            <circle cx={x} cy={y} r={4.5} fill="#fff" stroke={ORANGE} strokeWidth={2.5}>
              <title>
                {formaterDateCourte(liste[i].date_point)} · {nombreFormat(liste[i].avancement_pct)} %
                {liste[i].commentaire ? ` — ${liste[i].commentaire}` : ""}
              </title>
            </circle>
          </g>
        ))}

        {/* Dates des extrémités */}
        <text x={margeG} y={HAUTEUR - 10} fontSize={11} fill="#64748b">
          {formaterDateCourte(liste[0].date_point)}
        </text>
        {liste.length > 1 && (
          <text x={LARGEUR - margeD} y={HAUTEUR - 10} textAnchor="end" fontSize={11} fill="#64748b">
            {formaterDateCourte(liste[liste.length - 1].date_point)}
          </text>
        )}
      </svg>
      <p className="mt-2 text-xs text-muted">
        Trait plein : avancement réel constaté.
        {projectionVisible && " Pointillés : projection au rythme des points enregistrés."}
      </p>
    </div>
  );
}

export default function CourbeAvancement({
  chantierId,
  avancementActuel = null,
}: {
  chantierId: string;
  avancementActuel?: number | null;
}) {
  const [points, setPoints] = useState<PointAvancement[]>([]);
  const [disponible, setDisponible] = useState<boolean | null>(null);
  const [chargement, setChargement] = useState(true);
  const [enregistrement, setEnregistrement] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [pct, setPct] = useState("");
  const [commentaire, setCommentaire] = useState("");

  const charger = useCallback(async () => {
    if (!chantierId) return;
    setChargement(true);
    const supabase = createClient();
    const sonde = await supabase.from("avancements_chantier").select("id").limit(1);
    if (sonde.error) {
      setDisponible(false);
      setChargement(false);
      return;
    }
    setDisponible(true);
    const { data, error } = await supabase
      .from("avancements_chantier")
      .select("id, date_point, avancement_pct, commentaire, section_id, created_at")
      .eq("chantier_id", chantierId)
      .order("date_point", { ascending: true });
    if (error) setErreur(traduireErreur(error));
    else setPoints((data ?? []) as PointAvancement[]);
    setChargement(false);
  }, [chantierId]);

  useEffect(() => {
    charger();
  }, [charger]);

  // Pre-remplit l'avancement avec la valeur globale calculee sur les sections.
  useEffect(() => {
    if (pct === "" && avancementActuel !== null && avancementActuel !== undefined) {
      setPct(String(Math.round(avancementActuel * 10) / 10));
    }
  }, [avancementActuel, pct]);

  async function ajouter(e: FormEvent) {
    e.preventDefault();
    setErreur(null);
    setMessage(null);
    const valeur = Number(String(pct).replace(",", "."));
    if (!date || pct === "" || !Number.isFinite(valeur) || valeur < 0 || valeur > 100) {
      setErreur("Indiquez une date et un avancement entre 0 et 100 %.");
      return;
    }
    setEnregistrement(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("avancements_chantier").insert({
      chantier_id: chantierId,
      date_point: date,
      avancement_pct: valeur,
      commentaire: commentaire.trim() ? commentaire.trim() : null,
      created_by: user?.id ?? null,
    });
    if (error) {
      setErreur(traduireErreur(error));
    } else {
      setMessage("Point d'avancement enregistré.");
      setCommentaire("");
      await charger();
    }
    setEnregistrement(false);
  }

  async function supprimer(point: PointAvancement) {
    if (!window.confirm(`Supprimer le point du ${formaterDateCourte(point.date_point)} ?`)) return;
    const supabase = createClient();
    const { error } = await supabase.from("avancements_chantier").delete().eq("id", point.id);
    if (error) setErreur(traduireErreur(error));
    else await charger();
  }

  const liste = normaliserPoints(points);
  const resume = useMemo(() => resumerProgression(liste), [liste]);
  const derniers = [...liste].reverse().slice(0, 6);

  const pastilles: { texte: string; couleur: string }[] = [];
  if (resume.dernier) {
    pastilles.push({ texte: `${nombreFormat(resume.dernier.avancement_pct)} % au ${formaterDateCourte(resume.dernier.date_point)}`, couleur: "#f59e0b" });
  }
  if (resume.cadenceHebdo !== null) {
    pastilles.push({
      texte: `${resume.cadenceHebdo > 0 ? "+" : ""}${nombreFormat(resume.cadenceHebdo)} %/semaine`,
      couleur: resume.cadenceHebdo > 0 ? "#10b981" : "#f43f5e",
    });
  }
  if (resume.dateFinEstimee) {
    pastilles.push({ texte: `Fin estimée : ${formaterDateCourte(resume.dateFinEstimee)}`, couleur: "#0ea5e9" });
  }

  return (
    <Card padding="lg">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2.5 text-lg font-bold text-foreground">
            <span className="h-5 w-1.5 rounded-full bg-gradient-to-b from-action to-action-strong" aria-hidden />
            Avancement dans le temps
          </h2>
          <p className="mt-1 text-sm text-muted">
            Enregistrez la progression réelle du chantier : la courbe montre la cadence et estime la fin.
          </p>
        </div>
        {pastilles.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {pastilles.map((pastille) => (
              <span
                key={pastille.texte}
                className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-surface-2 px-2.5 py-1 text-[11px] font-semibold text-foreground"
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: pastille.couleur }} />
                {pastille.texte}
              </span>
            ))}
          </div>
        )}
      </div>

      {disponible === false ? (
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-dashed border-border bg-surface-2 px-4 py-5 text-sm text-muted">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <p>
            L&apos;historique d&apos;avancement sera activé après la mise à jour de la base (migration{" "}
            <span className="font-semibold text-foreground">0018_avancements_chantier.sql</span> à exécuter dans
            Supabase &gt; SQL Editor). La saisie des sections reste disponible en attendant.
          </p>
        </div>
      ) : chargement ? (
        <div className="mt-5 flex h-40 items-center justify-center">
          <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-border border-t-action" />
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Graphique points={liste} />
          </div>

          <div className="space-y-4">
            <form onSubmit={ajouter} className="rounded-2xl border border-border/70 bg-surface-2 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <TrendingUp className="h-4 w-4 text-action" />
                Nouveau point d&apos;avancement
              </p>
              <label className="mt-3 block text-xs font-medium text-muted">
                Date
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-action"
                />
              </label>
              <label className="mt-3 block text-xs font-medium text-muted">
                Avancement (%)
                <input
                  type="text"
                  inputMode="decimal"
                  value={pct}
                  onChange={(e) => setPct(e.target.value)}
                  placeholder="0 à 100"
                  className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-action"
                />
              </label>
              <label className="mt-3 block text-xs font-medium text-muted">
                Commentaire (facultatif)
                <input
                  type="text"
                  value={commentaire}
                  onChange={(e) => setCommentaire(e.target.value)}
                  placeholder="Ex. : fin du terrassement"
                  className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-action"
                />
              </label>
              <div className="mt-4">
                <Button type="submit" size="sm" isLoading={enregistrement} className="w-full">
                  Enregistrer le point
                </Button>
              </div>
              {message && <p className="mt-3 text-xs font-medium text-emerald-600">{message}</p>}
              {erreur && <p className="mt-3 text-xs font-medium text-rose-600">{erreur}</p>}
            </form>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Derniers points</p>
              <ul className="mt-1">
                {derniers.length === 0 && <li className="py-2 text-sm text-muted">Aucun point pour le moment.</li>}
                {derniers.map((p) => (
                  <li key={p.id} className="flex items-start justify-between gap-2 border-b border-border/60 py-2 last:border-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {nombreFormat(p.avancement_pct)} % <span className="font-normal text-muted">· {formaterDateCourte(p.date_point)}</span>
                      </p>
                      {p.commentaire && <p className="truncate text-xs text-muted">{p.commentaire}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => supprimer(p)}
                      title="Supprimer ce point"
                      className="rounded-lg p-1.5 text-muted transition hover:bg-rose-500/10 hover:text-rose-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
