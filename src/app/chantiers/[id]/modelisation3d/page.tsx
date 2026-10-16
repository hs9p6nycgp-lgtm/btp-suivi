"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { getLangue } from "@/lib/i18n";
import Modele3D from "@/components/visualisation/Modele3D";
import { Card } from "@/components/ui/Card";
import Link from "next/link";

type Chantier = {
  id: string;
  nom: string;
  type: string;
  longueur: number | null;
  largeur: number | null;
  hauteur: number | null;
};

type Section3D = {
  id: string;
  nom: string;
  pk_debut: number | null;
  pk_fin: number | null;
  niveau: string | null;
  lot: string | null;
  type_ouvrage: string | null;
  longueur: number | null;
  largeur: number | null;
  hauteur: number | null;
  couleur: string | null;
};

const TYPES_OUVRAGE = [
  { value: "mur", label: "Mur" },
  { value: "dalle", label: "Dalle" },
  { value: "pilier", label: "Pilier" },
  { value: "section", label: "Section" },
  { value: "autre", label: "Autre" },
];

export default function Modelisation3DPage() {
  const params = useParams();
  const router = useRouter();
  const chantierId = params?.id as string;
  const langue = getLangue();

  const [chantier, setChantier] = useState<Chantier | null>(null);
  const [sections, setSections] = useState<Section3D[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [nom, setNom] = useState("");
  const [typeOuvrage, setTypeOuvrage] = useState("mur");
  const [longueur, setLongueur] = useState("3");
  const [largeur, setLargeur] = useState("0.2");
  const [hauteur, setHauteur] = useState("2.5");
  const [couleur, setCouleur] = useState("");

  useEffect(() => {
    async function load() {
      if (!chantierId) return;
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }
      const [cRes, sRes] = await Promise.all([
        supabase.from("chantiers").select("*").eq("id", chantierId).eq("proprietaire_id", user.id).maybeSingle(),
        supabase.from("sections_chantier").select("*").eq("chantier_id", chantierId).order("created_at", { ascending: true }),
      ]);
      if (cRes.data) setChantier(cRes.data as Chantier);
      else { router.replace("/chantiers"); return; }
      if (sRes.data) setSections(sRes.data as Section3D[]);
      setLoading(false);
    }
    load();
  }, [chantierId, router]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!chantierId || !nom.trim()) return;
    setSubmitting(true);
    const supabase = createClient();
    const L = parseFloat(longueur) || 0;
    const l = parseFloat(largeur) || 0;
    const h = parseFloat(hauteur) || 0;
    const { data, error } = await supabase
      .from("sections_chantier")
      .insert({
        chantier_id: chantierId,
        nom: nom.trim(),
        type_ouvrage: typeOuvrage,
        longueur: L > 0 ? L : null,
        largeur: l > 0 ? l : null,
        hauteur: h > 0 ? h : null,
        couleur: couleur.trim() || null,
      })
      .select()
      .single();
    if (data && !error) {
      setSections((prev) => [...prev, data as Section3D]);
      setNom("");
      setCouleur("");
    }
    setSubmitting(false);
  }

  async function handleDelete(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from("sections_chantier").delete().eq("id", id);
    if (!error) {
      setSections((prev) => prev.filter((s) => s.id !== id));
    }
  }

  if (loading) {
    return (
      <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
        <div className="flex h-64 items-center justify-center">
          <div className="animate-pulse rounded-full h-8 w-8 bg-action/60"></div>
        </div>
      </main>
    );
  }

  if (!chantier) {
    return (
      <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
        <p className="text-sm text-muted">Chantier introuvable.</p>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
      <div className="mb-6 flex items-center gap-3">
        <Link href={`/chantiers/${chantier.id}`} className="text-sm font-medium text-primary hover:underline">
          &larr; Retour au chantier
        </Link>
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">
          {langue === "fr" ? "Modélisation 3D" : "3D Modeling"} — {chantier.nom}
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Formulaire d'ajout */}
        <div className="lg:col-span-1">
          <Card padding="lg">
            <h2 className="mb-4 text-lg font-bold text-foreground">
              {langue === "fr" ? "Ajouter un élément" : "Add an element"}
            </h2>
            <form onSubmit={handleAdd} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  {langue === "fr" ? "Nom" : "Name"}
                </label>
                <input
                  type="text"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  required
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground"
                  placeholder={langue === "fr" ? "Ex. Mur de façade" : "e.g. Front wall"}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  {langue === "fr" ? "Type" : "Type"}
                </label>
                <select
                  value={typeOuvrage}
                  onChange={(e) => setTypeOuvrage(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground"
                >
                  {TYPES_OUVRAGE.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">L (m)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={longueur}
                    onChange={(e) => setLongueur(e.target.value)}
                    className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">l (m)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={largeur}
                    onChange={(e) => setLargeur(e.target.value)}
                    className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">h (m)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={hauteur}
                    onChange={(e) => setHauteur(e.target.value)}
                    className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  {langue === "fr" ? "Couleur (hex, optionnel)" : "Color (hex, optional)"}
                </label>
                <input
                  type="text"
                  value={couleur}
                  onChange={(e) => setCouleur(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground"
                  placeholder="#4a90e2"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-action px-3 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                {submitting
                  ? (langue === "fr" ? "Ajout..." : "Adding...")
                  : (langue === "fr" ? "Ajouter l'élément" : "Add element")}
              </button>
            </form>

            {/* Liste des éléments */}
            <div className="mt-6">
              <h3 className="mb-2 text-sm font-bold text-foreground">
                {langue === "fr" ? "Éléments créés" : "Created elements"} ({sections.length})
              </h3>
              {sections.length === 0 ? (
                <p className="text-xs text-muted">
                  {langue === "fr" ? "Aucun élément pour le moment." : "No elements yet."}
                </p>
              ) : (
                <ul className="space-y-2">
                  {sections.map((s) => (
                    <li
                      key={s.id}
                      className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2 text-xs"
                    >
                      <div>
                        <span className="font-medium text-foreground">{s.nom}</span>
                        <span className="ml-2 text-muted">
                          ({s.type_ouvrage ?? "—"} — {s.longueur ?? 0}×{s.largeur ?? 0}×{s.hauteur ?? 0} m)
                        </span>
                      </div>
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="text-rose-500 hover:text-rose-700"
                        title={langue === "fr" ? "Supprimer" : "Delete"}
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        </div>

        {/* Vue 3D */}
        <div className="lg:col-span-2">
          <Card padding="lg">
            <Modele3D chantier={chantier} sections={sections} />
          </Card>
        </div>
      </div>
    </main>
  );
}
