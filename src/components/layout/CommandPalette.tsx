"use client";

import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { t } from "@/lib/i18n";

type ItemRoute = {
  href: string;
  cle: string;
};

type Chantier = {
  id: string;
  nom: string;
};

type Resultat = {
  href: string;
  label: string;
  detail: string;
  groupe: "chantier" | "rubrique";
};

// Écrans à proposer dans la recherche globale (les onglets par chantier ne sont pas listés ici)
const ROUTES: ItemRoute[] = [
  { href: "/", cle: "home.titre" },
  { href: "/chantiers", cle: "chantiers.titre" },
  { href: "/alertes", cle: "nav.alertes" },
  { href: "/compte", cle: "nav.compte" },
  { href: "/exigences", cle: "nav.exigences" },
  { href: "/bpu", cle: "nav.bpu" },
  { href: "/fournisseurs", cle: "nav.fournisseurs" },
  { href: "/referentiel", cle: "nav.referentiel" },
  { href: "/calculateurs/devis", cle: "nav.devis" },
  { href: "/calculateurs/mur", cle: "nav.mur" },
  { href: "/export", cle: "nav.export" },
  { href: "/rapports", cle: "nav.rapports" },
  { href: "/aide", cle: "nav.aide" },
];

export default function CommandPalette({
  ouvert,
  onFermer,
}: {
  ouvert: boolean;
  onFermer: () => void;
}) {
  const [requete, setRequete] = useState("");
  const [chantiers, setChantiers] = useState<Chantier[]>([]);
  const [selection, setSelection] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listeRef = useRef<HTMLUListElement>(null);
  const router = useRouter();

  // Les chantiers sont chargés une fois : on peut ensuite y sauter en tapant leur nom.
  useEffect(() => {
    let annule = false;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.from("chantiers").select("id, nom").order("nom").limit(500);
      if (!annule && data) setChantiers(data as Chantier[]);
    })();
    return () => {
      annule = true;
    };
  }, []);

  // Réinitialise la recherche à l'ouverture et met le curseur dans la saisie
  useEffect(() => {
    if (ouvert) {
      setRequete("");
      setSelection(0);
      // Le focus après l'ouverture du modal
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [ouvert]);

  const q = requete.trim().toLowerCase();
  const pagesFiltrees = ROUTES.filter(
    (item) => t(item.cle).toLowerCase().includes(q) || item.href.includes(q),
  ).slice(0, 10);
  const chantiersFiltres = q
    ? chantiers.filter((c) => c.nom.toLowerCase().includes(q)).slice(0, 6)
    : [];

  // Liste plate des résultats affichés : sert à la navigation au clavier.
  const resultats: Resultat[] = [
    ...chantiersFiltres.map((chantier) => ({
      href: `/chantiers/${chantier.id}`,
      label: chantier.nom,
      detail: "Chantier",
      groupe: "chantier" as const,
    })),
    ...pagesFiltrees.map((item) => ({
      href: item.href,
      label: t(item.cle),
      detail: item.href,
      groupe: "rubrique" as const,
    })),
  ];

  // La sélection suit toujours un résultat existant.
  const index = resultats.length === 0 ? 0 : Math.min(selection, resultats.length - 1);

  useEffect(() => {
    setSelection(0);
  }, [requete]);

  // Le résultat sélectionné reste visible dans la liste.
  useEffect(() => {
    if (!ouvert || resultats.length === 0) return;
    const element = listeRef.current?.querySelector<HTMLElement>(`[data-index="${index}"]`);
    element?.scrollIntoView({ block: "nearest" });
  }, [index, ouvert, resultats.length]);

  if (!ouvert) return null;

  function surTouche(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      onFermer();
      return;
    }
    if (e.key === "ArrowDown" && resultats.length > 0) {
      e.preventDefault();
      setSelection((i) => (i + 1) % resultats.length);
      return;
    }
    if (e.key === "ArrowUp" && resultats.length > 0) {
      e.preventDefault();
      setSelection((i) => (i - 1 + resultats.length) % resultats.length);
      return;
    }
    // Entrée ouvre le résultat sélectionné.
    if (e.key === "Enter" && resultats[index]) {
      onFermer();
      router.push(resultats[index].href);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      onClick={onFermer}
    >
      <div
        className="w-full max-w-xl rounded-2xl border border-border bg-surface p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <Search className="h-5 w-5 text-muted" />
          <input
            ref={inputRef}
            value={requete}
            onChange={(e) => setRequete(e.target.value)}
            onKeyDown={surTouche}
            placeholder={t("topbar.rechercher")}
            aria-label={t("topbar.rechercher")}
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-resultats"
            className="w-full rounded-xl border border-border/80 bg-surface-2 px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10"
          />
          <button
            type="button"
            onClick={onFermer}
            aria-label={t("action.fermer")}
            className="rounded-xl p-2 text-muted hover:bg-slate-100 dark:hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <ul
          id="palette-resultats"
          ref={listeRef}
          role="listbox"
          aria-label="Résultats de recherche"
          className="mt-3 max-h-80 overflow-y-auto"
        >
          {resultats.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-muted">Aucun résultat</li>
          )}

          {chantiersFiltres.length > 0 && (
            <li
              role="presentation"
              className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted"
            >
              Chantiers
            </li>
          )}
          {chantiersFiltres.map((chantier) => {
            const position = resultats.findIndex(
              (resultat) => resultat.href === `/chantiers/${chantier.id}`,
            );
            return (
              <li key={chantier.id} role="presentation">
                <Link
                  href={`/chantiers/${chantier.id}`}
                  onClick={onFermer}
                  data-index={position}
                  role="option"
                  aria-selected={position === index}
                  className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm ${
                    position === index
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-slate-100 dark:hover:bg-white/10"
                  }`}
                >
                  <span className="min-w-0 truncate">{chantier.nom}</span>
                  <span className="shrink-0 text-xs text-muted">Chantier</span>
                </Link>
              </li>
            );
          })}

          {chantiersFiltres.length > 0 && pagesFiltrees.length > 0 && (
            <li
              role="presentation"
              className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted"
            >
              Rubriques
            </li>
          )}
          {pagesFiltrees.map((item) => {
            const position = resultats.findIndex((resultat) => resultat.href === item.href);
            return (
              <li key={item.href} role="presentation">
                <Link
                  href={item.href}
                  onClick={onFermer}
                  data-index={position}
                  role="option"
                  aria-selected={position === index}
                  className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm ${
                    position === index
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-slate-100 dark:hover:bg-white/10"
                  }`}
                >
                  <span>{t(item.cle)}</span>
                  <span className="text-xs text-muted">{item.href}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-[11px] text-muted">
          <span>↑ ↓ pour naviguer</span>
          <span>Entrée pour ouvrir</span>
          <span>Échap pour fermer</span>
        </p>
      </div>
    </div>
  );
}
