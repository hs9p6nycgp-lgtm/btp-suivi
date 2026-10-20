"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ListChecks, Search } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import donnees from "@/lib/exigences.json";

// Couverture des exigences du cahier des charges.
//
// Les exigences sont extraites automatiquement de `CAHIER_DES_CHARGES.md`
// (script `scripts/exigences/generer.mjs`) : la page montre donc toujours
// l'état réel de la spécification, sans ressaisie.

type Exigence = {
  code: string;
  intitule: string;
  priorite: "M" | "S" | "C";
  /** Nombre d'occurrences du code dans le code source de l'application. */
  references: number;
};

type Module = {
  nom: string;
  exigences: Exigence[];
};

type Regle = {
  code: string;
  texte: string;
  references: number;
  fichiers: string[];
  testee: boolean;
};

const donneesModules = donnees.modules as Module[];
const donneesRegles = (donnees as { regles: Regle[] }).regles ?? [];

// Point d'entrée de chaque module dans l'application.
const LIENS: Record<string, { href: string; libelle: string }> = {
  "Authentification et utilisateurs": { href: "/login", libelle: "Connexion" },
  Chantiers: { href: "/chantiers", libelle: "Chantiers" },
  "Métré, DQE et BPU": { href: "/bpu", libelle: "Base de prix" },
  "Journal de chantier (terrain)": { href: "/chantiers", libelle: "Journal d'un chantier" },
  "Approvisionnements et stocks": { href: "/chantiers", libelle: "Livraisons d'un chantier" },
  "Planning et avancement": { href: "/chantiers", libelle: "Planning d'un chantier" },
  Coûts: { href: "/chantiers", libelle: "Coûts d'un chantier" },
  Qualité: { href: "/chantiers", libelle: "Qualité d'un chantier" },
  "Sécurité (HSE)": { href: "/chantiers", libelle: "Sécurité d'un chantier" },
  "Reporting et tableaux de bord": { href: "/rapports", libelle: "Rapports" },
  "Notifications et collaboration": { href: "/alertes", libelle: "Centre d'alertes" },
  "Référentiel de prix (Côte d’Ivoire)": { href: "/referentiel", libelle: "Référentiel" },
  Fournisseurs: { href: "/fournisseurs", libelle: "Fournisseurs" },
};

const LIBELLE_PRIORITE: Record<string, string> = {
  M: "Indispensable",
  S: "Secondaire",
  C: "Complémentaire",
};

