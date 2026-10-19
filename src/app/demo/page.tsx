"use client";

import Link from "next/link";
import { ExternalLink, Film, Maximize2 } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";

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
];

export default function DemoPage() {
  return (
    <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
      <PageHeader
        eyebrow="Présentation"
        title="Démo en 30 secondes"
        description="Trois séquences courtes pour présenter l'application en réunion ou en soutenance."
        icon={<Film className="h-5 w-5" />}
      />

      <div className="space-y-6">
        {VIDEOS.map((video) => (
          <Card key={video.fichier} padding="lg">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
              <div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={video.fichier}
                  alt={`Démonstration : ${video.titre}`}
                  className="w-full rounded-xl border border-border/70 bg-surface-2"
                />
                <div className="mt-3 flex flex-wrap items-center gap-2">
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
  );
}
