"use client";

import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { t } from "@/lib/i18n";

type ItemRoute = {
  href: string;
  cle: string;
};

// Écrans à proposer dans la recherche globale (les onglets par chantier ne sont pas listés ici)
const ROUTES: ItemRoute[] = [
  { href: "/", cle: "home.titre" },
  { href: "/chantiers", cle: "chantiers.titre" },
  { href: "/bpu", cle: "nav.bpu" },
  { href: "/calculateurs/devis", cle: "nav.devis" },
  { href: "/calculateurs/mur", cle: "nav.mur" },
];

export default function CommandPalette({
  ouvert,
  onFermer,
}: {
  ouvert: boolean;
  onFermer: () => void;
}) {
  const [requete, setRequete] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const resultats = ROUTES.filter((item) =>
    t(item.cle).toLowerCase().includes(requete.toLowerCase()) ||
    item.href.includes(requete),
  ).slice(0, 8);

  // Réinitialise la recherche à l'ouverture et met le curseur dans la saisie
  useEffect(() => {
    if (ouvert) {
      setRequete("");
      // Le focus après l'ouverture du modal
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [ouvert]);

  if (!ouvert) return null;

  function allerA(item: ItemRoute) {
    onFermer();
    router.push(item.href);
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
          {resultats.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-muted">Aucun résultat</li>
          )}
          {resultats.map((item, position) => (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={() => allerA(item)}
                className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm ${
                  position === 0 ? "bg-primary/10 text-primary" : "text-foreground hover:bg-slate-100 dark:hover:bg-white/10"
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
