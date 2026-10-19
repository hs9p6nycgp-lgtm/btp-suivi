"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Film, Maximize2, X } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";

// Page « Démo » : trois vidéos de 30 secondes présentant l'application.
//
// Elles sont générées par le script `scripts/videos/generer.py` (rendu image
// par image) : le fichier de chaque vidéo est un GIF animé, lisible dans
// n'importe quel navigateur et insérable dans un diaporama.

const VIDEOS = [
  {
    fichier: "/videos/1-tableau-de-bord.gif",
    titre: "Le tableau de bord",
    resume:
      "Les chantiers en cours, leur avancement, les montants et les alertes : tout est regroupé sur l'accueil.",
    voixOff: [
      ["0-4 s", "BTP Suivi Pro : le suivi de chantier, du chantier au bureau."],
      ["4-13 s", "Tous vos chantiers, leur avancement et les alertes en cours, sur un seul écran."],
      ["13-21 s", "La liste complète : routes et bâtiments, montants, avancement et alertes."],
      ["21-27 s", "La fiche du chantier : avancement, alertes, journaux et travaux à faire."],
      ["27-30 s", "Un chantier, une seule application."],
    ],
  },
  {
    fichier: "/videos/2-saisie-sur-le-chantier.gif",
    titre: "La saisie sur le terrain, sans réseau",
    resume:
      "Le mode terrain (textes agrandis, contrastes renforcés) et la saisie qui continue même sans couverture.",
    voixOff: [
      ["0-4 s", "Sur le chantier, sans réseau : la saisie continue, même sans couverture."],
      ["4-12 s", "Le mode terrain : des textes lisibles en plein soleil."],
      ["12-18 s", "La photo est prise et jointe au journal, en deux gestes."],
      ["18-24 s", "Sans réseau, la photo est conservée sur le téléphone."],
      ["24-30 s", "De retour sur le réseau, tout part automatiquement."],
    ],
  },
  {
    fichier: "/videos/3-alertes-et-proces-verbal.gif",
    titre: "Les alertes et le procès-verbal",
    resume:
      "La cloche regroupe tout ce qui demande attention ; le procès-verbal A4 sort en un clic du journal.",
    voixOff: [
      ["0-4 s", "Rien ne passe inaperçu : alertes, non-conformités, retards et stocks."],
      ["4-12 s", "La cloche regroupe tout ce qui demande votre attention."],
      ["12-20 s", "Un seul écran pour les alertes de tous vos chantiers, exportables en CSV."],
      ["20-26 s", "Un procès-verbal A4 prêt à signer, sorti en un clic depuis le journal."],
      ["26-30 s", "Le suivi se justifie : chaque alerte traitée, chaque procès-verbal signé."],
    ],
  },
  {
    fichier: "/videos/4-chiffrage.gif",
    titre: "Le chiffrage : devis, base de prix et métré",
    resume:
      "Le devis se lit ligne par ligne, la base de prix alimente les prix unitaires, le métré donne le coût.",
    voixOff: [
      ["0-4 s", "Chiffrer vite, chiffrer juste : devis, base de prix et métré reliés entre eux."],
      ["4-13 s", "Le devis se lit ligne par ligne : quantités, prix unitaires et total."],
      ["13-21 s", "Votre base de prix : chaque prix a sa source et sa date."],
      ["21-27 s", "Le métré donne le volume, les matériaux et le coût, en direct."],
      ["27-30 s", "Du devis au marché, sans ressaisie."],
    ],
  },
  {
    fichier: "/videos/5-qualite-et-planning.gif",
    titre: "La conformité : essais, non-conformités, planning",
    resume:
      "Les essais sont datés et archivés, les non-conformités suivies jusqu'à l'action corrective, le planning lu par le chemin critique.",
    voixOff: [
      ["0-4 s", "La conformité se prouve : essais, non-conformités et planning, la trace reste."],
      ["4-14 s", "Chaque essai est daté, mesuré et archivé : la conformité se prouve."],
      ["14-22 s", "Le planning montre la tâche qui bloque tout le reste."],
      ["22-27 s", "L'ouvrage en trois dimensions, à partir des données du chantier."],
      ["27-30 s", "Chaque ouvrage, tracé et vérifié."],
    ],
  },
];

