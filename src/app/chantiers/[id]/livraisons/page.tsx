"use client";

import { Truck, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { offlineInsert, offlineDelete } from "@/lib/offline/mutations";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { getLangue, traduireErreur } from "@/lib/i18n";
import { verifierStockBas, materiauxEnAlerte } from "@/lib/stock/stock";

type Livraison = {
  id: string;
  chantier_id: string;
  materiau: string;
  fournisseur: string | null;
  quantite: number;
  quantite_commandee: number;
  quantite_mise_en_oeuvre: number;
  numero_bon: string | null;
  camion: string | null;
  photo_bon: string | null;
  date_livraison: string;
};

type RecapEntry = { commandee: number; livree: number; miseEnOeuvre: number };

// Seuils de stock (APP-04) : repli sur le navigateur si la table base
// n'existe pas encore (migration 0016_phase2_seuils_stock.sql non appliquée).
const cleSeuilsLocaux = (id: string) => `btp.seuilsStock.${id}`;

function lireSeuilsLocaux(chantierId: string): Record<string, number> {
  try {
    const brut = window.localStorage.getItem(cleSeuilsLocaux(chantierId));
    return brut ? (JSON.parse(brut) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

function ecrireSeuilsLocaux(chantierId: string, seuils: Record<string, number>) {
  try {
    window.localStorage.setItem(cleSeuilsLocaux(chantierId), JSON.stringify(seuils));
  } catch {
    // Stockage navigateur indisponible : les seuils restent en memoire.
  }
}

export default function LivraisonsPage() {
  const params = useParams();
  const router = useRouter();
  const chantierId = String(params?.id ?? "");
  const langue = getLangue();

  const [items, setItems] = useState<Livraison[]>([]);
  const [materiau, setMateriau] = useState("");
  const [fournisseur, setFournisseur] = useState("");
  const [quantite, setQuantite] = useState("");
  const [quantiteCommandee, setQuantiteCommandee] = useState("");
  const [quantiteMiseEnOeuvre, setQuantiteMiseEnOeuvre] = useState("");
  const [numeroBon, setNumeroBon] = useState("");
  const [camion, setCamion] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageOk, setMessageOk] = useState(false);
  const [seuils, setSeuils] = useState<Record<string, number>>({});
  const [seuilsLocaux, setSeuilsLocaux] = useState(false);

  useEffect(() => {
    if (chantierId) load();
  }, [chantierId]);

  async function load() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/login"); return; }
    const { data: chantier } = await supabase.from("chantiers").select("id").eq("id", chantierId).eq("proprietaire_id", user.id).maybeSingle();
    if (!chantier) { router.replace("/chantiers"); return; }
    const [livRes, seuilsRes] = await Promise.all([
      supabase
        .from("livraisons")
        .select("*")
        .eq("chantier_id", chantierId)
        .order("date_livraison", { ascending: false }),
      supabase
        .from("seuils_stock_chantier")
        .select("materiau,seuil")
        .eq("chantier_id", chantierId),
    ]);
    if (livRes.error) return;
    setItems((livRes.data ?? []) as Livraison[]);
    if (seuilsRes.error) {
      // Table de seuils pas encore creee en base : repli sur ce navigateur
      setSeuils(lireSeuilsLocaux(chantierId));
      setSeuilsLocaux(true);
    } else {
      const map: Record<string, number> = {};
      for (const s of (seuilsRes.data ?? []) as { materiau: string; seuil: number }[]) {
        map[s.materiau] = Number(s.seuil) || 0;
      }
      setSeuils(map);
      setSeuilsLocaux(false);
    }
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
        setMessage(traduireErreur(upErr));
        setMessageOk(false);
        return;
      }
    }

    const { error } = await supabase.from("livraisons").insert({
      chantier_id: chantierId,
      materiau,
      fournisseur: fournisseur || null,
      quantite: Number(quantite) || 0,
      quantite_commandee: Number(quantiteCommandee) || 0,
      quantite_mise_en_oeuvre: Number(quantiteMiseEnOeuvre) || 0,
      numero_bon: numeroBon || null,
      camion: camion || null,
      photo_bon: photoPath,
      date_livraison: date,
    });

    setLoading(false);
    if (error) {
      setMessage(traduireErreur(error));
      setMessageOk(false);
      return;
    }
    setMateriau("");
    setFournisseur("");
    setQuantite("");
    setQuantiteCommandee("");
    setQuantiteMiseEnOeuvre("");
    setNumeroBon("");
    setCamion("");
    setFile(null);
    setMessageOk(true);
    setMessage(langue === "fr" ? "Livraison enregistrée." : "Delivery recorded.");
    load();
  }

  async function handleRemove(id: string, photoPath: string | null) {
    if (photoPath) {
      const supabase = createClient();
      await supabase.storage.from("chantiers-documents").remove([photoPath]);
    }
    const { error } = await offlineDelete("livraisons", id);
    if (error) {
      setMessage(traduireErreur(error));
      setMessageOk(false);
      return;
    }
    load();
  }

  async function changerSeuil(materiau: string, valeur: string) {
    const seuil = Math.max(0, Number(valeur) || 0);
    const nouveaux = { ...seuils, [materiau]: seuil };
    setSeuils(nouveaux);
    if (seuilsLocaux) {
      ecrireSeuilsLocaux(chantierId, nouveaux);
      return;
    }
    const supabase = createClient();
    const { error } = await supabase
      .from("seuils_stock_chantier")
      .upsert({ chantier_id: chantierId, materiau, seuil }, { onConflict: "chantier_id,materiau" });
    if (error) {
      // Repli : enregistrer au moins sur cet appareil
      setSeuilsLocaux(true);
      ecrireSeuilsLocaux(chantierId, nouveaux);
    }
  }

  const recap: Record<string, RecapEntry> = {};
  for (const it of items) {
    if (!recap[it.materiau]) recap[it.materiau] = { commandee: 0, livree: 0, miseEnOeuvre: 0 };
    recap[it.materiau].commandee += Number(it.quantite_commandee) || 0;
    recap[it.materiau].livree += Number(it.quantite) || 0;
    recap[it.materiau].miseEnOeuvre += Number(it.quantite_mise_en_oeuvre) || 0;
  }

  // APP-03 / APP-04 : stock theorique (entrees - sorties) et alertes de stock bas
  const alertes = Object.entries(recap).map(([mat, q]) =>
    verifierStockBas(mat, q.livree, q.miseEnOeuvre, seuils[mat] ?? 0),
  );
  const enAlerte = materiauxEnAlerte(alertes);

  return (
    <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
      <PageHeader
        eyebrow={langue === "fr" ? "Suivi de chantier" : "Site tracking"}
        title={langue === "fr" ? "Approvisionnements et livraisons" : "Supplies and deliveries"}
        description={
          langue === "fr"
            ? "Saisie des bons de livraison, comparaison commandé / livré / mis en œuvre et suivi des stocks."
            : "Delivery note entry, ordered / delivered / installed comparison and stock tracking."
        }
        icon={<Truck className="h-5 w-5" />}
        actions={
          <Link
            href={`/chantiers/${chantierId}`}
            className="inline-flex items-center gap-2 rounded-xl border border-border/80 bg-surface px-3.5 py-2 text-sm font-semibold text-muted shadow-sm transition hover:border-primary-light/50 hover:text-foreground"
          >
            <span>←</span>
            {langue === "fr" ? "Retour au chantier" : "Back to site"}
          </Link>
        }
      />

      <Card variant="elevated" padding="lg" className="anim-fade-up anim-delay-1 mb-8">
        <h2 className="mb-4 flex items-center gap-2.5 text-lg font-bold text-foreground">
          <span className="h-5 w-1.5 rounded-full bg-gradient-to-b from-action to-action-strong" aria-hidden />
          {langue === "fr" ? "Nouvelle livraison" : "New delivery"}
        </h2>
        <form onSubmit={handleAdd} className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label htmlFor="materiau" className="mb-1 block text-sm font-medium text-foreground">Matériau *</label>
            <input
              id="materiau"
              className="w-full rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10"
              value={materiau}
              onChange={(e) => setMateriau(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="fournisseur" className="mb-1 block text-sm font-medium text-foreground">Fournisseur</label>
            <input
              id="fournisseur"
              className="w-full rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10"
              value={fournisseur}
              onChange={(e) => setFournisseur(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="quantite" className="mb-1 block text-sm font-medium text-foreground">Quantité *</label>
            <input
              id="quantite"
              className="w-full rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10"
              type="number"
              step="0.01"
              value={quantite}
              onChange={(e) => setQuantite(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="quantiteCommandee" className="mb-1 block text-sm font-medium text-foreground">Qté commandée (cumulé)</label>
            <input
              id="quantiteCommandee"
              className="w-full rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10"
              type="number"
              step="0.01"
              value={quantiteCommandee}
              onChange={(e) => setQuantiteCommandee(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="quantiteMiseEnOeuvre" className="mb-1 block text-sm font-medium text-foreground">Qté mise en œuvre (cumulé)</label>
            <input
              id="quantiteMiseEnOeuvre"
              className="w-full rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10"
              type="number"
              step="0.01"
              value={quantiteMiseEnOeuvre}
              onChange={(e) => setQuantiteMiseEnOeuvre(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="numeroBon" className="mb-1 block text-sm font-medium text-foreground">N° de bon</label>
            <input
              id="numeroBon"
              className="w-full rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10"
              value={numeroBon}
              onChange={(e) => setNumeroBon(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="camion" className="mb-1 block text-sm font-medium text-foreground">Camion</label>
            <input
              id="camion"
              className="w-full rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10"
              value={camion}
              onChange={(e) => setCamion(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="date" className="mb-1 block text-sm font-medium text-foreground">Date</label>
            <input
              id="date"
              className="w-full rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10"
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
              className="w-full rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <Button type="submit" size="lg" className="w-full md:col-span-3" disabled={loading}>
            {loading ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </form>
        {message && (
          <div
            className={`mt-3 rounded-xl border p-3 text-sm ${
              messageOk
                ? "border-success/40 bg-success/10 text-foreground"
                : "border-danger/40 bg-danger/10 text-foreground"
            }`}
          >
            {message}
          </div>
        )}
      </Card>

      <section className="anim-fade-up anim-delay-2 mb-6">
        <h2 className="mb-4 flex items-center gap-2.5 text-lg font-bold text-foreground">
          <span className="h-5 w-1.5 rounded-full bg-gradient-to-b from-action to-action-strong" aria-hidden />
          {langue === "fr" ? "Comparaison commandé / livré / mis en œuvre" : "Ordered / delivered / installed comparison"}
        </h2>
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/80 bg-surface-2 text-left">
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted">Matériau</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted">Commandé</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted">Livré</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted">Mis en œuvre</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted">Écart (livré - commandé)</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(recap).map(([mat, q]) => (
                  <tr key={mat} className="border-b border-border/60 transition last:border-0 hover:bg-surface-2/70">
                    <td className="px-4 py-3 font-medium text-foreground">{mat}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted">{q.commandee.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted">{q.livree.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted">{q.miseEnOeuvre.toFixed(2)}</td>
                    <td className={`px-4 py-3 text-right font-semibold tabular-nums ${q.livree > q.commandee ? "text-danger" : "text-success"}`}>
                      {q.livree - q.commandee > 0 ? "+" : ""}
                      {(q.livree - q.commandee).toFixed(2)}
                    </td>
                  </tr>
                ))}
                {Object.keys(recap).length === 0 && (
                  <tr>
                    <td className="p-6 text-center text-muted" colSpan={5}>
                      Aucune livraison.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      {/* APP-03 / APP-04 : stocks theoriques et alertes */}
      <section className="anim-fade-up anim-delay-3 mb-6">
        <h2 className="mb-4 flex items-center gap-2.5 text-lg font-bold text-foreground">
          <span className="h-5 w-1.5 rounded-full bg-gradient-to-b from-action to-action-strong" aria-hidden />
          {langue === "fr" ? "Stocks théoriques et alertes" : "Theoretical stock and alerts"}
        </h2>

        {enAlerte.length > 0 && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-400/40 bg-amber-500/10 p-3 text-sm font-medium text-foreground">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
            {langue === "fr"
              ? `${enAlerte.length} matériau${enAlerte.length > 1 ? "x" : ""} en alerte de stock — vérifiez les approvisionnements.`
              : `${enAlerte.length} material${enAlerte.length > 1 ? "s" : ""} in stock alert — check supplies.`}
          </div>
        )}

        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/80 bg-surface-2 text-left">
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted">Matériau</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted">Entrées (livré)</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted">Sorties (mis en œuvre)</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted">Stock théorique</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted">Seuil d&apos;alerte</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted">État</th>
                </tr>
              </thead>
              <tbody>
                {alertes.map((a) => {
                  const surconsommation = a.stockTheorique < 0;
                  const niveau: "danger" | "warning" | "success" = surconsommation ? "danger" : a.enAlerte ? "warning" : "success";
                  const libelle = surconsommation
                    ? (langue === "fr" ? "Surconsommation" : "Overconsumption")
                    : a.enAlerte
                      ? (langue === "fr" ? "Stock bas" : "Low stock")
                      : "OK";
                  return (
                    <tr key={a.materiau} className="border-b border-border/60 transition last:border-0 hover:bg-surface-2/70">
                      <td className="px-4 py-3 font-medium text-foreground">{a.materiau}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted">{recap[a.materiau].livree.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted">{recap[a.materiau].miseEnOeuvre.toFixed(2)}</td>
                      <td className={`px-4 py-3 text-right font-semibold tabular-nums ${a.enAlerte ? "text-danger" : "text-success"}`}>
                        {a.stockTheorique.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={seuils[a.materiau] ?? 0}
                          onChange={(e) => changerSeuil(a.materiau, e.target.value)}
                          className="w-24 rounded-lg border border-border/80 bg-surface px-2 py-1 text-right text-sm tabular-nums text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10"
                          aria-label={`${langue === "fr" ? "Seuil d'alerte" : "Alert threshold"} ${a.materiau}`}
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={niveau}>{libelle}</Badge>
                      </td>
                    </tr>
                  );
                })}
                {alertes.length === 0 && (
                  <tr>
                    <td className="p-6 text-center text-muted" colSpan={6}>
                      {langue === "fr" ? "Aucune entrée : ajoutez d'abord des livraisons." : "No entries: add deliveries first."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
        <p className="mt-3 text-xs text-muted">
          {langue === "fr"
            ? "Stock théorique = entrées (livré) − sorties (mis en œuvre), 2 décimales. « Surconsommation » = quantité mise en œuvre supérieure au livré. Le seuil d'alerte est paramétrable par chantier et par matériau."
            : "Theoretical stock = entries (delivered) − exits (installed), 2 decimals. “Overconsumption” = quantity installed greater than delivered. The alert threshold is configurable per site and per material."}
        </p>
        {seuilsLocaux && (
          <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
            {langue === "fr"
              ? "Les seuils sont enregistrés sur cet appareil uniquement (table base absente : migration 0016 non appliquée)."
              : "Thresholds are saved on this device only (database table missing: migration 0016 not applied)."}
          </p>
        )}
      </section>

      <section className="anim-fade-up anim-delay-4">
        <h2 className="mb-4 flex items-center gap-2.5 text-lg font-bold text-foreground">
          <span className="h-5 w-1.5 rounded-full bg-gradient-to-b from-action to-action-strong" aria-hidden />
          {langue === "fr" ? "Livraisons enregistrées" : "Recorded deliveries"}
        </h2>
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/80 bg-surface-2 text-left">
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted">Date</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted">Matériau</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted">Quantité</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted">Fournisseur</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted">N° bon</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted">Camion</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {items.map((l) => (
                  <tr key={l.id} className="border-b border-border/60 transition last:border-0 hover:bg-surface-2/70">
                    <td className="px-4 py-3 text-muted">{new Date(l.date_livraison).toLocaleDateString(langue === "fr" ? "fr-FR" : "en-US")}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{l.materiau}</td>
                    <td className="px-4 py-3 text-center tabular-nums text-muted">{Number(l.quantite).toFixed(2)}</td>
                    <td className="px-4 py-3 text-muted">{l.fournisseur ?? "-"}</td>
                    <td className="px-4 py-3 text-right text-muted">{l.numero_bon ?? "-"}</td>
                    <td className="px-4 py-3 text-right text-muted">{l.camion ?? "-"}</td>
                    <td className="px-4 py-3 text-right">
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
        </Card>
      </section>
    </main>
  );
}