export default function ExigencesPage() {
  const [onglet, setOnglet] = useState<"exigences" | "regles">("exigences");
  const [recherche, setRecherche] = useState("");
  const [priorite, setPriorite] = useState<"toutes" | "M" | "S" | "C">("toutes");

  const modulesVisibles = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return donneesModules
      .map((module) => ({
        ...module,
        exigences: module.exigences.filter(
          (exigence) =>
            (priorite === "toutes" || exigence.priorite === priorite) &&
            (q === "" ||
              exigence.code.toLowerCase().includes(q) ||
              exigence.intitule.toLowerCase().includes(q) ||
              module.nom.toLowerCase().includes(q)),
        ),
      }))
      .filter((module) => module.exigences.length > 0);
  }, [recherche, priorite]);

  const compteAffiche = modulesVisibles.reduce(
    (somme, module) => somme + module.exigences.length,
    0,
  );

  const reglesVisibles = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return donneesRegles.filter(
      (regle) =>
        q === "" ||
        regle.code.toLowerCase().includes(q) ||
        regle.texte.toLowerCase().includes(q),
    );
  }, [recherche]);

  return (
    <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
      <PageHeader
        eyebrow="Spécification"
        title="Couverture des exigences"
        description="Ce que le cahier des charges demande, et où c'est traité dans l'application."
        icon={<ListChecks className="h-5 w-5" />}
      />

      {/* Onglets */}
      <div className="mb-4 inline-flex rounded-xl border border-border/80 bg-surface p-1">
        <button
          type="button"
          onClick={() => setOnglet("exigences")}
          className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
            onglet === "exigences"
              ? "bg-primary text-white shadow-sm"
              : "text-muted hover:text-foreground"
          }`}
        >
          Exigences ({donnees.total})
        </button>
        <button
          type="button"
          onClick={() => setOnglet("regles")}
          className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
            onglet === "regles"
              ? "bg-primary text-white shadow-sm"
              : "text-muted hover:text-foreground"
          }`}
        >
          Règles de gestion ({donneesRegles.length})
        </button>
      </div>

      {onglet === "regles" ? (
        /* Règles de gestion : la règle, l'endroit du code qui l'applique, le test. */
        <div className="space-y-3">
          {reglesVisibles.map((regle) => (
            <Card key={regle.code} padding="lg">
              <div className="flex flex-wrap items-start gap-3">
                <span className="w-16 shrink-0 rounded-md bg-surface-2 px-1.5 py-1 text-center text-[11px] font-bold text-primary">
                  {regle.code}
                </span>
                <p className="min-w-0 flex-1 text-sm text-foreground">{regle.texte}</p>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
                <span
                  className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                    regle.testee
                      ? "bg-success/15 text-success"
                      : regle.references > 0
                        ? "bg-primary/10 text-primary"
                        : "bg-surface-2 text-muted"
                  }`}
                >
                  {regle.testee
                    ? "règle testée"
                    : regle.references > 0
                      ? `citée ${regle.references} fois`
                      : "non citée dans le code"}
                </span>
                {regle.fichiers.slice(0, 3).map((fichier) => (
                  <code
                    key={fichier}
                    className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] text-muted"
                  >
                    {fichier}
                  </code>
                ))}
                {regle.fichiers.length > 3 && (
                  <span className="text-[10px] text-muted">+{regle.fichiers.length - 3}</span>
                )}
              </div>
            </Card>
          ))}
          {reglesVisibles.length === 0 && (
            <Card className="text-center">
              <p className="font-semibold text-foreground">Aucune règle trouvée</p>
              <p className="mt-1 text-sm text-muted">Essayez un autre code (RG-01…).</p>
            </Card>
          )}
        </div>
      ) : (
        <>
      {/* Résumé */}
      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        <Card padding="sm" className="border-l-4 border-l-primary">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Exigences</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{donnees.total}</p>
        </Card>
        <Card padding="sm" className="border-l-4 border-l-action">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Indispensables (M)</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{donnees.parPriorite.M}</p>
        </Card>
        <Card padding="sm" className="border-l-4 border-l-primary-light">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Secondaires (S)</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{donnees.parPriorite.S}</p>
        </Card>
        <Card padding="sm" className="border-l-4 border-l-success">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            Repérées dans le code
          </p>
          <p className="mt-1 text-2xl font-bold text-foreground">
            {donnees.reperees}
            <span className="text-base font-medium text-muted"> / {donnees.total}</span>
          </p>
        </Card>
        <Card padding="sm" className="border-l-4 border-l-muted">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Complémentaires (C)</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{donnees.parPriorite.C}</p>
        </Card>
      </div>

      {/* Recherche et filtres */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-xl border border-border/80 bg-surface-2 px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-muted" />
          <input
            value={recherche}
            onChange={(evenement) => setRecherche(evenement.target.value)}
            placeholder="Rechercher une exigence (code ou texte)…"
            aria-label="Rechercher une exigence"
            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted"
          />
        </div>
        {(["toutes", "M", "S", "C"] as const).map((valeur) => {
          const actif = priorite === valeur;
          const libelle =
            valeur === "toutes" ? "Toutes" : `${valeur} · ${LIBELLE_PRIORITE[valeur]}`;
          return (
            <button
              key={valeur}
              type="button"
              onClick={() => setPriorite(valeur)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                actif
                  ? "border-primary bg-primary text-white"
                  : "border-border/80 bg-surface text-muted hover:border-primary/40 hover:text-foreground"
              }`}
            >
              {libelle}
            </button>
          );
        })}
      </div>

      {/* Modules */}
      <div className="space-y-4">
        {modulesVisibles.map((module) => {
          const lien = LIENS[module.nom];
          return (
            <Card key={module.nom} padding="lg">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-bold text-foreground">{module.nom}</h2>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-semibold text-muted">
                    {module.exigences.length} exigence(s)
                  </span>
                  {lien && (
                    <Link
                      href={lien.href}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      {lien.libelle} →
                    </Link>
                  )}
                </div>
              </div>

              <ul className="divide-y divide-border/60">
                {module.exigences.map((exigence) => (
                  <li key={exigence.code} className="flex flex-wrap items-start gap-3 py-2">
                    <span className="w-16 shrink-0 rounded-md bg-surface-2 px-1.5 py-0.5 text-center text-[11px] font-bold text-primary">
                      {exigence.code}
                    </span>
                    <span className="min-w-0 flex-1 text-sm text-foreground">{exigence.intitule}</span>
                    <span
                      className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                        exigence.priorite === "M"
                          ? "bg-action/15 text-action-strong"
                          : exigence.priorite === "S"
                            ? "bg-primary/10 text-primary"
                            : "bg-surface-2 text-muted"
                      }`}
                      title={LIBELLE_PRIORITE[exigence.priorite]}
                    >
                      {exigence.priorite}
                    </span>
                    <span
                      className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                        exigence.references > 0
                          ? "bg-success/15 text-success"
                          : "bg-surface-2 text-muted"
                      }`}
                      title={
                        exigence.references > 0
                          ? `Code cité ${exigence.references} fois dans l'application`
                          : "Code non cité dans le code source (l'exigence peut être traitée sans que son code soit écrit)"
                      }
                    >
                      {exigence.references > 0 ? `référencée (${exigence.references})` : "sans référence"}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}

        {modulesVisibles.length === 0 && (
          <Card className="text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-muted" />
            <p className="mt-2 font-semibold text-foreground">Aucune exigence trouvée</p>
            <p className="mt-1 text-sm text-muted">
              Essayez un autre code (CHA-01, APP-04…) ou un autre filtre.
            </p>
          </Card>
        )}
      </div>

      <p className="mt-6 text-sm text-muted">
        {compteAffiche} exigence(s) affichée(s) sur {donnees.total}. Ces éléments sont
        générés depuis <code className="rounded bg-surface-2 px-1 py-0.5 text-xs">CAHIER_DES_CHARGES.md</code>{" "}
        par le script <code className="rounded bg-surface-2 px-1 py-0.5 text-xs">scripts/exigences/generer.mjs</code>.
      </p>
        </>
      )}
    </main>
  );
}