export default function DemoPage() {
  const [presentation, setPresentation] = useState<number | null>(null);
  const [instant, setInstant] = useState(0);

  // Mode présentation : le chronomètre avance tout seul, les phrases de la
  // voix off s'affichent au moment prévu.
  useEffect(() => {
    if (presentation === null) return;
    setInstant(0);
    const depart = Date.now();
    const minuteur = window.setInterval(() => {
      setInstant((Date.now() - depart) / 1000);
    }, 100);
    return () => window.clearInterval(minuteur);
  }, [presentation]);

  useEffect(() => {
    if (presentation === null) return;
    function surTouche(evenement: KeyboardEvent) {
      if (evenement.key === "Escape") setPresentation(null);
      if (evenement.key === "ArrowRight") {
        setPresentation((index) => (index === null ? index : (index + 1) % VIDEOS.length));
      }
      if (evenement.key === "ArrowLeft") {
        setPresentation((index) =>
          index === null ? index : (index - 1 + VIDEOS.length) % VIDEOS.length,
        );
      }
    }
    window.addEventListener("keydown", surTouche);
    return () => window.removeEventListener("keydown", surTouche);
  }, [presentation]);

  const video = presentation !== null ? VIDEOS[presentation] : null;
  const phraseCourante = useMemo(() => {
    if (!video) return null;
    for (const [moment, phrase] of video.voixOff) {
      const [debut, fin] = moment.split("-");
      const debutS = Number(debut.replace(" s", "").trim());
      const finS = Number(fin.replace(" s", "").trim());
      if (instant >= debutS && instant < finS) return phrase;
    }
    return null;
  }, [video, instant]);

  return (
    <>
    <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
      <PageHeader
        eyebrow="Présentation"
        title="Démo en 30 secondes"
        description="Cinq séquences courtes pour présenter l'application en réunion ou en soutenance."
        icon={<Film className="h-5 w-5" />}
      />

      <div className="space-y-6">
        {VIDEOS.map((video, index) => (
          <Card key={video.fichier} padding="lg">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
              <div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={video.fichier}
                  alt={`Démonstration : ${video.titre}`}
                  loading="lazy"
                  className="w-full rounded-xl border border-border/70 bg-surface-2"
                />
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button size="sm" onClick={() => setPresentation(index)}>
                    <Film className="mr-1.5 h-4 w-4" /> Mode présentation
                  </Button>
                  <a
                    href={video.fichier}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl border border-border/80 bg-surface px-3 py-2 text-xs font-semibold text-muted transition hover:border-primary-light/50 hover:text-foreground"
                  >
                    <Maximize2 className="h-3.5 w-3.5" /> Plein écran
                  </a>
                  <a
                    href={video.fichier}
                    download
                    className="inline-flex items-center gap-2 rounded-xl border border-border/80 bg-surface px-3 py-2 text-xs font-semibold text-muted transition hover:border-primary-light/50 hover:text-foreground"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Télécharger
                  </a>
                </div>
              </div>

              <div>
                <h2 className="text-lg font-bold text-foreground">{video.titre}</h2>
                <p className="mt-1 text-sm text-muted">{video.resume}</p>

                <h3 className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted">
                  Voix off (30 s)
                </h3>
                <ul className="mt-2 space-y-1.5 text-sm">
                  {video.voixOff.map(([moment, phrase]) => (
                    <li key={moment} className="flex gap-2">
                      <span className="shrink-0 rounded-md bg-surface-2 px-1.5 py-0.5 text-[11px] font-semibold text-muted">
                        {moment}
                      </span>
                      <span className="text-foreground">{phrase}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <p className="mt-6 text-sm text-muted">
        Besoin d&apos;une version avec vos propres données ou votre logo ? Les vidéos sont
        générées par un script :{" "}
        <code className="rounded bg-surface-2 px-1 py-0.5 text-xs">scripts/videos/generer.py</code>{" "}
        (textes, écrans et couleurs y sont modifiables).
      </p>
    </main>

    {/* Mode présentation : la vidéo en grand et la phrase de la voix off à dire. */}
    {video && (
      <div className="fixed inset-0 z-[90] flex flex-col bg-[#050c16]">
        <div className="flex items-center justify-between px-5 py-3 text-white/80">
          <p className="text-sm font-semibold">
            {presentation !== null ? `${presentation + 1}. ${video.titre}` : video.titre}
          </p>
          <div className="flex items-center gap-3">
            <p className="text-xs text-white/50">Échap pour quitter · ← → pour changer de vidéo</p>
            <button
              type="button"
              onClick={() => setPresentation(null)}
              aria-label="Quitter la présentation"
              className="rounded-lg p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 pb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={video.fichier}
            alt={`Démonstration : ${video.titre}`}
            className="max-h-full max-w-full rounded-xl border border-white/10"
          />
        </div>

        <div className="px-8 pb-8 text-center">
          <div className="mx-auto mb-4 h-1 w-full max-w-3xl overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full rounded-full bg-action transition-[width] duration-100"
              style={{ width: `${Math.min(100, (instant / 30) * 100)}%` }}
            />
          </div>
          <p className="mx-auto max-w-3xl text-xl font-semibold leading-snug text-white md:text-2xl">
            {phraseCourante ?? "…"}
          </p>
        </div>
      </div>
    )}
    </>
  );
}
