"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, BookOpen, ShieldAlert, Truck } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

type Alerte = { id: string; type: string; valeur: number; seuil: number; date_alerte: string };
type NonConformite = {
  id: string;
  description: string;
  gravite: string;
  statut: string;
  created_at: string;
};
type Journal = { id: string; date_journal: string; meteo: string | null; statut: string };
type Livraison = {
  id: string;
  materiau: string;
  fournisseur: string | null;
  quantite: number;
  date_livraison: string;
};

function formaterDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("fr-FR");
}

const GRAVITES: Record<string, { label: string; variant: "info" | "warning" | "danger" }> = {
  mineure: { label: "Mineure", variant: "info" },
  majeure: { label: "Majeure", variant: "warning" },
  critique: { label: "Critique", variant: "danger" },
};

export default function ChantierSuiviRapide({ chantierId }: { chantierId: string }) {
  const [alertes, setAlertes] = useState<Alerte[]>([]);
  const [nonConformites, setNonConformites] = useState<NonConformite[]>([]);
  const [journaux, setJournaux] = useState<Journal[]>([]);
  const [livraisons, setLivraisons] = useState<Livraison[]>([]);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [aRes, nRes, jRes, lRes] = await Promise.all([
        supabase
          .from("alertes")
          .select("id,type,valeur,seuil,date_alerte")
          .eq("chantier_id", chantierId)
          .eq("statut", "ouverte")
          .order("date_alerte", { ascending: false })
          .limit(4),
        supabase
          .from("non_conformites")
          .select("id,description,gravite,statut,created_at")
          .eq("chantier_id", chantierId)
          .in("statut", ["ouverte", "en_cours"])
          .order("created_at", { ascending: false })
          .limit(4),
        supabase
          .from("journaux")
          .select("id,date_journal,meteo,statut")
          .eq("chantier_id", chantierId)
          .order("date_journal", { ascending: false })
          .limit(4),
        supabase
          .from("livraisons")
          .select("id,materiau,fournisseur,quantite,date_livraison")
          .eq("chantier_id", chantierId)
          .order("date_livraison", { ascending: false })
          .limit(4),
      ]);
      setAlertes((aRes.data ?? []) as Alerte[]);
      setNonConformites((nRes.data ?? []) as NonConformite[]);
      setJournaux((jRes.data ?? []) as Journal[]);
      setLivraisons((lRes.data ?? []) as Livraison[]);
    }
    if (chantierId) load();
  }, [chantierId]);

  const colonnes = [
    {
      titre: "Alertes ouvertes",
      icone: <AlertTriangle className="h-4 w-4" />,
      nombre: alertes.length,
      lien: `/chantiers/${chantierId}/metre`,
      vide: "Aucune alerte ✓",
      contenu: (
        <ul className="space-y-1.5">
          {alertes.map((alerte) => (
            <li key={alerte.id} className="truncate text-xs text-muted">
              <span className="font-medium text-foreground">
                Écart {Number(alerte.valeur).toLocaleString("fr-FR")}
              </span>{" "}
              (seuil {Number(alerte.seuil).toLocaleString("fr-FR")}) · {formaterDate(alerte.date_alerte)}
            </li>
          ))}
        </ul>
      ),
    },
    {
      titre: "Non-conformités",
      icone: <ShieldAlert className="h-4 w-4" />,
      nombre: nonConformites.length,
      lien: `/chantiers/${chantierId}/qualite`,
      vide: "Aucune non-conformité ✓",
      contenu: (
        <ul className="space-y-1.5">
          {nonConformites.map((nc) => {
            const gravite = GRAVITES[nc.gravite] ?? GRAVITES.mineure;
            return (
              <li key={nc.id} className="flex items-center gap-2">
                <Badge variant={gravite.variant}>{gravite.label}</Badge>
                <span className="truncate text-xs text-muted" title={nc.description}>
                  {nc.description}
                </span>
              </li>
            );
          })}
        </ul>
      ),
    },
    {
      titre: "Derniers journaux",
      icone: <BookOpen className="h-4 w-4" />,
      nombre: journaux.length,
      lien: `/chantiers/${chantierId}/journaux`,
      vide: "Aucun journal saisi",
      contenu: (
        <ul className="space-y-1.5">
          {journaux.map((journal) => (
            <li key={journal.id} className="flex items-center gap-2 text-xs text-muted">
              <span className="font-medium text-foreground">{formaterDate(journal.date_journal)}</span>
              {journal.meteo && <span>· {journal.meteo}</span>}
              <Badge variant={journal.statut === "valide" ? "success" : "warning"}>
                {journal.statut === "valide" ? "Validé" : "Brouillon"}
              </Badge>
            </li>
          ))}
        </ul>
      ),
    },
    {
      titre: "Dernières livraisons",
      icone: <Truck className="h-4 w-4" />,
      nombre: livraisons.length,
      lien: `/chantiers/${chantierId}/livraisons`,
      vide: "Aucune livraison enregistrée",
      contenu: (
        <ul className="space-y-1.5">
          {livraisons.map((livraison) => (
            <li key={livraison.id} className="truncate text-xs text-muted">
              <span className="font-medium text-foreground">{livraison.materiau}</span> ·{" "}
              {Number(livraison.quantite).toLocaleString("fr-FR")}
              {livraison.fournisseur ? ` · ${livraison.fournisseur}` : ""} · {formaterDate(livraison.date_livraison)}
            </li>
          ))}
        </ul>
      ),
    },
  ];

  return (
    <Card padding="lg">
      <div className="mb-4">
        <h2 className="flex items-center gap-2.5 text-lg font-bold text-foreground">
          <span className="h-5 w-1.5 rounded-full bg-gradient-to-b from-action to-action-strong" aria-hidden />
          Suivi rapide
        </h2>
        <p className="mt-1 text-sm text-muted">
          Alertes, qualité, journaux et livraisons : l&apos;essentiel du terrain en un coup d&apos;œil.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {colonnes.map((colonne) => (
          <div key={colonne.titre} className="rounded-2xl border border-border/80 bg-surface-2/40 p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
                {colonne.icone}
                {colonne.titre}
              </p>
              <span className="rounded-full bg-surface px-2 py-0.5 text-sm font-bold tabular-nums text-foreground">
                {colonne.nombre}
              </span>
            </div>
            {colonne.nombre > 0 ? colonne.contenu : <p className="text-xs text-muted">{colonne.vide}</p>}
            <Link
              href={colonne.lien}
              className="mt-3 inline-block text-xs font-semibold text-primary transition hover:underline"
            >
              Voir tout →
            </Link>
          </div>
        ))}
      </div>
    </Card>
  );
}
