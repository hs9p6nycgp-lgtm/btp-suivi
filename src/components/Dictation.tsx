"use client";

// Saisie vocale (exigence JOU-06) : dicter les observations du journal.
//
// Le module de reconnaissance vocale des navigateurs (Web Speech API) est
// utilise quand il est disponible ; sinon le bouton est desactive et
// l'utilisateur tape au clavier comme d'habitude.

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";

type Reconnaissance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((evenement: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((evenement: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

type Constructeur = new () => Reconnaissance;

function navigateurCompatible(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as { SpeechRecognition?: Constructeur; webkitSpeechRecognition?: Constructeur };
  return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
}

type Props = {
  /** Texte déjà saisi : la dictée s'y ajoute. */
  valeur: string;
  onChange: (valeur: string) => void;
  langue?: string;
};

export default function Dictation({ valeur, onChange, langue = "fr-FR" }: Props) {
  const [actif, setActif] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const reconnaissanceRef = useRef<Reconnaissance | null>(null);
  const baseRef = useRef<string>(valeur);

  useEffect(() => {
    return () => {
      try {
        reconnaissanceRef.current?.stop();
      } catch {
        // Le module peut deja etre arrete : rien a faire.
      }
    };
  }, []);

  function demarrer() {
    if (!navigateurCompatible()) {
      setErreur("La dictée vocale n'est pas disponible sur cet appareil.");
      return;
    }
    const w = window as unknown as { SpeechRecognition?: Constructeur; webkitSpeechRecognition?: Constructeur };
    const Constructeur = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Constructeur) return;
    setErreur(null);
    baseRef.current = valeur;
    const reconnaissance = new Constructeur();
    reconnaissance.lang = langue;
    reconnaissance.continuous = false;
    reconnaissance.interimResults = false;
    reconnaissance.onresult = (evenement) => {
      let texte = "";
      for (let i = 0; i < evenement.results.length; i++) {
        texte += evenement.results[i][0]?.transcript ?? "";
      }
      const propre = texte.trim();
      if (!propre) return;
      const separator = baseRef.current && !baseRef.current.endsWith(" ") ? " " : "";
      onChange(`${baseRef.current}${separator}${propre}`);
    };
    reconnaissance.onerror = (evenement) => {
      setErreur(
        evenement.error === "not-allowed"
          ? "L'accès au microphone a été refusé."
          : "La dictée n'a pas pu démarrer.",
      );
      setActif(false);
    };
    reconnaissance.onend = () => setActif(false);
    reconnaissanceRef.current = reconnaissance;
    try {
      reconnaissance.start();
      setActif(true);
    } catch {
      setErreur("La dictée n'a pas pu démarrer.");
      setActif(false);
    }
  }

  function arreter() {
    try {
      reconnaissanceRef.current?.stop();
    } catch {
      // deja arrete
    }
    setActif(false);
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={actif ? arreter : demarrer}
        title={
          actif
            ? "Arrêter la dictée"
            : "Dicter les observations (microphone)"
        }
        className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border transition ${
          actif
            ? "border-danger/50 bg-danger/10 text-danger"
            : "border-border/80 bg-surface text-muted hover:text-foreground"
        }`}
      >
        {actif ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
      </button>
      {erreur && <span className="text-xs text-danger">{erreur}</span>}
      {actif && !erreur && (
        <span className="text-xs text-muted">Dictée en cours…</span>
      )}
    </span>
  );
}
