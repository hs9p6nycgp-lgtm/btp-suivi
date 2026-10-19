"use client";

// Rapport de reception imprimable (cahier des charges §6.3) : bilan des
// quantites et des couts, controles qualites, securite, reserves restant a
// lever et signatures. C'est le proces-verbal de remise du chantier.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import {
  bilanFinancier,
  bilanQuantites,
  bilanQualite,
  pointsBloquantsReception,
} from "@/lib/chantiers/reception";
import { calculIndicateursHse, heuresTravailleesDepuisJournaux } from "@/lib/hse/declarations";
import { formaterMontant } from "@/lib/rapport/agregats";
import { formaterDateNC, libelleGraviteNC, libelleStatutNC } from "@/lib/qualite/nonConformites";

type Chantier = {
  id: string;
  nom: string;
  type: string;
  maitre_ouvrage: string | null;
  maitre_oeuvre?: string | null;
  entreprise: string | null;
  numero_marche: string | null;
  montant_marche: number;
  date_debut: string | null;
  date_fin_prevue: string | null;
};

function formaterDate(valeur: string | null | undefined): string {
  if (!valeur) return "—";
  const d = new Date(`${String(valeur).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return String(valeur);
  return d.toLocaleDateString("fr-FR");
}

function formaterNombre(valeur: number | string | null | undefined, decimales = 2): string {
  const n = Number(valeur ?? 0);
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString("fr-FR", { maximumFractionDigits: decimales });
}

export default function RapportReceptionPage() {
  const params = useParams();
  const router = useRouter();
  const chantierId = String(params?.id ?? "");

  const [chantier, setChantier] = useState<Chantier | null>(null);
  const [bilans, setBilans] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!chantierId) return;
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }
      const { data: entete } = await supabase
        .from("chantiers")
        .select("id,nom,type,maitre_ouvrage,maitre_oeuvre,entreprise,numero_marche,montant_marche,date_debut,date_fin_prevue")
        .eq("id", chantierId)
        .eq("proprietaire_id", user.id)
        .maybeSingle();
      if (!entete) {
        router.replace("/chantiers");
        return;
      }
      setChantier(entete as Chantier);

      const [poRes, qtRes, bpuRes, depRes, esRes, ncRes, hseRes, jrRes, efRes] = await Promise.all([
        supabase.from("postes_dqe").select("id,code,designation,unite,quantite_marche,prix_unitaire").eq("chantier_id", chantierId).order("created_at"),
        supabase.from("quantites_realisees").select("poste_dqe_id,quantite").eq("chantier_id", chantierId),
        supabase.from("bpu_postes").select("id,prix_unitaire"),
        supabase.from("depenses_reelles").select("id,categorie,designation,montant_total,date_depense").eq("chantier_id", chantierId).order("date_depense"),
        supabase.from("essais_qualite").select("id,type_controle,valeur_mesuree,valeur_exigee,unite,conforme,date_controle").eq("chantier_id", chantierId).order("date_controle", { ascending: false }),
        supabase.from("non_conformites").select("id,description,gravite,statut,responsable,action_corrective,echeance,date_cloture").eq("chantier_id", chantierId).order("created_at", { ascending: false }),
        supabase.from("hse_incidents").select("*").eq("chantier_id", chantierId).order("date_occurrence", { ascending: false }),
        supabase.from("journaux").select("id").eq("chantier_id", chantierId),
        supabase.from("journal_effectifs").select("journal_id,nombre"),
      ]);

      const postes = (poRes.data ?? []) as any[];
      const prixBpu = new Map<string, number>(
        ((bpuRes.data ?? []) as any[]).map((b) => [b.id, Number(b.prix_unitaire) || 0]),
      );
      const postesAvecPrix = postes.map((p) => ({
        ...p,
        prix_unitaire: prixBpu.get(p.id) ?? (Number(p.prix_unitaire) || 0),
      }));

      const bilanQ = bilanQuantites(postesAvecPrix, (qtRes.data ?? []) as any[]);
      const depenses = (depRes.data ?? []) as any[];
      const bilanF = bilanFinancier({
        montantMarche: Number((entete as Chantier).montant_marche) || bilanQ.montantMarche,
        valorisationTravaux: bilanQ.montantRealise,
        depensesReelles: depenses.reduce((s: number, d) => s + (Number(d.montant_total) || 0), 0),
      });
      const bilanQual = bilanQualite(
        (esRes.data ?? []) as any[],
        (ncRes.data ?? []) as any[],
      );

      const incidents = (hseRes.data ?? []) as any[];
      const identifiants = ((jrRes.data ?? []) as any[]).map((j) => j.id);
      const effectifsParJour = identifiants.map(
        (id) =>
          ((efRes.data ?? []) as any[]).filter((e) => e.journal_id === id).reduce(
            (s: number, e) => s + (Number(e.nombre) || 0),
            0,
          ),
      );
      const heuresTravaillees = heuresTravailleesDepuisJournaux(
        effectifsParJour.map((nombre) => ({ nombre })),
      );
      const indicateursHse = calculIndicateursHse(incidents, heuresTravaillees);
      const points = pointsBloquantsReception({
        bilanQuantites: bilanQ,
        bilanQualite: bilanQual,
        accidentsAvecArret: indicateursHse.accidentsAvecArret,
      });

      setBilans({
        quantites: bilanQ,
        financier: bilanF,
        qualite: bilanQual,
        hse: indicateursHse,
        heuresTravaillees,
        points,
        depenses,
        essais: (esRes.data ?? []) as any[],
        nonConformites: (ncRes.data ?? []) as any[],
        incidents,
      });
      setLoading(false);
    }
    load();
  }, [chantierId, router]);

  if (loading && !chantier) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-slate-300 border-t-slate-600" />
      </div>
    );
  }

  if (!chantier) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-100 text-slate-700">
        <p className="text-sm">{message ?? "Chantier introuvable."}</p>
        <Link href="/chantiers" className="text-sm font-semibold text-primary hover:underline">
          Retour aux chantiers
        </Link>
      </div>
    );
  }

  const b = bilans;

  return (
    <div className="min-h-screen bg-slate-100 py-6 print:bg-white print:py-0">
      {/* Barre d'actions — masquée à l'impression */}
      <div className="mx-auto mb-4 flex w-full max-w-[210mm] flex-wrap items-center justify-between gap-3 px-4 print:hidden">
        <Link
          href={`/chantiers/${chantier.id}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au chantier
        </Link>
        <Button size="sm" onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          Imprimer / PDF
        </Button>
      </div>

      {/* Feuille A4 */}
      <div className="mx-auto w-full max-w-[210mm] bg-white px-10 py-10 text-slate-900 shadow-lg print:max-w-none print:px-0 print:py-0 print:shadow-none">
        {/* En-tête */}
        <div className="flex items-start justify-between gap-6 border-b-2 border-slate-900 pb-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
              BTP Suivi Pro — Rapport de réception
            </p>
            <h1 className="mt-1 text-2xl font-bold">{chantier.nom}</h1>
            <p className="mt-1 text-[12px] text-slate-600">
              {chantier.maitre_ouvrage ? `MO : ${chantier.maitre_ouvrage}` : ""}
              {chantier.entreprise ? ` — Entreprise : ${chantier.entreprise}` : ""}
              {chantier.numero_marche ? ` — Marché n° ${chantier.numero_marche}` : ""}
            </p>
          </div>
          <div className="text-right text-[11px] text-slate-500">
            <p>
              Exécution : {formaterDate(chantier.date_debut)} → {formaterDate(chantier.date_fin_prevue)}
            </p>
            <p className="mt-1">Édité le {new Date().toLocaleDateString("fr-FR")}</p>
          </div>
        </div>

        {/* Points bloquants */}
        {b && (
          <div
            className={`mt-5 rounded-lg border p-4 ${
              b.points.receptable
                ? "border-emerald-600/40 bg-emerald-50 text-emerald-900"
                : "border-amber-600/40 bg-amber-50 text-amber-900"
            }`}
          >
            <p className="text-[12px] font-bold uppercase tracking-wider">
              {b.points.receptable
                ? "Chantier réceptionnable"
                : "Points à lever avant réception"}
            </p>
            {b.points.receptable ? (
              <p className="mt-1 text-[11px]">
                Aucune réserve ouverte, aucun poste du DQE non soldé, aucun accident avec arrêt à solder.
              </p>
            ) : (
              <ul className="mt-1 list-disc pl-4 text-[11px]">
                {b.points.bloquants.map((point: string) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Bilan financier */}
        {b && (
          <>
            <h2 className="mt-6 mb-2 text-[12px] font-bold uppercase tracking-wider text-slate-700">
              Bilan financier
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {[
                { libelle: "Montant du marché", valeur: formaterMontant(b.financier.montantMarche) },
                { libelle: "Valorisation des travaux", valeur: formaterMontant(b.financier.valorisationTravaux) },
                { libelle: "Dépenses réelles", valeur: formaterMontant(b.financier.depensesReelles) },
                { libelle: "Marge", valeur: formaterMontant(b.financier.marge) },
                { libelle: "Consommation", valeur: `${formaterNombre(b.financier.tauxConsommationPct, 1)} %` },
              ].map((item) => (
                <div key={item.libelle} className="rounded-lg border border-slate-300 p-2 text-center">
                  <p className="text-[9px] uppercase tracking-wider text-slate-500">{item.libelle}</p>
                  <p className="mt-0.5 text-[12px] font-bold">{item.valeur}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Bilan des quantités */}
        {b && b.quantites.lignes.length > 0 && (
          <>
            <h2 className="mt-6 mb-2 text-[12px] font-bold uppercase tracking-wider text-slate-700">
              Bilan des quantités (DQE)
            </h2>
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="border-b-2 border-slate-400 text-left text-slate-500">
                  <th className="py-1.5 pr-2 font-semibold">Poste</th>
                  <th className="py-1.5 pr-2 text-right font-semibold">Qté marché</th>
                  <th className="py-1.5 pr-2 text-right font-semibold">Qté réalisée</th>
                  <th className="py-1.5 pr-2 text-right font-semibold">Avancement</th>
                  <th className="py-1.5 pr-2 text-right font-semibold">Écart</th>
                  <th className="py-1.5 text-right font-semibold">Valorisé</th>
                </tr>
              </thead>
              <tbody>
                {b.quantites.lignes.map((l: any) => (
                  <tr key={l.posteId} className="border-b border-slate-200">
                    <td className="py-1.5 pr-2">
                      {l.code ? `${l.code} · ` : ""}
                      {l.designation}
                    </td>
                    <td className="py-1.5 pr-2 text-right tabular-nums">
                      {formaterNombre(l.quantiteMarche)} {l.unite}
                    </td>
                    <td className="py-1.5 pr-2 text-right tabular-nums">
                      {formaterNombre(l.quantiteRealisee)}
                    </td>
                    <td className="py-1.5 pr-2 text-right tabular-nums">
                      {formaterNombre(l.avancementPct, 1)} %
                    </td>
                    <td className="py-1.5 pr-2 text-right tabular-nums">
                      {l.ecartQuantitePct > 0 ? "+" : ""}
                      {formaterNombre(l.ecartQuantitePct, 1)} %
                    </td>
                    <td className="py-1.5 text-right tabular-nums">
                      {formaterMontant(l.montantRealise)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td className="pt-2 font-semibold">Total</td>
                  <td />
                  <td />
                  <td className="pt-2 text-right font-semibold tabular-nums">
                    {formaterNombre(b.quantites.avancementGlobalPct, 1)} %
                  </td>
                  <td />
                  <td className="pt-2 text-right font-bold tabular-nums">
                    {formaterMontant(b.quantites.montantRealise)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </>
        )}

        {/* Qualité et réserves */}
        {b && (
          <>
            <h2 className="mt-6 mb-2 text-[12px] font-bold uppercase tracking-wider text-slate-700">
              Contrôles qualité et réserves
            </h2>
            <p className="text-[11px] text-slate-600">
              Essais de contrôle : {b.qualite.nbEssais} — {b.qualite.nbConformes} conforme(s) (
              {formaterNombre(b.qualite.tauxConformitePct, 1)} %). Non-conformités :{" "}
              {b.qualite.nbNonConformites} dont {b.qualite.ncCloturees} clôturée(s).
            </p>
            {b.nonConformites.length > 0 ? (
              <table className="mt-2 w-full border-collapse text-[11px]">
                <thead>
                  <tr className="border-b-2 border-slate-400 text-left text-slate-500">
                    <th className="py-1.5 pr-2 font-semibold">Non-conformité</th>
                    <th className="py-1.5 pr-2 font-semibold">Gravité</th>
                    <th className="py-1.5 pr-2 font-semibold">Statut</th>
                    <th className="py-1.5 pr-2 font-semibold">Responsable</th>
                    <th className="py-1.5 font-semibold">Action corrective</th>
                  </tr>
                </thead>
                <tbody>
                  {b.nonConformites.map((nc: any) => (
                    <tr key={nc.id} className="border-b border-slate-200">
                      <td className="py-1.5 pr-2">{nc.description}</td>
                      <td className="py-1.5 pr-2">{libelleGraviteNC(nc.gravite)}</td>
                      <td className="py-1.5 pr-2">{libelleStatutNC(nc.statut)}</td>
                      <td className="py-1.5 pr-2 text-slate-600">{nc.responsable ?? "—"}</td>
                      <td className="py-1.5 text-slate-600">
                        {nc.action_corrective ?? "—"}
                        {nc.echeance ? ` (échéance ${formaterDateNC(nc.echeance)})` : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="mt-1 text-[11px] text-slate-500">Aucune non-conformité enregistrée.</p>
            )}
          </>
        )}

        {/* Sécurité */}
        {b && (
          <>
            <h2 className="mt-6 mb-2 text-[12px] font-bold uppercase tracking-wider text-slate-700">
              Sécurité (HSE)
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {[
                { libelle: "Accidents avec arrêt", valeur: String(b.hse.accidentsAvecArret) },
                { libelle: "Incidents", valeur: String(b.hse.incidents) },
                { libelle: "Jours sans accident", valeur: String(b.hse.joursSansAccident) },
                { libelle: "Heures travaillées", valeur: formaterNombre(b.heuresTravaillees, 0) },
                { libelle: "Taux de fréquence", valeur: formaterNombre(b.hse.tauxFrequence, 2) },
              ].map((item) => (
                <div key={item.libelle} className="rounded-lg border border-slate-300 p-2 text-center">
                  <p className="text-[9px] uppercase tracking-wider text-slate-500">{item.libelle}</p>
                  <p className="mt-0.5 text-[12px] font-bold">{item.valeur}</p>
                </div>
              ))}
            </div>
            {b.incidents.length > 0 && (
              <ul className="mt-2 text-[11px]">
                {b.incidents.map((incident: any) => (
                  <li key={incident.id} className="border-b border-slate-100 py-0.5">
                    {formaterDate(incident.date_occurrence)} — {incident.description}
                    {incident.accident_avec_arret ? " (arrêt de travail)" : ""}
                    {incident.action_immediate ? ` — action : ${incident.action_immediate}` : ""}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {/* Réserves à lever */}
        {b && b.points.reserves.length > 0 && (
          <>
            <h2 className="mt-6 mb-2 text-[12px] font-bold uppercase tracking-wider text-slate-700">
              Réserves à lever
            </h2>
            <ul className="list-disc pl-4 text-[11px]">
              {b.points.reserves.map((reserve: string) => (
                <li key={reserve}>{reserve}</li>
              ))}
            </ul>
          </>
        )}

        {/* Observations */}
        <div className="mt-6">
          <h2 className="mb-1 text-[12px] font-bold uppercase tracking-wider text-slate-700">
            Observations
          </h2>
          <div className="h-16 border-b border-slate-300" />
        </div>

        {/* Signatures */}
        <h2 className="mt-6 mb-3 text-[12px] font-bold uppercase tracking-wider text-slate-700">
          Procès-verbal de réception
        </h2>
        <p className="mb-3 text-[11px] text-slate-600">
          Les parties soussignées reconnaissent la réception du chantier, sans réserve, ou avec les
          réserves mentionnées ci-dessus.
        </p>
        <div className="grid grid-cols-2 gap-6">
          {[
            "Le maître d'ouvrage",
            "L'entreprise",
            "Le conducteur de travaux",
            "Le responsable qualité",
          ].map((role) => (
            <div key={role}>
              <p className="text-[11px] font-semibold text-slate-700">{role}</p>
              <div className="mt-9 border-t border-slate-400" />
              <p className="mt-1 text-[10px] text-slate-400">Nom, date et signature</p>
            </div>
          ))}
        </div>

        <p className="mt-6 border-t border-slate-200 pt-2 text-center text-[10px] text-slate-400">
          Rapport de réception — {chantier.nom} — {formaterDate(new Date().toISOString())}
        </p>
      </div>
    </div>
  );
}
