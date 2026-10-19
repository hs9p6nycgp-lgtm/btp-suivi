"use client";

// Situations de paiement (decomptes) du chantier.
//
// Le module calcule la valorisation cumulee des travaux realises (quantites
// saisies x prix du DQE), propose un montant par periode, applique la
// retenue de garantie et les acomptes, et suit le statut jusqu'au paiement.

import { useEffect, useMemo, useState } from "react";
import { Banknote, FileCheck2, Percent, TrendingUp, Wallet } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { getLangue, traduireErreur } from "@/lib/i18n";
import {
  alertesSituation,
  calculerSituation,
  LIBELLES_STATUT,
  prochainNumero,
  situationModifiable,
  totalDecompteAnterieur,
  valorisationCumulee,
  type Situation,
  type StatutSituation,
} from "@/lib/couts/situation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";

const CHAMP =
  "w-full rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary-light focus:ring-4 focus:ring-primary/10";

type PosteDqe = {
  id: string;
  code: string | null;
  designation: string;
  unite: string;
  quantite_marche: number;
  prix_unitaire: number;
};

type Quantite = { poste_dqe_id: string; quantite: number; date_saisie: string };

type SituationEnBase = Situation & { montant_brut: number; retenue: number; net_a_payer: number };

export default function SituationsPage() {
  const params = useParams();
  const router = useRouter();
  const chantierId = String(params?.id ?? "");
  const langue = getLangue();

  const [chantier, setChantier] = useState<{ nom: string; montant_marche: number } | null>(null);
  const [postes, setPostes] = useState<PosteDqe[]>([]);
  const [quantites, setQuantites] = useState<Quantite[]>([]);
  const [situations, setSituations] = useState<SituationEnBase[]>([]);
  const [chargement, setChargement] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  // Formulaire de nouvelle situation
  const [periodeDebut, setPeriodeDebut] = useState("");
  const [periodeFin, setPeriodeFin] = useState("");
  const [tauxRetenue, setTauxRetenue] = useState("10");
  const [acomptes, setAcomptes] = useState("0");
  const [observations, setObservations] = useState("");
  const [enregistrement, setEnregistrement] = useState(false);
  const [detail, setDetail] = useState<string | null>(null);

  useEffect(() => {
    if (chantierId) charger();
  }, [chantierId]);

  async function charger() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/login"); return; }
    const { data: ch } = await supabase
      .from("chantiers")
      .select("id,nom,montant_marche")
      .eq("id", chantierId)
      .eq("proprietaire_id", user.id)
      .maybeSingle();
    if (!ch) { router.replace("/chantiers"); return; }
    setChantier({ nom: ch.nom, montant_marche: Number(ch.montant_marche) || 0 });

    const [postesRes, quantitesRes, situationsRes] = await Promise.all([
      supabase.from("postes_dqe").select("id,code,designation,unite,quantite_marche,prix_unitaire").eq("chantier_id", chantierId),
      supabase.from("quantites_realisees").select("poste_dqe_id,quantite,date_saisie").eq("chantier_id", chantierId),
      supabase.from("situations_paiement").select("*").eq("chantier_id", chantierId).order("periode_fin", { ascending: false }),
    ]);
    setPostes((postesRes.data ?? []) as PosteDqe[]);
    setQuantites((quantitesRes.data ?? []) as Quantite[]);
    setSituations((situationsRes.data ?? []) as SituationEnBase[]);
    setChargement(false);
  }

  const montantMarche = chantier?.montant_marche ?? 0;
  const fr = langue === "fr" ? "fr-FR" : "en-US";
  const fcfa = (valeur: number) => Math.round(valeur || 0).toLocaleString(fr);

  /** Cumul valorise au 31/12/2024 (toute la periode). */
  const cumulTotal = useMemo(
    () =>
      valorisationCumulee(
        postes.map((p) => ({
          posteDqeId: p.id,
          code: p.code,
          designation: p.designation,
          unite: p.unite,
          quantiteMarche: Number(p.quantite_marche) || 0,
          quantiteRealisee: 0,
          prixUnitaire: Number(p.prix_unitaire) || 0,
        })),
        quantites.map((q) => ({ posteDqeId: q.poste_dqe_id, quantite: Number(q.quantite) || 0, date: q.date_saisie })),
        null,
      ),
    [postes, quantites],
  );

  const decompteAnterieur = totalDecompteAnterieur(situations);
  const derniere = situations[0] ?? null;

  /** Valorisation de la periode saisie (cumul a la fin moins cumul avant). */
  const apercu = useMemo(() => {
    if (!periodeDebut || !periodeFin) return null;
    const postesCalc = postes.map((p) => ({
      posteDqeId: p.id,
      code: p.code,
      designation: p.designation,
      unite: p.unite,
      quantiteMarche: Number(p.quantite_marche) || 0,
      quantiteRealisee: 0,
      prixUnitaire: Number(p.prix_unitaire) || 0,
    }));
    const quantitesCalc = quantites.map((q) => ({
      posteDqeId: q.poste_dqe_id,
      quantite: Number(q.quantite) || 0,
      date: q.date_saisie,
    }));
    // Cumulation juste avant la periode (le jour precedant le debut)
    const veille = new Date(periodeDebut);
    veille.setDate(veille.getDate() - 1);
    const avant = valorisationCumulee(postesCalc, quantitesCalc, veille.toISOString().slice(0, 10));
    const fin = valorisationCumulee(postesCalc, quantitesCalc, periodeFin);
    const cumulPeriode = fin.montant - avant.montant;
    const calcul = calculerSituation({
      cumulAvant: avant.montant,
      cumulPeriode,
      decompteAnterieur,
      acomptes: Number(acomptes) || 0,
      tauxRetenue: Number(tauxRetenue) || 0,
      montantMarche,
    });
    return { avant, fin, cumulPeriode, calcul };
  }, [periodeDebut, periodeFin, postes, quantites, acomptes, tauxRetenue, decompteAnterieur, montantMarche]);

  async function creerSituation(e: React.FormEvent) {
    e.preventDefault();
    if (!apercu) return;
    setEnregistrement(true);
    setMessage(null);
    setErreur(null);
    const supabase = createClient();
    const numero = prochainNumero(situations);
    const { error } = await supabase.from("situations_paiement").insert({
      chantier_id: chantierId,
      numero,
      periode_debut: periodeDebut,
      periode_fin: periodeFin,
      cumul_avant: apercu.avant.montant,
      cumul_periode: apercu.cumulPeriode,
      decompte_anterieur: decompteAnterieur,
      acomptes: Number(acomptes) || 0,
      taux_retenue: Number(tauxRetenue) || 0,
      montant_brut: apercu.calcul.montantBrut,
      retenue: apercu.calcul.retenue,
      net_a_payer: apercu.calcul.netAPayer,
      statut: "brouillon",
      observations: observations.trim() || null,
    });
    setEnregistrement(false);
    if (error) {
      setErreur(traduireErreur(error));
      return;
    }
    setPeriodeDebut("");
    setPeriodeFin("");
    setAcomptes("0");
    setObservations("");
    setMessage(langue === "fr" ? `Situation ${numero} créée (brouillon).` : `Situation ${numero} created (draft).`);
    charger();
  }

  async function changerStatut(id: string, statut: StatutSituation) {
    const supabase = createClient();
    const { error } = await supabase
      .from("situations_paiement")
      .update({ statut, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      setErreur(traduireErreur(error));
      return;
    }
    charger();
  }

  async function supprimerSituation(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from("situations_paiement").delete().eq("id", id);
    if (error) {
      setErreur(traduireErreur(error));
      return;
    }
    setMessage(langue === "fr" ? "Situation supprimée." : "Situation deleted.");
    charger();
  }

  const detailSituation = useMemo(() => {
    if (!detail) return null;
    const situation = situations.find((s) => s.id === detail);
    if (!situation) return null;
    const postesCalc = postes.map((p) => ({
      posteDqeId: p.id,
      code: p.code,
      designation: p.designation,
      unite: p.unite,
      quantiteMarche: Number(p.quantite_marche) || 0,
      quantiteRealisee: 0,
      prixUnitaire: Number(p.prix_unitaire) || 0,
    }));
    const quantitesCalc = quantites.map((q) => ({
      posteDqeId: q.poste_dqe_id,
      quantite: Number(q.quantite) || 0,
      date: q.date_saisie,
    }));
    const veille = new Date(situation.periode_debut);
    veille.setDate(veille.getDate() - 1);
    const avant = valorisationCumulee(postesCalc, quantitesCalc, veille.toISOString().slice(0, 10));
    const fin = valorisationCumulee(postesCalc, quantitesCalc, situation.periode_fin);
    const lignes = fin.lignes
      .map((l) => ({
        ...l,
        quantitePeriode: l.quantiteCumulee - (avant.lignes.find((a) => a.posteDqeId === l.posteDqeId)?.quantiteCumulee ?? 0),
        montantPeriode: l.montantCumule - (avant.lignes.find((a) => a.posteDqeId === l.posteDqeId)?.montantCumule ?? 0),
      }))
      .filter((l) => l.quantitePeriode !== 0);
    const calcul = calculerSituation({
      cumulAvant: Number(situation.cumul_avant) || 0,
      cumulPeriode: Number(situation.cumul_periode) || 0,
      decompteAnterieur: Number(situation.decompte_anterieur) || 0,
      acomptes: Number(situation.acomptes) || 0,
      tauxRetenue: Number(situation.taux_retenue) || 0,
      montantMarche,
    });
    const alertes = alertesSituation(
      situation,
      situations.filter((s) => s.id !== situation.id),
      montantMarche,
      calcul.cumulTotal,
    );
    return { situation, lignes, calcul, alertes };
  }, [detail, situations, postes, quantites, montantMarche]);

  return (
    <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
      <PageHeader
        eyebrow={langue === "fr" ? "Suivi de chantier" : "Site tracking"}
        title={langue === "fr" ? "Situations de paiement" : "Payment statements"}
        description={
          langue === "fr"
            ? "Ce que vous demandez à être payé : valorisation des travaux réalisés, retenue de garantie, acomptes et net à payer."
            : "What you claim: valuation of work done, retention, advances and net amount due."
        }
        icon={<Wallet className="h-5 w-5" />}
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

      {message && (
        <p className="mb-4 rounded-xl border border-success/40 bg-success/10 p-3 text-sm text-foreground">{message}</p>
      )}
      {erreur && (
        <p className="mb-4 rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-foreground">{erreur}</p>
      )}

      {/* Chiffres cles */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard
          title={langue === "fr" ? "Cumul valorisé" : "Valued total"}
          value={fcfa(cumulTotal.montant)}
          subtitle="FCFA"
          icon={<TrendingUp className="h-5 w-5" />}
          color="blue"
        />
        <StatCard
          title={langue === "fr" ? "Dernière situation" : "Last statement"}
          value={derniere ? fcfa(derniere.montant_brut) : "—"}
          subtitle={derniere ? derniere.numero : langue === "fr" ? "aucune" : "none"}
          icon={<FileCheck2 className="h-5 w-5" />}
          color="emerald"
        />
        <StatCard
          title={langue === "fr" ? "Déjà décompté" : "Already claimed"}
          value={fcfa(decompteAnterieur)}
          subtitle="FCFA"
          icon={<Banknote className="h-5 w-5" />}
          color="amber"
        />
        <StatCard
          title={langue === "fr" ? "Reste du marché" : "Remaining work"}
          value={fcfa(Math.max(0, montantMarche - cumulTotal.montant))}
          subtitle={`${montantMarche > 0 ? Math.round(((cumulTotal.montant / montantMarche) * 1000) / 10) : 0} % réalisé`}
          icon={<Percent className="h-5 w-5" />}
          color="slate"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Nouvelle situation */}
        <Card padding="lg" className="lg:col-span-2">
          <h2 className="mb-3 text-lg font-bold text-foreground">
            {langue === "fr" ? "Nouvelle situation" : "New statement"}
          </h2>
          <form onSubmit={creerSituation} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm font-medium text-foreground">
                {langue === "fr" ? "Du" : "From"}
                <input type="date" className={`${CHAMP} mt-1`} value={periodeDebut} onChange={(e) => setPeriodeDebut(e.target.value)} required />
              </label>
              <label className="block text-sm font-medium text-foreground">
                {langue === "fr" ? "Au" : "To"}
                <input type="date" className={`${CHAMP} mt-1`} value={periodeFin} onChange={(e) => setPeriodeFin(e.target.value)} required />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm font-medium text-foreground">
                {langue === "fr" ? "Retenue de garantie (%)" : "Retention (%)"}
                <input type="number" step="0.5" min="0" className={`${CHAMP} mt-1`} value={tauxRetenue} onChange={(e) => setTauxRetenue(e.target.value)} />
              </label>
              <label className="block text-sm font-medium text-foreground">
                {langue === "fr" ? "Acomptes versés (FCFA)" : "Advances paid (FCFA)"}
                <input type="number" className={`${CHAMP} mt-1`} value={acomptes} onChange={(e) => setAcomptes(e.target.value)} />
              </label>
            </div>
            <textarea
              className={`${CHAMP} min-h-16`}
              placeholder={langue === "fr" ? "Observations (avance, réserve, délai de paiement…)" : "Comments (advance, retention, payment terms…)"}
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
            />

            {apercu && (
              <div className="rounded-xl border border-border/70 bg-surface-2/60 p-3 text-sm">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">
                  {langue === "fr" ? "Aperçu" : "Preview"}
                </p>
                <div className="grid grid-cols-2 gap-y-1 text-xs">
                  <span className="text-muted">{langue === "fr" ? "Cumul avant" : "Total before"}</span>
                  <span className="text-right font-medium">{fcfa(apercu.avant.montant)}</span>
                  <span className="text-muted">{langue === "fr" ? "Période" : "Period"}</span>
                  <span className="text-right font-medium">{fcfa(apercu.cumulPeriode)}</span>
                  <span className="text-muted">{langue === "fr" ? "Montant brut" : "Gross amount"}</span>
                  <span className="text-right font-medium">{fcfa(apercu.calcul.montantBrut)}</span>
                  <span className="text-muted">{langue === "fr" ? "Retenue" : "Retention"}</span>
                  <span className="text-right font-medium">− {fcfa(apercu.calcul.retenue)}</span>
                  <span className="text-muted">{langue === "fr" ? "Net à payer" : "Net due"}</span>
                  <span className="text-right font-bold text-primary">{fcfa(apercu.calcul.netAPayer)}</span>
                </div>
              </div>
            )}

            <Button type="submit" disabled={enregistrement || !apercu} className="w-full">
              {enregistrement
                ? langue === "fr" ? "Enregistrement..." : "Saving..."
                : langue === "fr" ? "Créer la situation" : "Create statement"}
            </Button>
          </form>
        </Card>

        {/* Liste des situations */}
        <div className="lg:col-span-3">
          <Card padding="lg">
            <h2 className="mb-3 text-lg font-bold text-foreground">
              {langue === "fr" ? "Situations" : "Statements"} ({situations.length})
            </h2>
            {chargement ? (
              <p className="text-sm text-muted">{langue === "fr" ? "Chargement…" : "Loading…"}</p>
            ) : situations.length === 0 ? (
              <p className="text-sm text-muted">
                {langue === "fr"
                  ? "Aucune situation pour le moment : saisissez les quantités réalisées dans le journal, puis proposez votre première situation."
                  : "No statement yet: enter the quantities in the log, then propose your first statement."}
              </p>
            ) : (
              <ul className="space-y-3">
                {situations.map((s) => {
                  const calcul = calculerSituation({
                    cumulAvant: Number(s.cumul_avant) || 0,
                    cumulPeriode: Number(s.cumul_periode) || 0,
                    decompteAnterieur: Number(s.decompte_anterieur) || 0,
                    acomptes: Number(s.acomptes) || 0,
                    tauxRetenue: Number(s.taux_retenue) || 0,
                    montantMarche,
                  });
                  const alertes = alertesSituation(
                    s,
                    situations.filter((a) => a.id !== s.id),
                    montantMarche,
                    calcul.cumulTotal,
                  );
                  return (
                    <li key={s.id} className="rounded-xl border border-border/70 bg-surface-2/60 p-3">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-foreground">{s.numero}</span>
                        <Badge variant={s.statut === "paye" ? "success" : s.statut === "acceptee" ? "success" : s.statut === "soumise" ? "info" : s.statut === "rejetee" ? "danger" : "warning"}>
                          {LIBELLES_STATUT[s.statut].fr}
                        </Badge>
                        <span className="text-xs text-muted">
                          {s.periode_debut} → {s.periode_fin}
                        </span>
                        <button
                          type="button"
                          onClick={() => setDetail(detail === s.id ? null : s.id)}
                          className="ml-auto text-xs font-semibold text-primary hover:underline"
                        >
                          {detail === s.id
                            ? langue === "fr" ? "Masquer" : "Hide"
                            : langue === "fr" ? "Détail" : "Details"}
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-y-1 text-xs md:grid-cols-4">
                        <span className="text-muted">{langue === "fr" ? "Montant brut" : "Gross amount"}</span>
                        <span className="text-right font-medium md:text-left">{fcfa(calcul.montantBrut)}</span>
                        <span className="text-muted">{langue === "fr" ? "Retenue" : "Retention"}</span>
                        <span className="text-right font-medium md:text-left">− {fcfa(calcul.retenue)}</span>
                        <span className="text-muted">{langue === "fr" ? "Net à payer" : "Net due"}</span>
                        <span className="text-right font-bold text-primary md:text-left">{fcfa(calcul.netAPayer)}</span>
                        <span className="text-muted">{langue === "fr" ? "Cumul marché" : "Contract total"}</span>
                        <span className="text-right font-medium md:text-left">
                          {montantMarche > 0 ? Math.round((calcul.progressionPct * 10) / 10) : 0} %
                        </span>
                      </div>
                      {alertes.length > 0 && (
                        <ul className="mt-2 space-y-0.5 text-xs text-warning">
                          {alertes.map((a, i) => (
                            <li key={i}>{a.message}</li>
                          ))}
                        </ul>
                      )}
                      <div className="mt-2 flex flex-wrap gap-2">
                        {situationModifiable(s) && (
                          <>
                            {s.statut === "brouillon" && (
                              <Button type="button" size="sm" variant="outline" onClick={() => changerStatut(s.id, "soumise")}>
                                {langue === "fr" ? "Soumettre" : "Submit"}
                              </Button>
                            )}
                            {s.statut === "soumise" && (
                              <>
                                <Button type="button" size="sm" variant="outline" onClick={() => changerStatut(s.id, "acceptee")}>
                                  {langue === "fr" ? "Accepter" : "Accept"}
                                </Button>
                                <Button type="button" size="sm" variant="outline" onClick={() => changerStatut(s.id, "rejetee")}>
                                  {langue === "fr" ? "Rejeter" : "Reject"}
                                </Button>
                              </>
                            )}
                            <Button type="button" size="sm" variant="outline" onClick={() => changerStatut(s.id, "paye")}>
                              {langue === "fr" ? "Marquer payée" : "Mark paid"}
                            </Button>
                          </>
                        )}
                        {s.statut === "brouillon" && (
                          <button type="button" onClick={() => supprimerSituation(s.id)} className="text-xs font-medium text-danger hover:underline">
                            {langue === "fr" ? "Supprimer" : "Delete"}
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      </div>

      {/* Detail d'une situation */}
      {detailSituation && (
        <Card padding="lg" className="mt-6">
          <h2 className="mb-3 text-lg font-bold text-foreground">
            {langue === "fr" ? "Détail de la situation" : "Statement details"} {detailSituation.situation.numero}
          </h2>
          <div className="mb-4 grid grid-cols-2 gap-y-1 text-sm md:grid-cols-4">
            <span className="text-muted">{langue === "fr" ? "Cumul total" : "Total valued"}</span>
            <span className="text-right font-medium md:text-left">{fcfa(detailSituation.calcul.cumulTotal)}</span>
            <span className="text-muted">{langue === "fr" ? "Montant brut" : "Gross amount"}</span>
            <span className="text-right font-medium md:text-left">{fcfa(detailSituation.calcul.montantBrut)}</span>
            <span className="text-muted">{langue === "fr" ? "Retenue" : "Retention"}</span>
            <span className="text-right font-medium md:text-left">− {fcfa(detailSituation.calcul.retenue)}</span>
            <span className="text-muted">{langue === "fr" ? "Net à payer" : "Net due"}</span>
            <span className="text-right font-bold text-primary md:text-left">{fcfa(detailSituation.calcul.netAPayer)}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="p-2 text-xs font-semibold uppercase tracking-wider text-muted">Code</th>
                  <th className="p-2 text-xs font-semibold uppercase tracking-wider text-muted">
                    {langue === "fr" ? "Désignation" : "Designation"}
                  </th>
                  <th className="p-2 text-right text-xs font-semibold uppercase tracking-wider text-muted">
                    {langue === "fr" ? "Qté période" : "Qty period"}
                  </th>
                  <th className="p-2 text-right text-xs font-semibold uppercase tracking-wider text-muted">
                    {langue === "fr" ? "P.U." : "Unit price"}
                  </th>
                  <th className="p-2 text-right text-xs font-semibold uppercase tracking-wider text-muted">
                    {langue === "fr" ? "Montant" : "Amount"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {detailSituation.lignes.map((l) => (
                  <tr key={l.posteDqeId} className="border-b border-border/60 last:border-0">
                    <td className="p-2 text-muted">{l.code ?? "-"}</td>
                    <td className="p-2 font-medium text-foreground">{l.designation}</td>
                    <td className="p-2 text-right tabular-nums text-muted">
                      {l.quantitePeriode.toLocaleString(fr)} {l.unite}
                    </td>
                    <td className="p-2 text-right tabular-nums text-muted">{fcfa(l.prixUnitaire)}</td>
                    <td className="p-2 text-right tabular-nums font-medium text-foreground">{fcfa(l.montantPeriode)}</td>
                  </tr>
                ))}
                {detailSituation.lignes.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-sm text-muted">
                      {langue === "fr"
                        ? "Aucun travail valorisé sur cette période."
                        : "No work valued for this period."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </main>
  );
}
