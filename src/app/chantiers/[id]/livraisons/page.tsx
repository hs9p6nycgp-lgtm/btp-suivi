"use client";

import { Construction } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getLangue } from "@/lib/i18n";

type Livraison = {
  id: string;
  chantier_id: string;
  materiau: string;
  fournisseur: string | null;
  quantite: number;
  numero_bon: string | null;
  camion: string | null;
  photo_bon: string | null;
  date_livraison: string;
};

export default function LivraisonsPage() {
  const params = useParams();
  const router = useRouter();
  const chantierId = String(params?.id ?? "");
  const langue = getLangue();

  const [items, setItems] = useState<Livraison[]>([]);
  const [materiau, setMateriau] = useState("");
  const [fournisseur, setFournisseur] = useState("");
  const [quantite, setQuantite] = useState("");
  const [numeroBon, setNumeroBon] = useState("");
  const [camion, setCamion] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (chantierId) load();
  }, [chantierId]);

  async function load() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/login"); return; }
    const { data: chantier } = await supabase.from("chantiers").select("id").eq("id", chantierId).eq("proprietaire_id", user.id).maybeSingle();
    if (!chantier) { router.replace("/chantiers"); return; }
    const { data, error } = await supabase
      .from("livraisons")
      .select("*")
      .eq("chantier_id", chantierId)
      .order("date_livraison", { ascending: false });
    if (error) return;
    setItems((data ?? []) as Livraison[]);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const supabase = createClient();
    let photoPath: string | null = null;
    if (file) {
      photoPath = `livraisons/${chantierId}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("chantiers-documents").upload(photoPath, file);
      if (upErr) {
        setLoading(false);
        setMessage(upErr.message);
        return;
      }
    }

    const { error } = await supabase.from("livraisons").insert({
      chantier_id: chantierId,
      materiau,
      fournisseur: fournisseur || null,
      quantite: Number(quantite) || 0,
      numero_bon: numeroBon || null,
      camion: camion || null,
      photo_bon: photoPath,
      date_livraison: date,
    });

    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setMateriau("");
    setFournisseur("");
    setQuantite("");
    setNumeroBon("");
    setCamion("");
    setFile(null);
    setMessage(langue === "fr" ? "Livraison enregistrée." : "Delivery recorded.");
    load();
  }

  async function handleRemove(id: string, photoPath: string | null) {
    const supabase = createClient();
    if (photoPath) await supabase.storage.from("chantiers-documents").remove([photoPath]);
    const { error } = await supabase.from("livraisons").delete().eq("id", id);
    if (error) {
      setMessage(error.message);
      return;
    }
    load();
  }

  const recap = items.reduce<Record<string, number>>((acc, it) => {
    acc[it.materiau] = (acc[it.materiau] ?? 0) + Number(it.quantite);
    return acc;
  }, {});

  return (
    <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href={`/chantiers/${chantierId}`} className="text-sm font-medium text-primary hover:underline">
            &larr; Retour au chantier
          </Link>
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">Approvisionnements et livraisons</h1>
        </div>
      </div>

      <Card variant="elevated" padding="lg">
        <h2 className="mb-4 text-lg font-bold text-foreground">Nouvelle livraison</h2>
        <form onSubmit={handleAdd} className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label htmlFor="materiau" className="mb-1 block text-sm font-medium text-foreground">Matériau *</label>
            <input
              id="materiau"
              className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary dark:bg-slate-800 dark:text-slate-200"
              value={materiau}
              onChange={(e) => setMateriau(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="fournisseur" className="mb-1 block text-sm font-medium text-foreground">Fournisseur</label>
            <input
              id="fournisseur"
              className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary dark:bg-slate-800 dark:text-slate-200"
              value={fournisseur}
              onChange={(e) => setFournisseur(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="quantite" className="mb-1 block text-sm font-medium text-foreground">Quantité *</label>
            <input
              id="quantite"
              className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary dark:bg-slate-800 dark:text-slate-200"
              type="number"
              step="0.01"
              value={quantite}
              onChange={(e) => setQuantite(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="numeroBon" className="mb-1 block text-sm font-medium text-foreground">N° de bon</label>
            <input
              id="numeroBon"
              className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary dark:bg-slate-800 dark:text-slate-200"
              value={numeroBon}
              onChange={(e) => setNumeroBon(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="camion" className="mb-1 block text-sm font-medium text-foreground">Camion</label>
            <input
              id="camion"
              className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary dark:bg-slate-800 dark:text-slate-200"
              value={camion}
              onChange={(e) => setCamion(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="date" className="mb-1 block text-sm font-medium text-foreground">Date</label>
            <input
              id="date"
              className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary dark:bg-slate-800 dark:text-slate-200"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="photo" className="mb-1 block text-sm font-medium text-foreground">Photo du bon</label>
            <input
              id="photo"
              type="file"
              accept="image/*,.pdf"
              className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary dark:bg-slate-800 dark:text-slate-200"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <Button type="submit" size="lg" className="w-full md:col-span-3" disabled={loading}>
            {loading ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </form>
        {message && (
          <div className="mt-3 rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800 dark:bg-rose-950/30 dark:text-rose-300">
            {message}
          </div>
        )}
      </Card>

      <section className="mt-8">
        <h2 className="mb-4 text-lg font-bold text-foreground">Récapitulatif par matériau</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          {Object.entries(recap).map(([mat, q]) => (
            <div key={mat} className="rounded-xl border border-border bg-surface p-4">
              <p className="text-xs font-semibold text-muted uppercase tracking-wider">{mat}</p>
              <div className="mt-1 flex items-end gap-1">
                <span className="text-2xl font-bold text-foreground">{q.toFixed(2)}</span>
                <span className="text-sm text-muted">u</span>
              </div>
            </div>
          ))}
          {Object.keys(recap).length === 0 && (
            <div className="rounded-2xl border-2 border-dashed border-border p-10 text-center">
              <p className="text-sm text-muted">Aucune livraison.</p>
            </div>
          )}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="mb-4 text-lg font-bold text-foreground">Livraisons enregistrées</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="p-3 font-semibold text-muted">Date</th>
                <th className="p-3 font-semibold text-muted">Matériau</th>
                <th className="p-3 font-semibold text-muted text-center">Quantité</th>
                <th className="p-3 font-semibold text-muted">Fournisseur</th>
                <th className="p-3 font-semibold text-muted text-right">N° bon</th>
                <th className="p-3 font-semibold text-muted text-right">Camion</th>
                <th className="p-3 font-semibold text-muted text-right"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((l) => (
                <tr key={l.id} className="border-b border-border last:border-0">
                  <td className="p-3 text-muted">{new Date(l.date_livraison).toLocaleDateString(langue === "fr" ? "fr-FR" : "en-US")}</td>
                  <td className="p-3 font-medium text-foreground">{l.materiau}</td>
                  <td className="p-3 text-right text-muted">{Number(l.quantite).toFixed(2)}</td>
                  <td className="p-3 text-muted">{l.fournisseur ?? "-"}</td>
                  <td className="p-3 text-right text-muted">{l.numero_bon ?? "-"}</td>
                  <td className="p-3 text-right text-muted">{l.camion ?? "-"}</td>
                  <td className="p-3 text-right">
                    <button type="button" onClick={() => handleRemove(l.id, l.photo_bon)} className="text-danger text-xs font-medium hover:underline">
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td className="p-6 text-center text-muted" colSpan={7}>
                    Aucune livraison.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
