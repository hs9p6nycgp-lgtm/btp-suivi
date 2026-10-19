"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

// Bannière « Installer l'application » : propose d'ajouter BTP Suivi Pro
// à l'écran d'accueil de l'appareil (accès direct + saisie hors connexion).
// - Android / Chrome / Edge : utilise l'invitation native du navigateur.
// - iPhone / iPad (Safari) : affiche la petite procédure officielle
//   (bouton Partager puis « Sur l'écran d'accueil »).
// La bannière ne réapparaît pas si l'appareil a déjà l'application,
// ni si l'utilisateur l'a écartée une fois.

type EvenementAvantInstallation = Event & {
  prompt: () => Promise<void>;
};

const CLE_ECARTEE = "btp-suivi-installation-ecartee";

export default function InviteInstallation() {
  const [evenement, setEvenement] = useState<EvenementAvantInstallation | null>(null);
  const [procedeIos, setProcedeIos] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Application déjà installée ? (mode autonome, ou iPhone « écran d'accueil »)
    const dejaInstallee =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (dejaInstallee) return;
    if (localStorage.getItem(CLE_ECARTEE)) return;

    const ua = navigator.userAgent;
    const estIos = /iphone|ipad|ipod/i.test(ua);
    // Safari sur iPhone/iPad : pas d'événement, seulement la procédure manuelle.
    const estSafariIos = estIos && /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua);

    function surInvitation(e: Event) {
      e.preventDefault();
      setEvenement(e as EvenementAvantInstallation);
      setVisible(true);
    }
    function surInstallationTerminee() {
      setVisible(false);
      try {
        localStorage.setItem(CLE_ECARTEE, "1");
      } catch {
        // Stockage indisponible : la bannière se cache simplement pour la visite.
      }
    }

    window.addEventListener("beforeinstallprompt", surInvitation);
    window.addEventListener("appinstalled", surInstallationTerminee);

    if (estSafariIos) {
      setProcedeIos(true);
      setVisible(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", surInvitation);
      window.removeEventListener("appinstalled", surInstallationTerminee);
    };
  }, []);

  async function installer() {
    if (!evenement) return;
    await evenement.prompt();
    ecarter();
  }

  function ecarter() {
    setVisible(false);
    try {
      localStorage.setItem(CLE_ECARTEE, "1");
    } catch {
      // Stockage indisponible : la bannière se cache simplement pour la visite.
    }
  }

  if (!visible) return null;

  return (
    <div className="anim-fade-up mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-primary/25 bg-primary/5 p-4">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-sm">
        <Download className="h-5 w-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">
          Installez BTP Suivi Pro sur votre appareil
        </p>
        <p className="mt-0.5 text-xs text-muted">
          {procedeIos
            ? "Appuyez sur le bouton Partager (le carré avec une flèche), puis « Sur l'écran d'accueil ». Accès direct, plein écran et saisie hors connexion."
            : "Accès direct depuis l'écran d'accueil, plein écran et saisie hors connexion."}
        </p>
      </div>
      {!procedeIos && (
        <button
          type="button"
          onClick={installer}
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-br from-action to-action-strong px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-action/30 transition-all duration-200 hover:shadow-xl hover:brightness-[1.04] active:scale-[0.98]"
        >
          <Download className="h-4 w-4" aria-hidden />
          Installer
        </button>
      )}
      <button
        type="button"
        onClick={ecarter}
        aria-label="Masquer la proposition d'installation"
        className="rounded-lg p-2 text-muted transition hover:bg-surface-2 hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
