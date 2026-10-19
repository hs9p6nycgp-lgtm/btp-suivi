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

// Écrans à proposer dans la recherche globale (les onglets par chantier ne sont pas listés ici)
const ROUTES: ItemRoute[] = [
  { href: "/", cle: "home.titre" },
  { href: "/chantiers", cle: "chantiers.titre" },
  { href: "/alertes", cle: "nav.alertes" },
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
  const inputRef = useRef<HTMLInputElement>(null);
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
  const premierHref = chantiersFiltres[0]
    ? `/chantiers/${chantiersFiltres[0].id}`
    : pagesFiltrees[0]?.href;

  if (!ouvert) return null;

  function surTouche(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      onFermer();
      return;
    }
    // Entrée ouvre le premier résultat : un chantier s'il y en a, sinon une rubrique.
    if (e.key === "Enter" && premierHref) {
      onFermer();
      router.push(premierHref);
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

        <ul className="mt-3 max-h-80 overflow-y-auto">
          {pagesFiltrees.length === 0 && chantiersFiltres.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-muted">Aucun résultat</li>
          )}

          {chantiersFiltres.length > 0 && (
            <li className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
              Chantiers
            </li>
          )}
          {chantiersFiltres.map((chantier) => {
            const href = `/chantiers/${chantier.id}`;
            return (
              <li key={chantier.id}>
                <Link
                  href={href}
                  onClick={onFermer}
                  className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm ${
                    href === premierHref
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
            <li className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
              Rubriques
            </li>
          )}
          {pagesFiltrees.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onFermer}
                className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm ${
                  item.href === premierHref
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-slate-100 dark:hover:bg-white/10"
                }`}
              >
                <span>{t(item.cle)}</span>
                <span className="text-xs text-muted">{item.href}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
