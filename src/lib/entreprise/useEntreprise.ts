"use client";

// Chargement des parametres de l'entreprise (REP-04, REP-05).
//
// Un cache de module evite de relire la table a chaque affichage ; la
// fonction de rafraichissement permet de forcer la relecture apres une
// modification.

import { useCallback, useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { BUCKET_PHOTOS, DUREE_URL_SIGNEE_SECONDES } from "@/lib/photos/urls";
import type { ParametresEntreprise } from "./parametres.ts";

type LigneParametres = {
  id: string;
  nom: string | null;
  sigle: string | null;
  adresse: string | null;
  ville: string | null;
  telephone: string | null;
  email: string | null;
  nif: string | null;
  rccm: string | null;
  logo: string | null;
  destinataires: string[] | null;
};

const VIDE: ParametresEntreprise = {
  nom: "",
  sigle: null,
  adresse: null,
  ville: null,
  telephone: null,
  email: null,
  nif: null,
  rccm: null,
  logo: null,
  destinataires: [],
};

let cache: ParametresEntreprise | null = null;
let cacheDate = 0;
const DUREE_CACHE_MS = 60_000;

/** Logo de l'entreprise : URL signee (affichage) et donnees integrees (piece jointe). */
export type LogoEntreprise = { url: string | null; dataUrl: string | null };

let cacheLogo: LogoEntreprise = { url: null, dataUrl: null };

async function chargerLogo(chemin: string | null): Promise<LogoEntreprise> {
  if (!chemin) return { url: null, dataUrl: null };
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(BUCKET_PHOTOS)
    .createSignedUrl(chemin, DUREE_URL_SIGNEE_SECONDES);
  if (error || !data?.signedUrl) return { url: null, dataUrl: null };
  const url = data.signedUrl;
  // Version « donnees » : le fichier joint au message doit rester lisible
  // hors connexion, sans acces au stockage.
  let dataUrl: string | null = null;
  try {
    const reponse = await fetch(url);
    if (reponse.ok) {
      const blob = await reponse.blob();
      dataUrl = await new Promise<string | null>((resolve) => {
        const lecteur = new FileReader();
        lecteur.onload = () => resolve(String(lecteur.result ?? ""));
        lecteur.onerror = () => resolve(null);
        lecteur.readAsDataURL(blob);
      });
    }
  } catch {
    dataUrl = null;
  }
  return { url, dataUrl };
}

function versParametres(ligne: LigneParametres | null): ParametresEntreprise {
  if (!ligne) return { ...VIDE };
  return {
    id: ligne.id,
    nom: ligne.nom ?? "",
    sigle: ligne.sigle,
    adresse: ligne.adresse,
    ville: ligne.ville,
    telephone: ligne.telephone,
    email: ligne.email,
    nif: ligne.nif,
    rccm: ligne.rccm,
    logo: ligne.logo,
    destinataires: ligne.destinataires ?? [],
  };
}

/** Relit les parametres depuis la base (force le rafraichissement du cache). */
export async function chargerParametresEntreprise(): Promise<ParametresEntreprise> {
  const supabase = createClient();
  const { data } = await supabase
    .from("parametres_entreprise")
    .select("*")
    .maybeSingle();
  cache = versParametres((data ?? null) as LigneParametres | null);
  cacheDate = Date.now();
  return cache;
}

/** Vide le cache (appele apres une modification). */
export function viderCacheEntreprise(): void {
  cache = null;
  cacheDate = 0;
}

/**
 * Hook : renvoie les parametres de l'entreprise et une fonction de
 * rafraichissement. Tant que les parametres ne sont pas charges, `chargement`
 * vaut true.
 */
export function useEntreprise(): {
  entreprise: ParametresEntreprise;
  logo: LogoEntreprise;
  chargement: boolean;
  rafraichir: () => Promise<void>;
} {
  const [entreprise, setEntreprise] = useState<ParametresEntreprise>(cache ?? { ...VIDE });
  const [logo, setLogo] = useState<LogoEntreprise>(cacheLogo);
  const [chargement, setChargement] = useState(!cache);

  const rafraichir = useCallback(async () => {
    const params = await chargerParametresEntreprise();
    setEntreprise(params);
    const nouveauLogo = await chargerLogo(params.logo);
    cacheLogo = nouveauLogo;
    setLogo(nouveauLogo);
    setChargement(false);
  }, []);

  useEffect(() => {
    if (cache && Date.now() - cacheDate < DUREE_CACHE_MS) {
      setChargement(false);
      return;
    }
    chargerParametresEntreprise()
      .then(async (params) => {
        setEntreprise(params);
        const nouveauLogo = await chargerLogo(params.logo);
        cacheLogo = nouveauLogo;
        setLogo(nouveauLogo);
        setChargement(false);
      })
      .catch(() => setChargement(false));
  }, []);

  return { entreprise, logo, chargement, rafraichir };
}
